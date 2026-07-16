"""Report agent for rain/fog traffic management suggestions."""

from __future__ import annotations

import json


def generate_report(result: dict, visibility: dict, traffic: dict, risk: dict) -> str:
    """Generate a deterministic report without requiring an LLM API key."""
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
        "雨雾低光交通风险分析报告",
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
    lines.append("说明：本报告基于视频/图像视觉特征和 YOLO 检测结果生成，用于交通管理辅助研判。")
    return "\n".join(lines)


def build_llm_report_payload(result: dict, visibility: dict, traffic: dict, risk: dict) -> dict:
    """Build a compact metrics-only payload for a future LLM report step.

    This intentionally excludes raw images, base64 strings, frame snapshots,
    annotated video URLs and per-frame media. The LLM should only polish the
    warning reason and management advice from structured CV/YOLO metrics.
    """
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
            "total_objects": result.get("total_objects"),
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
            "reasons": risk.get("reasons", []),
            "suggestions": risk.get("suggestions", []),
        },
    }


def build_llm_report_prompt(result: dict, visibility: dict, traffic: dict, risk: dict) -> str:
    """Create a prompt from metrics only; never attach raw media to the LLM."""
    payload = build_llm_report_payload(result, visibility, traffic, risk)
    return (
        "请只根据以下结构化视觉指标和 YOLO 统计，生成雨雾交通管理预警原因与建议。"
        "不要假设真实天气，只能说画面呈现的低能见度/低光/交通风险特征。"
        f"\n\n{json.dumps(payload, ensure_ascii=False, separators=(',', ':'))}"
    )


# Optional LLM version:
# If you later configure OPENAI_API_KEY or QWEN_API_KEY, you can replace the
# deterministic report above with an LLM-polished report. Use
# build_llm_report_prompt(...) so the model receives metrics only, not raw
# images, video frames, base64 strings or media URLs.
#
# from langchain_openai import ChatOpenAI
# from app.config.settings import settings
#
# def generate_report_with_llm(result: dict, visibility: dict, traffic: dict, risk: dict) -> str:
#     provider = settings.LLM_PROVIDER.lower()
#     api_key = settings.QWEN_API_KEY if provider == "qwen" else settings.OPENAI_API_KEY
#     model_name = settings.QWEN_MODEL if provider == "qwen" else settings.OPENAI_MODEL
#     base_url = settings.QWEN_BASE_URL if provider == "qwen" else settings.OPENAI_BASE_URL
#     llm = ChatOpenAI(api_key=api_key, model=model_name, base_url=base_url, temperature=0.2)
#     prompt = build_llm_report_prompt(result, visibility, traffic, risk)
#     return llm.invoke(prompt).content


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
