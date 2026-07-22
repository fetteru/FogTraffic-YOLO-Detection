"""Rain/fog traffic risk assessment agent."""

from __future__ import annotations


def assess_risk(visibility: dict, traffic: dict) -> dict:
    """Assess rain/fog traffic management risk on a 1-4 warning scale."""
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
        "suggestions": _suggestions(level),
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
    normal_visibility = visibility_score <= 0
    minor_visibility_issue = visibility_score >= 1
    low_visibility = visibility_score >= 2
    very_low_visibility = visibility_score >= 3
    medium_vehicles = density_score >= 2 or vehicle_count >= 8
    many_vehicles = density_score >= 3 or vehicle_count >= 25
    large_vehicle_attention = large_vehicle_count >= 4 or large_vehicle_ratio >= 0.3
    large_vehicle_high = large_vehicle_count >= 8 or large_vehicle_ratio >= 0.45
    extra_risk = vulnerable_count > 0 or (avg_confidence is not None and avg_confidence < 0.4)

    # Clear/normal visibility is not a rain-fog warning scene. Keep it capped
    # at level 2 even when there are many vehicles or large vehicles.
    if normal_visibility:
        if many_vehicles or medium_vehicles or large_vehicle_attention or extra_risk:
            return 2
        return 1

    # 4: immediate action only when traffic pressure and visibility risk are both high.
    if very_low_visibility and (many_vehicles or (medium_vehicles and large_vehicle_high)):
        return 4
    if low_visibility and many_vehicles and large_vehicle_attention:
        return 4

    # 3: warning control. It must have clear visibility risk support; traffic
    # pressure alone should not become a rain/fog warning.
    if very_low_visibility:
        return 3
    if low_visibility and (many_vehicles or medium_vehicles or large_vehicle_attention):
        return 3
    if extra_risk and low_visibility and medium_vehicles:
        return 3
    if minor_visibility_issue and many_vehicles and (
        large_vehicle_attention or vehicle_count >= 50 or extra_risk
    ):
        return 3

    # 2: attention. Mild rain/fog/low-light evidence, or traffic pressure with
    # no strong visibility degradation.
    if minor_visibility_issue:
        return 2
    if medium_vehicles or large_vehicle_attention:
        return 2

    return 1


def _risk_name(level: int) -> str:
    return {
        1: "常态监测",
        2: "关注提示",
        3: "预警管控",
        4: "应急处置",
    }.get(level, "应急处置")


def _risk_score(level: int, visibility_score: int, density_score: int) -> int:
    return min(100, level * 20 + visibility_score * 3 + density_score * 2)


def _level_rule(level: int) -> str:
    return {
        1: "常态监测：画面可见性整体稳定，车辆较少或交通压力不高，保持常规巡检。",
        2: "关注提示：存在轻微雨雾、低光或画面质量下降特征；或在可见性稳定时车流/大车数量需要持续观察。",
        3: "预警管控：可见度明显下降并叠加车流、大车或弱势交通参与者风险，或可见度很低即使车辆较少，也需要提高巡检频率并发布降速提醒。",
        4: "应急处置：车辆很多且可见度很低，存在追尾、排队、制动距离不足等高风险，应考虑限速、分流或现场处置。",
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
        reasons.append("画面可见度下降，远距离车辆和目标边界识别可能受影响。")
    elif visibility_score >= 1:
        reasons.append("画面存在雨雾、低光或摄像头画质下降特征。")
    else:
        reasons.append("当前画面可见性指标整体较稳定。")

    if density_score >= 3 or vehicle_count >= 25:
        reasons.append(f"车辆数量很多，风险统计车辆数约为 {vehicle_count}。")
    elif density_score >= 2 or vehicle_count >= 8:
        reasons.append(f"车辆数量较多，风险统计车辆数约为 {vehicle_count}。")
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


def _suggestions(level: int) -> list[str]:
    if level <= 1:
        return [
            "保持常规监控，记录当前摄像头画面质量和车流变化。",
            "暂不建议发布预警，可继续观察后续雨雾和车流变化。",
        ]
    if level == 2:
        return [
            "建议进入关注提示状态，持续观察该路段雨雾、低光、车流或大车占比变化。",
            "如后续可见度明显下降并叠加车流增多或大车占比升高，应提升到预警管控。",
        ]
    if level == 3:
        return [
            "建议进入预警管控状态，提高巡检频率，提示驾驶员降低车速并保持车距。",
            "建议保留标注视频、关键帧和结构化检测数据，供人工复核和后续研判。",
        ]
    return [
        "建议立即采取交通管理措施，发布降速、保持车距或分流提示。",
        "必要时安排交通管理人员关注现场，评估是否需要限速、分流或临时管控。",
    ]
