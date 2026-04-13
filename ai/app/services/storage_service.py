# Storage Service - Abstraction for S3 and Local filesystem storage
import os
import shutil
from abc import ABC, abstractmethod
from typing import Optional
from pathlib import Path
from app.config import settings


class BaseStorageProvider(ABC):
    """Abstract base class for storage providers."""
    
    @abstractmethod
    async def upload_file(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        """Upload a file and return the URL/path."""
        pass
    
    @abstractmethod
    async def get_file_content(self, key: str) -> bytes:
        """Get file content by key."""
        pass
    
    @abstractmethod
    async def delete_file(self, key: str) -> bool:
        """Delete a file by key."""
        pass
    
    @abstractmethod
    async def get_file_url(self, key: str, expires_in: int = 3600) -> str:
        """Get a URL to access the file (signed URL for S3, local path for local)."""
        pass
    
    @abstractmethod
    def file_exists(self, key: str) -> bool:
        """Check if a file exists."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    """Local filesystem storage provider."""
    
    def __init__(self, base_path: str = None):
        self.base_path = Path(base_path or settings.LOCAL_STORAGE_PATH)
        # Ensure the base directory exists
        self.base_path.mkdir(parents=True, exist_ok=True)
        print(f"[LocalStorage] Initialized with base path: {self.base_path.absolute()}")
    
    def _get_full_path(self, key: str) -> Path:
        """Get the full filesystem path for a key."""
        # Normalize the key to prevent path traversal
        safe_key = key.lstrip("/").replace("..", "")
        return self.base_path / safe_key
    
    async def upload_file(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        """Upload a file to local storage."""
        file_path = self._get_full_path(key)
        
        # Create parent directories if they don't exist
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write the file
        if isinstance(content, str):
            file_path.write_text(content, encoding='utf-8')
        else:
            file_path.write_bytes(content)
        
        print(f"[LocalStorage] Saved file: {file_path}")
        return str(file_path.absolute())
    
    async def get_file_content(self, key: str) -> bytes:
        """Get file content from local storage."""
        file_path = self._get_full_path(key)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {key}")
        
        return file_path.read_bytes()
    
    async def delete_file(self, key: str) -> bool:
        """Delete a file from local storage."""
        file_path = self._get_full_path(key)
        
        if file_path.exists():
            file_path.unlink()
            print(f"[LocalStorage] Deleted file: {file_path}")
            return True
        return False
    
    async def get_file_url(self, key: str, expires_in: int = 3600) -> str:
        """Get the local file path as URL."""
        file_path = self._get_full_path(key)
        # Return as file:// URL for local access
        return f"file://{file_path.absolute()}"
    
    def file_exists(self, key: str) -> bool:
        """Check if a file exists."""
        return self._get_full_path(key).exists()
    
    def get_local_path(self, key: str) -> str:
        """Get the absolute local path for direct file access."""
        return str(self._get_full_path(key).absolute())


class S3StorageProvider(BaseStorageProvider):
    """AWS S3 storage provider."""
    
    def __init__(self):
        import boto3
        
        self.bucket = settings.AWS_S3_BUCKET
        self.region = settings.AWS_REGION
        
        # Initialize S3 client
        client_kwargs = {'region_name': self.region}
        
        # Add credentials if provided
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            client_kwargs['aws_access_key_id'] = settings.AWS_ACCESS_KEY_ID
            client_kwargs['aws_secret_access_key'] = settings.AWS_SECRET_ACCESS_KEY
        
        self.s3 = boto3.client('s3', **client_kwargs)
        print(f"[S3Storage] Initialized with bucket: {self.bucket}")
    
    async def upload_file(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        """Upload a file to S3."""
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=content_type
        )
        
        url = f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"
        print(f"[S3Storage] Uploaded file: {key}")
        return url
    
    async def get_file_content(self, key: str) -> bytes:
        """Get file content from S3."""
        response = self.s3.get_object(Bucket=self.bucket, Key=key)
        return response['Body'].read()
    
    async def delete_file(self, key: str) -> bool:
        """Delete a file from S3."""
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=key)
            print(f"[S3Storage] Deleted file: {key}")
            return True
        except Exception as e:
            print(f"[S3Storage] Error deleting file {key}: {e}")
            return False
    
    async def get_file_url(self, key: str, expires_in: int = 3600) -> str:
        """Get a pre-signed URL for S3 object."""
        url = self.s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': key},
            ExpiresIn=expires_in
        )
        return url
    
    def file_exists(self, key: str) -> bool:
        """Check if a file exists in S3."""
        try:
            self.s3.head_object(Bucket=self.bucket, Key=key)
            return True
        except:
            return False


# =============================================================================
# Factory Function
# =============================================================================

_storage_provider: Optional[BaseStorageProvider] = None


def get_storage_provider() -> BaseStorageProvider:
    """
    Factory function to get the configured storage provider.
    
    Returns:
        Configured storage provider instance (S3 or Local)
    
    Example:
        >>> storage = get_storage_provider()
        >>> await storage.upload_file("docs/file.pdf", content, "application/pdf")
    """
    global _storage_provider
    
    if _storage_provider is None:
        provider_type = settings.STORAGE_PROVIDER.lower()
        
        if provider_type == "s3":
            _storage_provider = S3StorageProvider()
        elif provider_type == "local":
            _storage_provider = LocalStorageProvider()
        else:
            raise ValueError(
                f"Unknown storage provider: {provider_type}. "
                f"Available: s3, local"
            )
        
        print(f"[Storage] Using {provider_type.upper()} storage provider")
    
    return _storage_provider


# Default storage provider instance (lazy loaded)
def get_storage() -> BaseStorageProvider:
    """Convenience alias for get_storage_provider()."""
    return get_storage_provider()
