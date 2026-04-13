# Progress Stream Service - SSE-based progress updates
import asyncio
from typing import Dict, Optional, AsyncGenerator
from dataclasses import dataclass
from enum import Enum
import json
import time


class ProcessingStage(str, Enum):
    STARTED = "started"
    PARSING_DOCUMENTS = "parsing_documents"
    EXTRACTING_TEXT = "extracting_text"
    GENERATING_NOTES = "generating_notes"
    CREATING_FLASHCARDS = "creating_flashcards"
    CREATING_QUIZZES = "creating_quizzes"
    CREATING_RECOMMENDATIONS = "creating_recommendations"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class ProgressEvent:
    stage: ProcessingStage
    progress: int  # 0-100
    message: str
    timestamp: float = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()
    
    def to_dict(self) -> dict:
        return {
            "stage": self.stage.value,
            "progress": self.progress,
            "message": self.message,
            "timestamp": self.timestamp
        }
    
    def to_sse(self) -> str:
        return f"data: {json.dumps(self.to_dict())}\n\n"


class ProgressManager:
    """Manages progress events for multiple workspaces."""
    
    def __init__(self):
        self._progress: Dict[str, ProgressEvent] = {}
        self._subscribers: Dict[str, list] = {}
    
    def update(self, workspace_id: str, stage: ProcessingStage, progress: int, message: str):
        """Update progress for a workspace and notify subscribers."""
        event = ProgressEvent(stage=stage, progress=progress, message=message)
        self._progress[workspace_id] = event
        
        # Notify all subscribers
        if workspace_id in self._subscribers:
            for queue in self._subscribers[workspace_id]:
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    pass  # Skip if queue is full
        
        print(f"[Progress] {workspace_id}: {stage.value} ({progress}%) - {message}")
    
    def get_current(self, workspace_id: str) -> Optional[ProgressEvent]:
        """Get current progress for a workspace."""
        return self._progress.get(workspace_id)
    
    async def subscribe(self, workspace_id: str) -> AsyncGenerator[ProgressEvent, None]:
        """Subscribe to progress updates for a workspace."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=50)
        
        if workspace_id not in self._subscribers:
            self._subscribers[workspace_id] = []
        self._subscribers[workspace_id].append(queue)
        
        try:
            # Send current progress if exists
            current = self.get_current(workspace_id)
            if current:
                yield current
            
            # Wait for new events
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield event
                    
                    # Stop if completed or error
                    if event.stage in (ProcessingStage.COMPLETED, ProcessingStage.ERROR):
                        break
                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield ProgressEvent(
                        stage=ProcessingStage.STARTED,
                        progress=-1,  # -1 indicates heartbeat
                        message="heartbeat"
                    )
        finally:
            # Cleanup
            if workspace_id in self._subscribers:
                self._subscribers[workspace_id].remove(queue)
                if not self._subscribers[workspace_id]:
                    del self._subscribers[workspace_id]
    
    def clear(self, workspace_id: str):
        """Clear progress for a workspace."""
        if workspace_id in self._progress:
            del self._progress[workspace_id]


# Singleton instance
progress_manager = ProgressManager()
