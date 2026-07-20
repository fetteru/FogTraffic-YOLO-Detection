"""Multi-tool detection agent with memory and lightweight RAG."""

from __future__ import annotations

import asyncio
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
        self._chat_llm = None

    def _get_chat_llm(self):
        provider = settings.LLM_PROVIDER.lower()
        provider_config = _provider_config(provider)
        api_key = provider_config["api_key"]

        if not api_key:
            return None
        if self._chat_llm is not None:
            return self._chat_llm

        try:
            from langchain_openai import ChatOpenAI
        except Exception as exc:
            logger.warning("Chat LLM dependency unavailable: %s", exc)
            return None

        self._chat_llm = ChatOpenAI(
            api_key=api_key,
            model=provider_config["model"],
            base_url=provider_config["base_url"],
            temperature=0.35,
            streaming=False,
            timeout=30,
        )
        return self._chat_llm

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
                final_text = "".join(event.get("content", "") for event in direct if event.get("type") == "token")
                if final_text:
                    conversation_memory.append(session_id, "assistant", final_text)
                yield {"type": "done"}
                return

            knowledge_context = _format_knowledge_context(knowledge_retriever.search(message, top_k=2))
            context = build_context_prompt(history, knowledge_context)
            enriched_message = f"{context}\n\n当前用户问题：{message}" if context else message

            llm = self._get_chat_llm()
            if llm is None:
                output = _fallback_answer(message, knowledge_context)
            else:
                try:
                    yield {"type": "thinking", "content": "正在调用大模型组织回答..."}
                    response = await llm.ainvoke(enriched_message)
                    output = str(getattr(response, "content", response) or "").strip()
                    if not output:
                        output = _fallback_answer(message, knowledge_context)
                except Exception as exc:
                    logger.error("Agent chat failed: %s", exc, exc_info=True)
                    yield {"type": "thinking", "content": "大模型回答失败，已切换为本地项目助手回复。"}
                    output = _fallback_answer(message, knowledge_context)

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
        tasks = _plan_agent_tasks(lowered, image_paths)
        if not tasks:
            return None

        route = ",".join(tasks)
        yield_events = [
            _agent_event("supervisor", "done", "Supervisor", f"路由决策：{route}", {"tasks": tasks})
        ]
        if len(tasks) > 1:
            yield_events.append(
                _agent_event("parallel", "running", "Parallel Executor", "正在并行调度专业智能体", {"tasks": tasks})
            )

        try:
            running = []
            if "detection" in tasks:
                tool_name = _detect_tool_name(image_paths)
                yield_events.append(_agent_event("detection", "running", "Detection Agent", "正在调用 YOLO 检测工具", {"tool": tool_name}))
                yield_events.append(_tool_start(tool_name, "正在调用 YOLO 检测工具..."))
                running.append(("detection", asyncio.to_thread(_run_detection_tool, image_paths)))
            if "analysis" in tasks:
                yield_events.append(_agent_event("analysis", "running", "Analysis Agent", "正在查询检测统计或历史记录", {}))
                running.append(("analysis", asyncio.to_thread(_run_analysis_tool, lowered)))
            if "qa" in tasks:
                yield_events.append(_agent_event("qa", "running", "QA Agent", "正在检索本地 RAG 知识库", {}))
                yield_events.append(_tool_start("search_knowledge_base", "正在检索本地知识库..."))
                running.append(("qa", asyncio.to_thread(_run_qa_tool, message)))

            gathered = await asyncio.gather(*(item[1] for item in running), return_exceptions=True)
            results = {}
            for (name, _), result in zip(running, gathered):
                if isinstance(result, Exception):
                    results[name] = {"error": str(result), "text": f"{name} Agent 执行失败：{result}"}
                    yield_events.append(_agent_event(name, "error", _agent_title(name), str(result), {}))
                    continue
                results[name] = result
                yield_events.append(_agent_event(name, "done", _agent_title(name), result.get("text", "执行完成"), result.get("data", {})))
                if name == "detection":
                    yield_events.append(_tool_result(result.get("tool", "detect_single_image"), result["text"], result.get("data", {})))
                elif name == "qa":
                    yield_events.append(_tool_result("search_knowledge_base", "已找到相关知识片段", result.get("data", {})))

            if len(tasks) > 1:
                yield_events.append(_agent_event("parallel", "done", "Parallel Executor", "并行任务已完成", {"tasks": tasks}))
            final_text = _summarize_multi_agent_results(message, tasks, results)
            yield_events.append(_agent_event("summarize", "done", "Supervisor Summarize", "已整合检测、分析和知识结果", {"has_knowledge": "qa" in results}))
            yield_events.extend({"type": "token", "content": chunk} for chunk in _chunk_text(final_text))
            return yield_events
        except Exception as exc:
            logger.error("Multi-agent direct flow failed: %s", exc, exc_info=True)
            return [{"type": "error", "content": f"多智能体调用失败：{exc}"}]


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


def _agent_event(node: str, status: str, title: str, detail: str, data: dict | None = None) -> dict:
    return {
        "type": "multi_agent",
        "node": node,
        "status": status,
        "title": title,
        "detail": detail,
        "data": data or {},
    }


def _agent_title(name: str) -> str:
    return {
        "detection": "Detection Agent",
        "analysis": "Analysis Agent",
        "qa": "QA Agent",
        "parallel": "Parallel Executor",
        "summarize": "Supervisor Summarize",
    }.get(name, name)


def _plan_agent_tasks(lowered_message: str, image_paths: list[str]) -> list[str]:
    tasks: list[str] = []
    if image_paths:
        tasks.append("detection")
    wants_platform_analysis = (
        _looks_like_history_question(lowered_message)
        or _looks_like_user_question(lowered_message)
        or (
            _looks_like_stats_question(lowered_message)
            and not (image_paths and _looks_like_detection_count_question(lowered_message))
        )
    )
    if wants_platform_analysis:
        tasks.append("analysis")
    if _looks_like_knowledge_question(lowered_message):
        tasks.append("qa")
    return tasks


def _run_detection_tool(image_paths: list[str]) -> dict:
    tool_name = _detect_tool_name(image_paths)
    if tool_name == "detect_video_file":
        raw = detect_video_file.invoke({"video_path": image_paths[0]})
    elif tool_name == "detect_zip_images":
        raw = detect_zip_images.invoke({"zip_path": image_paths[0]})
    elif len(image_paths) == 1:
        raw = detect_single_image.invoke({"image_path": image_paths[0]})
    else:
        raw = detect_batch_images.invoke({"image_paths": image_paths})
    data = json.loads(raw)
    return {
        "tool": tool_name,
        "data": data,
        "text": _format_detection_text(data),
    }


def _run_qa_tool(message: str) -> dict:
    raw = search_knowledge_base.invoke({"query": message})
    data = json.loads(raw)
    context = _format_knowledge_context(data.get("items", []))
    return {
        "data": data,
        "context": context,
        "text": "已检索到相关知识片段" if context else "知识库中暂未找到高相关内容",
    }


def _run_analysis_tool(lowered_message: str) -> dict:
    if _looks_like_history_question(lowered_message):
        raw = query_recent_history.invoke({"limit": 5})
        data = json.loads(raw)
        items = data.get("items", [])
        lines = [f"最近共有 {data.get('total', 0)} 条检测记录，最新 {len(items)} 条如下："]
        for item in items:
            lines.append(
                f"- #{item.get('id')} {item.get('task_type')} / {item.get('status')} / 目标 {item.get('total_objects', 0)}"
            )
        return {"tool": "query_recent_history", "data": data, "text": "\n".join(lines)}

    if _looks_like_user_question(lowered_message):
        raw = query_users.invoke({"keyword": ""})
        data = json.loads(raw)
        items = data.get("items", [])
        text = "当前用户列表：\n" + "\n".join(
            f"- {item.get('username')} ({item.get('email')}) 角色：{', '.join(item.get('roles') or []) or '无'}"
            for item in items[:10]
        )
        return {"tool": "query_users", "data": data, "text": text}

    raw = query_detection_statistics.invoke({"days": 30})
    data = json.loads(raw)
    text = (
        f"近 30 天共有 {data.get('total_tasks', 0)} 个检测任务，"
        f"处理 {data.get('total_images', 0)} 张图片，"
        f"检测到 {data.get('total_objects', 0)} 个目标，"
        f"平均推理耗时 {data.get('avg_inference_time', 0)} ms。"
    )
    return {"tool": "query_detection_statistics", "data": data, "text": text}


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


def _looks_like_detection_count_question(text: str) -> bool:
    return any(
        word in text
        for word in [
            "多少辆",
            "多少车",
            "车辆数量",
            "车数量",
            "火车数量",
            "汽车数量",
            "卡车数量",
            "大车数量",
            "目标数量",
            "几个目标",
            "多少个目标",
            "有多少",
        ]
    )


def _looks_like_history_question(text: str) -> bool:
    return any(word in text for word in ["历史", "记录", "最近检测", "检测记录"])


def _looks_like_user_question(text: str) -> bool:
    normalized = text.replace("当前用户问题", "")
    return any(
        word in normalized
        for word in [
            "用户列表",
            "注册用户",
            "平台用户",
            "有哪些用户",
            "所有用户",
            "查询用户",
            "用户管理",
            "账号列表",
            "账户列表",
            "管理员账号",
            "人员列表",
        ]
    )


def _looks_like_knowledge_question(text: str) -> bool:
    return any(
        word in text
        for word in [
            "iou",
            "yolo",
            "map",
            "precision",
            "recall",
            "nms",
            "rag",
            "遥感",
            "知识库",
            "什么是",
            "预警",
            "雨雾",
            "可见度",
            "大车",
            "卡车",
            "公交车",
            "视频检测",
            "摄像头",
            "去重",
            "重复统计",
            "多智能体",
            "agent",
            "工作流",
        ]
    )


def _format_knowledge_context(items: list[dict]) -> str:
    if not items:
        return ""
    return "\n\n".join(
        f"来源：{item.get('source')}#{item.get('chunk_id')} "
        f"({item.get('header_context') or item.get('title') or '知识片段'}，相似度 {item.get('similarity', item.get('score', 0))})\n"
        f"{item.get('content')}"
        for item in items
    )


def _fallback_answer(message: str, knowledge_context: str) -> str:
    if knowledge_context:
        return f"我检索到的相关知识如下，可结合你的问题参考：\n\n{knowledge_context}"
    return (
        f"{PROJECT_INTRO.strip()}\n\n"
        "我可以帮你做交通目标检测、解释 YOLO/IoU/mAP 等指标、查询历史检测统计，"
        "也可以根据结构化检测结果分析雨雾低能见度交通风险。"
    )


def _summarize_multi_agent_results(message: str, tasks: list[str], results: dict) -> str:
    parts: list[str] = []
    lowered = message.lower()

    detection = results.get("detection") or {}
    if detection:
        parts.append(detection.get("text") or "检测任务已完成。")
        data = detection.get("data") or {}
        specific_count = _specific_class_count_answer(lowered, data)
        if specific_count:
            parts.append(specific_count)
        elif _looks_like_detection_count_question(lowered):
            vehicle_count = _vehicle_count_from_summary(data)
            parts.append(f"按当前类别统计，这次检测到的车辆相关目标约为 {vehicle_count} 个。")

    analysis = results.get("analysis") or {}
    if analysis and _should_include_analysis_text(lowered, detection, analysis):
        parts.append(analysis.get("text") or "分析任务已完成。")

    qa = results.get("qa") or {}
    if qa:
        context = qa.get("context") or ""
        if context:
            parts.append(_fallback_answer(message, context))
        elif "iou" in message.lower():
            parts.append(
                "IoU 是 Intersection over Union，中文通常叫交并比，用来衡量预测框和真实框的重叠程度。"
                "IoU = 交集面积 / 并集面积，数值越高说明框得越准；在目标检测中常用于判断预测是否命中，以及配合 NMS 过滤重复框。"
            )

    if not parts:
        parts.append(_fallback_answer(message, ""))

    if len(tasks) > 1:
        parts.insert(0, "多智能体并行处理完成：")
    return "\n\n".join(parts)


def _format_detection_followup_answer(message: str, detection_text: str, summary: dict) -> str:
    parts = [detection_text]
    lowered = message.lower()
    if _looks_like_knowledge_question(lowered):
        context = _format_knowledge_context(knowledge_retriever.search(message, top_k=2))
        if context:
            parts.append(_fallback_answer(message, context))
        elif "iou" in lowered:
            parts.append(
                "IoU 是 Intersection over Union，表示预测框和真实框的重叠程度。"
                "它等于两个框交集面积除以并集面积，数值越高说明框得越准；"
                "在检测里，IoU 阈值常用于判断预测框是否算命中，以及过滤重复框。"
            )
    specific_count = _specific_class_count_answer(lowered, summary)
    if specific_count:
        parts.append(specific_count)
    elif _looks_like_detection_count_question(lowered):
        vehicle_count = _vehicle_count_from_summary(summary)
        parts.append(f"按当前类别统计，这次检测到的车辆相关目标约为 {vehicle_count} 个。")
    return "\n\n".join(part for part in parts if part)


def _should_include_analysis_text(lowered_message: str, detection: dict, analysis: dict) -> bool:
    if not detection:
        return True
    tool_name = analysis.get("tool")
    if tool_name == "query_users":
        return _looks_like_user_question(lowered_message)
    if tool_name == "query_detection_statistics" and _looks_like_detection_count_question(lowered_message):
        return False
    return True


def _specific_class_count_answer(message: str, summary: dict) -> str:
    if not _looks_like_detection_count_question(message):
        return ""

    counts = summary.get("class_counts") or {}
    normalized_counts = {str(name).lower(): int(count) for name, count in counts.items()}
    targets = [
        ("火车", "train", ["火车", "train"]),
        ("卡车", "truck", ["卡车", "货车", "truck"]),
        ("公交车", "bus", ["公交", "公交车", "大巴", "bus"]),
        ("汽车", "car", ["汽车", "小车", "轿车", "car"]),
        ("摩托车", "motorcycle", ["摩托", "摩托车", "motorcycle", "motorbike"]),
    ]
    for label, class_name, keywords in targets:
        if any(keyword in message for keyword in keywords):
            count = normalized_counts.get(class_name, 0)
            if count:
                return f"按模型类别统计，这次检测到的{label}数量为 {count} 个。"
            detected = "，".join(f"{name} x {count}" for name, count in counts.items()) or "暂无类别统计"
            if class_name == "train":
                return f"当前检测结果里没有 train/火车类别；模型这次识别到的是：{detected}。如果你说的是画面中的道路车辆总数，可按车辆相关目标约 {_vehicle_count_from_summary(summary)} 个参考。"
            return f"当前检测结果里没有{label}类别；已识别类别为：{detected}。"
    return ""


def _vehicle_count_from_summary(summary: dict) -> int:
    counts = summary.get("class_counts") or {}
    return sum(
        int(count)
        for name, count in counts.items()
        if str(name).lower() in {"car", "truck", "bus", "motorcycle", "motorbike", "bicycle", "van", "suv", "vehicle"}
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
