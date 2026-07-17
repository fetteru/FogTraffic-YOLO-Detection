"""Multi-tool detection agent with memory and lightweight RAG."""

from __future__ import annotations

import json
from contextvars import ContextVar
from pathlib import Path
from typing import AsyncGenerator

try:
    from langchain_core.tools import tool
except Exception:
    class _SimpleTool:
        def __init__(self, func):
            self.func = func
            self.name = func.__name__
            self.description = func.__doc__ or ""

        def invoke(self, payload: dict | None = None):
            payload = payload or {}
            return self.func(**payload)

    def tool(func):
        return _SimpleTool(func)

from app.agent.memory import conversation_memory
from app.agent.prompts import PROJECT_INTRO, SYSTEM_PROMPT, build_context_prompt
from app.config.settings import settings
from app.core.logger import get_logger
from app.rag.retriever import knowledge_retriever
from app.services.dashboard_service import dashboard_service
from app.services.detection_service import detection_service
from app.services.history_service import history_service
from app.services.user_service import user_service
from app.database.session import SessionLocal


logger = get_logger(__name__)
current_user_id: ContextVar[int | None] = ContextVar("current_user_id", default=None)


@tool
def detect_single_image(image_path: str, conf: float = 0.25, iou: float = 0.45) -> str:
    """Detect objects in one local image path and summarize object counts, classes and inference time."""
    result = detection_service.detect_single(image_path, conf=conf, iou=iou)
    user_id = current_user_id.get()
    if user_id and "error" not in result:
        result["db_task_id"] = detection_service.save_detection_result(
            user_id=user_id,
            task_type="single",
            result=result,
            conf=conf,
            iou=iou,
            task_name=Path(image_path).name,
        )
    return json.dumps(_summarize_detection_result(result), ensure_ascii=False)


@tool
def detect_batch_images(image_paths: list[str], conf: float = 0.25, iou: float = 0.45) -> str:
    """Detect objects in multiple local image paths and summarize totals and class distribution."""
    result = detection_service.detect_batch(image_paths, conf=conf, iou=iou)
    user_id = current_user_id.get()
    if user_id and "error" not in result:
        result["db_task_id"] = detection_service.save_detection_result(
            user_id=user_id,
            task_type="batch",
            result=result,
            conf=conf,
            iou=iou,
            task_name="agent batch detection",
        )
    return json.dumps(_summarize_detection_result(result), ensure_ascii=False)


@tool
def detect_zip_images(zip_path: str, conf: float = 0.25, iou: float = 0.45) -> str:
    """Extract a ZIP file and detect all supported images inside it."""
    result = detection_service.detect_zip(zip_path, conf=conf, iou=iou)
    user_id = current_user_id.get()
    if user_id and "error" not in result:
        result["db_task_id"] = detection_service.save_detection_result(
            user_id=user_id,
            task_type="zip",
            result=result,
            conf=conf,
            iou=iou,
            task_name=Path(zip_path).name,
        )
    return json.dumps(_summarize_detection_result(result), ensure_ascii=False)


@tool
def detect_video_file(video_path: str, conf: float = 0.25, iou: float = 0.45, sample_interval: int = 5) -> str:
    """Detect objects in a local video file using sampled frames."""
    user_id = current_user_id.get()
    db_task_id = None
    if user_id:
        db_task_id = detection_service.create_detection_task(
            user_id=user_id,
            task_type="video",
            conf=conf,
            iou=iou,
            task_name=Path(video_path).name,
            source_type="video",
        )
    result = detection_service.detect_video(
        video_path,
        task_id=Path(video_path).stem,
        conf=conf,
        iou=iou,
        sample_interval=sample_interval,
        db_task_id=db_task_id,
    )
    if "error" in result:
        detection_service.mark_detection_task_failed(db_task_id, result["error"])
    return json.dumps(_summarize_detection_result(result), ensure_ascii=False)


@tool
def search_knowledge_base(query: str) -> str:
    """Search the local RAG knowledge base for YOLO, IoU, remote sensing and evaluation questions."""
    items = knowledge_retriever.search(query, top_k=settings.RAG_TOP_K)
    return json.dumps({"items": items}, ensure_ascii=False)


@tool
def query_detection_statistics(days: int = 30) -> str:
    """Query dashboard statistics for the current user, including task, image and object counts."""
    user_id = _require_user_id()
    return json.dumps(dashboard_service.get_statistics(user_id=user_id, days=days), ensure_ascii=False)


@tool
def query_recent_history(limit: int = 5) -> str:
    """Query the current user's recent detection history records."""
    user_id = _require_user_id()
    result = history_service.list_tasks(user_id=user_id, page=1, page_size=max(1, min(limit, 20)))
    return json.dumps(result, ensure_ascii=False, default=str)


@tool
def query_users(keyword: str = "") -> str:
    """Query platform users by keyword. Useful when the user asks about registered users or admins."""
    db = SessionLocal()
    try:
        result = user_service.list_users(db, page=1, page_size=20, keyword=keyword or None)
        return json.dumps(result, ensure_ascii=False, default=str)
    finally:
        db.close()


class DetectionAgent:
    """Day11 agent wrapper for streaming chat responses."""

    def __init__(self) -> None:
        self.tools = [
            detect_single_image,
            detect_batch_images,
            detect_zip_images,
            detect_video_file,
            search_knowledge_base,
            query_detection_statistics,
            query_recent_history,
            query_users,
        ]
        self._executor = None

    def _get_executor(self):
        provider = settings.LLM_PROVIDER.lower()
        provider_config = _provider_config(provider)
        api_key = provider_config["api_key"]
        model_name = provider_config["model"]
        base_url = provider_config["base_url"]

        if not api_key:
            return None
        if self._executor is not None:
            return self._executor

        try:
            from langchain.agents import AgentExecutor, create_openai_tools_agent
            from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
            from langchain_openai import ChatOpenAI
        except Exception as exc:
            logger.warning("LangChain Agent dependencies unavailable: %s", exc)
            return None

        llm = ChatOpenAI(
            api_key=api_key,
            model=model_name,
            base_url=base_url,
            temperature=0.2,
            streaming=False,
        )
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("human", "{input}"),
                MessagesPlaceholder("agent_scratchpad"),
            ]
        )
        agent = create_openai_tools_agent(llm, self.tools, prompt)
        self._executor = AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=False,
            max_iterations=6,
            handle_parsing_errors=True,
        )
        return self._executor

    async def stream_chat(
        self,
        message: str,
        image_paths: list[str] | None = None,
        session_id: str = "default",
        user_id: int | None = None,
    ) -> AsyncGenerator[dict, None]:
        token = current_user_id.set(user_id)
        try:
            history = conversation_memory.get_messages(session_id)
            conversation_memory.append(session_id, "user", message)
            yield {"type": "thinking", "content": "正在理解你的问题，并检查是否需要调用工具..."}

            direct = await self._try_direct_tool_flow(message, image_paths or [], user_id)
            if direct:
                for event in direct:
                    yield event
                final_text = direct[-1].get("content", "") if direct else ""
                if final_text:
                    conversation_memory.append(session_id, "assistant", final_text)
                yield {"type": "done"}
                return

            knowledge_context = _format_knowledge_context(knowledge_retriever.search(message, top_k=2))
            context = build_context_prompt(history, knowledge_context)
            enriched_message = f"{context}\n\n当前用户问题：{message}" if context else message

            executor = self._get_executor()
            if executor is None:
                output = _fallback_answer(message, knowledge_context)
            else:
                try:
                    yield {"type": "thinking", "content": "正在调用大模型组织回答..."}
                    result = await executor.ainvoke({"input": enriched_message})
                    output = result.get("output", "")
                except Exception as exc:
                    logger.error("Agent chat failed: %s", exc, exc_info=True)
                    yield {"type": "error", "content": f"Agent 调用失败：{exc}"}
                    return

            for chunk in _chunk_text(output):
                yield {"type": "token", "content": chunk}
            conversation_memory.append(session_id, "assistant", output)
            yield {"type": "done"}
        finally:
            current_user_id.reset(token)

    async def _try_direct_tool_flow(
        self,
        message: str,
        image_paths: list[str],
        user_id: int | None,
    ) -> list[dict] | None:
        lowered = message.lower()
        if image_paths:
            tool_name = _detect_tool_name(image_paths)
            yield_events = [_tool_start(tool_name, "正在调用检测工具...")]
            try:
                if tool_name == "detect_video_file":
                    raw = detect_video_file.invoke({"video_path": image_paths[0]})
                elif tool_name == "detect_zip_images":
                    raw = detect_zip_images.invoke({"zip_path": image_paths[0]})
                elif len(image_paths) == 1:
                    raw = detect_single_image.invoke({"image_path": image_paths[0]})
                else:
                    raw = detect_batch_images.invoke({"image_paths": image_paths})
                summary = json.loads(raw)
                text = _format_detection_text(summary)
                yield_events.append(_tool_result(tool_name, text, summary))
                yield_events.extend({"type": "token", "content": chunk} for chunk in _chunk_text(text))
                return yield_events
            except Exception as exc:
                return [{"type": "error", "content": f"检测工具调用失败：{exc}"}]

        if _looks_like_stats_question(lowered):
            yield_events = [_tool_start("query_detection_statistics", "正在查询检测统计...")]
            raw = query_detection_statistics.invoke({"days": 30})
            data = json.loads(raw)
            text = (
                f"近 30 天共有 {data.get('total_tasks', 0)} 个检测任务，"
                f"处理 {data.get('total_images', 0)} 张图片，"
                f"检测到 {data.get('total_objects', 0)} 个目标，"
                f"平均推理耗时 {data.get('avg_inference_time', 0)} ms。"
            )
            yield_events.append(_tool_result("query_detection_statistics", text, data))
            yield_events.extend({"type": "token", "content": chunk} for chunk in _chunk_text(text))
            return yield_events

        if _looks_like_history_question(lowered):
            yield_events = [_tool_start("query_recent_history", "正在查询最近检测历史...")]
            raw = query_recent_history.invoke({"limit": 5})
            data = json.loads(raw)
            items = data.get("items", [])
            lines = [f"最近共有 {data.get('total', 0)} 条检测记录，最新 {len(items)} 条如下："]
            for item in items:
                lines.append(
                    f"- #{item.get('id')} {item.get('task_type')} / {item.get('status')} / 目标 {item.get('total_objects', 0)}"
                )
            text = "\n".join(lines)
            yield_events.append(_tool_result("query_recent_history", text, data))
            yield_events.extend({"type": "token", "content": chunk} for chunk in _chunk_text(text))
            return yield_events

        if _looks_like_user_question(lowered):
            yield_events = [_tool_start("query_users", "正在查询用户信息...")]
            raw = query_users.invoke({"keyword": ""})
            data = json.loads(raw)
            items = data.get("items", [])
            text = "当前用户列表：\n" + "\n".join(
                f"- {item.get('username')} ({item.get('email')}) 角色：{', '.join(item.get('roles') or []) or '无'}"
                for item in items[:10]
            )
            yield_events.append(_tool_result("query_users", text, data))
            yield_events.extend({"type": "token", "content": chunk} for chunk in _chunk_text(text))
            return yield_events

        if _looks_like_knowledge_question(lowered):
            yield_events = [_tool_start("search_knowledge_base", "正在检索本地知识库...")]
            raw = search_knowledge_base.invoke({"query": message})
            data = json.loads(raw)
            context = _format_knowledge_context(data.get("items", []))
            text = _fallback_answer(message, context)
            yield_events.append(_tool_result("search_knowledge_base", "已找到相关知识片段", data))
            yield_events.extend({"type": "token", "content": chunk} for chunk in _chunk_text(text))
            return yield_events

        return None


def _require_user_id() -> int:
    user_id = current_user_id.get()
    if not user_id:
        raise RuntimeError("missing current user")
    return user_id


def _provider_config(provider: str) -> dict:
    configs = {
        "openai": {
            "api_key": settings.OPENAI_API_KEY,
            "model": settings.OPENAI_MODEL,
            "base_url": settings.OPENAI_BASE_URL,
        },
        "qwen": {
            "api_key": settings.QWEN_API_KEY,
            "model": settings.QWEN_MODEL,
            "base_url": settings.QWEN_BASE_URL,
        },
        "gemini": {
            "api_key": settings.GEMINI_API_KEY,
            "model": settings.GEMINI_MODEL,
            "base_url": settings.GEMINI_BASE_URL,
        },
    }
    return configs.get(provider, configs["openai"])


def _tool_start(tool_name: str, message: str) -> dict:
    return {
        "type": "tool_start",
        "tool": tool_name,
        "message": message,
        "content": message,
    }


def _tool_result(tool_name: str, message: str, result: dict) -> dict:
    return {
        "type": "tool_result",
        "tool": tool_name,
        "message": message,
        "content": message,
        "result": result,
    }


def _detect_tool_name(paths: list[str]) -> str:
    suffix = Path(paths[0]).suffix.lower() if paths else ""
    if suffix == ".zip":
        return "detect_zip_images"
    if suffix in {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv"}:
        return "detect_video_file"
    if len(paths) > 1:
        return "detect_batch_images"
    return "detect_single_image"


def _looks_like_stats_question(text: str) -> bool:
    return any(word in text for word in ["统计", "看板", "多少次", "检测了多少", "任务数", "目标数"])


def _looks_like_history_question(text: str) -> bool:
    return any(word in text for word in ["历史", "记录", "最近检测", "检测记录"])


def _looks_like_user_question(text: str) -> bool:
    return any(word in text for word in ["用户", "管理员", "账号", "人员"])


def _looks_like_knowledge_question(text: str) -> bool:
    return any(word in text for word in ["iou", "yolo", "map", "precision", "recall", "遥感", "知识库", "什么是"])


def _format_knowledge_context(items: list[dict]) -> str:
    if not items:
        return ""
    return "\n\n".join(
        f"来源：{item.get('source')}#{item.get('chunk_id')}\n{item.get('content')}"
        for item in items
    )


def _fallback_answer(message: str, knowledge_context: str) -> str:
    if knowledge_context:
        return f"???????????????\n\n{knowledge_context}"
    return (
        f"{PROJECT_INTRO.strip()}\n\n"
        "???????????????????????????????????????IoU ? YOLO ?????"
        "???????? YOLO ????????????????????????"
    )


def _format_detection_text(summary: dict) -> str:
    if "error" in summary:
        return f"检测失败：{summary['error']}"
    counts = summary.get("class_counts") or {}
    class_text = "，".join(f"{name} x {count}" for name, count in counts.items()) or "暂无类别统计"
    return f"检测完成，共发现 {summary.get('total_objects', 0)} 个目标。类别分布：{class_text}。"


def _summarize_detection_result(result: dict) -> dict:
    if "error" in result:
        return result
    summary = {
        "total_objects": result.get("total_objects"),
        "class_counts": result.get("class_counts"),
        "inference_time": result.get("inference_time"),
        "db_task_id": result.get("db_task_id"),
    }
    if "total_images" in result:
        summary["total_images"] = result.get("total_images")
    if "filename" in result:
        summary["filename"] = Path(str(result.get("filename"))).name
    if "total_frames" in result:
        summary["total_frames"] = result.get("total_frames")
        summary["sampled_frames"] = result.get("sampled_frames")
        summary["media_note"] = "视频结果已由后端保存，LLM 摘要不包含媒体 URL。"
    return summary


def _chunk_text(text: str, size: int = 18):
    for index in range(0, len(text), size):
        yield text[index : index + size]


detection_agent = DetectionAgent()
