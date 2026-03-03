# FastAPI Application Entry Point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.router import router, upload_router

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered document analysis and RAG tutoring API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router (with /api prefix)
app.include_router(router)

# Include upload router (at root level, no prefix)
app.include_router(upload_router)

# Include chat router with /api prefix for REST endpoint AND at root for WebSocket
from app.api.chat import router as chat_router
app.include_router(chat_router, prefix="/api")  # REST: /api/chat
app.include_router(chat_router)  # WebSocket: /ws/rag_chat


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


# For running directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
