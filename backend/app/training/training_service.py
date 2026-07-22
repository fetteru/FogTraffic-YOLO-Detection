"""Training task service for YOLOv11 jobs."""

from __future__ import annotations

import csv
import base64
import os
import shutil
import tempfile
import threading
import uuid
from datetime import datetime
from pathlib import Path

from app.config.settings import settings
from app.core.logger import get_logger
from app.database.session import SessionLocal
from app.entity.db_models import TrainingMetric, TrainingTask


logger = get_logger(__name__)
_running_tasks: dict[str, object] = {}
_running_lock = threading.Lock()
_progress_cache: dict[int, tuple[int, int]] = {}
_progress_lock = threading.Lock()


def _model_display_name(path_value: str | None) -> str | None:
    if not path_value:
        return None
    path = Path(path_value)
    if path.name.lower() == "best.pt" and path.parent.name:
        return path.parent.name
    return path.stem or None


def _worker_count(config: dict | None = None) -> int:
    default_workers = 0 if os.name == "nt" else 2
    value = (config or {}).get("workers")
    if value is None:
        return default_workers
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return default_workers


class TrainingService:
    """Create, run, monitor and stop YOLO training tasks."""

    @staticmethod
    def start_training(db, user_id: int, scene_id: int, config: dict) -> TrainingTask:
        task_uuid = str(uuid.uuid4())[:8]
        dataset_path = config.get("dataset_path", "")
        data_yaml = config.get("data_yaml") or (
            os.path.join(dataset_path, "data.yaml") if dataset_path else None
        )
        model_name = config.get("model_name") or _model_display_name(config.get("base_model_path")) or "local_model"

        task = TrainingTask(
            user_id=user_id,
            scene_id=scene_id,
            task_uuid=task_uuid,
            status="pending",
            model_name=model_name,
            epochs=config.get("epochs", 50),
            img_size=config.get("img_size", 640),
            batch_size=config.get("batch_size", 8),
            device=config.get("device", "cpu"),
            optimizer=config.get("optimizer", "SGD"),
            lr0=config.get("lr0", 0.01),
            augment_config=config.get("augment_config"),
            dataset_path=dataset_path,
            data_yaml=data_yaml,
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        thread = threading.Thread(
            target=TrainingService._run_training,
            args=(task.id, task.task_uuid, config),
            daemon=True,
            name=f"train-{task_uuid}",
        )
        thread.start()
        return task

    @staticmethod
    def _run_training(task_id: int, task_uuid: str, config: dict) -> None:
        db = SessionLocal()
        task = None
        data_yaml = ""
        original_content = None
        try:
            task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
            if task is None:
                logger.error("Training task not found: %s", task_id)
                return

            task.status = "running"
            task.started_at = datetime.now()
            db.commit()

            data_yaml = config.get("data_yaml") or os.path.join(config.get("dataset_path", ""), "data.yaml")
            if not os.path.exists(data_yaml):
                raise FileNotFoundError(f"data.yaml does not exist: {data_yaml}")

            from ultralytics import YOLO

            model_name = config.get("model_name") or "local_model"
            base_model_path = config.get("base_model_path")
            model_file = base_model_path or (model_name if model_name.endswith(".pt") else f"{model_name}.pt")
            model = YOLO(model_file)
            with _running_lock:
                _running_tasks[task_uuid] = model

            data_yaml_path = Path(data_yaml)
            original_content = data_yaml_path.read_text(encoding="utf-8")
            data_yaml_dir = str(data_yaml_path.parent.resolve()).replace("\\", "/")
            modified_content = _replace_yaml_path(original_content, data_yaml_dir)
            data_yaml_path.write_text(modified_content, encoding="utf-8")

            train_kwargs = {
                "data": str(data_yaml_path),
                "epochs": config.get("epochs", 50),
                "imgsz": config.get("img_size", 640),
                "batch": config.get("batch_size", 8),
                "device": config.get("device", "cpu"),
                "optimizer": config.get("optimizer", "SGD"),
                "lr0": config.get("lr0", 0.01),
                "project": str(Path.cwd() / settings.TRAIN_OUTPUT_DIR),
                "name": f"task_{task_uuid}",
                "exist_ok": True,
                "verbose": True,
                "save": True,
                "plots": True,
                "workers": _worker_count(config),
            }

            def on_train_epoch_end(trainer):
                TrainingService._record_epoch_metric(task_id, trainer, config)

            def on_train_batch_end(trainer):
                TrainingService._record_batch_progress(task_id, trainer, config)

            model.add_callback("on_train_batch_end", on_train_batch_end)
            model.add_callback("on_train_epoch_end", on_train_epoch_end)
            task.progress = max(task.progress or 0, 1)
            task.error_message = None
            db.commit()
            logger.info(
                "Starting YOLO training: task_id=%s uuid=%s model=%s data=%s device=%s workers=%s",
                task_id,
                task_uuid,
                model_file,
                data_yaml_path,
                train_kwargs["device"],
                train_kwargs["workers"],
            )
            model.train(**train_kwargs)

            task.status = "completed"
            task.progress = 100
            task.current_epoch = config.get("epochs", 50)
            task.completed_at = datetime.now()
            db.commit()
            TrainingService._parse_final_results(
                db, task_id, task_uuid, str(Path.cwd() / settings.TRAIN_OUTPUT_DIR)
            )
        except Exception as exc:
            logger.error("Training failed: task_id=%s error=%s", task_id, exc, exc_info=True)
            db.rollback()
            if task is not None:
                task.status = "failed"
                task.error_message = str(exc)[:2000]
                task.completed_at = datetime.now()
                db.commit()
        finally:
            if original_content is not None and data_yaml:
                try:
                    Path(data_yaml).write_text(original_content, encoding="utf-8")
                except Exception:
                    logger.warning("Failed to restore data.yaml: %s", data_yaml)
            with _running_lock:
                _running_tasks.pop(task_uuid, None)
            with _progress_lock:
                _progress_cache.pop(task_id, None)
            db.close()

    @staticmethod
    def _record_batch_progress(task_id: int, trainer, config: dict) -> None:
        try:
            total_epochs = max(1, int(config.get("epochs", 50) or 50))
            epoch_index = max(0, int(getattr(trainer, "epoch", 0) or 0))
            batch_index = getattr(trainer, "batch_i", None)
            if batch_index is None:
                batch_index = getattr(trainer, "i", None)
            batch_index = max(0, int(batch_index or 0))

            train_loader = getattr(trainer, "train_loader", None) or getattr(trainer, "loader", None)
            try:
                total_batches = len(train_loader) if train_loader is not None else 0
            except TypeError:
                total_batches = 0

            epoch_fraction = 0.0
            if total_batches > 0:
                epoch_fraction = min(1.0, (batch_index + 1) / total_batches)
            progress = int(((epoch_index + epoch_fraction) / total_epochs) * 100)
            progress = max(1, min(99, progress))
            current_epoch = min(total_epochs, epoch_index + 1)
            TrainingService._update_progress(task_id, progress, current_epoch)
        except Exception as exc:
            logger.debug("Training batch progress callback skipped: %s", exc)

    @staticmethod
    def _update_progress(task_id: int, progress: int, current_epoch: int) -> None:
        marker = (progress, current_epoch)
        with _progress_lock:
            if _progress_cache.get(task_id) == marker:
                return
            _progress_cache[task_id] = marker

        db = SessionLocal()
        try:
            task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
            if not task or task.status != "running":
                return
            task.progress = max(int(task.progress or 0), progress)
            task.current_epoch = max(int(task.current_epoch or 0), current_epoch)
            db.commit()
        except Exception as exc:
            logger.debug("Training progress update skipped: %s", exc)
            db.rollback()
        finally:
            db.close()

    @staticmethod
    def _record_epoch_metric(task_id: int, trainer, config: dict) -> None:
        db = SessionLocal()
        try:
            epoch = int(getattr(trainer, "epoch", 0)) + 1
            metrics = getattr(trainer, "metrics", {}) or {}
            metric = db.query(TrainingMetric).filter_by(task_id=task_id, epoch=epoch).first()
            if not metric:
                metric = TrainingMetric(task_id=task_id, epoch=epoch)
                db.add(metric)
            metric.box_loss = _safe_float(metrics.get("train/box_loss") or metrics.get("metrics/box_loss"))
            metric.cls_loss = _safe_float(metrics.get("train/cls_loss") or metrics.get("metrics/cls_loss"))
            metric.dfl_loss = _safe_float(metrics.get("train/dfl_loss") or metrics.get("metrics/dfl_loss"))
            metric.precision = _safe_float(metrics.get("metrics/precision(B)"))
            metric.recall = _safe_float(metrics.get("metrics/recall(B)"))
            metric.map50 = _safe_float(metrics.get("metrics/mAP50(B)"))
            metric.map50_95 = _safe_float(metrics.get("metrics/mAP50-95(B)"))

            task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
            if not task:
                logger.warning("Training task not found while recording metric: %s", task_id)
                return
            total_epochs = int(config.get("epochs", 50))
            task.current_epoch = max(task.current_epoch or 0, epoch)
            task.progress = max(task.progress or 0, min(100, int((epoch / total_epochs) * 100)))
            db.commit()
        except Exception as exc:
            logger.warning("Training callback failed: %s", exc)
            db.rollback()
        finally:
            db.close()

    @staticmethod
    def _parse_final_results(db, task_id: int, task_uuid: str, project_path: str | None = None) -> None:
        results_csv = Path(project_path or settings.TRAIN_OUTPUT_DIR) / f"task_{task_uuid}" / "results.csv"
        for item in TrainingService.parse_results_csv(str(results_csv)):
            metric = db.query(TrainingMetric).filter_by(task_id=task_id, epoch=item["epoch"]).first()
            if not metric:
                metric = TrainingMetric(task_id=task_id, epoch=item["epoch"])
                db.add(metric)
            for key, value in item.items():
                if key != "epoch":
                    setattr(metric, key, value)
        db.commit()

    @staticmethod
    def get_training_status(db, task_id: int) -> dict:
        task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
        if not task:
            return {"error": "training task not found"}
        latest_metric = (
            db.query(TrainingMetric)
            .filter(TrainingMetric.task_id == task_id)
            .order_by(TrainingMetric.epoch.desc())
            .first()
        )
        with _running_lock:
            is_running = task.task_uuid in _running_tasks
        return {
            "task": _task_to_dict(task),
            "latest_metric": _metric_to_dict(latest_metric) if latest_metric else None,
            "is_running": is_running,
        }

    @staticmethod
    def get_training_metrics(db, task_id: int) -> list[dict]:
        metrics = (
            db.query(TrainingMetric)
            .filter(TrainingMetric.task_id == task_id)
            .order_by(TrainingMetric.epoch.asc())
            .all()
        )
        return [_metric_to_dict(metric) for metric in metrics]

    @staticmethod
    def stop_training(db, task_id: int) -> dict:
        task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
        if not task:
            return {"error": "training task not found"}
        if task.status != "running":
            return {"error": f"task status is {task.status}, cannot stop"}

        with _running_lock:
            model = _running_tasks.get(task.task_uuid)
        if model and getattr(model, "trainer", None):
            try:
                model.trainer.stop()
            except Exception as exc:
                logger.warning("Failed to stop trainer cleanly: %s", exc)

        task.status = "cancelled"
        task.completed_at = datetime.now()
        db.commit()
        return {"message": "training task stopped", "task_id": task_id}

    @staticmethod
    def get_task_list(db, user_id: int | None = None, limit: int = 20) -> list[dict]:
        query = db.query(TrainingTask)
        if user_id:
            query = query.filter(TrainingTask.user_id == user_id)
        return [_task_to_dict(task) for task in query.order_by(TrainingTask.created_at.desc()).limit(limit).all()]

    @staticmethod
    def parse_results_csv(results_csv_path: str) -> list[dict]:
        metrics = []
        if not os.path.exists(results_csv_path):
            return metrics
        with open(results_csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                row = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
                metrics.append(
                    {
                        "epoch": int(float(row.get("epoch", 0))) + 1,
                        "box_loss": _safe_float(row.get("train/box_loss")),
                        "cls_loss": _safe_float(row.get("train/cls_loss")),
                        "dfl_loss": _safe_float(row.get("train/dfl_loss")),
                        "precision": _safe_float(row.get("metrics/precision(B)")),
                        "recall": _safe_float(row.get("metrics/recall(B)")),
                        "map50": _safe_float(row.get("metrics/mAP50(B)")),
                        "map50_95": _safe_float(row.get("metrics/mAP50-95(B)")),
                        "lr": _safe_float(row.get("lr/pg0")),
                    }
                )
        return metrics

    @staticmethod
    def validate_model(
        db,
        task_id: int,
        split: str = "val",
        conf: float = 0.001,
        iou: float = 0.6,
        device: str | None = None,
    ) -> dict:
        task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
        if not task:
            return {"error": "training task not found"}

        weights_path = _get_task_weights_path(task)
        if not weights_path.exists():
            return {"error": f"best.pt not found: {weights_path}"}

        data_yaml = task.data_yaml or os.path.join(task.dataset_path or "", "data.yaml")
        if not data_yaml or not os.path.exists(data_yaml):
            return {"error": f"data.yaml not found: {data_yaml}"}

        try:
            from ultralytics import YOLO

            model = YOLO(str(weights_path))
            results = model.val(
                data=data_yaml,
                split=split,
                conf=conf,
                iou=iou,
                imgsz=task.img_size or 640,
                batch=min(task.batch_size or 4, 4),
                device=device or task.device or "cpu",
                plots=True,
                project=str(Path.cwd() / settings.TRAIN_OUTPUT_DIR),
                name=f"task_{task.task_uuid}_{split}_eval",
                exist_ok=True,
                verbose=False,
                workers=_worker_count(),
            )
            report = _build_eval_report(task, model, results, split)
            model_version = _upsert_model_version(db, task, weights_path, report)
            report["model_version_id"] = model_version.id
            report["model_version"] = model_version.version
            report["artifacts_dir"] = str(results.save_dir)
            return report
        except Exception as exc:
            logger.error("Model validation failed: task_id=%s error=%s", task_id, exc, exc_info=True)
            return {"error": str(exc)}

    @staticmethod
    def export_model(
        db,
        task_id: int,
        version: str | None = None,
        description: str | None = None,
        set_default: bool = False,
        upload_minio: bool = False,
    ) -> dict:
        task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
        if not task:
            return {"error": "training task not found"}

        weights_path = _get_task_weights_path(task)
        if not weights_path.exists():
            return {"error": f"best.pt not found: {weights_path}"}

        from app.entity.db_models import DetectionScene, ModelVersion

        scene = db.query(DetectionScene).filter(DetectionScene.id == task.scene_id).first()
        if not scene:
            return {"error": "detection scene not found"}

        if not version:
            existing_count = db.query(ModelVersion).filter(ModelVersion.scene_id == task.scene_id).count()
            version = f"v{existing_count + 1}.0.0"

        export_dir = Path.cwd() / "models" / f"{scene.name}_{version}"
        export_dir.mkdir(parents=True, exist_ok=True)
        export_path = export_dir / "best.pt"
        shutil.copy2(weights_path, export_path)

        report = TrainingService.validate_model(db, task_id, split="val", device=task.device or "cpu")
        if "error" in report:
            report = {"overall": {}, "per_class": {}}
        report_path = export_dir / "eval_report.json"
        import json

        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

        model_version = db.query(ModelVersion).filter(ModelVersion.training_task_id == task_id).first()
        if not model_version:
            model_version = ModelVersion(
                scene_id=task.scene_id,
                training_task_id=task_id,
                version=version,
                model_name=f"{scene.name}_{version}",
                model_type=task.model_name,
                model_path=str(export_path),
            )
            db.add(model_version)

        if set_default:
            db.query(ModelVersion).filter(ModelVersion.scene_id == task.scene_id).update({"is_default": False})

        overall = report.get("overall", {})
        model_version.version = version
        model_version.model_path = str(export_path)
        model_version.description = description or f"Exported from training task {task.task_uuid}"
        model_version.map50 = overall.get("map50")
        model_version.map50_95 = overall.get("map50_95")
        model_version.precision = overall.get("precision")
        model_version.recall = overall.get("recall")
        model_version.per_class_ap = report.get("per_class")
        model_version.file_size = export_path.stat().st_size
        model_version.is_default = set_default

        if upload_minio:
            try:
                from app.storage.minio_client import minio_client

                object_name = f"models/{scene.name}/{version}/best.pt"
                model_version.minio_url = minio_client.upload_file(object_name, str(export_path))
            except Exception as exc:
                logger.warning("Model MinIO upload skipped: %s", exc)

        db.commit()
        db.refresh(model_version)
        return {
            "message": "model exported",
            "model_version_id": model_version.id,
            "version": model_version.version,
            "model_path": model_version.model_path,
            "report_path": str(report_path),
            "is_default": model_version.is_default,
        }

    @staticmethod
    def get_model_download_path(db, task_id: int) -> dict:
        task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
        if not task:
            return {"error": "training task not found"}
        weights_path = _get_task_weights_path(task)
        if not weights_path.exists():
            return {"error": f"best.pt not found: {weights_path}"}
        return {"path": str(weights_path), "filename": f"best_{task.task_uuid}.pt"}

    @staticmethod
    def predict_image(
        db,
        task_id: int,
        image_bytes: bytes,
        filename: str,
        conf: float = 0.25,
        iou: float = 0.45,
        device: str | None = None,
    ) -> dict:
        task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
        if not task:
            return {"error": "training task not found"}
        weights_path = _get_task_weights_path(task)
        if not weights_path.exists():
            return {"error": f"best.pt not found: {weights_path}"}

        suffix = Path(filename).suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
            return {"error": "unsupported image type"}

        tmp_path = None
        try:
            from PIL import Image
            from ultralytics import YOLO

            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                tmp_file.write(image_bytes)
                tmp_path = tmp_file.name

            model = YOLO(str(weights_path))
            results = model.predict(
                source=tmp_path,
                conf=conf,
                iou=iou,
                imgsz=task.img_size or 640,
                device=device or task.device or "cpu",
                verbose=False,
            )
            result = results[0]
            detections = []
            class_counts: dict[str, int] = {}
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = model.names.get(class_id, str(class_id))
                confidence = float(box.conf[0])
                xyxy = [round(float(v), 2) for v in box.xyxy[0].tolist()]
                detections.append(
                    {
                        "class_id": class_id,
                        "class_name": class_name,
                        "confidence": round(confidence, 4),
                        "bbox": xyxy,
                    }
                )
                class_counts[class_name] = class_counts.get(class_name, 0) + 1

            plotted = result.plot()[:, :, ::-1]
            image = Image.fromarray(plotted)
            import io

            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=85)
            annotated_base64 = base64.b64encode(buffer.getvalue()).decode("ascii")

            return {
                "filename": filename,
                "total_objects": len(detections),
                "detections": detections,
                "class_counts": class_counts,
                "annotated_image": f"data:image/jpeg;base64,{annotated_base64}",
                "inference_time": round(float(result.speed.get("inference", 0)), 2),
            }
        except Exception as exc:
            logger.error("Prediction failed: task_id=%s error=%s", task_id, exc, exc_info=True)
            return {"error": str(exc)}
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass


def _replace_yaml_path(content: str, path_value: str) -> str:
    lines = content.splitlines()
    for idx, line in enumerate(lines):
        if line.strip().startswith("path:"):
            lines[idx] = f"path: {path_value}"
            return "\n".join(lines) + ("\n" if content.endswith("\n") else "")
    return f"path: {path_value}\n{content}"


def _safe_float(value) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _get_task_weights_path(task: TrainingTask) -> Path:
    return Path.cwd() / settings.TRAIN_OUTPUT_DIR / f"task_{task.task_uuid}" / "weights" / "best.pt"


def _build_eval_report(task: TrainingTask, model, results, split: str) -> dict:
    overall = {
        "precision": round(float(results.box.mp), 6),
        "recall": round(float(results.box.mr), 6),
        "map50": round(float(results.box.map50), 6),
        "map50_95": round(float(results.box.map), 6),
    }
    per_class = {}
    if results.box.ap is not None:
        for index, ap50 in enumerate(results.box.ap50):
            class_name = model.names.get(index, f"class_{index}")
            ap50_95 = results.box.ap[index] if index < len(results.box.ap) else 0.0
            per_class[class_name] = {
                "ap50": round(float(ap50), 6),
                "ap50_95": round(float(ap50_95), 6),
            }
    return {
        "task_id": task.id,
        "task_uuid": task.task_uuid,
        "split": split,
        "overall": overall,
        "per_class": per_class,
    }


def _upsert_model_version(db, task: TrainingTask, weights_path: Path, report: dict):
    from app.entity.db_models import DetectionScene, ModelVersion

    scene = db.query(DetectionScene).filter(DetectionScene.id == task.scene_id).first()
    model_version = db.query(ModelVersion).filter(ModelVersion.training_task_id == task.id).first()
    if not model_version:
        existing_count = db.query(ModelVersion).filter(ModelVersion.scene_id == task.scene_id).count()
        version = f"v{existing_count + 1}.0.0"
        model_version = ModelVersion(
            scene_id=task.scene_id,
            training_task_id=task.id,
            version=version,
            model_name=f"{scene.name}_{version}" if scene else f"task_{task.task_uuid}_{version}",
            model_type=task.model_name,
            model_path=str(weights_path),
        )
        db.add(model_version)

    overall = report.get("overall", {})
    model_version.map50 = overall.get("map50")
    model_version.map50_95 = overall.get("map50_95")
    model_version.precision = overall.get("precision")
    model_version.recall = overall.get("recall")
    model_version.per_class_ap = report.get("per_class")
    model_version.file_size = weights_path.stat().st_size if weights_path.exists() else None
    model_version.description = model_version.description or f"Generated from training task {task.task_uuid}"
    db.commit()
    db.refresh(model_version)
    return model_version


def _task_to_dict(task: TrainingTask) -> dict:
    return {
        "id": task.id,
        "scene_id": task.scene_id,
        "task_uuid": task.task_uuid,
        "status": task.status,
        "model_name": task.model_name,
        "epochs": task.epochs,
        "current_epoch": task.current_epoch,
        "progress": task.progress,
        "device": task.device,
        "batch_size": task.batch_size,
        "img_size": task.img_size,
        "dataset_name": os.path.basename(task.dataset_path or "") or None,
        "dataset_path": task.dataset_path,
        "data_yaml": task.data_yaml,
        "created_at": str(task.created_at) if task.created_at else None,
        "started_at": str(task.started_at) if task.started_at else None,
        "completed_at": str(task.completed_at) if task.completed_at else None,
        "error_message": task.error_message,
    }


def _metric_to_dict(metric: TrainingMetric) -> dict:
    return {
        "epoch": metric.epoch,
        "box_loss": metric.box_loss,
        "cls_loss": metric.cls_loss,
        "dfl_loss": metric.dfl_loss,
        "precision": metric.precision,
        "recall": metric.recall,
        "map50": metric.map50,
        "map50_95": metric.map50_95,
        "lr": metric.lr,
    }


training_service = TrainingService()
