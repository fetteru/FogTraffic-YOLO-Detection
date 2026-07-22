"""Chat API routes."""

from __future__ import annotations

import json
import os
import tempfile
import asyncio
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from app.agent.detection_agent import detection_agent
from app.database.session import get_db
from app.middleware.permission_checker import require_permission
from app.services.rbac_service import user_has_permission


router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat/stream")
async def chat_stream(
    request: Request,
    current_user=Depends(require_permission("agent:chat")),
    db: Session = Depends(get_db),
):
    message, session_id, files = await _parse_chat_request(request)
    required_permission = _required_detection_permission(files)
    if required_permission and not user_has_permission(db, current_user, required_permission):
        raise HTTPException(
            status_code=403,
            detail=f"Permission required: {required_permission}",
        )
    tmp_paths = []
    try:
        if files:
            for upload in files:
                suffix = Path(upload.filename or "").suffix or ".jpg"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                    tmp_file.write(await upload.read())
                    tmp_paths.append(tmp_file.name)

        async def event_generator():
            try:
                async for event in detection_agent.stream_chat(
                    message,
                    image_paths=tmp_paths,
                    session_id=session_id,
                    user_id=current_user.id,
                ):
                    if await request.is_disconnected():
                        break
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                if not await request.is_disconnected():
                    yield "data: [DONE]\n\n"
            except asyncio.CancelledError:
                raise
            finally:
                _cleanup_files(tmp_paths)

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception:
        _cleanup_files(tmp_paths)
        raise


def _cleanup_files(paths: list[str]) -> None:
    for path in paths:
        try:
            os.unlink(path)
        except OSError:
            pass


def _required_detection_permission(files: list[UploadFile]) -> str | None:
    if not files:
        return None
    if any(_is_zip_file(item) for item in files):
        return "detection:zip"
    if any(_is_video_file(item) for item in files):
        return "detection:video"
    if len(files) > 1:
        return "detection:batch"
    return "detection:scan"


def _is_zip_file(file: UploadFile) -> bool:
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    return filename.endswith(".zip") or "zip" in content_type


def _is_video_file(file: UploadFile) -> bool:
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    video_suffixes = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv"}
    return content_type.startswith("video/") or Path(filename).suffix in video_suffixes


async def _parse_chat_request(request: Request) -> tuple[str, str, list[UploadFile]]:
    content_type = request.headers.get("content-type", "")
    files: list[UploadFile] = []
    attachment_names: list[str] = []

    if "multipart/form-data" in content_type:
        form = await request.form()
        message = str(form.get("message") or form.get("content") or "").strip()
        session_id = str(form.get("session_id") or "default")
        for key in ("files", "file"):
            for item in form.getlist(key):
                if isinstance(item, UploadFile):
                    files.append(item)
                    attachment_names.append(item.filename or "upload")
    elif "application/json" in content_type:
        payload = await request.json()
        message = str(payload.get("message") or payload.get("content") or "").strip()
        session_id = str(payload.get("session_id") or "default")
    else:
        payload = await request.body()
        message = payload.decode("utf-8", errors="ignore").strip()
        session_id = "default"

    if attachment_names:
        message = (
            f"{message}\n\n"
            f"用户附加了文件：{', '.join(attachment_names)}。"
            "附件仅交给后端 YOLO 检测工具处理；大模型只能看到结构化检测摘要，不能接收原始图片、视频或 base64。"
        ).strip()

    if not message:
        raise HTTPException(status_code=422, detail="message or files is required")
    return message, session_id, files
