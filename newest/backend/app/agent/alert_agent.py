"""Alert agent for rain/fog traffic risk records."""

from __future__ import annotations

from app.core.logger import get_logger
from app.database.session import SessionLocal
from app.entity.db_models import CongestionAlert


logger = get_logger(__name__)


def build_alert(risk: dict, traffic: dict, visibility: dict) -> dict | None:
    """Build an alert payload when risk reaches warning level."""
    if not risk.get("alert_required"):
        return None
    return {
        "alert_level": risk.get("risk_level", 0),
        "alert_type": "rain_fog_traffic_risk",
        "alert_status": "pending",
        "alert_message": "；".join(risk.get("reasons", []))[:500],
        "vehicle_density": traffic.get("traffic_count_for_risk"),
        "average_speed": None,
        "threshold_value": visibility.get("visibility_score"),
    }


def save_alert(db_task_id: int | None, alert: dict | None) -> int | None:
    """Persist alert to congestion_alerts when possible."""
    if not db_task_id or not alert:
        return None
    db = SessionLocal()
    try:
        row = CongestionAlert(
            task_id=db_task_id,
            alert_level=int(alert.get("alert_level", 0)),
            alert_type=alert.get("alert_type", "rain_fog_traffic_risk"),
            vehicle_density=alert.get("vehicle_density"),
            average_speed=alert.get("average_speed"),
            threshold_value=alert.get("threshold_value"),
            alert_message=alert.get("alert_message", ""),
            alert_status=alert.get("alert_status", "pending"),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.id
    except Exception as exc:
        db.rollback()
        logger.warning("Save congestion alert failed: %s", exc)
        return None
    finally:
        db.close()
