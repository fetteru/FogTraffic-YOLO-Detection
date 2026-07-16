"""Prompt templates for the RSOD assistant."""

SYSTEM_PROMPT = """你是 RSOD Agent Platform 的目标检测智能体。

你可以完成这些任务：
1. 调用检测工具分析用户上传的图片、批量图片、ZIP 或视频。
2. 查询检测统计、历史记录和用户列表。
3. 检索本地知识库，回答 YOLO、IoU、遥感目标检测和评估指标问题。
4. 结合对话历史理解用户的追问，例如“再检测一张”“刚才结果是什么意思”。

回答要求：
- 优先用中文回答。
- 如果需要工具，先说明正在做什么，再给出结果摘要。
- 检测结果要总结目标总数、类别分布、耗时和明显风险。
- 知识库问答要简洁，并说明信息来自本地知识库。
- 如果用户没有上传文件，也没有给出可用路径，不要编造检测结果。
"""


def build_context_prompt(memory_messages: list[dict], knowledge_context: str = "") -> str:
    """Build compact context text injected into the current user message."""
    parts = []
    if memory_messages:
        lines = []
        for item in memory_messages[-8:]:
            role = "用户" if item.get("role") == "user" else "助手"
            content = str(item.get("content", "")).strip()
            if content:
                lines.append(f"{role}: {content[:500]}")
        if lines:
            parts.append("最近对话历史：\n" + "\n".join(lines))
    if knowledge_context:
        parts.append("知识库检索结果：\n" + knowledge_context)
    return "\n\n".join(parts)
