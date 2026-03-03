# Workspace Processing Endpoint
import httpx
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from pydantic import BaseModel
from app.services.document_processor import chunk_text
from app.services.url_scraper import url_scraper

from app.services.deep_content_generator import DeepContentGenerator, deep_content_generator
from app.services.progress_stream import progress_manager, ProcessingStage
from app.core.vector_store import vector_store
from app.core.auth import get_current_user, TokenPayload

# Create two routers: one for workspace endpoints, one for upload (no prefix)
router = APIRouter(prefix="/workspace", tags=["workspace"])
upload_router = APIRouter(tags=["upload"])


from app.models.schemas import ProcessWorkspaceRequest, ProcessWorkspaceResponse
from app.utils.s3_utils import s3_utils
from botocore.exceptions import ClientError

async def fetch_content_from_url(url: str) -> str:
    """Fetch content from a signed S3 URL or regular URL."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(url, timeout=30.0)
        response.raise_for_status()
        return response.text

async def fetch_content_from_url_bytes(url: str) -> bytes:
    """Fetch binary content from a URL."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(url, timeout=60.0)
        response.raise_for_status()
        return response.content

@router.post("/process-workspace", response_model=ProcessWorkspaceResponse)
async def process_workspace(request: ProcessWorkspaceRequest, user: TokenPayload = Depends(get_current_user)):
    """
    Process all sources in a workspace and generate content.
    
    - Fetches content from signed URLs or direct S3 keys
    - Processes PDFs, text, and URLs
    - Generates notes, flashcards, quizzes, and recommendations
    - Stores embeddings for RAG
    """
    try:
        workspace_id = request.workspaceId
        all_text_parts = []
        
        # Emit: Started
        progress_manager.update(
            workspace_id, 
            ProcessingStage.STARTED, 
            0, 
            "Starting workspace processing..."
        )
        
        # Initialize deep content generator (industrial-strength)
        generator = deep_content_generator
        if request.provider:
            generator = DeepContentGenerator(llm_provider=request.provider, llm_model=request.model)
        
        # Emit: Parsing documents
        progress_manager.update(
            workspace_id,
            ProcessingStage.PARSING_DOCUMENTS,
            5,
            f"Processing {len(request.sources)} sources..."
        )
        
        print(f"[Workspace] Processing {len(request.sources)} sources for workspace {workspace_id}")
        
        # Check if we have sources with URLs
        for source in request.sources:
            print(f"[Workspace] Source: {source.name} (type={source.type}, url={source.url}, has_content={bool(source.content)})")
        
        # Process each source based on type
        total_sources = len(request.sources)
        for idx, source in enumerate(request.sources):
            try:
                source_type = source.type
                source_name = source.name
                source_url = source.url  # S3 key or URL
                
                print(f"[Workspace] Processing source {idx+1}/{total_sources}: type={source_type}, name={source_name}, has_url={bool(source_url)}")
                
                # Emit: Extracting text for this source
                progress = 5 + int((idx / total_sources) * 25)  # 5-30% for document parsing
                progress_manager.update(
                    workspace_id,
                    ProcessingStage.EXTRACTING_TEXT,
                    progress,
                    f"Extracting text from: {source_name[:50]}..."
                )
                
                # ─────────────────────────────────────────────────────────────
                # TYPE: PDF - Fetch from S3 and extract text
                # ─────────────────────────────────────────────────────────────
                if source_type == "pdf":
                    if not source_url:
                        print(f"[Workspace] No URL/S3 key for PDF: {source_name}")
                        continue
                    
                    try:
                        # Fetch PDF bytes from S3
                        raw_bytes = s3_utils.get_file_content(source_url)
                        from app.services.document_processor import extract_text_from_pdf_bytes
                        content = extract_text_from_pdf_bytes(raw_bytes)
                        
                        if content and content.strip():
                            print(f"[Workspace] ✓ PDF extracted: {len(content)} chars from {source_name}")
                            # Store in vector DB for RAG
                            chunks = chunk_text(content)
                            vector_store.add_documents(
                                doc_id=workspace_id,
                                chunks=chunks,
                                metadatas=[{"source": source_name, "type": "pdf", "workspace_id": workspace_id}]
                            )
                            all_text_parts.append(f"## Source: {source_name} (PDF)\n\n{content}")
                        else:
                            print(f"[Workspace] ✗ No text extracted from PDF: {source_name}")
                    except ClientError as e:
                        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                        print(f"[Workspace] S3 Error ({error_code}) for {source_name}")
                        continue
                    except Exception as e:
                        print(f"[Workspace] PDF error for {source_name}: {e}")
                        continue
                
                # ─────────────────────────────────────────────────────────────
                # TYPE: TEXT - Always fetch from S3 (content field is just title)
                # ─────────────────────────────────────────────────────────────
                elif source_type == "text":
                    if not source_url:
                        print(f"[Workspace] No S3 key for text: {source_name}")
                        continue
                    
                    try:
                        raw_bytes = s3_utils.get_file_content(source_url)
                        content = raw_bytes.decode('utf-8')
                        print(f"[Workspace] ✓ Text from S3: {len(content)} chars from {source_name}")
                        
                        if content and content.strip():
                            # Store in vector DB for RAG
                            chunks = chunk_text(content)
                            vector_store.add_documents(
                                doc_id=workspace_id,
                                chunks=chunks,
                                metadatas=[{"source": source_name, "type": "text", "workspace_id": workspace_id}]
                            )
                            all_text_parts.append(f"## Source: {source_name} (Text)\n\n{content}")
                    except ClientError as e:
                        print(f"[Workspace] S3 Error for text {source_name}: {e}")
                        continue
                    except Exception as e:
                        print(f"[Workspace] Text decode error for {source_name}: {e}")
                        continue

                
                # ─────────────────────────────────────────────────────────────
                # TYPE: URL - Use web scraper
                # ─────────────────────────────────────────────────────────────
                elif source_type == "url":
                    if not source_url:
                        print(f"[Workspace] No URL provided for: {source_name}")
                        continue
                    
                    # Skip AWS Console URLs (they require authentication)
                    if 'console.aws.amazon.com' in source_url:
                        print(f"[Workspace] ⚠ Skipping AWS Console URL (requires auth): {source_name}")
                        all_text_parts.append(f"## Source: {source_name} (URL - Skipped)\n\nThis is an AWS Console URL which requires authentication. Please use direct S3 links or upload the content directly.")
                        continue
                    
                    try:
                        result = await url_scraper.process_url(
                            url=source_url,
                            doc_id=workspace_id,
                            crawl_if_docs=True
                        )
                        if result.get('raw_text'):
                            content = result['raw_text']
                            print(f"[Workspace] ✓ URL scraped: {len(content)} chars from {source_name}")
                            all_text_parts.append(f"## Source: {source_name} (URL)\n\n{content}")
                        else:
                            print(f"[Workspace] ✗ No content from URL: {source_name}")
                    except Exception as e:
                        print(f"[Workspace] URL scraping error for {source_name}: {e}")
                        continue
                
                else:
                    print(f"[Workspace] Unknown source type: {source_type} for {source_name}")
                    
            except Exception as e:
                print(f"[Workspace] Unexpected error for {source.name}: {e}")
                continue

        # Check if we have any content to process
        if not all_text_parts:
            progress_manager.update(workspace_id, ProcessingStage.ERROR, 100, "No content could be extracted")
            return ProcessWorkspaceResponse(
                workspaceId=workspace_id,
                title="No Content Processed",
                summary="No content could be extracted from the provided sources. Please check your source URLs and AWS credentials.",
                notes="<p>Unable to generate notes because no content was extracted from the sources.</p>",
                flashcards=[],
                quizzes=[],
                recommendations="Please ensure your sources are valid and accessible."
            )
        
        # Combine all text
        combined_text = "\n\n---\n\n".join(all_text_parts)
        
        # Emit: Generating notes (main content generation)
        progress_manager.update(
            workspace_id,
            ProcessingStage.GENERATING_NOTES,
            35,
            "Generating research notes with AI..."
        )
        
        # Generate content using industrial-strength deep generator
        print(f"[Workspace] Generating research content (text length: {len(combined_text)})")
        
        # Pass progress callback to generator
        async def progress_callback(stage: str, pct: int, msg: str):
            stage_map = {
                "notes": ProcessingStage.GENERATING_NOTES,
                "flashcards": ProcessingStage.CREATING_FLASHCARDS,
                "quizzes": ProcessingStage.CREATING_QUIZZES,
                "recommendations": ProcessingStage.CREATING_RECOMMENDATIONS,
            }
            ps = stage_map.get(stage, ProcessingStage.GENERATING_NOTES)
            progress_manager.update(workspace_id, ps, pct, msg)
        
        result = await generator.generate_research_content(
            text=combined_text,
            title=f"Workspace Study Guide",
            language=request.language or "en",
            progress_callback=progress_callback
        )
        
        # Emit: Finalizing (building response)
        progress_manager.update(workspace_id, ProcessingStage.FINALIZING, 98, "Preparing your content...")
        
        print(f"[Workspace] Content generation complete")
        
        response = ProcessWorkspaceResponse(
            title=result.get("title"),
            summary=result.get("summary"),
            notes=result.get("notes") or result.get("content"),
            flashcards=result.get("flashcards"),
            quizzes=result.get("quizzes"),
            recommendations=result.get("recommendations"),
            keyConcepts=result.get("key_concepts")
        )
        
        # Emit: Completed - only after response is ready
        progress_manager.update(workspace_id, ProcessingStage.COMPLETED, 100, "Done! ✨")
        
        return response
        
    except Exception as e:
        raise HTTPException(500, str(e))




@upload_router.post("/upload_pdfs/")
async def upload_pdfs(files: List[UploadFile] = File(...), workspace_id: Optional[str] = Query(None)):
    """
    Upload and index PDFs for RAG.
    Returns document data in the format expected by the frontend.
    This is a simplified endpoint that indexes PDFs to vector store.
    
    Args:
        files: PDF files to upload
        workspace_id: Optional workspace ID to associate with these documents.
                     If not provided, generates a temporary ID.
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        documents = []
        # Use provided workspace_id or create a temporary one
        if not workspace_id:
            workspace_id = str(uuid.uuid4())
        
        print(f"[Upload] Starting document upload for workspace: {workspace_id}")
        
        for file in files:
            if not file.filename or not file.filename.lower().endswith('.pdf'):
                continue
            
            try:
                # Extract text from PDF
                from app.services.document_processor import extract_text_from_pdf_bytes
                file_bytes = await file.read()
                text = extract_text_from_pdf_bytes(file_bytes)
                
                if not text.strip():
                    print(f"[Upload] No text extracted from {file.filename}")
                    continue
                
                # Use workspace_id as the doc_id so it can be queried later
                doc_id = workspace_id
                
                # Index to vector store
                chunks = chunk_text(text)
                vector_store.add_documents(
                    doc_id=doc_id,
                    chunks=chunks,
                    metadatas=[{"source": file.filename, "type": "pdf", "workspace_id": workspace_id}]
                )
                
                print(f"[Upload] Indexed {len(chunks)} chunks from {file.filename} with doc_id={doc_id}")
                
                # Build response in format expected by frontend
                documents.append({
                    "document_id": doc_id,
                    "filename": file.filename,
                    "processed_text": [
                        {
                            "content": text,
                            "quizzes": [],
                            "flashcards": []
                        }
                    ],
                    "youtube_links": [],
                    "website_links": []
                })
                
            except Exception as e:
                print(f"[Upload] Error processing {file.filename}: {e}")
                continue
        
        if not documents:
            raise HTTPException(status_code=400, detail="No PDFs could be processed")
        
        return {
            "documents": documents,
            "workspace_id": workspace_id,  # Return workspace_id so frontend knows which doc_id to use for chat
            "status": "success"
        }
        
    except Exception as e:
        print(f"[Upload] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{workspace_id}/embeddings")
async def delete_workspace_embeddings(workspace_id: str, user: TokenPayload = Depends(get_current_user)):
    """Delete all embeddings for a workspace."""
    try:
        # Get all chunks for this workspace
        results = vector_store.collection.get(
            where={"workspace_id": workspace_id}
        )
        
        if results["ids"]:
            vector_store.collection.delete(ids=results["ids"])
        
        return {"message": f"Deleted embeddings for workspace {workspace_id}"}
    except Exception as e:
        raise HTTPException(500, str(e))
