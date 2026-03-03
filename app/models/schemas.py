# Pydantic models for API requests/responses
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ============================================================================
# Document Models
# ============================================================================

class URLRequest(BaseModel):
    """Request to process a URL."""
    url: str
    crawl_docs: bool = Field(default=True, description="Crawl child pages if API docs detected")


class SourceInput(BaseModel):
    """A single source in the workspace."""
    id: str
    type: str  # "pdf", "text", "url"
    name: str
    url: Optional[str] = None  # Signed URL or S3 key
    content: Optional[str] = None  # For text sources


class ProcessWorkspaceRequest(BaseModel):
    """Request to process a workspace."""
    workspaceId: str
    sources: List[SourceInput]
    language: Optional[str] = "en"
    provider: Optional[str] = None
    model: Optional[str] = None


class ProcessWorkspaceResponse(BaseModel):
    """Response with generated content."""
    title: Optional[str] = None
    summary: Optional[str] = None
    notes: Optional[str] = None
    flashcards: Optional[List[dict]] = None
    quizzes: Optional[List[dict]] = None
    recommendations: Optional[str] = None
    keyConcepts: Optional[List[str]] = None


class TextRequest(BaseModel):
    """Request to process raw text."""
    text: str
    title: Optional[str] = "Text Note"


class DocumentResponse(BaseModel):
    """Response after processing a document."""
    doc_id: str
    source: str
    source_type: str  # "pdf", "url", "text"
    total_chunks: int
    text_length: int
    is_api_docs: Optional[bool] = None
    pages_crawled: Optional[int] = None


class ProcessedDocumentResponse(BaseModel):
    """Response with generated content."""
    document: DocumentResponse
    content: Dict[str, Any]  # Generated notes, flashcards, quizzes


# ============================================================================
# Chat Models
# ============================================================================

class ChatMessage(BaseModel):
    """A single chat message."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request for RAG chat."""
    query: str
    document_ids: List[str]
    chat_history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    """Response from RAG chat."""
    query: str
    answer: str
    model: str
    context_used: Optional[str] = None


# ============================================================================
# Generation Models
# ============================================================================

class GenerateRequest(BaseModel):
    """Request to generate content."""
    document_id: str
    raw_text: Optional[str] = None  # If text already available


class NotesResponse(BaseModel):
    """Generated notes."""
    title: str
    summary: str
    content: str
    key_concepts: List[str]


class FlashcardResponse(BaseModel):
    """A single flashcard."""
    front: str
    back: str


class QuizResponse(BaseModel):
    """A single quiz question."""
    question: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None
