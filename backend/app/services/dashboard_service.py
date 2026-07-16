"""Dashboard statistics service."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import Date, cast, func

from app.database.session import SessionLocal
from app.entity.db_models import DetectionResult, DetectionScene, DetectionTask


class DashboardService:
    """Aggregate detection data for dashboard charts."""

    @staticmethod
    def get_statistics(user_id: int, days: int = 30) -> dict:
        db = SessionLocal()
        try:
            now = datetime.now()
            start_date = now - timedelta(days=days)
            prev_start = now - timedelta(days=days * 2)

            current = _task_summary(db, user_id, start_date, now)
            previous = _task_summary(db, user_id, prev_start, start_date)

            return {
                "total_tasks": current["total_tasks"],
                "total_images": current["total_images"],
                "total_objects": current["total_objects"],
                "avg_inference_time": current["avg_inference_time"],
                "growth": {
                    "tasks": _growth(current["total_tasks"], previous["total_tasks"]),
                    "images": _growth(current["total_images"], previous["total_images"]),
                    "objects": _growth(current["total_objects"], previous["total_objects"]),
                    "inference_time": _growth(
                        current["avg_inference_time"],
                        previous["avg_inference_time"],
                    ),
                },
                "period_days": days,
            }
        finally:
            db.close()

    @staticmethod
    def get_trend(user_id: int, days: int = 30) -> dict:
        db = SessionLocal()
        try:
            start_date = datetime.now() - timedelta(days=days)
            rows = (
                db.query(
                    cast(DetectionTask.created_at, Date).label("date"),
                    func.count(DetectionTask.id).label("task_count"),
                    func.coalesce(func.sum(DetectionTask.total_objects), 0).label("object_count"),
                    func.coalesce(func.sum(DetectionTask.total_images), 0).label("image_count"),
                )
                .filter(
                    DetectionTask.user_id == user_id,
                    DetectionTask.created_at >= start_date,
                )
                .group_by(cast(DetectionTask.created_at, Date))
                .order_by(cast(DetectionTask.created_at, Date))
                .all()
            )
            row_map = {
                str(row.date): {
                    "date": str(row.date),
                    "task_count": row.task_count,
                    "object_count": int(row.object_count or 0),
                    "image_count": int(row.image_count or 0),
                }
                for row in rows
            }
            trend = []
            for offset in range(days):
                date = (datetime.now() - timedelta(days=days - offset - 1)).strftime("%Y-%m-%d")
                trend.append(
                    row_map.get(
                        date,
                        {
                            "date": date,
                            "task_count": 0,
                            "object_count": 0,
                            "image_count": 0,
                        },
                    )
                )
            return {"trend": trend, "period_days": days}
        finally:
            db.close()

    @staticmethod
    def get_class_distribution(user_id: int, days: int = 30) -> dict:
        db = SessionLocal()
        try:
            start_date = datetime.now() - timedelta(days=days)
            rows = (
                db.query(
                    DetectionResult.class_name.label("name"),
                    func.count(DetectionResult.id).label("value"),
                )
                .join(DetectionTask, DetectionTask.id == DetectionResult.task_id)
                .filter(
                    DetectionTask.user_id == user_id,
                    DetectionTask.created_at >= start_date,
                )
                .group_by(DetectionResult.class_name)
                .order_by(func.count(DetectionResult.id).desc())
                .limit(20)
                .all()
            )
            return {"distribution": [{"name": row.name, "value": row.value} for row in rows]}
        finally:
            db.close()

    @staticmethod
    def get_scene_distribution(user_id: int, days: int = 30) -> dict:
        db = SessionLocal()
        try:
            start_date = datetime.now() - timedelta(days=days)
            rows = (
                db.query(
                    DetectionScene.display_name.label("name"),
                    func.count(DetectionTask.id).label("value"),
                )
                .join(DetectionScene, DetectionScene.id == DetectionTask.scene_id)
                .filter(
                    DetectionTask.user_id == user_id,
                    DetectionTask.created_at >= start_date,
                )
                .group_by(DetectionScene.display_name)
                .order_by(func.count(DetectionTask.id).desc())
                .all()
            )
            return {"distribution": [{"name": row.name, "value": row.value} for row in rows]}
        finally:
            db.close()

    @staticmethod
    def get_type_distribution(user_id: int, days: int = 30) -> dict:
        db = SessionLocal()
        try:
            start_date = datetime.now() - timedelta(days=days)
            rows = (
                db.query(
                    DetectionTask.task_type.label("name"),
                    func.count(DetectionTask.id).label("value"),
                )
                .filter(
                    DetectionTask.user_id == user_id,
                    DetectionTask.created_at >= start_date,
                )
                .group_by(DetectionTask.task_type)
                .order_by(func.count(DetectionTask.id).desc())
                .all()
            )
            return {"distribution": [{"name": row.name, "value": row.value} for row in rows]}
        finally:
            db.close()


def _task_summary(db, user_id: int, start_date: datetime, end_date: datetime) -> dict:
    row = (
        db.query(
            func.count(DetectionTask.id).label("total_tasks"),
            func.coalesce(func.sum(DetectionTask.total_images), 0).label("total_images"),
            func.coalesce(func.sum(DetectionTask.total_objects), 0).label("total_objects"),
            func.coalesce(func.avg(DetectionTask.total_inference_time), 0).label(
                "avg_inference_time"
            ),
        )
        .filter(
            DetectionTask.user_id == user_id,
            DetectionTask.created_at >= start_date,
            DetectionTask.created_at < end_date,
        )
        .first()
    )
    return {
        "total_tasks": int(row.total_tasks or 0),
        "total_images": int(row.total_images or 0),
        "total_objects": int(row.total_objects or 0),
        "avg_inference_time": round(float(row.avg_inference_time or 0), 2),
    }


def _growth(current: float, previous: float) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round((current - previous) / previous * 100, 1)


dashboard_service = DashboardService()
