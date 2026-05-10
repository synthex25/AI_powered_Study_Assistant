# FastAPI Application Entry Point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.router import router, upload_router
from app.api.chat import router as chat_router

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered document analysis and RAG tutoring API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
# Allow all origins temporarily for easy deployment. You can restrict this later.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# /api/* routes (workspace, chat REST, progress)
app.include_router(router)

# /upload_pdfs/ — no /api prefix (legacy endpoint)
app.include_router(upload_router)

# WebSocket only — /ws/rag_chat (no /api prefix)
app.include_router(chat_router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "llm_provider": settings.LLM_PROVIDER
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "services": {
            "api": True,
            "vector_store": True,
            "llm_provider": settings.LLM_PROVIDER
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
