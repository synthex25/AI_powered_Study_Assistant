import asyncio
from app.config import settings
from app.services.storage_service import get_storage_provider

async def test():
    print(f"STORAGE_PROVIDER: {settings.STORAGE_PROVIDER}")
    print(f"LOCAL_STORAGE_PATH: {settings.LOCAL_STORAGE_PATH}")
    provider = get_storage_provider()
    
    key = "estheredwardsamuel@gmail.com/workspaces/69aa6121dd7657c7af1208e1/pdfs/1772773671837-ML.pdf"
    
    print(f"Checking if file exists: {provider.file_exists(key)}")
    try:
        content = await provider.get_file_content(key)
        print(f"Successfully read {len(content)} bytes")
    except Exception as e:
        print(f"Failed to read file: {e}")

if __name__ == "__main__":
    asyncio.run(test())
