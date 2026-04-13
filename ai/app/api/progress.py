# SSE Progress Endpoint
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.progress_stream import progress_manager

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/stream/{workspace_id}")
async def stream_progress(workspace_id: str):
    """
    Server-Sent Events endpoint for real-time progress updates.
    
    Usage: 
    const eventSource = new EventSource('/api/progress/stream/{workspace_id}');
    eventSource.onmessage = (event) => console.log(JSON.parse(event.data));
    """
    async def event_generator():
        async for event in progress_manager.subscribe(workspace_id):
            if event.progress == -1:  # Heartbeat
                yield ": heartbeat\n\n"
            else:
                yield event.to_sse()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
