import asyncio
import httpx
import jwt
from app.config import settings

async def test_api():
    # 1. Create a valid JWT
    token_payload = {
        "userId": "test_user_id",
        "email": "test@example.com",
        "name": "Test User"
    }
    
    token = jwt.encode(
        token_payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    
    # 2. Prepare payload
    payload = {
        "workspaceId": "69aa6121dd7657c7af1208e1",
        "sources": [
            {
                "id": "source_123",
                "type": "pdf",
                "name": "1772773671837-ML.pdf",
                "url": "estheredwardsamuel@gmail.com/workspaces/69aa6121dd7657c7af1208e1/pdfs/1772773671837-ML.pdf"
            }
        ],
        "language": "en"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("Sending POST request to localhost:8000...")
    target_url = "http://localhost:8000/api/workspace/process-workspace"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                target_url,
                json=payload,
                headers=headers,
                timeout=30.0
            )
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error calling API: {e}")

if __name__ == "__main__":
    asyncio.run(test_api())
