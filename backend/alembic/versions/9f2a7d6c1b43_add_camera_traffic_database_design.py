"""add camera, media, traffic statistics and alert tables

Revision ID: 9f2a7d6c1b43
Revises: c553a1f550a3
Create Date: 2026-07-14 11:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9f2a7d6c1b43"
down_revision: Union[str, None] = "c553a1f550a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("real_name", sa.String(length=50), nullable=True, comment="Real name"))

    op.add_column(
        "roles",
        sa.Column("role_code", sa.String(length=50), nullable=True, comment="External/business role code"),
    )
    op.create_unique_constraint("uq_roles_role_code", "roles", ["role_code"])

    op.add_column(
        "permissions",
        sa.Column("permission_type", sa.String(length=20), nullable=True, comment="Permission type: menu/button/api"),
    )
    op.add_column("permissions", sa.Column("parent_id", sa.Integer(), nullable=True))
    op.add_column(
        "permissions",
        sa.Column("route_path", sa.String(length=255), nullable=True, comment="Frontend route or API path"),
    )
    op.create_index(op.f("ix_permissions_parent_id"), "permissions", ["parent_id"], unique=False)
    op.create_foreign_key("fk_permissions_parent_id_permissions", "permissions", "permissions", ["parent_id"], ["id"])

    op.create_table(
        "media_files",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False, comment="Original uploaded filename"),
        sa.Column("stored_name", sa.String(length=255), nullable=False, comment="Stored filename"),
        sa.Column("file_path", sa.String(length=500), nullable=False, comment="Local path or object storage path"),
        sa.Column("file_type", sa.String(length=20), nullable=False, comment="image/video/folder"),
        sa.Column("file_size", sa.BigInteger(), nullable=True, comment="File size in bytes"),
        sa.Column("width", sa.Integer(), nullable=True, comment="Image or video width"),
        sa.Column("height", sa.Integer(), nullable=True, comment="Image or video height"),
        sa.Column("duration", sa.Numeric(10, 2), nullable=True, comment="Video duration in seconds"),
        sa.Column("fps", sa.Numeric(8, 2), nullable=True, comment="Video frame rate"),
        sa.Column("uploaded_by", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_media_files_uploaded_at"), "media_files", ["uploaded_at"], unique=False)
    op.create_index(op.f("ix_media_files_uploaded_by"), "media_files", ["uploaded_by"], unique=False)

    op.create_table(
        "camera_info",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("camera_name", sa.String(length=100), nullable=False, comment="Camera display name"),
        sa.Column("camera_code", sa.String(length=50), nullable=False, comment="Unique camera code"),
        sa.Column("camera_type", sa.String(length=20), nullable=False, comment="USB/RTSP/HTTP"),
        sa.Column("stream_url", sa.String(length=500), nullable=False, comment="Stream URL or local device identifier"),
        sa.Column("location", sa.String(length=255), nullable=True, comment="Installation location"),
        sa.Column("longitude", sa.Numeric(10, 6), nullable=True),
        sa.Column("latitude", sa.Numeric(10, 6), nullable=True),
        sa.Column("status", sa.Integer(), nullable=True, comment="1 online/enabled, 0 offline/disabled"),
        sa.Column("remark", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_camera_info_camera_code"), "camera_info", ["camera_code"], unique=True)
    op.create_index(op.f("ix_camera_info_status"), "camera_info", ["status"], unique=False)

    op.add_column(
        "model_versions",
        sa.Column("class_names", sa.JSON(), nullable=True, comment="Detection class names"),
    )

    op.add_column("detection_tasks", sa.Column("task_name", sa.String(length=100), nullable=True, comment="Human-readable task name"))
    op.add_column("detection_tasks", sa.Column("media_id", sa.Integer(), nullable=True))
    op.add_column("detection_tasks", sa.Column("camera_id", sa.Integer(), nullable=True))
    op.add_column("detection_tasks", sa.Column("source_type", sa.String(length=20), nullable=True, comment="image/video/camera/folder"))
    op.add_column("detection_tasks", sa.Column("total_frames", sa.Integer(), nullable=True, comment="Total video/camera frames"))
    op.add_column("detection_tasks", sa.Column("processed_frames", sa.Integer(), nullable=True, comment="Processed video/camera frames"))
    op.add_column("detection_tasks", sa.Column("vehicle_count", sa.Integer(), nullable=True, comment="Total detected vehicles"))
    op.add_column("detection_tasks", sa.Column("result_path", sa.String(length=500), nullable=True, comment="Annotated result image/video path"))
    op.add_column("detection_tasks", sa.Column("started_at", sa.DateTime(), nullable=True, comment="Task start time"))
    op.add_column("detection_tasks", sa.Column("finished_at", sa.DateTime(), nullable=True, comment="Task finish time"))
    op.create_index(op.f("ix_detection_tasks_media_id"), "detection_tasks", ["media_id"], unique=False)
    op.create_index(op.f("ix_detection_tasks_camera_id"), "detection_tasks", ["camera_id"], unique=False)
    op.create_foreign_key("fk_detection_tasks_media_id_media_files", "detection_tasks", "media_files", ["media_id"], ["id"])
    op.create_foreign_key("fk_detection_tasks_camera_id_camera_info", "detection_tasks", "camera_info", ["camera_id"], ["id"])

    op.add_column("detection_results", sa.Column("frame_number", sa.Integer(), nullable=True, comment="Video frame number"))
    op.add_column("detection_results", sa.Column("frame_time", sa.Numeric(12, 3), nullable=True, comment="Frame timestamp in seconds"))
    op.add_column("detection_results", sa.Column("track_id", sa.BigInteger(), nullable=True, comment="ByteTrack tracking id"))
    op.add_column("detection_results", sa.Column("x1", sa.Numeric(10, 3), nullable=True))
    op.add_column("detection_results", sa.Column("y1", sa.Numeric(10, 3), nullable=True))
    op.add_column("detection_results", sa.Column("x2", sa.Numeric(10, 3), nullable=True))
    op.add_column("detection_results", sa.Column("y2", sa.Numeric(10, 3), nullable=True))
    op.add_column("detection_results", sa.Column("speed", sa.Numeric(8, 2), nullable=True, comment="Estimated vehicle speed"))
    op.add_column("detection_results", sa.Column("lane_no", sa.Integer(), nullable=True, comment="Lane number"))
    op.add_column("detection_results", sa.Column("detected_at", sa.DateTime(), nullable=True, comment="Detection time"))
    op.create_index(op.f("ix_detection_results_frame_number"), "detection_results", ["frame_number"], unique=False)
    op.create_index(op.f("ix_detection_results_track_id"), "detection_results", ["track_id"], unique=False)
    op.create_index(op.f("ix_detection_results_lane_no"), "detection_results", ["lane_no"], unique=False)

    op.create_table(
        "traffic_statistics",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("camera_id", sa.Integer(), nullable=True),
        sa.Column("lane_no", sa.Integer(), nullable=True),
        sa.Column("statistic_time", sa.DateTime(), nullable=True),
        sa.Column("time_interval", sa.Integer(), nullable=True, comment="Statistic interval in seconds"),
        sa.Column("car_count", sa.Integer(), nullable=True),
        sa.Column("suv_count", sa.Integer(), nullable=True),
        sa.Column("truck_count", sa.Integer(), nullable=True),
        sa.Column("bus_count", sa.Integer(), nullable=True),
        sa.Column("motorcycle_count", sa.Integer(), nullable=True),
        sa.Column("emergency_count", sa.Integer(), nullable=True),
        sa.Column("total_count", sa.Integer(), nullable=True),
        sa.Column("vehicle_density", sa.Numeric(8, 2), nullable=True),
        sa.Column("average_speed", sa.Numeric(8, 2), nullable=True),
        sa.Column("traffic_flow", sa.Numeric(10, 2), nullable=True),
        sa.Column("congestion_level", sa.Integer(), nullable=True, comment="0 free, higher means more congested"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["camera_id"], ["camera_info.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["detection_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_traffic_statistics_task_id"), "traffic_statistics", ["task_id"], unique=False)
    op.create_index(op.f("ix_traffic_statistics_camera_id"), "traffic_statistics", ["camera_id"], unique=False)
    op.create_index(op.f("ix_traffic_statistics_lane_no"), "traffic_statistics", ["lane_no"], unique=False)
    op.create_index(op.f("ix_traffic_statistics_statistic_time"), "traffic_statistics", ["statistic_time"], unique=False)
    op.create_index(op.f("ix_traffic_statistics_congestion_level"), "traffic_statistics", ["congestion_level"], unique=False)

    op.create_table(
        "congestion_alerts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("statistic_id", sa.Integer(), nullable=True),
        sa.Column("camera_id", sa.Integer(), nullable=True),
        sa.Column("alert_level", sa.Integer(), nullable=False, comment="Alert level"),
        sa.Column("alert_type", sa.String(length=50), nullable=False, comment="congestion/parking/incident/etc"),
        sa.Column("vehicle_density", sa.Numeric(8, 2), nullable=True),
        sa.Column("average_speed", sa.Numeric(8, 2), nullable=True),
        sa.Column("threshold_value", sa.Numeric(8, 2), nullable=True),
        sa.Column("alert_message", sa.String(length=500), nullable=False),
        sa.Column("alert_status", sa.String(length=20), nullable=True, comment="pending/confirmed/handled"),
        sa.Column("handled_by", sa.Integer(), nullable=True),
        sa.Column("alert_time", sa.DateTime(), nullable=True),
        sa.Column("handled_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["camera_id"], ["camera_info.id"]),
        sa.ForeignKeyConstraint(["handled_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["statistic_id"], ["traffic_statistics.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["detection_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_congestion_alerts_task_id"), "congestion_alerts", ["task_id"], unique=False)
    op.create_index(op.f("ix_congestion_alerts_statistic_id"), "congestion_alerts", ["statistic_id"], unique=False)
    op.create_index(op.f("ix_congestion_alerts_camera_id"), "congestion_alerts", ["camera_id"], unique=False)
    op.create_index(op.f("ix_congestion_alerts_alert_level"), "congestion_alerts", ["alert_level"], unique=False)
    op.create_index(op.f("ix_congestion_alerts_alert_status"), "congestion_alerts", ["alert_status"], unique=False)
    op.create_index(op.f("ix_congestion_alerts_handled_by"), "congestion_alerts", ["handled_by"], unique=False)
    op.create_index(op.f("ix_congestion_alerts_alert_time"), "congestion_alerts", ["alert_time"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_congestion_alerts_alert_time"), table_name="congestion_alerts")
    op.drop_index(op.f("ix_congestion_alerts_handled_by"), table_name="congestion_alerts")
    op.drop_index(op.f("ix_congestion_alerts_alert_status"), table_name="congestion_alerts")
    op.drop_index(op.f("ix_congestion_alerts_alert_level"), table_name="congestion_alerts")
    op.drop_index(op.f("ix_congestion_alerts_camera_id"), table_name="congestion_alerts")
    op.drop_index(op.f("ix_congestion_alerts_statistic_id"), table_name="congestion_alerts")
    op.drop_index(op.f("ix_congestion_alerts_task_id"), table_name="congestion_alerts")
    op.drop_table("congestion_alerts")

    op.drop_index(op.f("ix_traffic_statistics_congestion_level"), table_name="traffic_statistics")
    op.drop_index(op.f("ix_traffic_statistics_statistic_time"), table_name="traffic_statistics")
    op.drop_index(op.f("ix_traffic_statistics_lane_no"), table_name="traffic_statistics")
    op.drop_index(op.f("ix_traffic_statistics_camera_id"), table_name="traffic_statistics")
    op.drop_index(op.f("ix_traffic_statistics_task_id"), table_name="traffic_statistics")
    op.drop_table("traffic_statistics")

    op.drop_index(op.f("ix_detection_results_lane_no"), table_name="detection_results")
    op.drop_index(op.f("ix_detection_results_track_id"), table_name="detection_results")
    op.drop_index(op.f("ix_detection_results_frame_number"), table_name="detection_results")
    for column_name in ["detected_at", "lane_no", "speed", "y2", "x2", "y1", "x1", "track_id", "frame_time", "frame_number"]:
        op.drop_column("detection_results", column_name)

    op.drop_constraint("fk_detection_tasks_camera_id_camera_info", "detection_tasks", type_="foreignkey")
    op.drop_constraint("fk_detection_tasks_media_id_media_files", "detection_tasks", type_="foreignkey")
    op.drop_index(op.f("ix_detection_tasks_camera_id"), table_name="detection_tasks")
    op.drop_index(op.f("ix_detection_tasks_media_id"), table_name="detection_tasks")
    for column_name in [
        "finished_at",
        "started_at",
        "result_path",
        "vehicle_count",
        "processed_frames",
        "total_frames",
        "source_type",
        "camera_id",
        "media_id",
        "task_name",
    ]:
        op.drop_column("detection_tasks", column_name)

    op.drop_column("model_versions", "class_names")

    op.drop_index(op.f("ix_camera_info_status"), table_name="camera_info")
    op.drop_index(op.f("ix_camera_info_camera_code"), table_name="camera_info")
    op.drop_table("camera_info")

    op.drop_index(op.f("ix_media_files_uploaded_by"), table_name="media_files")
    op.drop_index(op.f("ix_media_files_uploaded_at"), table_name="media_files")
    op.drop_table("media_files")

    op.drop_constraint("fk_permissions_parent_id_permissions", "permissions", type_="foreignkey")
    op.drop_index(op.f("ix_permissions_parent_id"), table_name="permissions")
    op.drop_column("permissions", "route_path")
    op.drop_column("permissions", "parent_id")
    op.drop_column("permissions", "permission_type")

    op.drop_constraint("uq_roles_role_code", "roles", type_="unique")
    op.drop_column("roles", "role_code")
    op.drop_column("users", "real_name")
