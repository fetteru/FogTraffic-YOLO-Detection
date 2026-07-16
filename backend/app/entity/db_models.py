"""
Database model definitions.

Tables:
- User and RBAC: users, roles, permissions, user_roles, role_permissions
- Detection: detection_scenes, detection_tasks, detection_results
- Model management: training_tasks, training_metrics, model_versions
- Agent chat: chat_sessions, chat_messages
- Operations: operation_logs
"""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database.session import Base


# User and RBAC
class User(Base):
    """User table."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True, comment="Username")
    email = Column(String(100), unique=True, nullable=False, index=True, comment="Email")
    hashed_password = Column(String(255), nullable=False, comment="Hashed password")
    real_name = Column(String(50), nullable=True, comment="Real name")
    phone = Column(String(20), nullable=True, comment="Phone number")
    avatar = Column(String(500), nullable=True, comment="Avatar URL")
    is_active = Column(Boolean, default=True, comment="Whether the user is active")
    is_superuser = Column(Boolean, default=False, comment="Whether the user is a superuser")
    last_login_at = Column(DateTime, nullable=True, comment="Last login time")
    created_at = Column(DateTime, default=datetime.now, comment="Created time")
    updated_at = Column(
        DateTime,
        default=datetime.now,
        onupdate=datetime.now,
        comment="Updated time",
    )

    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    detection_tasks = relationship("DetectionTask", back_populates="user")
    media_files = relationship("MediaFile", back_populates="uploader")
    training_tasks = relationship("TrainingTask", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    operation_logs = relationship("OperationLog", back_populates="user")
    handled_alerts = relationship("CongestionAlert", back_populates="handler")


class Role(Base):
    """Role table."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(
        String(50),
        unique=True,
        nullable=False,
        comment="Role code, such as admin/operator/viewer",
    )
    display_name = Column(String(100), nullable=False, comment="Role display name")
    description = Column(String(500), nullable=True, comment="Role description")
    is_system = Column(Boolean, default=False, comment="Whether this is a built-in role")
    role_code = Column(String(50), nullable=True, unique=True, comment="External/business role code")
    created_at = Column(DateTime, default=datetime.now, comment="Created time")

    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    role_permissions = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
    )


class Permission(Base):
    """Permission table."""

    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(
        String(100),
        unique=True,
        nullable=False,
        comment="Permission code, such as detection:task:create",
    )
    name = Column(String(100), nullable=False, comment="Permission name")
    module = Column(
        String(50),
        nullable=False,
        comment="Module: auth/detection/training/agent/system",
    )
    description = Column(String(500), nullable=True, comment="Permission description")
    permission_type = Column(String(20), nullable=True, comment="Permission type: menu/button/api")
    parent_id = Column(Integer, ForeignKey("permissions.id"), nullable=True, index=True)
    route_path = Column(String(255), nullable=True, comment="Frontend route or API path")

    role_permissions = relationship(
        "RolePermission",
        back_populates="permission",
        cascade="all, delete-orphan",
    )
    parent = relationship("Permission", remote_side=[id], backref="children")


class UserRole(Base):
    """User-role association table."""

    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")


class RolePermission(Base):
    """Role-permission association table."""

    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False, index=True)

    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")


# Detection
class DetectionScene(Base):
    """Detection scene configuration table."""

    __tablename__ = "detection_scenes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(
        String(100),
        unique=True,
        nullable=False,
        comment="Scene code, such as remote_sensing",
    )
    display_name = Column(String(100), nullable=False, comment="Scene display name")
    description = Column(Text, nullable=True, comment="Scene description")
    category = Column(
        String(50),
        nullable=False,
        comment="Category: agriculture/industry/remote_sensing/medical/traffic",
    )
    class_names = Column(JSON, nullable=False, comment="Class list")
    class_names_cn = Column(JSON, nullable=True, comment="Chinese class name mapping")
    is_active = Column(Boolean, default=True, comment="Whether the scene is active")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, comment="Creator user id")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    detection_tasks = relationship("DetectionTask", back_populates="scene")
    model_versions = relationship("ModelVersion", back_populates="scene")
    training_tasks = relationship("TrainingTask", back_populates="scene")


class MediaFile(Base):
    """Uploaded image/video metadata table."""

    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    original_name = Column(String(255), nullable=False, comment="Original uploaded filename")
    stored_name = Column(String(255), nullable=False, comment="Stored filename")
    file_path = Column(String(500), nullable=False, comment="Local path or object storage path")
    file_type = Column(String(20), nullable=False, comment="image/video/folder")
    file_size = Column(BigInteger, nullable=True, comment="File size in bytes")
    width = Column(Integer, nullable=True, comment="Image or video width")
    height = Column(Integer, nullable=True, comment="Image or video height")
    duration = Column(Numeric(10, 2), nullable=True, comment="Video duration in seconds")
    fps = Column(Numeric(8, 2), nullable=True, comment="Video frame rate")
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    uploaded_at = Column(DateTime, default=datetime.now, index=True)

    uploader = relationship("User", back_populates="media_files")
    detection_tasks = relationship("DetectionTask", back_populates="media_file")


class CameraInfo(Base):
    """Camera registration and stream configuration table."""

    __tablename__ = "camera_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_name = Column(String(100), nullable=False, comment="Camera display name")
    camera_code = Column(String(50), unique=True, nullable=False, index=True, comment="Unique camera code")
    camera_type = Column(String(20), nullable=False, comment="USB/RTSP/HTTP")
    stream_url = Column(String(500), nullable=False, comment="Stream URL or local device identifier")
    location = Column(String(255), nullable=True, comment="Installation location")
    longitude = Column(Numeric(10, 6), nullable=True)
    latitude = Column(Numeric(10, 6), nullable=True)
    status = Column(Integer, default=1, index=True, comment="1 online/enabled, 0 offline/disabled")
    remark = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    detection_tasks = relationship("DetectionTask", back_populates="camera")
    traffic_statistics = relationship("TrafficStatistic", back_populates="camera")
    congestion_alerts = relationship("CongestionAlert", back_populates="camera")


class DetectionTask(Base):
    """Detection task table."""

    __tablename__ = "detection_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_name = Column(String(100), nullable=True, comment="Human-readable task name")
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="Operating user",
    )
    scene_id = Column(
        Integer,
        ForeignKey("detection_scenes.id"),
        nullable=False,
        index=True,
        comment="Detection scene",
    )
    model_version_id = Column(
        Integer,
        ForeignKey("model_versions.id"),
        nullable=True,
        comment="Model version used",
    )
    media_id = Column(Integer, ForeignKey("media_files.id"), nullable=True, index=True)
    camera_id = Column(Integer, ForeignKey("camera_info.id"), nullable=True, index=True)
    source_type = Column(String(20), nullable=True, comment="image/video/camera/folder")
    task_type = Column(
        String(20),
        nullable=False,
        comment="Detection type: single/batch/folder/video/camera",
    )
    status = Column(
        String(20),
        default="pending",
        comment="Status: pending/processing/completed/failed",
    )

    total_images = Column(Integer, default=0, comment="Total processed images")
    total_frames = Column(Integer, default=0, comment="Total video/camera frames")
    processed_frames = Column(Integer, default=0, comment="Processed video/camera frames")
    total_objects = Column(Integer, default=0, comment="Total detected objects")
    vehicle_count = Column(Integer, default=0, comment="Total detected vehicles")
    total_inference_time = Column(Float, default=0, comment="Total inference time in ms")

    conf_threshold = Column(Float, default=0.25, comment="Confidence threshold")
    iou_threshold = Column(Float, default=0.45, comment="NMS IoU threshold")
    image_size = Column(Integer, default=640, comment="Inference image size")
    result_path = Column(String(500), nullable=True, comment="Annotated result image/video path")

    error_message = Column(Text, nullable=True, comment="Error message on failure")
    analysis_report = Column(Text, nullable=True, comment="Analysis report in Markdown")
    analysis_suggestion = Column(Text, nullable=True, comment="Professional suggestion")
    risk_level = Column(String(20), nullable=True, comment="Risk level: low/medium/high/critical")
    analyzed_at = Column(DateTime, nullable=True, comment="Analysis completed time")
    started_at = Column(DateTime, nullable=True, comment="Task start time")
    finished_at = Column(DateTime, nullable=True, comment="Task finish time")
    created_at = Column(DateTime, default=datetime.now, index=True, comment="Created time")
    completed_at = Column(DateTime, nullable=True, comment="Completed time")

    user = relationship("User", back_populates="detection_tasks")
    scene = relationship("DetectionScene", back_populates="detection_tasks")
    model_version = relationship("ModelVersion", back_populates="detection_tasks")
    media_file = relationship("MediaFile", back_populates="detection_tasks")
    camera = relationship("CameraInfo", back_populates="detection_tasks")
    results = relationship("DetectionResult", back_populates="task", cascade="all, delete-orphan")
    traffic_statistics = relationship("TrafficStatistic", back_populates="task", cascade="all, delete-orphan")
    congestion_alerts = relationship("CongestionAlert", back_populates="task", cascade="all, delete-orphan")


class DetectionResult(Base):
    """Detection result table."""

    __tablename__ = "detection_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(
        Integer,
        ForeignKey("detection_tasks.id"),
        nullable=False,
        index=True,
        comment="Detection task",
    )
    image_path = Column(String(500), nullable=False, comment="Original image path")
    annotated_image_url = Column(String(500), nullable=True, comment="Annotated image MinIO URL")
    frame_number = Column(Integer, nullable=True, index=True, comment="Video frame number")
    frame_time = Column(Numeric(12, 3), nullable=True, comment="Frame timestamp in seconds")
    track_id = Column(BigInteger, nullable=True, index=True, comment="ByteTrack tracking id")

    class_name = Column(String(50), nullable=False, index=True, comment="Class name")
    class_name_cn = Column(String(50), nullable=True, comment="Chinese class name")
    class_id = Column(Integer, nullable=False, comment="Class id")
    confidence = Column(Float, nullable=False, comment="Confidence score from 0 to 1")
    bbox = Column(JSON, nullable=False, comment="Bounding box [x1, y1, x2, y2]")
    x1 = Column(Numeric(10, 3), nullable=True)
    y1 = Column(Numeric(10, 3), nullable=True)
    x2 = Column(Numeric(10, 3), nullable=True)
    y2 = Column(Numeric(10, 3), nullable=True)
    speed = Column(Numeric(8, 2), nullable=True, comment="Estimated vehicle speed")
    lane_no = Column(Integer, nullable=True, index=True, comment="Lane number")

    inference_time = Column(Float, nullable=True, comment="Inference time in ms")
    image_width = Column(Integer, nullable=True, comment="Image width")
    image_height = Column(Integer, nullable=True, comment="Image height")
    detected_at = Column(DateTime, nullable=True, comment="Detection time")
    created_at = Column(DateTime, default=datetime.now)

    task = relationship("DetectionTask", back_populates="results")


class TrafficStatistic(Base):
    """Aggregated traffic statistics per task/camera/lane/time window."""

    __tablename__ = "traffic_statistics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("detection_tasks.id"), nullable=False, index=True)
    camera_id = Column(Integer, ForeignKey("camera_info.id"), nullable=True, index=True)
    lane_no = Column(Integer, nullable=True, index=True)
    statistic_time = Column(DateTime, default=datetime.now, index=True)
    time_interval = Column(Integer, default=60, comment="Statistic interval in seconds")
    car_count = Column(Integer, default=0)
    suv_count = Column(Integer, default=0)
    truck_count = Column(Integer, default=0)
    bus_count = Column(Integer, default=0)
    motorcycle_count = Column(Integer, default=0)
    emergency_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    vehicle_density = Column(Numeric(8, 2), nullable=True)
    average_speed = Column(Numeric(8, 2), nullable=True)
    traffic_flow = Column(Numeric(10, 2), nullable=True)
    congestion_level = Column(Integer, default=0, index=True, comment="0 free, higher means more congested")
    created_at = Column(DateTime, default=datetime.now)

    task = relationship("DetectionTask", back_populates="traffic_statistics")
    camera = relationship("CameraInfo", back_populates="traffic_statistics")
    congestion_alerts = relationship("CongestionAlert", back_populates="statistic")


class CongestionAlert(Base):
    """Traffic congestion or abnormal event alert table."""

    __tablename__ = "congestion_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("detection_tasks.id"), nullable=True, index=True)
    statistic_id = Column(Integer, ForeignKey("traffic_statistics.id"), nullable=True, index=True)
    camera_id = Column(Integer, ForeignKey("camera_info.id"), nullable=True, index=True)
    alert_level = Column(Integer, nullable=False, index=True, comment="Alert level")
    alert_type = Column(String(50), nullable=False, comment="congestion/parking/incident/etc")
    vehicle_density = Column(Numeric(8, 2), nullable=True)
    average_speed = Column(Numeric(8, 2), nullable=True)
    threshold_value = Column(Numeric(8, 2), nullable=True)
    alert_message = Column(String(500), nullable=False)
    alert_status = Column(String(20), default="pending", index=True, comment="pending/confirmed/handled")
    handled_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    alert_time = Column(DateTime, default=datetime.now, index=True)
    handled_at = Column(DateTime, nullable=True)

    task = relationship("DetectionTask", back_populates="congestion_alerts")
    statistic = relationship("TrafficStatistic", back_populates="congestion_alerts")
    camera = relationship("CameraInfo", back_populates="congestion_alerts")
    handler = relationship("User", back_populates="handled_alerts")


# Model management
class TrainingTask(Base):
    """Model training task table."""

    __tablename__ = "training_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="Operating user",
    )
    scene_id = Column(
        Integer,
        ForeignKey("detection_scenes.id"),
        nullable=False,
        index=True,
        comment="Related scene",
    )
    task_uuid = Column(String(100), unique=True, nullable=False, index=True, comment="Task UUID")
    status = Column(
        String(20),
        default="pending",
        comment="Status: pending/running/completed/failed/cancelled",
    )

    model_name = Column(String(50), default="yolov11n", comment="Base model")
    epochs = Column(Integer, default=100, comment="Training epochs")
    img_size = Column(Integer, default=640, comment="Image size")
    batch_size = Column(Integer, default=16, comment="Batch size")
    device = Column(String(20), default="0", comment="Training device: 0/1/cpu")
    optimizer = Column(String(20), default="SGD", comment="Optimizer: SGD/Adam/AdamW")
    lr0 = Column(Float, default=0.01, comment="Initial learning rate")
    augment_config = Column(JSON, nullable=True, comment="Data augmentation config")

    current_epoch = Column(Integer, default=0, comment="Current epoch")
    progress = Column(Integer, default=0, comment="Progress percentage from 0 to 100")

    dataset_path = Column(String(500), nullable=True, comment="Dataset path")
    dataset_size = Column(Integer, nullable=True, comment="Number of dataset images")
    data_yaml = Column(String(500), nullable=True, comment="data.yaml path")

    error_message = Column(Text, nullable=True, comment="Error message on failure")
    created_at = Column(DateTime, default=datetime.now, comment="Created time")
    updated_at = Column(
        DateTime,
        default=datetime.now,
        onupdate=datetime.now,
        comment="Updated time",
    )
    started_at = Column(DateTime, nullable=True, comment="Training started time")
    completed_at = Column(DateTime, nullable=True, comment="Training completed time")

    user = relationship("User", back_populates="training_tasks")
    scene = relationship("DetectionScene", back_populates="training_tasks")
    metrics = relationship("TrainingMetric", back_populates="task", cascade="all, delete-orphan")
    model_versions = relationship("ModelVersion", back_populates="training_task")


class TrainingMetric(Base):
    """Training metric table, one row per epoch."""

    __tablename__ = "training_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(
        Integer,
        ForeignKey("training_tasks.id"),
        nullable=False,
        index=True,
        comment="Training task",
    )
    epoch = Column(Integer, nullable=False, comment="Current epoch")

    box_loss = Column(Float, nullable=True, comment="Box loss")
    cls_loss = Column(Float, nullable=True, comment="Classification loss")
    dfl_loss = Column(Float, nullable=True, comment="DFL loss")

    precision = Column(Float, nullable=True, comment="Precision")
    recall = Column(Float, nullable=True, comment="Recall")
    map50 = Column(Float, nullable=True, comment="mAP@0.50")
    map50_95 = Column(Float, nullable=True, comment="mAP@0.50:0.95")

    lr = Column(Float, nullable=True, comment="Learning rate")
    created_at = Column(DateTime, default=datetime.now)

    task = relationship("TrainingTask", back_populates="metrics")


class ModelVersion(Base):
    """Model version table."""

    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scene_id = Column(
        Integer,
        ForeignKey("detection_scenes.id"),
        nullable=False,
        index=True,
        comment="Related scene",
    )
    training_task_id = Column(
        Integer,
        ForeignKey("training_tasks.id"),
        nullable=True,
        comment="Source training task",
    )
    version = Column(String(50), nullable=False, comment="Version, such as v1.0.0")
    model_name = Column(String(100), nullable=False, comment="Model name")
    model_type = Column(String(50), default="yolov11n", comment="Model type")
    status = Column(String(20), default="active", comment="Status: active/archived/deleted")

    model_path = Column(String(500), nullable=False, comment="Local model file path")
    class_names = Column(JSON, nullable=True, comment="Detection class names")
    minio_url = Column(String(500), nullable=True, comment="MinIO URL")

    map50 = Column(Float, nullable=True, comment="mAP@0.50")
    map50_95 = Column(Float, nullable=True, comment="mAP@0.50:0.95")
    precision = Column(Float, nullable=True, comment="Precision")
    recall = Column(Float, nullable=True, comment="Recall")
    per_class_ap = Column(JSON, nullable=True, comment="Per-class AP")

    description = Column(Text, nullable=True, comment="Version description")
    file_size = Column(BigInteger, nullable=True, comment="Model file size in bytes")
    is_default = Column(Boolean, default=False, comment="Whether this is the default model")
    created_at = Column(DateTime, default=datetime.now, comment="Created time")

    scene = relationship("DetectionScene", back_populates="model_versions")
    training_task = relationship("TrainingTask", back_populates="model_versions")
    detection_tasks = relationship("DetectionTask", back_populates="model_version")


# Agent chat
class ChatSession(Base):
    """Chat session table."""

    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="Owner user",
    )
    session_uuid = Column(String(100), unique=True, nullable=False, index=True, comment="Session UUID")
    title = Column(String(200), nullable=True, comment="Session title")
    status = Column(String(20), default="active", comment="Status: active/archived")
    message_count = Column(Integer, default=0, comment="Message count")
    last_message_at = Column(DateTime, nullable=True, comment="Last message time")
    created_at = Column(DateTime, default=datetime.now, comment="Created time")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base):
    """Chat message table."""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(
        Integer,
        ForeignKey("chat_sessions.id"),
        nullable=False,
        index=True,
        comment="Chat session",
    )
    role = Column(String(20), nullable=False, comment="Role: user/assistant/tool/system")
    content = Column(Text, nullable=False, comment="Message content")

    agent_used = Column(
        String(50),
        nullable=True,
        comment="Agent used: supervisor/detection/analysis/qa",
    )
    tool_calls = Column(JSON, nullable=True, comment="Tool call records")
    tool_result = Column(Text, nullable=True, comment="Tool call result")

    tokens_used = Column(Integer, nullable=True, comment="Token usage")
    latency_ms = Column(Integer, nullable=True, comment="Latency in ms")
    created_at = Column(DateTime, default=datetime.now, index=True, comment="Created time")

    session = relationship("ChatSession", back_populates="messages")


# Operations
class OperationLog(Base):
    """Operation audit log table."""

    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
        comment="Operating user",
    )
    username = Column(String(50), nullable=True, comment="Redundant username for queries")

    module = Column(String(50), nullable=False, comment="Module: auth/detection/training/agent/system")
    action = Column(String(50), nullable=False, comment="Action: create/update/delete/login/export")
    target_type = Column(String(50), nullable=True, comment="Target type: user/task/model/session")
    target_id = Column(String(100), nullable=True, comment="Target id")
    description = Column(String(500), nullable=True, comment="Operation description")

    ip_address = Column(String(50), nullable=True, comment="Client IP")
    user_agent = Column(String(500), nullable=True, comment="Client User-Agent")
    request_method = Column(String(10), nullable=True, comment="HTTP method")
    request_path = Column(String(500), nullable=True, comment="Request path")

    status = Column(String(20), default="success", comment="Result: success/failure")
    error_message = Column(Text, nullable=True, comment="Error message on failure")
    created_at = Column(DateTime, default=datetime.now, index=True, comment="Created time")

    user = relationship("User", back_populates="operation_logs")
