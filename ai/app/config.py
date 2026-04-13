# Configuration settings for the FastAPI backend
from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings
from functools import lru_cache

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App Settings
    APP_NAME: str = "Byte Bees API"
    DEBUG: bool = False
    
    # LLM Provider Settings
    LLM_PROVIDER: Literal["deepinfra", "openai", "ollama", "gemini", "bedrock"] = "deepinfra"
    LLM_MODEL: str = "openai/gpt-oss-120b"
    
    # API Keys
    DEEPINFRA_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OLLAMA_HOST: str = "http://localhost:11434"
    
    # Google Gemini
    GOOGLE_API_KEY: str = ""
    
    # AWS Bedrock
    AWS_REGION: str = "us-east-1"
    
    # Storage Provider Settings
    STORAGE_PROVIDER: Literal["s3", "local"] = "local"
    LOCAL_STORAGE_PATH: str = "../application-data"  # Shared folder at project root
    AWS_S3_BUCKET: str = "aws-test-bees"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    
    # External APIs
    YOUTUBE_API_KEY: str = ""
    GOOGLE_CSE_ID: str = ""
    
    # JWT Auth (shared with Node.js backend)
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    
    # Vector Store
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # Document Processing
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100
    
    # URL Scraping
    MAX_CRAWL_DEPTH: int = 2
    MAX_PAGES_PER_SITE: int = 20
    
    class Config:
        env_file = str(ENV_FILE)
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
