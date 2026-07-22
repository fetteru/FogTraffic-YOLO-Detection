"""Training API routes."""

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.core.logger import get_logger
from app.database.session import get_db
from app.entity.db_models import DetectionScene
from app.entity.schemas import ModelExportRequest, ModelValidateRequest, TrainingTaskCreate
from app.middleware.permission_checker import require_permission
from app.training.training_service import training_service


logger = get_logger(__name__)
router = APIRouter(prefix="/api/training", tags=["model training"])


def _default_training_scene(db: Session) -> DetectionScene:
    scene = db.query(DetectionScene).filter(DetectionScene.name == "traffic_rain_fog").first()
    if scene:
        return scene
    scene = DetectionScene(
        name="traffic_rain_fog",
        display_name="Rain/Fog Traffic Detection",
        description="Default scene for rain/fog/low-light traffic warning training",
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
    db.commit()
    db.refresh(scene)
    return scene


@router.get("/datasets")
async def list_training_datasets(
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("dataset:view")),
):
    backend_dir = Path(__file__).resolve().parents[2]
    dataset_root = (backend_dir / settings.DATASET_BASE_DIR).resolve()
    scene = _default_training_scene(db)
    items = []
    if dataset_root.exists():
        for index, data_yaml in enumerate(sorted(dataset_root.rglob("data.yaml")), start=1):
            dataset_dir = data_yaml.parent
            train_images = dataset_dir / "train" / "images"
            valid_images = dataset_dir / "valid" / "images"
            val_images = dataset_dir / "val" / "images"
            train_count = len(list(train_images.glob("*"))) if train_images.exists() else 0
            val_dir = valid_images if valid_images.exists() else val_images
            val_count = len(list(val_dir.glob("*"))) if val_dir.exists() else 0
            rel_name = dataset_dir.relative_to(dataset_root).as_posix()
            items.append(
                {
                    "id": index,
                    "name": rel_name,
                    "scene_id": scene.id,
                    "scene_name": scene.name,
                    "display_name": rel_name,
                    "format": "YOLO",
                    "dataset_path": str(dataset_dir),
                    "data_yaml": str(data_yaml),
                    "train": train_count,
                    "val": val_count,
                    "images": train_count + val_count,
                    "classes": scene.class_names or [],
                    "status": "ready",
                }
            )
    return {"total": len(items), "items": items}


@router.post("/start")
async def start_training(
    request: TrainingTaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("training:create")),
):
    scene = db.query(DetectionScene).filter(DetectionScene.id == request.scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="detection scene not found")

    backend_dir = Path(__file__).resolve().parents[2]
    dataset_root = (backend_dir / settings.DATASET_BASE_DIR).resolve()
    if request.data_yaml:
        data_yaml = Path(request.data_yaml).expanduser().resolve()
        dataset_path = data_yaml.parent
        if dataset_root not in data_yaml.parents:
            raise HTTPException(status_code=400, detail="data.yaml must be inside backend datasets directory")
    elif request.dataset_path:
        dataset_path = Path(request.dataset_path).expanduser().resolve()
        data_yaml = dataset_path / "data.yaml"
        if dataset_root not in dataset_path.parents and dataset_path != dataset_root:
            raise HTTPException(status_code=400, detail="dataset_path must be inside backend datasets directory")
    else:
        dataset_path = backend_dir / settings.DATASET_BASE_DIR / scene.name / "yolo_dataset"
        data_yaml = dataset_path / "data.yaml"
    if not data_yaml.exists():
        raise HTTPException(
            status_code=400,
            detail=f"data.yaml does not exist: {data_yaml}. Please prepare the dataset first.",
        )
    base_model_path = None
    if request.base_model_path:
        project_root = Path(__file__).resolve().parents[3]
        models_root = (project_root / "models").resolve()
        base_model_path = Path(request.base_model_path).expanduser().resolve()
        if models_root not in base_model_path.parents:
            raise HTTPException(status_code=400, detail="base model must be inside project models directory")
        if not base_model_path.exists():
            raise HTTPException(status_code=400, detail=f"base model does not exist: {base_model_path}")

    config = {
        "model_name": request.model_name,
        "base_model_path": str(base_model_path) if base_model_path else None,
        "epochs": request.epochs,
        "img_size": request.img_size,
        "batch_size": request.batch_size,
        "device": request.device,
        "optimizer": request.optimizer,
        "lr0": request.lr0,
        "augment_config": request.augment_config,
        "dataset_path": str(dataset_path),
        "data_yaml": str(data_yaml),
        "dataset_name": request.dataset_name,
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
    current_user=Depends(require_permission("training:view")),
):
    tasks = training_service.get_task_list(db, user_id=current_user.id)
    return {"total": len(tasks), "items": tasks}


@router.get("/status/{task_id}")
async def get_training_status(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("training:view")),
):
    status = training_service.get_training_status(db, task_id)
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])
    return status


@router.get("/metrics/{task_id}")
async def get_training_metrics(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("training:evaluate")),
):
    metrics = training_service.get_training_metrics(db, task_id)
    return {"task_id": task_id, "total": len(metrics), "metrics": metrics}


@router.post("/stop/{task_id}")
async def stop_training(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("training:create")),
):
    result = training_service.stop_training(db, task_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/results/{task_uuid}")
async def get_results_csv(
    task_uuid: str,
    current_user=Depends(require_permission("training:evaluate")),
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
    current_user=Depends(require_permission("training:evaluate")),
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
    current_user=Depends(require_permission("training:evaluate")),
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
    current_user=Depends(require_permission("training:evaluate")),
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
    current_user=Depends(require_permission("training:evaluate")),
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
