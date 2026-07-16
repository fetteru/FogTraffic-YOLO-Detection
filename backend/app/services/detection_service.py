"""YOLO detection service for image, video and live camera uploads."""

from __future__ import annotations

import base64
import io
import os
import shutil
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image

from app.agent.rain_fog_workflow import run_rain_fog_workflow
from app.agent.tracking_agent import SimpleIoUTracker
from app.agent.visibility_agent import analyze_frame
from app.config.settings import settings
from app.core.logger import get_logger
from app.database.session import SessionLocal
from app.entity.db_models import DetectionResult, DetectionScene, DetectionTask


logger = get_logger(__name__)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv"}


class DetectionService:
    """Run YOLO inference and normalize detection results for API/frontend."""

    def __init__(self) -> None:
        self._model = None
        self._model_path = ""

    def _get_model(self):
        from ultralytics import YOLO

        model_path = Path(settings.DEFAULT_MODEL_PATH)
        if not model_path.is_absolute():
            model_path = Path.cwd() / model_path
        if not model_path.exists():
            fallback = Path.cwd() / "yolo11n.pt"
            if fallback.exists():
                model_path = fallback
            else:
                raise FileNotFoundError(f"model weights not found: {model_path}")

        resolved = str(model_path.resolve())
        if self._model is None or self._model_path != resolved:
            logger.info("Loading detection model: %s", resolved)
            self._model = YOLO(resolved)
            self._model_path = resolved
        return self._model

    def detect_single(
        self,
        image_path: str | Path,
        conf: float = 0.25,
        iou: float = 0.45,
        save: bool = False,
    ) -> dict:
        path = Path(image_path)
        if not path.exists():
            return {"error": f"image not found: {path}"}
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            return {"error": f"unsupported image type: {path.suffix}"}

        model = self._get_model()
        results = model.predict(
            source=str(path),
            conf=conf,
            iou=iou,
            imgsz=640,
            save=save,
            project=str(Path.cwd() / settings.DETECTION_OUTPUT_DIR),
            name="chat_predict",
            exist_ok=True,
            verbose=False,
        )
        result = results[0]
        detections = []
        class_counts: dict[str, int] = {}
        for box in result.boxes:
            class_id = int(box.cls[0])
            class_name = model.names.get(class_id, str(class_id))
            confidence = round(float(box.conf[0]), 4)
            bbox = [round(float(v), 2) for v in box.xyxy[0].tolist()]
            detections.append(
                {
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": confidence,
                    "bbox": bbox,
                }
            )
            class_counts[class_name] = class_counts.get(class_name, 0) + 1

        annotated_image = _result_to_base64(result)
        payload = {
            "filename": path.name,
            "image_path": str(path),
            "total_objects": len(detections),
            "class_counts": class_counts,
            "detections": detections,
            "annotated_image": annotated_image,
            "inference_time": round(float(result.speed.get("inference", 0)), 2),
        }
        payload["rain_fog_analysis"] = run_rain_fog_workflow(payload, image_path=str(path))
        return payload

    def detect_batch(
        self,
        image_paths: Iterable[str | Path],
        conf: float = 0.25,
        iou: float = 0.45,
    ) -> dict:
        items = []
        total_objects = 0
        class_counts: dict[str, int] = {}
        for image_path in image_paths:
            result = self.detect_single(image_path, conf=conf, iou=iou)
            items.append(result)
            if "error" in result:
                continue
            total_objects += int(result.get("total_objects", 0))
            for class_name, count in result.get("class_counts", {}).items():
                class_counts[class_name] = class_counts.get(class_name, 0) + int(count)
        payload = {
            "total_images": len(items),
            "total_objects": total_objects,
            "class_counts": class_counts,
            "items": items,
        }
        payload["rain_fog_analysis"] = run_rain_fog_workflow(payload)
        return payload

    def detect_zip(self, zip_path: str | Path, conf: float = 0.25, iou: float = 0.45) -> dict:
        zip_file = Path(zip_path)
        if not zip_file.exists():
            return {"error": f"zip not found: {zip_file}"}
        image_paths = []
        with tempfile.TemporaryDirectory(prefix="rsod_zip_") as tmp_dir:
            with zipfile.ZipFile(zip_file, "r") as archive:
                archive.extractall(tmp_dir)
            for path in Path(tmp_dir).rglob("*"):
                if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                    image_paths.append(path)
            if not image_paths:
                return {"error": "zip has no supported images"}
            return self.detect_batch(image_paths, conf=conf, iou=iou)

    def detect_upload_bytes(
        self,
        data: bytes,
        filename: str,
        conf: float = 0.25,
        iou: float = 0.45,
    ) -> dict:
        suffix = Path(filename).suffix.lower()
        if suffix not in IMAGE_EXTENSIONS:
            return {"error": f"unsupported image type: {suffix}"}
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_file.write(data)
            tmp_path = tmp_file.name
        try:
            result = self.detect_single(tmp_path, conf=conf, iou=iou)
            result["filename"] = filename
            return result
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    def create_detection_task(
        self,
        user_id: int,
        task_type: str,
        conf: float = 0.25,
        iou: float = 0.45,
        task_name: str | None = None,
        status: str = "processing",
        source_type: str | None = None,
    ) -> int | None:
        """Create a database task row for async or long-running detection."""
        db = SessionLocal()
        try:
            scene = _get_or_create_default_scene(db)
            task = DetectionTask(
                task_name=task_name or f"{task_type} detection",
                user_id=user_id,
                scene_id=scene.id,
                task_type=task_type,
                source_type=source_type or task_type,
                status=status,
                conf_threshold=conf,
                iou_threshold=iou,
                started_at=_now(),
            )
            db.add(task)
            db.commit()
            db.refresh(task)
            return task.id
        except Exception as exc:
            db.rollback()
            logger.warning("Create detection task DB record failed: %s", exc)
            return None
        finally:
            db.close()

    def mark_detection_task_failed(self, db_task_id: int | None, error: str) -> None:
        """Mark a saved detection task as failed."""
        if not db_task_id:
            return
        db = SessionLocal()
        try:
            task = db.query(DetectionTask).filter(DetectionTask.id == db_task_id).first()
            if task:
                task.status = "failed"
                task.error_message = error
                task.finished_at = _now()
                task.completed_at = _now()
                db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning("Update failed detection task DB record failed: %s", exc)
        finally:
            db.close()

    def save_detection_result(
        self,
        user_id: int,
        task_type: str,
        result: dict,
        conf: float = 0.25,
        iou: float = 0.45,
        task_name: str | None = None,
    ) -> int | None:
        """Persist image, batch, zip or completed video detection result."""
        db = SessionLocal()
        try:
            scene = _get_or_create_default_scene(db)
            items = _flatten_result_items(result)
            total_images = int(result.get("total_images") or (1 if task_type == "single" else len(items)))
            total_objects = int(result.get("total_objects") or sum(item.get("total_objects", 0) for item in items))
            total_inference_time = float(
                result.get("total_inference_time")
                or result.get("inference_time")
                or sum(float(item.get("inference_time") or 0) for item in items)
            )
            task = DetectionTask(
                task_name=task_name or result.get("filename") or f"{task_type} detection",
                user_id=user_id,
                scene_id=scene.id,
                task_type=task_type,
                source_type="folder" if task_type == "zip" else task_type,
                status="completed",
                total_images=total_images,
                total_frames=int(result.get("total_frames") or 0),
                processed_frames=int(result.get("processed_frames") or result.get("sampled_frames") or 0),
                total_objects=total_objects,
                vehicle_count=total_objects,
                total_inference_time=total_inference_time,
                conf_threshold=conf,
                iou_threshold=iou,
                result_path=result.get("output_path") or result.get("image_path") or result.get("filename"),
                started_at=_now(),
                finished_at=_now(),
                completed_at=_now(),
            )
            db.add(task)
            db.flush()
            for item in items:
                image_path = item.get("image_path") or item.get("filename") or result.get("filename") or ""
                inference_time = float(item.get("inference_time") or result.get("inference_time") or 0)
                for detection in item.get("detections", []):
                    _add_detection_result(db, task.id, image_path, detection, inference_time)
            db.commit()
            return task.id
        except Exception as exc:
            db.rollback()
            logger.warning("Save detection DB records failed: %s", exc)
            return None
        finally:
            db.close()

    def detect_video(
        self,
        video_path: str | Path,
        task_id: str,
        conf: float = 0.25,
        iou: float = 0.45,
        sample_interval: int = 5,
        max_frames: int = 0,
        output_dir: str | Path | None = None,
        db_task_id: int | None = None,
        progress_callback=None,
    ) -> dict:
        path = Path(video_path)
        if not path.exists():
            return {"error": f"video not found: {path}"}
        if path.suffix.lower() not in VIDEO_EXTENSIONS:
            return {"error": f"unsupported video type: {path.suffix}"}

        output_root = Path(output_dir or Path.cwd() / settings.DETECTION_OUTPUT_DIR / "videos")
        output_root.mkdir(parents=True, exist_ok=True)
        raw_output_path = output_root / f"{task_id}_raw.mp4"
        final_output_path = output_root / f"{task_id}.mp4"

        cap = cv2.VideoCapture(str(path))
        if not cap.isOpened():
            return {"error": "failed to open video"}
        if progress_callback:
            progress_callback(2)

        started = time.perf_counter()
        logger.info("Video detection started: task=%s path=%s", task_id, path)
        model = self._get_model()
        if progress_callback:
            progress_callback(4)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        if width <= 0 or height <= 0:
            cap.release()
            return {"error": "invalid video dimensions"}
        if progress_callback:
            progress_callback(5)

        writer = cv2.VideoWriter(
            str(raw_output_path),
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (width, height),
        )

        detections_by_frame = []
        key_frames = []
        class_counts: dict[str, int] = {}
        total_objects = 0
        total_inference_time = 0.0
        processed_frames = 0
        detected_frames = 0
        last_detections = []
        tracker = SimpleIoUTracker(iou_threshold=0.25, max_lost=3)
        visibility_samples = []
        sample_interval = max(1, int(sample_interval))
        max_frames = int(max_frames or 0)
        unlimited_detection = max_frames <= 0
        db_results = []

        try:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                should_detect = processed_frames % sample_interval == 0 and (
                    unlimited_detection or detected_frames < max_frames
                )
                frame_detections = last_detections
                inference_time = 0.0

                if should_detect:
                    result = model.predict(
                        source=frame,
                        conf=conf,
                        iou=iou,
                        imgsz=640,
                        verbose=False,
                    )[0]
                    raw_detections = _boxes_to_detections(result, model)
                    visibility_samples.append(analyze_frame(frame, raw_detections))
                    frame_detections = tracker.update(raw_detections, processed_frames)
                    last_detections = frame_detections
                    inference_time = round(float(result.speed.get("inference", 0)), 2)
                    total_inference_time += inference_time
                    detected_frames += 1
                    total_objects += len(frame_detections)
                    for item in frame_detections:
                        name = item["class_name"]
                        class_counts[name] = class_counts.get(name, 0) + 1
                    annotated_frame = _draw_detections_on_frame(frame, frame_detections)
                    annotated_image = _frame_to_base64(annotated_frame)
                    frame_item = {
                        "frame_index": processed_frames,
                        "frame_number": processed_frames,
                        "time_sec": round(processed_frames / fps, 2),
                        "frame_time": round(processed_frames / fps, 3),
                        "total_objects": len(frame_detections),
                        "detections": frame_detections,
                        "annotated_image": annotated_image,
                        "inference_time": inference_time,
                    }
                    detections_by_frame.append(frame_item)
                    key_frames.append(
                        {
                            "frame_number": frame_item["frame_number"],
                            "frame_time": frame_item["frame_time"],
                            "image": annotated_image,
                            "detections": frame_detections,
                        }
                    )
                    for item in frame_detections:
                        db_results.append((processed_frames, frame_item["frame_time"], item, inference_time, width, height))
                else:
                    annotated_frame = _draw_detections_on_frame(frame, frame_detections)

                writer.write(annotated_frame)
                processed_frames += 1
                if progress_callback and frame_count:
                    progress = min(95, int(processed_frames / frame_count * 95))
                    progress_callback(progress)
                elif progress_callback and detected_frames and detected_frames % 5 == 0:
                    progress_callback(min(90, 5 + detected_frames))
        finally:
            cap.release()
            writer.release()

        if progress_callback:
            progress_callback(96)
        _transcode_for_browser(raw_output_path, final_output_path)
        try:
            raw_output_path.unlink(missing_ok=True)
        except OSError:
            pass
        local_video_url = f"/static/detections/videos/{final_output_path.name}"
        video_url = local_video_url
        video_object_name = f"detections/{task_id}/annotated_video.mp4"
        try:
            from app.storage.minio_client import MinIOClient

            video_url = MinIOClient().upload_file(
                video_object_name,
                str(final_output_path),
                content_type="video/mp4",
            )
        except Exception as exc:
            logger.warning("Upload annotated video to MinIO failed, using local URL: %s", exc)
        if db_task_id:
            self._save_video_task_to_db(
                db_task_id=db_task_id,
                task_id=task_id,
                video_path=str(path),
                output_path=str(final_output_path),
                total_frames=processed_frames,
                processed_frames=detected_frames,
                total_objects=total_objects,
                total_inference_time=total_inference_time,
                unique_vehicle_count=tracker.unique_vehicle_count,
                db_results=db_results,
            )

        payload = {
            "task_id": task_id,
            "db_task_id": db_task_id,
            "filename": path.name,
            "video_url": video_url,
            "annotated_video_url": video_url,
            "local_video_url": local_video_url,
            "video_object_name": video_object_name,
            "output_path": str(final_output_path),
            "total_frames": processed_frames,
            "sampled_frames": detected_frames,
            "processed_frames": detected_frames,
            "frame_sample_rate": sample_interval,
            "fps": round(float(fps), 2),
            "duration": round(processed_frames / fps, 2) if fps else 0,
            "duration_seconds": round(processed_frames / fps, 2) if fps else 0,
            "video_resolution": {"width": width, "height": height},
            "total_objects": total_objects,
            "unique_vehicle_count": tracker.unique_vehicle_count,
            "sampled_class_counts": class_counts,
            "unique_class_counts": tracker.unique_vehicle_class_counts,
            "class_counts": class_counts,
            "frames": detections_by_frame[:30],
            "key_frames": key_frames[:30],
            "inference_time": round((time.perf_counter() - started) * 1000, 2),
            "total_inference_time": round(total_inference_time, 2),
        }
        payload["rain_fog_analysis"] = run_rain_fog_workflow(
            payload,
            frames=detections_by_frame,
            visibility_samples=visibility_samples,
            db_task_id=db_task_id,
        )
        logger.info(
            "Video detection completed: task=%s frames=%s sampled=%s objects=%s unique_vehicles=%s",
            task_id,
            processed_frames,
            detected_frames,
            total_objects,
            tracker.unique_vehicle_count,
        )
        return payload

    def _save_video_task_to_db(
        self,
        db_task_id: int,
        task_id: str,
        video_path: str,
        output_path: str,
        total_frames: int,
        processed_frames: int,
        total_objects: int,
        total_inference_time: float,
        unique_vehicle_count: int,
        db_results: list[tuple[int, float, dict, float, int, int]],
    ) -> None:
        db = SessionLocal()
        try:
            task = db.query(DetectionTask).filter(DetectionTask.id == db_task_id).first()
            if task:
                task.status = "completed"
                task.total_frames = total_frames
                task.processed_frames = processed_frames
                task.total_objects = total_objects
                task.vehicle_count = unique_vehicle_count or total_objects
                task.total_inference_time = total_inference_time
                task.result_path = output_path
                task.completed_at = _now()
                task.finished_at = _now()
            for frame_number, frame_time, item, inference_time, width, height in db_results:
                x1, y1, x2, y2 = item["bbox"]
                db.add(
                    DetectionResult(
                        task_id=db_task_id,
                        image_path=video_path,
                        frame_number=frame_number,
                        frame_time=frame_time,
                        class_name=item["class_name"],
                        class_id=item["class_id"],
                        confidence=item["confidence"],
                        bbox=item["bbox"],
                        track_id=item.get("track_id"),
                        x1=x1,
                        y1=y1,
                        x2=x2,
                        y2=y2,
                        inference_time=inference_time,
                        image_width=width,
                        image_height=height,
                        detected_at=_now(),
                    )
                )
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning("Save video detection DB records failed: %s", exc)
        finally:
            db.close()

    def detect_camera_frame(
        self,
        frame_b64: str,
        conf: float = 0.25,
        iou: float = 0.45,
        mode: str = "cpu",
    ) -> dict:
        model = self._get_model()
        if "," in frame_b64:
            frame_b64 = frame_b64.split(",", 1)[1]
        frame_bytes = base64.b64decode(frame_b64)
        buffer = np.frombuffer(frame_bytes, dtype=np.uint8)
        frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "invalid frame data"}

        imgsz = 640 if mode == "gpu" else 416
        started = time.perf_counter()
        result = model.predict(source=frame, conf=conf, iou=iou, imgsz=imgsz, verbose=False)[0]
        detections = _boxes_to_detections(result, model)
        annotated = result.plot()
        ok, encoded = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        if not ok:
            return {"error": "failed to encode annotated frame"}

        return {
            "annotated_frame": base64.b64encode(encoded.tobytes()).decode("ascii"),
            "total_objects": len(detections),
            "detections": detections,
            "inference_time": round((time.perf_counter() - started) * 1000, 2),
            "mode": mode,
        }


def _result_to_base64(result) -> str:
    plotted = result.plot()[:, :, ::-1]
    image = Image.fromarray(plotted)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def _frame_to_base64(frame) -> str:
    ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    if not ok:
        return ""
    return f"data:image/jpeg;base64,{base64.b64encode(encoded.tobytes()).decode('ascii')}"


def _boxes_to_detections(result, model) -> list[dict]:
    detections = []
    for box in result.boxes:
        class_id = int(box.cls[0])
        detections.append(
            {
                "class_id": class_id,
                "class_name": model.names.get(class_id, str(class_id)),
                "confidence": round(float(box.conf[0]), 4),
                "bbox": [round(float(v), 2) for v in box.xyxy[0].tolist()],
            }
        )
    return detections


def _draw_detections_on_frame(frame, detections: list[dict]):
    annotated = frame.copy()
    for item in detections:
        x1, y1, x2, y2 = [int(v) for v in item["bbox"]]
        track = f' #{item["track_id"]}' if item.get("track_id") is not None else ""
        label = f'{item["class_name"]}{track} {item["confidence"]:.2f}'
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (46, 204, 113), 2)
        cv2.putText(
            annotated,
            label,
            (x1, max(18, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (46, 204, 113),
            2,
            cv2.LINE_AA,
        )
    return annotated


def _transcode_for_browser(input_path: Path, output_path: Path) -> None:
    ffmpeg = _get_ffmpeg_executable()
    if not ffmpeg:
        shutil.move(str(input_path), str(output_path))
        logger.warning("ffmpeg not found; video may not be playable in browser: %s", output_path)
        return
    import subprocess

    command = [
        ffmpeg,
        "-y",
        "-i",
        str(input_path),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(output_path),
    ]
    try:
        subprocess.run(command, check=True, capture_output=True)
    except Exception as exc:
        logger.warning("ffmpeg transcode failed, using mp4v output: %s", exc)
        shutil.move(str(input_path), str(output_path))


def _get_ffmpeg_executable() -> str | None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        return ffmpeg
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def _get_or_create_default_scene(db) -> DetectionScene:
    scene = db.query(DetectionScene).filter(DetectionScene.name == "traffic_rain_fog").first()
    if scene:
        return scene
    scene = DetectionScene(
        name="traffic_rain_fog",
        display_name="雨雾低光交通检测",
        description="Default scene for rain/fog/low-light traffic risk analysis",
        category="traffic",
        class_names=["car", "person", "truck", "bus", "motorcycle"],
        class_names_cn={
            "car": "汽车",
            "person": "行人",
            "truck": "货车",
            "bus": "公交车",
            "motorcycle": "摩托车",
        },
        is_active=True,
    )
    db.add(scene)
    db.flush()
    return scene


def _flatten_result_items(result: dict) -> list[dict]:
    if "items" in result:
        return [item for item in result.get("items", []) if "error" not in item]
    if "frames" in result:
        return [
            {
                "image_path": result.get("filename", ""),
                "frame_number": frame.get("frame_number"),
                "frame_time": frame.get("frame_time"),
                "detections": frame.get("detections", []),
                "inference_time": frame.get("inference_time"),
            }
            for frame in result.get("frames", [])
        ]
    return [result]


def _add_detection_result(db, task_id: int, image_path: str, detection: dict, inference_time: float) -> None:
    bbox = detection.get("bbox") or [0, 0, 0, 0]
    x1, y1, x2, y2 = (bbox + [0, 0, 0, 0])[:4]
    db.add(
        DetectionResult(
            task_id=task_id,
            image_path=image_path,
            class_name=detection.get("class_name", "unknown"),
            class_id=int(detection.get("class_id", -1)),
            confidence=float(detection.get("confidence", 0)),
            bbox=bbox,
            x1=x1,
            y1=y1,
            x2=x2,
            y2=y2,
            inference_time=inference_time,
            detected_at=_now(),
        )
    )


def _now():
    from datetime import datetime

    return datetime.now()


detection_service = DetectionService()
