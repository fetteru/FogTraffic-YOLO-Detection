"""Rain/fog traffic risk assessment agent."""

from __future__ import annotations


def assess_risk(visibility: dict, traffic: dict) -> dict:
    """Assess rain/fog traffic management risk from visibility and traffic statistics."""
    score = 0
    reasons = []

    visibility_score = int(visibility.get("visibility_score") or 0)
    if visibility_score >= 3:
        score += 1
        reasons.append("画面存在较高可见性风险，可能影响远距离目标识别，需要结合车流情况研判")
    elif visibility_score >= 2:
        score += 1
        reasons.append("画面存在中等低光、低对比或低能见度特征，建议按摄像头画面质量持续关注")
    elif visibility_score >= 1:
        reasons.append("画面存在一定低光、低对比或低能见度特征，按摄像头画面质量记录")

    density_score = int(traffic.get("density_score") or 0)
    if density_score >= 3:
        score += 2
        reasons.append("车辆密度较高，雨雾低光环境下需要关注追尾和排队风险")
    elif density_score >= 2:
        score += 1
        reasons.append("车辆密度中等，需要持续关注车流变化")

    if traffic.get("vulnerable_road_user_count", 0) > 0:
        score += 1
        reasons.append("检测到行人、摩托车或非机动车等脆弱交通参与者")

    large_vehicle_count = int(traffic.get("large_vehicle_count") or 0)
    large_vehicle_ratio = float(traffic.get("large_vehicle_ratio") or 0)
    if large_vehicle_count > 0:
        reasons.append("检测到货车、公交车等大型车辆，雨雾条件下需关注制动距离")
    if density_score >= 2 and (large_vehicle_count >= 6 or large_vehicle_ratio >= 0.35):
        score += 1
        reasons.append("大型车辆占比较高且车流不低，建议提高关注等级")

    avg_confidence = visibility.get("avg_confidence")
    if avg_confidence is not None and avg_confidence < 0.45:
        score += 1
        reasons.append("目标平均置信度明显偏低，建议人工复核关键目标")

    if not reasons:
        reasons.append("当前可见性和交通密度均未触发明显风险规则")

    level = _risk_level(score, visibility_score, density_score)
    return {
        "risk_level": level,
        "risk_name": _risk_name(level),
        "risk_score": score,
        "alert_required": level >= 2,
        "reasons": reasons,
        "suggestions": _suggestions(level, visibility, traffic),
    }


def _risk_name(level: int) -> str:
    return {
        0: "正常",
        1: "关注",
        2: "警告",
        3: "严重",
    }.get(level, "严重")


def _risk_level(score: int, visibility_score: int, density_score: int) -> int:
    if score <= 0:
        return 0
    if score <= 2:
        return 1
    if score == 3:
        return 2
    if visibility_score >= 2 and density_score >= 2:
        return 3
    return 2


def _suggestions(level: int, visibility: dict, traffic: dict) -> list[str]:
    suggestions = []
    if visibility.get("visibility_score", 0) >= 1:
        suggestions.append("建议记录当前摄像头画面质量；若现场确认为雨雾低能见度，再开启降速和保持车距提示。")
    if traffic.get("density_score", 0) >= 2:
        suggestions.append("建议交通管理人员关注该路段车流密度变化，必要时进行限速或分流。")
    if traffic.get("vulnerable_road_user_count", 0) > 0:
        suggestions.append("建议加强行人、摩托车及非机动车混行区域监控。")
    if traffic.get("large_vehicle_count", 0) > 0:
        suggestions.append("建议对大型车辆通行情况保持关注，避免雨雾条件下制动距离不足。")
    if level >= 2:
        suggestions.append("建议保留标注视频和关键帧，供人工复核和后续追溯。")
    if not suggestions:
        suggestions.append("当前未触发明显预警，可继续保持常规监控。")
    return suggestions
