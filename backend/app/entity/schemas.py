"""
Pydantic request and response models.

These schemas are used for API input validation and output serialization.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# User and RBAC
class UserRegister(BaseModel):
    """User registration request."""

    username: str = Field(..., min_length=2, max_length=50, description="Username")
    email: str = Field(..., description="Email")
    password: str = Field(..., min_length=6, max_length=100, description="Password")


class UserLogin(BaseModel):
    """User login request."""

    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")


class UserBrief(BaseModel):
    """Brief user information embedded in token responses."""

    id: int
    username: str
    email: str
    avatar: Optional[str] = None
    roles: list[str] = []

    model_config = {
        "from_attributes": True,
    }


class TokenResponse(BaseModel):
    """Successful login response."""

    access_token: str
    token_type: str = "bearer"
    user: UserBrief


class UserResponse(BaseModel):
    """User detail response."""

    id: int
    username: str
    email: str
    phone: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool
    is_superuser: bool
    roles: list[str] = []
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class UserUpdate(BaseModel):
    """User profile update request."""

    phone: Optional[str] = None
    avatar: Optional[str] = None
    email: Optional[str] = None


class ChangePassword(BaseModel):
    """Change password request."""

    old_password: str = Field(..., description="Old password")
    new_password: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="New password",
    )


class RoleResponse(BaseModel):
    """Role response."""

    id: int
    name: str
    display_name: str
    description: Optional[str] = None
    is_system: bool
    permissions: list[str] = []
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class RoleCreate(BaseModel):
    """Create role request."""

    name: str = Field(..., min_length=2, max_length=50, description="Role code")
    display_name: str = Field(..., description="Role display name")
    description: Optional[str] = None
    permission_codes: list[str] = Field(default=[], description="Permission code list")


class PermissionResponse(BaseModel):
    """Permission response."""

    id: int
    code: str
    name: str
    module: str
    description: Optional[str] = None

    model_config = {
        "from_attributes": True,
    }


# Detection
class SceneCreate(BaseModel):
    """Create detection scene request."""

    name: str = Field(..., description="Scene code, such as remote_sensing")
    display_name: str = Field(..., description="Scene display name")
    description: Optional[str] = None
    category: str = Field(
        ...,
        description="Category: agriculture/industry/remote_sensing/medical/traffic",
    )
    class_names: list[str] = Field(..., description="Class list")
    class_names_cn: Optional[dict[str, str]] = Field(
        None,
        description="Chinese class name mapping",
    )


class SceneResponse(BaseModel):
    """Detection scene response."""

    id: int
    name: str
    display_name: str
    description: Optional[str] = None
    category: str
    class_names: list
    class_names_cn: Optional[dict] = None
    is_active: bool
    default_model: Optional["ModelVersionBrief"] = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class DetectionTaskResponse(BaseModel):
    """Detection task response."""

    id: int
    user_id: int
    scene_id: int
    scene_name: Optional[str] = None
    model_version_id: Optional[int] = None
    task_type: str
    status: str
    total_images: int
    total_objects: int
    total_inference_time: float
    conf_threshold: float
    iou_threshold: float
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
        "protected_namespaces": (),
    }


class DetectionResultResponse(BaseModel):
    """Single detection result response."""

    id: int
    task_id: int
    image_path: str
    annotated_image_url: Optional[str] = None
    class_name: str
    class_name_cn: Optional[str] = None
    class_id: int
    confidence: float
    bbox: list
    inference_time: Optional[float] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class DetectionTaskDetail(BaseModel):
    """Detection task detail response."""

    task: DetectionTaskResponse
    results: list[DetectionResultResponse] = []


class DetectionStatistics(BaseModel):
    """Detection statistics response."""

    total_tasks: int
    total_images: int
    total_objects: int
    avg_inference_time: float
    class_distribution: dict[str, int]
    daily_trend: list[dict]
    scene_distribution: dict[str, int]


# Model management
class TrainingTaskCreate(BaseModel):
    """Create training task request."""

    scene_id: int = Field(..., description="Related scene id")
    dataset_name: Optional[str] = Field(None, description="Dataset display name")
    dataset_path: Optional[str] = Field(None, description="Dataset directory")
    data_yaml: Optional[str] = Field(None, description="YOLO data.yaml path")
    model_name: str = Field(default="yolov11n", description="Base model")
    epochs: int = Field(default=100, ge=1, le=500, description="Training epochs")
    img_size: int = Field(default=640, description="Image size")
    batch_size: int = Field(default=16, ge=1, le=64, description="Batch size")
    device: str = Field(default="0", description="Training device")
    optimizer: str = Field(default="SGD", description="Optimizer")
    lr0: float = Field(default=0.01, description="Initial learning rate")
    augment_config: Optional[dict] = Field(None, description="Data augmentation config")

    model_config = {
        "protected_namespaces": (),
    }


class TrainingTaskResponse(BaseModel):
    """Training task response."""

    id: int
    user_id: int
    scene_id: int
    scene_name: Optional[str] = None
    task_uuid: str
    status: str
    model_name: str
    epochs: int
    current_epoch: int
    progress: int
    img_size: int
    batch_size: int
    device: str
    dataset_size: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
        "protected_namespaces": (),
    }


class TrainingMetricResponse(BaseModel):
    """Training metric response for one epoch."""

    epoch: int
    box_loss: Optional[float] = None
    cls_loss: Optional[float] = None
    dfl_loss: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    map50: Optional[float] = None
    map50_95: Optional[float] = None
    lr: Optional[float] = None

    model_config = {
        "from_attributes": True,
    }


class ModelVersionBrief(BaseModel):
    """Brief model version information."""

    id: int
    version: str
    model_name: str
    model_type: str
    map50: Optional[float] = None
    is_default: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "protected_namespaces": (),
    }


class ModelVersionResponse(BaseModel):
    """Model version detail response."""

    id: int
    scene_id: int
    scene_name: Optional[str] = None
    training_task_id: Optional[int] = None
    version: str
    model_name: str
    model_type: str
    status: str
    model_path: str
    minio_url: Optional[str] = None
    map50: Optional[float] = None
    map50_95: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    per_class_ap: Optional[dict] = None
    description: Optional[str] = None
    file_size: Optional[int] = None
    is_default: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "protected_namespaces": (),
    }


class ModelVersionCreate(BaseModel):
    """Manual model version upload request."""

    scene_id: int
    version: str = Field(..., description="Version")
    model_name: str = Field(..., description="Model name")
    model_type: str = Field(default="yolov11n", description="Model type")
    description: Optional[str] = None

    model_config = {
        "protected_namespaces": (),
    }


class ModelValidateRequest(BaseModel):
    """Model validation request."""

    split: str = Field(default="val", description="Dataset split: train/val/test")
    conf: float = Field(default=0.001, ge=0, le=1, description="Confidence threshold")
    iou: float = Field(default=0.6, ge=0, le=1, description="NMS IoU threshold")
    device: Optional[str] = Field(default=None, description="Validation device")


class ModelExportRequest(BaseModel):
    """Model export request."""

    version: Optional[str] = Field(default=None, description="Version, such as v1.0.0")
    description: Optional[str] = Field(default=None, description="Version description")
    set_default: bool = Field(default=False, description="Set as scene default model")
    upload_minio: bool = Field(default=False, description="Upload model to MinIO")


class ModelPredictResponse(BaseModel):
    """Single image prediction response."""

    filename: str
    total_objects: int
    detections: list[dict]
    class_counts: dict[str, int]
    annotated_image: str
    inference_time: float


# Agent chat
class ChatSessionCreate(BaseModel):
    """Create chat session request."""

    title: Optional[str] = None


class ChatSessionResponse(BaseModel):
    """Chat session response."""

    id: int
    session_uuid: str
    title: Optional[str] = None
    status: str
    message_count: int
    last_message_at: Optional[datetime] = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class ChatMessageRequest(BaseModel):
    """Send chat message request."""

    session_id: Optional[int] = Field(
        None,
        description="Session id. Empty means create a new session automatically.",
    )
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")


class ChatMessageResponse(BaseModel):
    """Chat message response."""

    id: int
    session_id: int
    role: str
    content: str
    agent_used: Optional[str] = None
    tool_calls: Optional[list] = None
    tool_result: Optional[str] = None
    tokens_used: Optional[int] = None
    latency_ms: Optional[int] = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class ChatHistoryResponse(BaseModel):
    """Chat history response."""

    session: ChatSessionResponse
    messages: list[ChatMessageResponse] = []


# Operations
class OperationLogResponse(BaseModel):
    """Operation log response."""

    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    module: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


# Common models
class ApiResponse(BaseModel):
    """Unified API response."""

    code: int = 200
    message: str = "success"
    data: Optional[dict | list] = None


class PageParams(BaseModel):
    """Pagination query parameters."""

    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Page size")


class PageResponse(BaseModel):
    """Pagination response."""

    total: int
    page: int
    page_size: int
    total_pages: int
    items: list


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    app_name: str
    version: str
    database: Optional[str] = None
    redis: Optional[str] = None
    minio: Optional[str] = None
