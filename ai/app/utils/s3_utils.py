# Storage utilities - Wrapper for unified storage access
from app.services.storage_service import get_storage_provider, BaseStorageProvider


class StorageUtils:
    """
    Unified storage utility class.
    Automatically uses the configured storage provider (S3 or Local).
    """
    
    def __init__(self):
        self._provider: BaseStorageProvider = None
    
    @property
    def provider(self) -> BaseStorageProvider:
        """Lazy-load the storage provider."""
        if self._provider is None:
            self._provider = get_storage_provider()
        return self._provider
    
    def get_file_content(self, key: str) -> bytes:
        """
        Fetch file content from storage.
        
        Args:
            key: The file key/path
            
        Returns:
            File content as bytes
        """
        import asyncio
        
        # Handle both sync and async contexts
        try:
            loop = asyncio.get_running_loop()
            # Already in async context, create a task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, self.provider.get_file_content(key))
                return future.result()
        except RuntimeError:
            # No running loop, safe to use asyncio.run
            return asyncio.run(self.provider.get_file_content(key))
    
    async def get_file_content_async(self, key: str) -> bytes:
        """Async version of get_file_content."""
        return await self.provider.get_file_content(key)
    
    async def upload_file(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        """Upload a file to storage."""
        return await self.provider.upload_file(key, content, content_type)
    
    async def delete_file(self, key: str) -> bool:
        """Delete a file from storage."""
        return await self.provider.delete_file(key)
    
    async def get_file_url(self, key: str, expires_in: int = 3600) -> str:
        """Get a URL to access the file."""
        return await self.provider.get_file_url(key, expires_in)
    
    def file_exists(self, key: str) -> bool:
        """Check if a file exists."""
        return self.provider.file_exists(key)


# =============================================================================
# Legacy S3Utils for backward compatibility
# =============================================================================

class S3Utils:
    """
    Legacy S3 utility class for backward compatibility.
    Now wraps the unified storage provider.
    """
    
    def __init__(self):
        self._storage = StorageUtils()
    
    def get_file_content(self, key: str) -> bytes:
        """Fetch file content from storage."""
        return self._storage.get_file_content(key)

    async def get_file_content_async(self, key: str) -> bytes:
        """Async fetch file content from storage."""
        return await self._storage.get_file_content_async(key)


# Default instances
storage_utils = StorageUtils()
s3_utils = S3Utils()  # Backward compatibility
