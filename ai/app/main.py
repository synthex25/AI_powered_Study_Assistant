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
# NOTE: On this machine, 'localhost' resolves to ::1 (IPv6) which is intercepted
# by Docker. Use 127.0.0.1 explicitly for all FastAPI URLs in the frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite (IPv6 path)
        "http://127.0.0.1:5173",   # Vite (IPv4 path)
        "http://localhost:4000",    # Node backend
        "http://127.0.0.1:4000",   # Node backend (IPv4)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
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
