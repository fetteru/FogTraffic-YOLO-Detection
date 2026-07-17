"""Report agent for rain/fog traffic management suggestions."""

from __future__ import annotations

import json

from app.config.settings import settings
from app.core.logger import get_logger


logger = get_logger(__name__)


def generate_report(result: dict, visibility: dict, traffic: dict, risk: dict) -> str:
    """Generate traffic warning reasons and suggestions.

    The first choice is an LLM report built only from structured YOLO/CV
    metrics. Raw media, base64, frame images, video URLs and bounding boxes are
    never sent to the model. If the LLM is not configured or fails, the function
    falls back to a deterministic local report so detection still works.
    """
    llm_report = generate_report_with_llm(result, visibility, traffic, risk)
    if llm_report:
        return llm_report
    return generate_template_report(result, visibility, traffic, risk)


def generate_template_report(result: dict, visibility: dict, traffic: dict, risk: dict) -> str:
    """Generate a deterministic fallback report without requiring an LLM key."""
    is_video = bool(result.get("video_url") or result.get("annotated_video_url") or result.get("sampled_frames"))
    class_counts = _format_counts(
        result.get("unique_class_counts")
        or traffic.get("unique_class_counts")
        or result.get("class_counts")
        or traffic.get("class_counts")
        or {}
    )
    avg_conf = visibility.get("avg_confidence")
    avg_conf_text = f"{avg_conf:.2f}" if isinstance(avg_conf, (int, float)) else "暂无目标置信度"
    unique_vehicle = traffic.get("unique_vehicle_count")
    unique_text = (
        f"估算唯一车辆 {unique_vehicle} 辆"
        if unique_vehicle is not None
        else "当前统计为检测次数，未完全去重"
    )

    lines = [
        "规则回退报告（Gemini 未启用或调用失败）",
        "",
        _summary_line(is_video, result, class_counts),
        f"交通统计：车辆数 {traffic.get('vehicle_count', 0)}，{unique_text}，"
        f"行人/非机动车等脆弱交通参与者 {traffic.get('vulnerable_road_user_count', 0)} 个，"
        f"大型车辆 {traffic.get('large_vehicle_count', 0)} 个。",
        f"可见性评估：{_visibility_label(visibility.get('visibility_risk'))}，"
        f"画面质量类型为 {visibility.get('scene_quality', 'unknown')}，平均置信度 {avg_conf_text}。",
        f"综合风险等级：{risk.get('risk_level', 0)}级（{risk.get('risk_name', '正常')}）。",
        "",
        "预警原因：",
    ]
    lines.extend(f"{idx}. {reason}" for idx, reason in enumerate(risk.get("reasons", []), 1))
    lines.append("")
    lines.append("管理建议：")
    lines.extend(f"{idx}. {item}" for idx, item in enumerate(risk.get("suggestions", []), 1))
    lines.append("")
    lines.append("说明：本报告基于结构化视觉特征和 YOLO 检测统计生成，用于交通管理辅助研判。")
    return "\n".join(lines)


def generate_report_with_llm(result: dict, visibility: dict, traffic: dict, risk: dict) -> str | None:
    """Use the configured LLM to write warning reasons and advice from metrics only."""
    config = _provider_config()
    if not config["api_key"]:
        return None
    try:
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(
            api_key=config["api_key"],
            model=config["model"],
            base_url=config["base_url"],
            temperature=0.35,
            timeout=20,
        )
        prompt = build_llm_report_prompt(result, visibility, traffic, risk)
        response = llm.invoke(prompt)
        content = getattr(response, "content", response)
        text = str(content or "").strip()
        if not text:
            return None
        return _normalize_llm_report(text)
    except Exception as exc:
        logger.warning("LLM report generation failed: %s", exc)
        return None


def build_llm_report_payload(result: dict, visibility: dict, traffic: dict, risk: dict) -> dict:
    """Build a compact metrics-only payload for the LLM report step."""
    class_counts = (
        result.get("unique_class_counts")
        or traffic.get("unique_class_counts")
        or result.get("class_counts")
        or traffic.get("class_counts")
        or {}
    )
    return {
        "task": "rain_fog_traffic_warning",
        "media_type": "video" if result.get("sampled_frames") or result.get("video_url") else "image",
        "detection": {
            "filename": result.get("filename"),
            "sampled_frames": result.get("sampled_frames"),
            "total_detection_boxes": result.get("total_objects"),
            "class_counts": class_counts,
            "unique_vehicle_count": result.get("unique_vehicle_count") or traffic.get("unique_vehicle_count"),
            "sampled_vehicle_instances": traffic.get("sampled_vehicle_instances"),
        },
        "visibility": {
            "brightness": visibility.get("brightness"),
            "contrast": visibility.get("contrast"),
            "sharpness": visibility.get("sharpness"),
            "avg_confidence": visibility.get("avg_confidence"),
            "low_confidence_ratio": visibility.get("low_confidence_ratio"),
            "visibility_risk": visibility.get("visibility_risk"),
            "visibility_score": visibility.get("visibility_score"),
            "scene_quality": visibility.get("scene_quality"),
            "evidence": visibility.get("evidence", []),
        },
        "traffic": {
            "vehicle_count": traffic.get("vehicle_count"),
            "traffic_count_for_risk": traffic.get("traffic_count_for_risk"),
            "density_level": traffic.get("density_level"),
            "density_score": traffic.get("density_score"),
            "large_vehicle_count": traffic.get("large_vehicle_count"),
            "large_vehicle_ratio": traffic.get("large_vehicle_ratio"),
            "vulnerable_road_user_count": traffic.get("vulnerable_road_user_count"),
            "counting_note": traffic.get("counting_note"),
        },
        "risk": {
            "risk_level": risk.get("risk_level"),
            "risk_name": risk.get("risk_name"),
            "risk_score": risk.get("risk_score"),
            "alert_required": risk.get("alert_required"),
            "rule_reasons": risk.get("reasons", []),
            "rule_suggestions": risk.get("suggestions", []),
        },
    }


def build_llm_report_prompt(result: dict, visibility: dict, traffic: dict, risk: dict) -> str:
    """Create a prompt from metrics only; never attach raw media to the LLM."""
    payload = build_llm_report_payload(result, visibility, traffic, risk)
    return (
        "你是 FogTraffic-YOLO-Detection 的交通管理预警分析智能体。"
        "请只根据下面的结构化视觉指标和 YOLO 统计，生成检测结果卡片中展示的预警原因与管理建议。"
        "严禁要求查看或上传原始图片、视频、base64、关键帧、边界框或媒体 URL；你没有看到画面本身，只能分析这些结构化数据。"
        "不要机械复述规则模板，要像交通管理辅助研判报告一样，结合车辆规模、大车占比、能见度/清晰度、置信度和去重说明给出有针对性的解释。"
        "如果证据不足，要明确说这是基于画面指标的辅助判断，不要断言真实天气。"
        "输出必须是中文，格式如下：\n"
        "AI预警研判（Gemini，结构化数据）\n"
        "风险解读：1段，说明为什么是当前等级。\n"
        "预警原因：3到5条编号列表。\n"
        "管理建议：3到5条编号列表，建议要具体，可执行。\n"
        "注意：不要输出 JSON，不要输出 Markdown 表格。\n\n"
        f"结构化数据：{json.dumps(payload, ensure_ascii=False, separators=(',', ':'))}"
    )


def _provider_config() -> dict:
    provider = (settings.LLM_PROVIDER or "openai").lower()
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


def _normalize_llm_report(text: str) -> str:
    text = text.strip()
    if text.startswith("AI预警研判"):
        return text
    return f"AI预警研判（Gemini，结构化数据）\n{text}"


def _format_counts(counts: dict) -> str:
    return "、".join(f"{name}: {count}" for name, count in counts.items())


def _summary_line(is_video: bool, result: dict, class_counts: str) -> str:
    if is_video:
        return (
            f"本次视频共采样检测 {result.get('sampled_frames', 0)} 帧，"
            f"累计检测框次数 {result.get('total_objects', 0)} 次，"
            f"去重类别统计：{class_counts or '暂无目标'}。"
        )
    return f"本次检测共发现 {result.get('total_objects', 0)} 个目标，类别统计：{class_counts or '暂无目标'}。"


def _visibility_label(value: str | None) -> str:
    return {
        "low": "低风险",
        "medium": "中等风险",
        "high": "高风险",
        "unknown": "未知",
    }.get(value or "unknown", value or "未知")
