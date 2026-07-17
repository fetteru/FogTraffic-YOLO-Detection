from app.agent.risk_agent import assess_risk


def _traffic(
    count: int,
    density_score: int,
    large_count: int = 0,
    large_ratio: float = 0,
    vulnerable_count: int = 0,
) -> dict:
    return {
        "traffic_count_for_risk": count,
        "vehicle_count": count,
        "density_score": density_score,
        "large_vehicle_count": large_count,
        "large_vehicle_ratio": large_ratio,
        "vulnerable_road_user_count": vulnerable_count,
    }


def test_clear_visibility_is_capped_at_attention_level():
    risk = assess_risk(
        {"visibility_score": 0, "avg_confidence": 0.72},
        _traffic(count=42, density_score=3, large_count=9, large_ratio=0.35),
    )

    assert risk["risk_level"] == 2
    assert risk["risk_name"] == "关注提示"
    assert risk["alert_required"] is False


def test_mild_visibility_issue_with_many_vehicles_stays_attention_level():
    risk = assess_risk(
        {"visibility_score": 1, "avg_confidence": 0.68},
        _traffic(count=35, density_score=3, large_count=2, large_ratio=0.06),
    )

    assert risk["risk_level"] == 2
    assert risk["alert_required"] is False


def test_mild_visibility_issue_with_dense_large_vehicle_flow_becomes_warning_control():
    risk = assess_risk(
        {"visibility_score": 1, "avg_confidence": 0.68},
        _traffic(count=57, density_score=3, large_count=12, large_ratio=0.21),
    )

    assert risk["risk_level"] == 3
    assert risk["risk_name"] == "预警管控"
    assert risk["alert_required"] is True


def test_low_visibility_with_traffic_pressure_becomes_warning_control():
    risk = assess_risk(
        {"visibility_score": 2, "avg_confidence": 0.61},
        _traffic(count=35, density_score=3, large_count=2, large_ratio=0.06),
    )

    assert risk["risk_level"] == 3
    assert risk["risk_name"] == "预警管控"
    assert risk["alert_required"] is True


def test_very_low_visibility_and_many_vehicles_becomes_emergency_response():
    risk = assess_risk(
        {"visibility_score": 3, "avg_confidence": 0.55},
        _traffic(count=65, density_score=3, large_count=6, large_ratio=0.09),
    )

    assert risk["risk_level"] == 4
    assert risk["risk_name"] == "应急处置"
    assert risk["alert_required"] is True
