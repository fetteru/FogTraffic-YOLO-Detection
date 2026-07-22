"""
MinIO object storage client wrapper.

Used to store detection images, annotated images, training models, and other files.
"""

import io
from datetime import timedelta

from minio import Minio
from minio.error import S3Error

from app.config.settings import settings


class MinIOClient:
    """MinIO client wrapper."""

    def __init__(self) -> None:
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self.bucket_name = settings.MINIO_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        """Ensure the configured bucket exists."""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as exc:
            print(f"MinIO bucket init warning: {exc}")

    def upload_file(self, object_name: str, file_path: str, content_type: str | None = None) -> str:
        """
        Upload a local file to MinIO.

        Args:
            object_name: Object name or path in MinIO.
            file_path: Local file path.

        Returns:
            Presigned URL.
        """
        self.client.fput_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            file_path=file_path,
            content_type=content_type,
        )
        return self.get_presigned_url(object_name)

    def upload_bytes(
        self,
        object_name: str,
        data: bytes,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload byte data to MinIO.

        Args:
            object_name: Object name in MinIO.
            data: Byte data.
            content_type: MIME type.

        Returns:
            Presigned URL.
        """
        self.client.put_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            data=io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return self.get_presigned_url(object_name)

    def get_presigned_url(self, object_name: str) -> str:
        """Get a presigned object URL that is valid for 7 days."""
        return self.client.presigned_get_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            expires=timedelta(days=7),
        )

    def delete_file(self, object_name: str) -> None:
        """Delete an object from MinIO."""
        self.client.remove_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
        )


minio_client = MinIOClient()
