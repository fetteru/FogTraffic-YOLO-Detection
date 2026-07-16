"""Chat API routes."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from app.agent.detection_agent import detection_agent
from app.api.auth import get_current_user


router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat/stream")
async def chat_stream(
    message: str = Form(...),
    session_id: str = Form("default"),
    files: list[UploadFile] | None = File(None),
    current_user=Depends(get_current_user),
):
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
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
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
