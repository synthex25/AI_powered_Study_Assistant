"""
Shared pytest fixtures for the FastAPI AI application test suite.
All external dependencies (Gemini, vector store) are mocked here.
"""
import os
import time
from typing import Generator
from unittest.mock import AsyncMock, MagicMock, patch

# ── Override env vars BEFORE any app module is imported ─────────────────────
# This prevents pydantic-settings from reading invalid values (e.g. DEBUG=release
# injected by npm/Node into the process environment).
os.environ.setdefault("DEBUG", "true")
os.environ["DEBUG"] = "true"
os.environ.setdefault("LLM_PROVIDER", "gemini")
os.environ.setdefault("LLM_MODEL", "gemini-2.5-flash")
os.environ.setdefault("JWT_SECRET", "4f8d9e2a7b5c1f3e6a9d8b2c4e7f1a5b9c3d6e8f2a4b7c1d5e9f3a6b8c2d4e7f0a1")
os.environ.setdefault("CHROMA_PERSIST_DIR", "./chroma_db")
os.environ.setdefault("STORAGE_PROVIDER", "local")
os.environ.setdefault("LOCAL_STORAGE_PATH", "../application-data")
os.environ.setdefault("GOOGLE_API_KEY", "test-key")

import jwt
import pytest
from fastapi.testclient import TestClient

# ── Constants ────────────────────────────────────────────────────────────────

TEST_JWT_SECRET = "4f8d9e2a7b5c1f3e6a9d8b2c4e7f1a5b9c3d6e8f2a4b7c1d5e9f3a6b8c2d4e7f0a1"
TEST_USER_ID    = "507f1f77bcf86cd799439011"
TEST_EMAIL      = "test@example.com"
TEST_DOC_ID     = "workspace_abc123"
TEST_WORKSPACE_ID = "69c560d0e2087b5bc4411621"

# ── JWT helpers ──────────────────────────────────────────────────────────────

def make_token(
    user_id: str = TEST_USER_ID,
    email: str = TEST_EMAIL,
    secret: str = TEST_JWT_SECRET,
    expires_in: int = 3600,
) -> str:
    payload = {
        "userId": user_id,
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + expires_in,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def make_expired_token() -> str:
    payload = {
        "userId": TEST_USER_ID,
        "email": TEST_EMAIL,
        "iat": int(time.time()) - 7200,
        "exp": int(time.time()) - 3600,   # expired 1 hour ago
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


def auth_headers(token: str | None = None) -> dict:
    return {"Authorization": f"Bearer {token or make_token()}"}


# ── LLM mock response ────────────────────────────────────────────────────────

def make_llm_response(content: str = "Mock AI answer.", model: str = "gemini-2.5-flash"):
    from app.providers.base import LLMResponse
    return LLMResponse(content=content, model=model, usage={"totalTokenCount": 10})


# ── App + TestClient fixture ─────────────────────────────────────────────────

@pytest.fixture(scope="session")
def app():
    """
    Create the FastAPI app with all external I/O patched at import time.
    Patches are applied session-wide so the app module is only loaded once.
    """
    # Patch ChromaDB / vector store before the app imports it
    mock_vs = MagicMock()
    mock_vs.query.return_value = [
        {"text": "AI stands for Artificial Intelligence.", "score": 0.95},
        {"text": "Machine learning is a subset of AI.", "score": 0.88},
    ]
    mock_vs.add_documents.return_value = None
    mock_vs.get_document_count.return_value = 5
    mock_vs.collection = MagicMock()
    mock_vs.collection.get.return_value = {"ids": []}

    with (
        patch("app.core.vector_store.vector_store", mock_vs),
        patch("chromadb.PersistentClient", MagicMock()),
        patch("sentence_transformers.SentenceTransformer", MagicMock()),
    ):
        from app.main import app as fastapi_app
        yield fastapi_app


@pytest.fixture()
def client(app) -> Generator[TestClient, None, None]:
    """TestClient — use this in every test."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ── Reusable token fixtures ──────────────────────────────────────────────────

@pytest.fixture()
def valid_token() -> str:
    return make_token()


@pytest.fixture()
def expired_token() -> str:
    return make_expired_token()


@pytest.fixture()
def valid_headers(valid_token) -> dict:
    return auth_headers(valid_token)


# ── LLM mock fixtures ────────────────────────────────────────────────────────

@pytest.fixture()
def mock_llm_generate():
    """Patch the LLM generate method used by RAGAgent and chat endpoint."""
    response = make_llm_response("This is a mocked AI response about AI concepts.")
    with patch(
        "app.providers.gemini.GeminiProvider._generate_impl",
        new_callable=AsyncMock,
        return_value=response,
    ) as mock:
        yield mock


@pytest.fixture()
def mock_rag_answer():
    """Patch RAGAgent.get_answer_with_context_check directly."""
    with patch(
        "app.services.rag_agent.RAGAgent.get_answer_with_context_check",
        new_callable=AsyncMock,
        return_value="Mocked RAG answer about the document.",
    ) as mock:
        yield mock


@pytest.fixture()
def mock_content_generator():
    """Patch DeepContentGenerator.generate_research_content."""
    result = {
        "title": "📚 Test Study Guide",
        "summary": "A comprehensive summary of the test document.",
        "key_concepts": ["concept1", "concept2"],
        "notes": "<article><h2>Test Notes</h2><p>Content here.</p></article>",
        "flashcards": [
            {"front": "What is AI?", "back": "Artificial Intelligence"},
            {"front": "What is ML?", "back": "Machine Learning"},
        ],
        "quizzes": [
            {
                "question": "What does AI stand for?",
                "options": ["A) Artificial Intelligence", "B) Auto Input", "C) Advanced Interface", "D) None"],
                "correctAnswer": "A",
                "explanation": "AI stands for Artificial Intelligence.",
            }
        ],
        "recommendations": "<div>Study recommendations here.</div>",
        "youtube_links": [{"title": "AI Tutorial", "url": "https://youtube.com/watch?v=test"}],
        "website_links": [{"title": "Wikipedia", "url": "https://en.wikipedia.org/wiki/AI"}],
        "diagrams": {"concept_map": "", "flowchart": ""},
    }
    with patch(
        "app.services.deep_content_generator.DeepContentGenerator.generate_research_content",
        new_callable=AsyncMock,
        return_value=result,
    ) as mock:
        yield mock


@pytest.fixture()
def mock_vector_store():
    """Return a fresh mock vector store for tests that need to inspect calls."""
    mock = MagicMock()
    mock.query.return_value = [
        {"text": "Artificial Intelligence is a branch of computer science.", "score": 0.9}
    ]
    mock.add_documents.return_value = None
    mock.get_document_count.return_value = 3
    with patch("app.services.rag_agent.vector_store", mock):
        yield mock
