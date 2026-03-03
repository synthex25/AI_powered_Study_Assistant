# Main API Router
from fastapi import APIRouter
from app.api import workspace, chat, progress

router = APIRouter(prefix="/api")

router.include_router(workspace.router)
router.include_router(chat.router)
router.include_router(progress.router)

# Export upload router separately (no /api prefix)
upload_router = workspace.upload_router
