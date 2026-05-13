# Workspace Processing Endpoint
import httpx
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from app.services.document_processor import chunk_text
from app.services import document_processor
from app.services.url_scraper import url_scraper

from app.services.deep_content_generator import (
    DeepContentGenerator,
    deep_content_generator,
)
from app.services.progress_stream import progress_manager, ProcessingStage
from app.core.vector_store import vector_store
from app.core.auth import get_current_user, TokenPayload

# Additional imports moved to top to satisfy linter
from app.models.schemas import (
    ProcessWorkspaceRequest,
    ProcessWorkspaceResponse,
)
from app.utils.s3_utils import s3_utils
from botocore.exceptions import ClientError

# Create two routers: one for workspace endpoints, one for upload (no prefix)
router = APIRouter(prefix="/workspace", tags=["workspace"])
upload_router = APIRouter(tags=["upload"])

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
async def process_workspace(
    request: ProcessWorkspaceRequest,
    user: TokenPayload = Depends(get_current_user),
):
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
        failed_sources = []
        processed_count = 0
        
        # Emit: Started
        progress_manager.update(
            workspace_id,
            ProcessingStage.STARTED,
            0,
            "Starting workspace processing...",
        )
        
        # Initialize deep content generator (industrial-strength)
        generator = deep_content_generator
        if request.provider:
            generator = DeepContentGenerator(
                llm_provider=request.provider,
                llm_model=request.model,
            )
        
        # Emit: Parsing documents
        progress_manager.update(
            workspace_id,
            ProcessingStage.PARSING_DOCUMENTS,
            5,
            f"Processing {len(request.sources)} sources..."
        )
        
        print(
            "[Workspace] Processing "
            f"{len(request.sources)} sources for workspace {workspace_id}"
        )
        
        # Check if we have sources with URLs
        for source in request.sources:
            print(
                "[Workspace] Source: "
                f"{source.name} (type={source.type}, url={source.url}, "
                f"has_content={bool(source.content)})"
            )
        
        # Process each source based on type
        total_sources = len(request.sources)
        for idx, source in enumerate(request.sources):
            try:
                source_type = source.type
                source_name = source.name
                source_url = source.url  # S3 key or URL
                
                print(
                    "[Workspace] Processing source "
                    f"{idx+1}/{total_sources}: type={source_type}, name={source_name}, "
                    f"has_url={bool(source_url)}"
                )

                # Emit: Extracting text for this source
                progress = 5 + int(
                    (idx / total_sources) * 25
                )  # 5-30% for document parsing
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
                    # Allow direct content (base64) from caller
                    # (local storage)
                    if getattr(source, 'content', None):
                        try:
                            import base64
                            raw_bytes = base64.b64decode(source.content)
                            print(
                                "[Workspace] Using provided PDF content for "
                                f"{source_name} ({len(raw_bytes)} bytes after decoding)"
                            )
                            # Extract text from provided PDF bytes
                            extract_pdf = (
                                document_processor.extract_text_from_pdf_bytes
                            )
                            content = extract_pdf(raw_bytes)
                            print(
                                f"[Workspace] Direct PDF extraction result for {source_name}: "
                                f"{len(content) if content else 0} characters"
                            )


                            if content and content.strip():
                                print(
                                    "[Workspace] ✓ PDF extracted: "
                                    + str(len(content))
                                    + " chars from "
                                    + source_name
                                )
                                processed_count += 1
                                # Store in vector DB for RAG
                                chunks = chunk_text(content)
                                vector_store.add_documents(
                                    doc_id=workspace_id,
                                    chunks=chunks,
                                    metadatas=[
                                        {
                                            "source": source_name,
                                            "type": "pdf",
                                            "workspace_id": workspace_id,
                                        }
                                    ],
                                )
                                header = (
                                    "## Source: " + source_name + " (PDF)\n\n"
                                )
                                all_text_parts.append(header + content)
                            else:
                                msg = (
                                    "PDF extraction returned empty content: "
                                    + source_name
                                )
                                print(f"[Workspace] ✗ {msg}")
                                failed_sources.append(msg)
                        except Exception as e:
                            msg = f"Failed to decode provided PDF content for {source_name}: {str(e)[:100]}"
                            print(f"[Workspace] ✗ {msg}")
                            failed_sources.append(msg)
                            continue
                    else:
                        if not source_url:
                            msg = f"No URL/S3 key for PDF: {source_name}"
                            print(f"[Workspace] {msg}")
                            failed_sources.append(msg)
                            continue
                        try:
                            # Fetch PDF bytes from S3 or signed URL
                            print(
                                "[Workspace] Fetching PDF from: "
                                f"{source_url[:100]}..."
                            )
                            
                            # Check if source_url is a URL (signed URL or HTTP URL)
                            is_http = source_url.startswith(
                                ("http://", "https://", "file://")
                            )
                            if is_http:
                                print(
                                    "[Workspace] Using URL fetch for PDF: "
                                    f"{source_name}"
                                )
                                try:
                                    raw_bytes = await fetch_content_from_url_bytes(
                                        source_url
                                    )
                                    print(
                                        "[Workspace] URL fetch succeeded, got "
                                        + str(len(raw_bytes))
                                        + " bytes"
                                    )
                                except Exception as url_err:
                                    msg = (
                                        "PDF URL fetch failed for " + source_name + ": "
                                        + str(url_err)[:100]
                                    )
                                    print(f"[Workspace] ✗ {msg}")
                                    failed_sources.append(msg)
                                    continue
                            else:
                                # It's an S3 key
                                print(
                                    "[Workspace] Using S3 fetch for PDF: "
                                    f"{source_name}"
                                )
                                try:
                                    raw_bytes = await s3_utils.get_file_content_async(
                                        source_url
                                    )
                                    print(
                                        "[Workspace] S3 fetch succeeded, got "
                                        + str(len(raw_bytes))
                                        + " bytes"
                                    )
                                except Exception as s3_err:
                                    msg = (
                                        "PDF S3 fetch failed for " + source_name + ": "
                                        + str(s3_err)[:100]
                                    )
                                    print(f"[Workspace] ✗ {msg}")
                                    failed_sources.append(msg)
                                    continue
                            
                            print(
                                f"[Workspace] Fetching PDF for {source_name}, source_url has value: {bool(source_url)}"
                            )
                            extract_pdf = (
                                document_processor.extract_text_from_pdf_bytes
                            )
                            content = extract_pdf(raw_bytes)
                            print(
                                f"[Workspace] PDF Extraction result for {source_name}: "
                                f"{len(content) if content else 0} characters"
                            )


                            if content and content.strip():
                                print(
                                    "[Workspace] ✓ PDF extracted: "
                                    + str(len(content))
                                    + " chars from "
                                    + source_name
                                )
                                processed_count += 1
                                # Store in vector DB for RAG
                                chunks = chunk_text(content)
                                vector_store.add_documents(
                                    doc_id=workspace_id,
                                    chunks=chunks,
                                    metadatas=[
                                        {
                                            "source": source_name,
                                            "type": "pdf",
                                            "workspace_id": workspace_id,
                                        }
                                    ],
                                )
                                all_text_parts.append(
                                    "## Source: " + source_name + " (PDF)\n\n" + content
                                )
                            else:
                                msg = (
                                    "PDF extraction returned empty content: "
                                    + source_name
                                )
                                print(f"[Workspace] ✗ {msg}")
                                failed_sources.append(msg)
                        except ClientError as e:
                            err = e.response.get('Error', {})
                            error_code = err.get('Code', 'Unknown')
                            msg = (
                                "S3 Error (" + str(error_code) + ") for PDF "
                                + source_name
                                + ": "
                                + str(e)[:100]
                            )
                            print(f"[Workspace] ✗ {msg}")
                            failed_sources.append(msg)
                        except Exception as e:
                            msg = (
                                "PDF error for "
                                + source_name
                                + ": "
                                + type(e).__name__
                                + ": "
                                + str(e)[:100]
                            )
                            print(f"[Workspace] ✗ {msg}")
                            failed_sources.append(msg)
                            import traceback
                            traceback.print_exc()
                
                # ─────────────────────────────────────────────────────────────
                # TYPE: TEXT - Always fetch from S3 (content field is just title)
                # ─────────────────────────────────────────────────────────────
                elif source_type == "text":
                    # If caller provided text content directly (local storage), use it
                    if getattr(source, 'content', None):
                        try:
                            content = source.content
                            print(
                                "[Workspace] Using provided text content for "
                                f"{source_name} ({len(content)} chars)"
                            )
                            processed_count += 1
                            chunks = chunk_text(content)
                            vector_store.add_documents(
                                doc_id=workspace_id,
                                chunks=chunks,
                                metadatas=[
                                    {
                                        "source": source_name,
                                        "type": "text",
                                        "workspace_id": workspace_id,
                                    }
                                ],
                            )
                            header = (
                                "## Source: " + source_name + " (Text)\n\n"
                            )
                            all_text_parts.append(header + content)
                            continue
                        except Exception as e:
                            msg = (
                                "Failed to use provided text content for "
                                + source_name
                                + ": "
                                + str(e)[:100]
                            )
                            print(f"[Workspace] ✗ {msg}")
                            failed_sources.append(msg)
                            continue
                    if not source_url:
                        msg = f"No S3 key for text: {source_name}"
                        print(f"[Workspace] {msg}")
                        failed_sources.append(msg)
                        continue
                    
                    try:
                        print(
                            "[Workspace] Fetching text from: "
                            f"{source_url[:100]}..."
                        )
                        
                        # Check if source_url is a URL (signed URL or HTTP URL)
                        is_http = source_url.startswith(
                            ("http://", "https://", "file://")
                        )
                        if is_http:
                            print(
                                "[Workspace] Using URL fetch for text: "
                                f"{source_name}"
                            )
                            try:
                                raw_bytes = await fetch_content_from_url_bytes(
                                    source_url
                                )
                                print(
                                    "[Workspace] URL fetch succeeded, got "
                                    + str(len(raw_bytes))
                                    + " bytes"
                                )
                            except Exception as url_err:
                                msg = (
                                    "Text URL fetch failed for " + source_name + ": "
                                    + str(url_err)[:100]
                                )
                                print(f"[Workspace] ✗ {msg}")
                                failed_sources.append(msg)
                                continue
                        else:
                            # It's an S3 key
                            print(
                                "[Workspace] Using S3 fetch for text: "
                                f"{source_name}"
                            )
                            try:
                                raw_bytes = await s3_utils.get_file_content_async(
                                    source_url
                                )
                                print(
                                    "[Workspace] S3 fetch succeeded, got "
                                    + str(len(raw_bytes))
                                    + " bytes"
                                )
                            except Exception as s3_err:
                                msg = (
                                    "Text S3 fetch failed for " + source_name + ": "
                                    + str(s3_err)[:100]
                                )
                                print(f"[Workspace] ✗ {msg}")
                                failed_sources.append(msg)
                                continue
                        
                        print(
                            f"[Workspace] Fetched {len(raw_bytes)} bytes for text: "
                            f"{source_name}"
                        )
                        content = raw_bytes.decode('utf-8')
                        print(
                            f"[Workspace] ✓ Text decoded: {len(content)} chars from "
                            f"{source_name}"
                        )
                        
                        if content and content.strip():
                            processed_count += 1
                            # Store in vector DB for RAG
                            chunks = chunk_text(content)
                            vector_store.add_documents(
                                doc_id=workspace_id,
                                chunks=chunks,
                                metadatas=[
                                    {
                                        "source": source_name,
                                        "type": "text",
                                        "workspace_id": workspace_id,
                                    }
                                ],
                            )
                            all_text_parts.append(
                                "## Source: " + source_name + " (Text)\n\n" + content
                            )
                    except ClientError as e:
                        msg = f"S3 Error for text {source_name}: {str(e)[:100]}"
                        print(f"[Workspace] ✗ {msg}")
                        failed_sources.append(msg)
                    except Exception as e:
                        msg = f"Text error for {source_name}: {type(e).__name__}: {str(e)[:100]}"
                        print(f"[Workspace] ✗ {msg}")
                        failed_sources.append(msg)
                        import traceback
                        traceback.print_exc()

                
                # ─────────────────────────────────────────────────────────────
                # TYPE: URL - Use web scraper
                # ─────────────────────────────────────────────────────────────
                elif source_type == "url":
                    if not source_url:
                        msg = f"No URL provided for: {source_name}"
                        print(f"[Workspace] {msg}")
                        failed_sources.append(msg)
                        continue
                    
                    # Skip AWS Console URLs (they require authentication)
                    if 'console.aws.amazon.com' in source_url:
                        msg = f"Skipping AWS Console URL (requires auth): {source_name}"
                        print(f"[Workspace] ⚠ {msg}")
                        failed_sources.append(msg)
                        continue
                    
                    try:
                        print(f"[Workspace] Scraping URL: {source_url[:100]}...")
                        result = await url_scraper.process_url(
                            url=source_url,
                            doc_id=workspace_id,
                            crawl_if_docs=True
                        )
                        if result.get('raw_text'):
                            content = result['raw_text']
                            print(
                                f"[Workspace] ✓ URL scraped: {len(content)} chars from "
                                f"{source_name}"
                            )
                            processed_count += 1
                            all_text_parts.append(
                                "## Source: " + source_name + " (URL)\n\n" + content
                            )
                        else:
                            msg = f"URL scraping returned no content: {source_name}"
                            print(f"[Workspace] ✗ {msg}")
                            failed_sources.append(msg)
                    except Exception as e:
                        msg = f"URL scraping error for {source_name}: {str(e)[:100]}"
                        print(f"[Workspace] ✗ {msg}")
                        failed_sources.append(msg)
                
                else:
                    print(f"[Workspace] Unknown source type: {source_type} for {source_name}")
                    
            except Exception as e:
                print(f"[Workspace] Unexpected error for {source.name}: {e}")
                continue

        # Check if we have any content to process
        if not all_text_parts:
            error_msg = (
                "No content extracted from "
                + str(len(request.sources))
                + " sources. Failed: "
                + str(len(failed_sources))
            )
            progress_manager.update(workspace_id, ProcessingStage.ERROR, 100, error_msg)
            
            print(f"[Workspace] ERROR: {error_msg}")
            for failure in failed_sources:
                print(f"[Workspace]   - {failure}")
            
            return ProcessWorkspaceResponse(
                workspaceId=workspace_id,
                title="No Content Processed",
                summary="No content could be extracted from the provided sources.",
                notes=(
                    "<p>Unable to generate notes because no content was "
                    "extracted from the sources. Check the server logs for "
                    "detailed error information.</p>"
                ),
                flashcards=[],
                quizzes=[],
                recommendations="Please check your source URLs and AWS credentials.",
                error=f"All {len(request.sources)} sources failed to extract: {'; '.join(failed_sources[:3])}{'... (check logs for more)' if len(failed_sources) > 3 else ''}",
                processedSources=processed_count,
                failedSources=failed_sources
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
        
        print("[Workspace] Content generation complete")
        
        response = ProcessWorkspaceResponse(
            workspaceId=workspace_id,
            title=result.get("title"),
            summary=result.get("summary"),
            notes=result.get("notes") or result.get("content"),
            flashcards=result.get("flashcards"),
            quizzes=result.get("quizzes"),
            recommendations=result.get("recommendations"),
            keyConcepts=result.get("key_concepts"),
            processedSources=processed_count
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
        
        print(f"[Upload] Starting document upload for workspace_id: {workspace_id}")
        
        for file in files:
            if not file.filename or not file.filename.lower().endswith('.pdf'):
                print(f"[Upload] Skipping non-PDF file: {file.filename}")
                continue
            
            try:
                # Extract text from PDF
                file_bytes = await file.read()
                text = document_processor.extract_text_from_pdf_bytes(file_bytes)
                
                if not text or not text.strip():
                    print(
                        "[Upload] ✗ No text extracted from " + file.filename
                    )
                    continue
                
                print(
                    "[Upload] ✓ Extracted " + str(len(text)) + " chars from " + file.filename
                )
                
                # Use workspace_id as the doc_id for vector store
                doc_id = workspace_id
                
                # Index to vector store
                chunks = chunk_text(text)
                print(f"[Upload] Chunked into {len(chunks)} parts")
                
                vector_store.add_documents(
                    doc_id=doc_id,
                    chunks=chunks,
                    metadatas=[{"source": file.filename, "type": "pdf", "workspace_id": workspace_id}]
                )
                
                print(f"[Upload] ✓ Indexed {len(chunks)} chunks with doc_id={doc_id}")
                print(f"[Upload] Total docs in store: {vector_store.get_document_count()}")
                
                # Verify indexing worked
                test_results = vector_store.query(query="test", document_ids=[doc_id], top_k=1)
                print(f"[Upload] Verification query returned {len(test_results)} results for doc_id {doc_id}")
                
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


@router.post("/debug/test-url-fetch")
async def debug_test_url_fetch(url: str = "", user: TokenPayload = Depends(get_current_user)):
    """
    Debug endpoint to test if we can fetch content from a URL.
    Helpful for diagnosing signed URL and network issues.
    """
    if not url:
        return {
            "status": "error",
            "message": "URL parameter required",
            "example": "POST /api/workspace/debug/test-url-fetch?url=https://..."
        }
    
    try:
        print(f"[Debug] Testing URL fetch: {url[:100]}...")
        
        # Try to fetch the URL
        raw_bytes = await fetch_content_from_url_bytes(url)
        
        return {
            "status": "success",
            "url": url[:100],
            "bytes_fetched": len(raw_bytes),
            "message": f"Successfully fetched {len(raw_bytes)} bytes"
        }
    except Exception as e:
        return {
            "status": "error",
            "url": url[:100],
            "error_type": type(e).__name__,
            "error_message": str(e)[:200],
            "message": f"Failed to fetch URL: {type(e).__name__}: {str(e)[:100]}"
        }

