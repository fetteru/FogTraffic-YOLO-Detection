"""Detection API routes for images, video tasks and live camera frames."""

from __future__ import annotations

import os
import tempfile
import threading
import time
import uuid
from pathlib import Path

from jose import JWTError
from sqlalchemy.orm import Session

from app.agent.alert_agent import save_alert
from app.core.security import decode_access_token
from app.database.session import SessionLocal, get_db
from app.entity.db_models import User
from app.middleware.permission_checker import require_permission
from app.services.rbac_service import user_has_permission
from app.services.detection_service import VIDEO_EXTENSIONS, detection_service
from app.storage.redis_client import redis_client
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketException,
    WebSocketDisconnect,
    status,
)
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/detection", tags=["detection"])

VIDEO_MAX_BYTES = 50 * 1024 * 1024
_video_tasks: dict[str, dict] = {}
_task_lock = threading.Lock()
_server_started_at = time.time()


@router.get("/models")
async def list_models(current_user=Depends(require_permission("detection:model:list"))):
    return {"models": detection_service.list_models()}


@router.post("/single")
async def detect_single(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
    iou: float = Form(0.45),
    model_version_id: int | None = Form(None),
    model_key: str | None = Form(None),
    current_user=Depends(require_permission("detection:scan")),
    db: Session = Depends(get_db),
):
    _ensure_model_switch_allowed(db, current_user, model_version_id, model_key)
    content = await file.read()
    result = detection_service.detect_upload_bytes(
        content,
        file.filename or "upload.jpg",
        conf=conf,
        iou=iou,
        model_version_id=model_version_id,
        model_key=model_key,
    )
    if "error" in result:
        return JSONResponse(status_code=400, content=result)
    result["db_task_id"] = detection_service.save_detection_result(
        user_id=current_user.id,
        task_type="single",
        result=result,
        conf=conf,
        iou=iou,
        task_name=file.filename or "single detection",
        model_version_id=_selected_model_version_id(model_version_id, model_key, result.get("model")),
    )
    _persist_analysis_alert(result)
    return result


@router.post("/batch")
async def detect_batch(
    files: list[UploadFile] = File(...),
    conf: float = Form(0.25),
    iou: float = Form(0.45),
    model_version_id: int | None = Form(None),
    model_key: str | None = Form(None),
    current_user=Depends(require_permission("detection:batch")),
    db: Session = Depends(get_db),
):
    _ensure_model_switch_allowed(db, current_user, model_version_id, model_key)
    tmp_paths = []
    try:
        for upload in files:
            suffix = Path(upload.filename or "").suffix or ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                tmp_file.write(await upload.read())
                tmp_paths.append(tmp_file.name)
        result = detection_service.detect_batch(
            tmp_paths,
            conf=conf,
            iou=iou,
            model_version_id=model_version_id,
            model_key=model_key,
        )
        if "error" in result:
            return JSONResponse(status_code=400, content=result)
        result["db_task_id"] = detection_service.save_detection_result(
            user_id=current_user.id,
            task_type="batch",
            result=result,
            conf=conf,
            iou=iou,
            task_name="batch detection",
            model_version_id=_selected_model_version_id(model_version_id, model_key, result.get("model")),
        )
        _persist_analysis_alert(result)
        return result
    finally:
        _cleanup_files(tmp_paths)


@router.post("/zip")
async def detect_zip(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
    iou: float = Form(0.45),
    model_version_id: int | None = Form(None),
    model_key: str | None = Form(None),
    current_user=Depends(require_permission("detection:zip")),
    db: Session = Depends(get_db),
):
    _ensure_model_switch_allowed(db, current_user, model_version_id, model_key)
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp_file:
            tmp_file.write(await file.read())
            tmp_path = tmp_file.name
        result = detection_service.detect_zip(
            tmp_path,
            conf=conf,
            iou=iou,
            model_version_id=model_version_id,
            model_key=model_key,
        )
        if "error" in result:
            return JSONResponse(status_code=400, content=result)
        result["db_task_id"] = detection_service.save_detection_result(
            user_id=current_user.id,
            task_type="zip",
            result=result,
            conf=conf,
            iou=iou,
            task_name=file.filename or "zip detection",
            model_version_id=_selected_model_version_id(model_version_id, model_key, result.get("model")),
        )
        _persist_analysis_alert(result)
        return result
    finally:
        if tmp_path:
            _cleanup_files([tmp_path])


@router.post("/video")
async def detect_video(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
    iou: float = Form(0.45),
    sample_interval: int = Form(5),
    max_frames: int = Form(0),
    model_version_id: int | None = Form(None),
    model_key: str | None = Form(None),
    current_user=Depends(require_permission("detection:video")),
    db: Session = Depends(get_db),
):
    _ensure_model_switch_allowed(db, current_user, model_version_id, model_key)
    filename = file.filename or "upload.mp4"
    suffix = Path(filename).suffix.lower()
    if suffix not in VIDEO_EXTENSIONS:
        return JSONResponse(
            status_code=400, content={"error": f"unsupported video type: {suffix}"}
        )

    content = await file.read()
    if len(content) > VIDEO_MAX_BYTES:
        return JSONResponse(
            status_code=400, content={"error": "video must be 50MB or smaller"}
        )

    task_id = uuid.uuid4().hex
    db_task_id = detection_service.create_detection_task(
        user_id=current_user.id,
        task_type="video",
        conf=conf,
        iou=iou,
        task_name=filename,
        source_type="video",
        model_version_id=_selected_model_version_id(model_version_id, model_key),
    )
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        tmp_file.write(content)
        tmp_path = tmp_file.name

    task_payload = {
        "task_id": task_id,
        "status": "processing",
        "progress": 0,
        "filename": filename,
        "db_task_id": db_task_id,
        "created_at": time.time(),
    }
    _set_task(task_id, task_payload)
    redis_client.set_json(f"video_task:{task_id}", task_payload, expire=3600)

    thread = threading.Thread(
        target=_run_video_task,
        args=(
            task_id,
            tmp_path,
            conf,
            iou,
            sample_interval,
            max_frames,
            db_task_id,
            model_version_id,
            model_key,
        ),
        daemon=True,
    )
    thread.start()
    return {"task_id": task_id, "db_task_id": db_task_id, "status": "processing", "progress": 0}


@router.get("/video/status/{task_id}")
async def get_video_status(
    task_id: str,
    current_user=Depends(require_permission("detection:video")),
):
    task = redis_client.get_json(f"video_task:{task_id}") or _get_task(task_id)
    if not task:
        return JSONResponse(status_code=404, content={"error": "video task not found"})
    if (
        task.get("status") == "processing"
        and float(task.get("created_at") or 0) < _server_started_at
    ):
        task.update(
            {
                "status": "failed",
                "progress": 100,
                "error": "后端服务已重启，当前视频任务已中断，请重新上传视频检测。",
                "updated_at": time.time(),
            }
        )
        _set_task(task_id, task)
    return task


@router.websocket("/camera")
async def detect_camera(websocket: WebSocket):
    websocket_user = _authorize_websocket_permission(websocket, "detection:camera")
    await websocket.accept()
    config = {
        "mode": "cpu",
        "conf": 0.25,
        "iou": 0.45,
        "model_version_id": None,
        "model_key": None,
    }
    frames = 0
    fps = 0
    fps_started = time.perf_counter()
    try:
        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")
            if msg_type == "config":
                next_model_version_id = payload.get("model_version_id")
                next_model_key = payload.get("model_key")
                if (next_model_version_id or next_model_key) and not websocket_user["can_switch_model"]:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "Permission required: detection:model:switch",
                        }
                    )
                    continue
                config.update(
                    {
                        "mode": payload.get("mode", "cpu"),
                        "conf": float(payload.get("conf", 0.25)),
                        "iou": float(payload.get("iou", 0.45)),
                        "model_version_id": next_model_version_id,
                        "model_key": next_model_key,
                    }
                )
                await websocket.send_json({"type": "config_ok", **config})
            elif msg_type == "frame":
                result = detection_service.detect_camera_frame(
                    payload.get("data", ""),
                    conf=config["conf"],
                    iou=config["iou"],
                    mode=config["mode"],
                    model_version_id=config.get("model_version_id"),
                    model_key=config.get("model_key"),
                )
                if "error" in result:
                    await websocket.send_json(
                        {"type": "error", "message": result["error"]}
                    )
                    continue

                frames += 1
                elapsed = time.perf_counter() - fps_started
                if elapsed >= 1:
                    fps = round(frames / elapsed, 1)
                    frames = 0
                    fps_started = time.perf_counter()
                await websocket.send_json({"type": "result", "fps": fps, **result})
            elif msg_type == "close":
                await websocket.close()
                break
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await websocket.send_json({"type": "error", "message": str(exc)})


def _run_video_task(
    task_id: str,
    tmp_path: str,
    conf: float,
    iou: float,
    sample_interval: int,
    max_frames: int,
    db_task_id: int | None,
    model_version_id: int | None,
    model_key: str | None,
) -> None:
    try:
        _update_task(task_id, status="processing", progress=1, message="视频任务已开始")
        result = detection_service.detect_video(
            tmp_path,
            task_id=task_id,
            conf=conf,
            iou=iou,
            sample_interval=sample_interval,
            max_frames=max_frames,
            db_task_id=db_task_id,
            progress_callback=lambda progress: _update_task(task_id, progress=progress),
            model_version_id=model_version_id,
            model_key=model_key,
        )
        if "error" in result:
            detection_service.mark_detection_task_failed(db_task_id, result["error"])
            _update_task(task_id, status="failed", progress=100, error=result["error"])
        else:
            _update_task(task_id, status="completed", progress=100, result=result)
    except Exception as exc:
        detection_service.mark_detection_task_failed(db_task_id, str(exc))
        _update_task(task_id, status="failed", progress=100, error=str(exc))
    finally:
        _cleanup_files([tmp_path])


def _set_task(task_id: str, payload: dict) -> None:
    with _task_lock:
        _video_tasks[task_id] = payload
    redis_client.set_json(f"video_task:{task_id}", payload, expire=3600)


def _get_task(task_id: str) -> dict | None:
    with _task_lock:
        task = _video_tasks.get(task_id)
        return dict(task) if task else None


def _update_task(task_id: str, **changes) -> None:
    with _task_lock:
        task = _video_tasks.setdefault(task_id, {"task_id": task_id})
        task.update(changes)
        task["updated_at"] = time.time()
        redis_client.set_json(f"video_task:{task_id}", dict(task), expire=3600)


def _cleanup_files(paths: list[str]) -> None:
    for path in paths:
        try:
            os.unlink(path)
        except OSError:
            pass


def _persist_analysis_alert(result: dict) -> None:
    analysis = result.get("rain_fog_analysis") or {}
    alert = analysis.get("alert")
    db_task_id = result.get("db_task_id")
    if not alert or not db_task_id:
        return
    alert_id = save_alert(db_task_id, alert)
    alert["alert_id"] = alert_id


def _ensure_model_switch_allowed(
    db: Session,
    current_user: User,
    model_version_id: int | None,
    model_key: str | None,
) -> None:
    if not model_version_id and not model_key:
        return
    if user_has_permission(db, current_user, "detection:model:switch"):
        return
    raise HTTPException(
        status_code=403,
        detail="Permission required: detection:model:switch",
    )


def _authorize_websocket_permission(websocket: WebSocket, permission_code: str) -> dict:
    token = websocket.query_params.get("token") or ""
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1].strip()
    if not token:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Missing authentication token",
        )

    db = SessionLocal()
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub") or 0)
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user_has_permission(db, user, permission_code):
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason=f"Permission required: {permission_code}",
            )
        return {
            "id": user.id,
            "can_switch_model": user_has_permission(db, user, "detection:model:switch"),
        }
    except (JWTError, ValueError, TypeError):
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Invalid authentication token",
        )
    finally:
        db.close()


def _selected_model_version_id(
    model_version_id: int | None,
    model_key: str | None,
    model_info: dict | None = None,
) -> int | None:
    if model_version_id:
        return model_version_id
    if model_info and model_info.get("model_version_id"):
        return int(model_info["model_version_id"])
    if model_key and model_key.startswith("db:"):
        try:
            return int(model_key.split(":", 1)[1])
        except ValueError:
            return None
    return None
