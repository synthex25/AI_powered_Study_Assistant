# Main API Router
from fastapi import APIRouter
from app.api import workspace, chat, progress

# All routes under this router get the /api prefix
router = APIRouter(prefix="/api")

router.include_router(workspace.router)   # /api/workspace/*
router.include_router(chat.router)        # /api/chat  (REST POST)
router.include_router(progress.router)    # /api/progress/stream/:id

# Upload router exported separately — mounted at root (no /api prefix)
upload_router = workspace.upload_router   # /upload_pdfs/
