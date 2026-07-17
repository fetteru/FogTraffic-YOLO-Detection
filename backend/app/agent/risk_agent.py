"""Rain/fog traffic risk assessment agent."""

from __future__ import annotations


def assess_risk(visibility: dict, traffic: dict) -> dict:
    """Assess rain/fog traffic management risk on a 1-5 warning scale."""
    visibility_score = int(visibility.get("visibility_score") or 0)
    density_score = int(traffic.get("density_score") or 0)
    vehicle_count = int(traffic.get("traffic_count_for_risk") or traffic.get("vehicle_count") or 0)
    large_vehicle_count = int(traffic.get("large_vehicle_count") or 0)
    large_vehicle_ratio = float(traffic.get("large_vehicle_ratio") or 0)
    vulnerable_count = int(traffic.get("vulnerable_road_user_count") or 0)
    avg_confidence = visibility.get("avg_confidence")

    level = _risk_level(
        visibility_score=visibility_score,
        density_score=density_score,
        vehicle_count=vehicle_count,
        large_vehicle_count=large_vehicle_count,
        large_vehicle_ratio=large_vehicle_ratio,
        vulnerable_count=vulnerable_count,
        avg_confidence=avg_confidence,
    )
    reasons = _reasons(
        level=level,
        visibility=visibility,
        traffic=traffic,
        visibility_score=visibility_score,
        density_score=density_score,
        vehicle_count=vehicle_count,
        large_vehicle_count=large_vehicle_count,
        large_vehicle_ratio=large_vehicle_ratio,
        vulnerable_count=vulnerable_count,
        avg_confidence=avg_confidence,
    )
    return {
        "risk_level": level,
        "risk_name": _risk_name(level),
        "risk_score": _risk_score(level, visibility_score, density_score),
        "alert_required": level >= 3,
        "reasons": reasons,
        "suggestions": _suggestions(level, visibility, traffic),
        "level_rule": _level_rule(level),
    }


def _risk_level(
    *,
    visibility_score: int,
    density_score: int,
    vehicle_count: int,
    large_vehicle_count: int,
    large_vehicle_ratio: float,
    vulnerable_count: int,
    avg_confidence,
) -> int:
    very_low_visibility = visibility_score >= 3
    low_visibility = visibility_score >= 2
    many_vehicles = density_score >= 3
    medium_vehicles = density_score >= 2
    has_extra_risk = (
        vulnerable_count > 0
        or large_vehicle_count >= 6
        or large_vehicle_ratio >= 0.35
        or (avg_confidence is not None and avg_confidence < 0.4)
    )
    many_large_vehicles = large_vehicle_count >= 8 or large_vehicle_ratio >= 0.45
    several_large_vehicles = large_vehicle_count >= 4 or large_vehicle_ratio >= 0.3

    if very_low_visibility and many_vehicles and has_extra_risk:
        return 5
    if very_low_visibility and many_vehicles:
        return 4
    if very_low_visibility and many_large_vehicles:
        return 4
    if (very_low_visibility and medium_vehicles) or (low_visibility and many_vehicles):
        return 3
    if low_visibility and several_large_vehicles:
        return 3
    if several_large_vehicles and medium_vehicles:
        return 3
    if several_large_vehicles:
        return 2
    if medium_vehicles or low_visibility or vehicle_count >= 8:
        return 2
    return 1


def _risk_name(level: int) -> str:
    return {
        1: "普通雨天",
        2: "车辆较多",
        3: "低能见度预警",
        4: "高风险预警",
        5: "严重预警",
    }.get(level, "严重预警")


def _risk_score(level: int, visibility_score: int, density_score: int) -> int:
    return level * 10 + visibility_score * 2 + density_score


def _level_rule(level: int) -> str:
    return {
        1: "普通雨天或画面质量轻微下降，车辆较少，保持常规观察。",
        2: "车辆数量较多，或画面可见性下降，需要持续关注车流变化。",
        3: "可见度较低且车辆不少，或大车数量达到关注阈值，建议进入预警观察。",
        4: "可见度很低且车辆很多，或可见度很低且大车较多，存在追尾、排队和制动距离不足风险。",
        5: "可见度很低、车辆很多，并伴随大型车辆、行人/非机动车或低置信度等额外风险。",
    }.get(level, "未知规则")


def _reasons(
    *,
    level: int,
    visibility: dict,
    traffic: dict,
    visibility_score: int,
    density_score: int,
    vehicle_count: int,
    large_vehicle_count: int,
    large_vehicle_ratio: float,
    vulnerable_count: int,
    avg_confidence,
) -> list[str]:
    reasons = [_level_rule(level)]

    if visibility_score >= 3:
        reasons.append("画面可见度很低，存在明显低光、低对比或雾化特征。")
    elif visibility_score >= 2:
        reasons.append("画面可见度下降，目标边界和远距离车辆识别可能受影响。")
    elif visibility_score >= 1:
        reasons.append("画面存在轻微雨雾、低光或摄像头画质下降特征。")
    else:
        reasons.append("当前画面可见性指标整体较稳定。")

    if density_score >= 3:
        reasons.append(f"车辆数量较多，风险统计车辆数约为 {vehicle_count}。")
    elif density_score >= 2:
        reasons.append(f"车辆数量中等，风险统计车辆数约为 {vehicle_count}。")
    else:
        reasons.append(f"车辆较少，风险统计车辆数约为 {vehicle_count}。")

    if large_vehicle_count > 0:
        reasons.append(f"检测到大型车辆 {large_vehicle_count} 个，占比约 {large_vehicle_ratio:.0%}。")
    if vulnerable_count > 0:
        reasons.append(f"检测到行人、摩托车或非机动车等弱势交通参与者 {vulnerable_count} 个。")
    if avg_confidence is not None and avg_confidence < 0.4:
        reasons.append("平均置信度偏低，建议人工复核关键目标。")

    evidence = visibility.get("evidence") or []
    for item in evidence[:2]:
        if item not in reasons:
            reasons.append(str(item))
    return reasons


def _suggestions(level: int, visibility: dict, traffic: dict) -> list[str]:
    if level <= 1:
        return [
            "保持常规监控，记录当前雨天或摄像头画面质量。",
            "暂不建议发布强预警，可继续观察车流变化。",
        ]
    if level == 2:
        return [
            "建议关注该路段车流密度变化，必要时提醒保持车距。",
            "若后续可见度继续下降或车辆继续增多，应提升预警等级。",
        ]
    if level == 3:
        return [
            "建议进入预警观察状态，提示驾驶员降低车速、保持车距。",
            "建议保留标注视频和关键检测数据，供人工复核。",
        ]
    if level == 4:
        return [
            "建议发布高风险预警，提醒减速慢行并关注排队、追尾风险。",
            "必要时安排交通管理人员关注该路段，评估是否需要限速或分流。",
        ]
    return [
        "建议发布严重预警，优先采取限速、分流或临时管控措施。",
        "建议人工复核现场情况，重点关注大型车辆、弱势交通参与者和连续低能见度路段。",
    ]
