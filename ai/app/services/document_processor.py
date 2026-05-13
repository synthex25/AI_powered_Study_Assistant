# Document Processing Service
import fitz  # PyMuPDF
import re
import textwrap
from typing import List, Dict, Any, Tuple
from fastapi import UploadFile
from app.config import settings


def semantic_chunk_text(
    text: str,
    max_chunk_size: int = None,
    min_chunk_size: int = 100,
    parent_window: int = 2
) -> List[Dict[str, Any]]:
    """
    Split text into semantic chunks at natural meaning boundaries.
    
    Uses paragraph boundaries first, then sentence boundaries for large paragraphs.
    Each chunk includes indices to its "parent" window (surrounding paragraphs)
    for expanded context retrieval.
    
    Args:
        text: Text to chunk
        max_chunk_size: Maximum chunk size (default from settings)
        min_chunk_size: Minimum chunk size to avoid tiny chunks
        parent_window: Number of surrounding paragraphs to include in parent
        
    Returns:
        List of chunk dicts with text, chunk_id, and parent indices
    """
    max_chunk_size = max_chunk_size or settings.CHUNK_SIZE
    
    # Step 1: Split on paragraph boundaries (double newline or more)
    paragraphs = re.split(r'\n\s*\n+', text.strip())
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    
    # Step 2: Further split large paragraphs at sentence boundaries
    refined_paragraphs = []
    for para in paragraphs:
        if len(para) > max_chunk_size:
            # Split at sentence boundaries
            sentences = re.split(r'(?<=[.!?])\s+', para)
            current_chunk = ""
            for sentence in sentences:
                if len(current_chunk) + len(sentence) <= max_chunk_size:
                    current_chunk += (" " if current_chunk else "") + sentence
                else:
                    if current_chunk:
                        refined_paragraphs.append(current_chunk)
                    current_chunk = sentence
            if current_chunk:
                refined_paragraphs.append(current_chunk)
        else:
            refined_paragraphs.append(para)
    
    # Step 3: Merge tiny chunks with neighbors
    merged = []
    for para in refined_paragraphs:
        if merged and len(merged[-1]) < min_chunk_size:
            merged[-1] += "\n\n" + para
        else:
            merged.append(para)
    
    # Step 4: Build chunk objects with parent window indices
    chunks = []
    for i, para in enumerate(merged):
        chunks.append({
            "text": para,
            "chunk_id": i,
            "parent_start": max(0, i - parent_window),
            "parent_end": min(len(merged), i + parent_window + 1),
            "total_chunks": len(merged)
        })
    
    return chunks


def chunk_text(
    text: str,
    chunk_size: int = None,
    overlap: int = None
) -> List[str]:
    """
    Legacy wrapper: Split text into chunks (returns list of strings).
    Uses semantic chunking internally but returns simple string list
    for backward compatibility.
    """
    semantic_chunks = semantic_chunk_text(text, max_chunk_size=chunk_size)
    return [chunk["text"] for chunk in semantic_chunks]


async def extract_text_from_pdf(file: UploadFile) -> str:
    """
    Extract text content from a PDF file.
    
    Args:
        file: Uploaded PDF file
        
    Returns:
        Extracted text content
    """
    try:
        file.file.seek(0)
        pdf_bytes = await file.read()
        
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            text_parts = []
            for page in doc:
                text_parts.append(page.get_text())
        
        return "\n".join(text_parts)
    except Exception as e:
        raise ValueError(f"Error extracting text from PDF: {str(e)}")


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes."""
    try:
        if not pdf_bytes:
            print("[DocumentProcessor] ✗ PDF bytes are empty!")
            return ""
            
        print(f"[DocumentProcessor] Attempting fitz extraction from {len(pdf_bytes)} bytes...")
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            print(f"[DocumentProcessor] PDF opened, pages: {len(doc)}")
            text_parts = []
            for i, page in enumerate(doc):
                page_text = page.get_text()
                print(f"[DocumentProcessor]   - Page {i+1}: {len(page_text)} chars")
                text_parts.append(page_text)
        
        full_text = "\n".join(text_parts)
        print(f"[DocumentProcessor] ✓ Extraction complete: {len(full_text)} total chars")
        return full_text
    except Exception as e:
        print(f"[DocumentProcessor] ✗ CRITICAL ERROR during PDF extraction: {e}")
        import traceback
        traceback.print_exc()
        return ""




class DocumentProcessor:
    """
    Service for processing uploaded documents.
    Handles PDF extraction, chunking, and embedding storage.
    """
    
    def __init__(self, vector_store=None):
        from app.core.vector_store import vector_store as default_store
        self.vector_store = vector_store or default_store
    
    async def process_pdf(
        self,
        file: UploadFile,
        doc_id: str
    ) -> Dict[str, Any]:
        """
        Process a PDF file: extract text, chunk, and store embeddings.
        
        Args:
            file: Uploaded PDF file
            doc_id: Unique document identifier
            
        Returns:
            Processing result with chunk count and metadata
        """
        # Extract text
        text = await extract_text_from_pdf(file)
        
        if not text.strip():
            raise ValueError("No text content found in PDF")
        
        # Chunk text
        chunks = chunk_text(text)
        
        # Store in vector DB
        self.vector_store.add_documents(
            doc_id=doc_id,
            chunks=chunks,
            metadatas=[{"source": file.filename, "type": "pdf"} for _ in chunks]
        )
        
        return {
            "doc_id": doc_id,
            "filename": file.filename,
            "total_chunks": len(chunks),
            "text_length": len(text),
            "raw_text": text  # For LLM processing
        }
    
    async def process_text(
        self,
        text: str,
        doc_id: str,
        title: str = "Text Note"
    ) -> Dict[str, Any]:
        """Process raw text content."""
        if not text.strip():
            raise ValueError("Empty text content")
        
        chunks = chunk_text(text)
        
        self.vector_store.add_documents(
            doc_id=doc_id,
            chunks=chunks,
            metadatas=[{"source": title, "type": "text"} for _ in chunks]
        )
        
        return {
            "doc_id": doc_id,
            "title": title,
            "total_chunks": len(chunks),
            "text_length": len(text),
            "raw_text": text
        }


# Default processor instance
document_processor = DocumentProcessor()
