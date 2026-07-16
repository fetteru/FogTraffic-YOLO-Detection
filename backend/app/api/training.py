"""Training API routes."""

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.config.settings import settings
from app.core.logger import get_logger
from app.database.session import get_db
from app.entity.db_models import DetectionScene
from app.entity.schemas import ModelExportRequest, ModelValidateRequest, TrainingTaskCreate
from app.training.training_service import training_service


logger = get_logger(__name__)
router = APIRouter(prefix="/api/training", tags=["model training"])


@router.post("/start")
async def start_training(
    request: TrainingTaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    scene = db.query(DetectionScene).filter(DetectionScene.id == request.scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="detection scene not found")

    backend_dir = Path(__file__).resolve().parents[2]
    dataset_path = backend_dir / settings.DATASET_BASE_DIR / scene.name / "yolo_dataset"
    data_yaml = dataset_path / "data.yaml"
    if not data_yaml.exists():
        raise HTTPException(
            status_code=400,
            detail=f"data.yaml does not exist: {data_yaml}. Please prepare the dataset first.",
        )

    config = {
        "model_name": request.model_name,
        "epochs": request.epochs,
        "img_size": request.img_size,
        "batch_size": request.batch_size,
        "device": request.device,
        "optimizer": request.optimizer,
        "lr0": request.lr0,
        "augment_config": request.augment_config,
        "dataset_path": str(dataset_path),
        "data_yaml": str(data_yaml),
    }
    try:
        task = training_service.start_training(db, current_user.id, request.scene_id, config)
    except Exception as exc:
        logger.error("Failed to start training: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"failed to start training: {exc}")

    return {
        "id": task.id,
        "task_uuid": task.task_uuid,
        "status": task.status,
        "model_name": task.model_name,
        "epochs": task.epochs,
        "message": "training task created",
    }


@router.get("/tasks")
async def list_training_tasks(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tasks = training_service.get_task_list(db, user_id=current_user.id)
    return {"total": len(tasks), "items": tasks}


@router.get("/status/{task_id}")
async def get_training_status(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    status = training_service.get_training_status(db, task_id)
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])
    return status


@router.get("/metrics/{task_id}")
async def get_training_metrics(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    metrics = training_service.get_training_metrics(db, task_id)
    return {"task_id": task_id, "total": len(metrics), "metrics": metrics}


@router.post("/stop/{task_id}")
async def stop_training(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = training_service.stop_training(db, task_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/results/{task_uuid}")
async def get_results_csv(
    task_uuid: str,
    current_user=Depends(get_current_user),
):
    results_path = Path(settings.TRAIN_OUTPUT_DIR) / f"task_{task_uuid}" / "results.csv"
    if not results_path.exists():
        raise HTTPException(status_code=404, detail="results.csv not found")
    return FileResponse(
        path=str(results_path),
        media_type="text/csv",
        filename=f"training_results_{task_uuid}.csv",
    )


@router.post("/validate/{task_id}")
async def validate_model(
    task_id: int,
    request: ModelValidateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = training_service.validate_model(
        db=db,
        task_id=task_id,
        split=request.split,
        conf=request.conf,
        iou=request.iou,
        device=request.device,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/export/{task_id}")
async def export_model(
    task_id: int,
    request: ModelExportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = training_service.export_model(
        db=db,
        task_id=task_id,
        version=request.version,
        description=request.description,
        set_default=request.set_default,
        upload_minio=request.upload_minio,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/download/{task_id}")
async def download_model(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = training_service.get_model_download_path(db, task_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return FileResponse(
        path=result["path"],
        media_type="application/octet-stream",
        filename=result["filename"],
    )


@router.post("/predict")
async def predict_with_model(
    task_id: int = Form(...),
    conf: float = Form(0.25),
    iou: float = Form(0.45),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    result = training_service.predict_image(
        db=db,
        task_id=task_id,
        image_bytes=content,
        filename=file.filename or "upload.jpg",
        conf=conf,
        iou=iou,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
