"""Detection history service."""

from __future__ import annotations

from datetime import datetime, time

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from app.database.session import SessionLocal
from app.entity.db_models import DetectionResult, DetectionScene, DetectionTask


class HistoryService:
    """Query and manage detection task history."""

    @staticmethod
    def list_tasks(
        user_id: int,
        page: int = 1,
        page_size: int = 10,
        task_type: str | None = None,
        status: str | None = None,
        scene_id: int | None = None,
        keyword: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict:
        db = SessionLocal()
        try:
            query = db.query(DetectionTask).filter(DetectionTask.user_id == user_id)
            query = _apply_filters(query, task_type, status, scene_id, keyword, start_date, end_date)
            total = query.count()
            rows = (
                query.options(joinedload(DetectionTask.scene))
                .order_by(DetectionTask.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
                .all()
            )
            return {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size if page_size else 0,
                "items": [_task_to_dict(item) for item in rows],
            }
        finally:
            db.close()

    @staticmethod
    def get_task_detail(user_id: int, task_id: int) -> dict:
        db = SessionLocal()
        try:
            task = (
                db.query(DetectionTask)
                .options(joinedload(DetectionTask.scene), joinedload(DetectionTask.results))
                .filter(DetectionTask.id == task_id, DetectionTask.user_id == user_id)
                .first()
            )
            if not task:
                raise HTTPException(status_code=404, detail="Detection task not found")

            class_counts = {}
            for result in task.results:
                class_counts[result.class_name] = class_counts.get(result.class_name, 0) + 1

            return {
                "task": _task_to_dict(task),
                "class_counts": class_counts,
                "results": [_result_to_dict(result) for result in task.results],
            }
        finally:
            db.close()

    @staticmethod
    def delete_task(user_id: int, task_id: int) -> dict:
        db = SessionLocal()
        try:
            task = (
                db.query(DetectionTask)
                .filter(DetectionTask.id == task_id, DetectionTask.user_id == user_id)
                .first()
            )
            if not task:
                raise HTTPException(status_code=404, detail="Detection task not found")
            db.delete(task)
            db.commit()
            return {"message": "deleted"}
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def get_summary(user_id: int) -> dict:
        db = SessionLocal()
        try:
            row = (
                db.query(
                    func.count(DetectionTask.id).label("total_tasks"),
                    func.coalesce(func.sum(DetectionTask.total_objects), 0).label("total_objects"),
                    func.coalesce(func.sum(DetectionTask.total_images), 0).label("total_images"),
                )
                .filter(DetectionTask.user_id == user_id)
                .first()
            )
            return {
                "total_tasks": int(row.total_tasks or 0),
                "total_objects": int(row.total_objects or 0),
                "total_images": int(row.total_images or 0),
            }
        finally:
            db.close()

    @staticmethod
    def list_scenes(user_id: int) -> dict:
        db = SessionLocal()
        try:
            rows = (
                db.query(DetectionScene)
                .join(DetectionTask, DetectionTask.scene_id == DetectionScene.id)
                .filter(DetectionTask.user_id == user_id)
                .group_by(DetectionScene.id)
                .order_by(DetectionScene.display_name.asc())
                .all()
            )
            return {
                "items": [
                    {"id": row.id, "name": row.name, "display_name": row.display_name}
                    for row in rows
                ]
            }
        finally:
            db.close()


def _apply_filters(query, task_type, status, scene_id, keyword, start_date, end_date):
    if task_type:
        query = query.filter(DetectionTask.task_type == task_type)
    if status:
        query = query.filter(DetectionTask.status == status)
    if scene_id:
        query = query.filter(DetectionTask.scene_id == scene_id)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            or_(
                DetectionTask.task_name.ilike(like),
                DetectionTask.result_path.ilike(like),
            )
        )
    if start_date:
        start = datetime.combine(datetime.strptime(start_date, "%Y-%m-%d").date(), time.min)
        query = query.filter(DetectionTask.created_at >= start)
    if end_date:
        end = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d").date(), time.max)
        query = query.filter(DetectionTask.created_at <= end)
    return query


def _task_to_dict(task: DetectionTask) -> dict:
    return {
        "id": task.id,
        "task_name": task.task_name,
        "task_type": task.task_type,
        "source_type": task.source_type,
        "status": task.status,
        "scene_id": task.scene_id,
        "scene_name": task.scene.display_name if task.scene else None,
        "total_images": task.total_images,
        "total_frames": task.total_frames,
        "processed_frames": task.processed_frames,
        "total_objects": task.total_objects,
        "total_inference_time": task.total_inference_time,
        "conf_threshold": task.conf_threshold,
        "iou_threshold": task.iou_threshold,
        "result_path": task.result_path,
        "error_message": task.error_message,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
    }


def _result_to_dict(result: DetectionResult) -> dict:
    return {
        "id": result.id,
        "task_id": result.task_id,
        "image_path": result.image_path,
        "annotated_image_url": result.annotated_image_url,
        "frame_number": result.frame_number,
        "frame_time": float(result.frame_time) if result.frame_time is not None else None,
        "class_name": result.class_name,
        "class_name_cn": result.class_name_cn,
        "class_id": result.class_id,
        "confidence": result.confidence,
        "bbox": result.bbox,
        "inference_time": result.inference_time,
        "image_width": result.image_width,
        "image_height": result.image_height,
        "created_at": result.created_at,
    }


history_service = HistoryService()
