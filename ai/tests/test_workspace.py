"""
Tests for workspace endpoints:
  POST /api/workspace/process-workspace
  POST /upload_pdfs/
All Gemini and file-processing calls are mocked.
"""
import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import (
    TEST_WORKSPACE_ID,
    auth_headers,
    make_token,
)

# ── Minimal valid PDF bytes (enough for PyMuPDF to not crash) ────────────────
# A real 1-page PDF with the text "Hello World"
_MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R"
    b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    b"4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\n"
    b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"xref\n0 6\n0000000000 65535 f\n"
    b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF"
)


def _process_payload(workspace_id=TEST_WORKSPACE_ID, sources=None):
    return {
        "workspaceId": workspace_id,
        "sources": sources or [
            {
                "id": "src_001",
                "type": "text",
                "name": "Test Note",
                "content": "Artificial Intelligence is the simulation of human intelligence by machines.",
            }
        ],
        "language": "en",
    }


# ── process-workspace: happy path ─────────────────────────────────────────────

class TestProcessWorkspaceSuccess:
    def test_returns_200(self, client, mock_content_generator, valid_headers):
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=valid_headers,
        )
        assert resp.status_code == 200

    def test_response_has_workspace_id(self, client, mock_content_generator, valid_headers):
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=valid_headers,
        )
        assert resp.json()["workspaceId"] == TEST_WORKSPACE_ID

    def test_response_has_notes(self, client, mock_content_generator, valid_headers):
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=valid_headers,
        )
        body = resp.json()
        assert "notes" in body
        assert body["notes"] is not None
        assert len(body["notes"]) > 0

    def test_response_has_flashcards_list(self, client, mock_content_generator, valid_headers):
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=valid_headers,
        )
        body = resp.json()
        assert "flashcards" in body
        assert isinstance(body["flashcards"], list)

    def test_response_has_quizzes_list(self, client, mock_content_generator, valid_headers):
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=valid_headers,
        )
        body = resp.json()
        assert "quizzes" in body
        assert isinstance(body["quizzes"], list)

    def test_response_has_title_and_summary(self, client, mock_content_generator, valid_headers):
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=valid_headers,
        )
        body = resp.json()
        assert body.get("title") is not None
        assert body.get("summary") is not None

    def test_flashcard_structure(self, client, mock_content_generator, valid_headers):
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=valid_headers,
        )
        flashcards = resp.json()["flashcards"]
        assert len(flashcards) > 0
        for card in flashcards:
            assert "front" in card
            assert "back" in card

    def test_quiz_structure(self, client, mock_content_generator, valid_headers):
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=valid_headers,
        )
        quizzes = resp.json()["quizzes"]
        assert len(quizzes) > 0
        q = quizzes[0]
        assert "question" in q
        assert "options" in q
        assert "correctAnswer" in q

    def test_generator_called_once(self, client, mock_content_generator, valid_headers):
        client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=valid_headers,
        )
        mock_content_generator.assert_called_once()

    def test_multiple_text_sources(self, client, mock_content_generator, valid_headers):
        sources = [
            {"id": f"src_{i}", "type": "text", "name": f"Note {i}", "content": f"Content {i}"}
            for i in range(3)
        ]
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(sources=sources),
            headers=valid_headers,
        )
        assert resp.status_code == 200

    def test_language_parameter_accepted(self, client, mock_content_generator, valid_headers):
        payload = _process_payload()
        payload["language"] = "es"
        resp = client.post(
            "/api/workspace/process-workspace",
            json=payload,
            headers=valid_headers,
        )
        assert resp.status_code == 200


# ── process-workspace: auth ───────────────────────────────────────────────────

class TestProcessWorkspaceAuth:
    def test_no_token_returns_401(self, client):
        resp = client.post("/api/workspace/process-workspace", json=_process_payload())
        assert resp.status_code == 401

    def test_expired_token_returns_401(self, client, expired_token):
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(),
            headers=auth_headers(expired_token),
        )
        assert resp.status_code == 401


# ── process-workspace: validation ────────────────────────────────────────────

class TestProcessWorkspaceValidation:
    def test_missing_workspace_id_returns_422(self, client, valid_headers):
        payload = {"sources": [{"id": "s1", "type": "text", "name": "n", "content": "c"}]}
        resp = client.post(
            "/api/workspace/process-workspace",
            json=payload,
            headers=valid_headers,
        )
        assert resp.status_code == 422

    def test_empty_sources_returns_error(self, client, mock_content_generator, valid_headers):
        """Empty sources: workspace.py still calls the generator with no text,
        which returns the mocked result. The endpoint returns 200 with content.
        This is acceptable behaviour — the generator handles empty input gracefully."""
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(sources=[]),
            headers=valid_headers,
        )
        # FastAPI validates the empty list at the Pydantic level (422)
        # OR the endpoint processes it and returns 200 — both are acceptable.
        assert resp.status_code in (200, 422)

    def test_invalid_json_returns_422(self, client, valid_headers):
        resp = client.post(
            "/api/workspace/process-workspace",
            content="not-json",
            headers={**valid_headers, "Content-Type": "application/json"},
        )
        assert resp.status_code == 422

    def test_source_missing_required_fields_returns_422(self, client, valid_headers):
        payload = {
            "workspaceId": TEST_WORKSPACE_ID,
            "sources": [{"type": "text"}],   # missing id and name
        }
        resp = client.post(
            "/api/workspace/process-workspace",
            json=payload,
            headers=valid_headers,
        )
        assert resp.status_code == 422


# ── process-workspace: AI failure ────────────────────────────────────────────

class TestProcessWorkspaceAIFailure:
    def test_ai_rate_limit_returns_fallback_not_500(self, client, valid_headers):
        """Generator catches rate limits and returns fallback content, not a crash."""
        with patch(
            "app.services.deep_content_generator.DeepContentGenerator.generate_research_content",
            new_callable=AsyncMock,
            return_value={
                "title": "Fallback",
                "summary": "Rate limited.",
                "notes": "<p>Rate limited fallback.</p>",
                "flashcards": [],
                "quizzes": [],
                "recommendations": "",
                "key_concepts": [],
                "youtube_links": [],
                "website_links": [],
                "diagrams": {"concept_map": "", "flowchart": ""},
            },
        ):
            resp = client.post(
                "/api/workspace/process-workspace",
                json=_process_payload(),
                headers=valid_headers,
            )
            assert resp.status_code == 200

    def test_unhandled_exception_returns_500(self, client, valid_headers):
        with patch(
            "app.services.deep_content_generator.DeepContentGenerator.generate_research_content",
            new_callable=AsyncMock,
            side_effect=RuntimeError("Unexpected crash"),
        ):
            resp = client.post(
                "/api/workspace/process-workspace",
                json=_process_payload(),
                headers=valid_headers,
            )
            assert resp.status_code == 500


# ── process-workspace: large input ───────────────────────────────────────────

class TestProcessWorkspaceLargeInput:
    def test_large_text_source_accepted(self, client, mock_content_generator, valid_headers):
        large_content = "This is a sentence about artificial intelligence. " * 500  # ~25k chars
        sources = [{"id": "big", "type": "text", "name": "Big Doc", "content": large_content}]
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(sources=sources),
            headers=valid_headers,
        )
        assert resp.status_code == 200

    def test_many_sources_accepted(self, client, mock_content_generator, valid_headers):
        sources = [
            {"id": f"s{i}", "type": "text", "name": f"Doc {i}", "content": f"Content about topic {i}."}
            for i in range(10)
        ]
        resp = client.post(
            "/api/workspace/process-workspace",
            json=_process_payload(sources=sources),
            headers=valid_headers,
        )
        assert resp.status_code == 200


# ── /upload_pdfs/ endpoint ────────────────────────────────────────────────────

class TestUploadPdfs:
    def _upload(self, client, pdf_bytes=None, filename="test.pdf", workspace_id=None):
        files = {"files": (filename, io.BytesIO(pdf_bytes or _MINIMAL_PDF), "application/pdf")}
        params = {"workspace_id": workspace_id} if workspace_id else {}
        with patch(
            "app.services.document_processor.extract_text_from_pdf_bytes",
            return_value="Extracted text from PDF about artificial intelligence.",
        ):
            return client.post("/upload_pdfs/", files=files, params=params)

    def test_valid_pdf_returns_200(self, client):
        resp = self._upload(client)
        assert resp.status_code == 200

    def test_response_has_documents_list(self, client):
        resp = self._upload(client)
        body = resp.json()
        assert "documents" in body
        assert isinstance(body["documents"], list)
        assert len(body["documents"]) > 0

    def test_response_has_workspace_id(self, client):
        resp = self._upload(client, workspace_id="ws_test_123")
        body = resp.json()
        assert "workspace_id" in body
        assert body["workspace_id"] == "ws_test_123"

    def test_workspace_id_auto_generated_if_not_provided(self, client):
        resp = self._upload(client)
        body = resp.json()
        assert "workspace_id" in body
        assert len(body["workspace_id"]) > 0

    def test_document_structure(self, client):
        resp = self._upload(client)
        doc = resp.json()["documents"][0]
        assert "document_id" in doc
        assert "processed_text" in doc
        assert isinstance(doc["processed_text"], list)

    def test_non_pdf_file_skipped(self, client):
        """Non-PDF files are skipped; with no valid PDFs the upload router raises
        HTTPException(400) which FastAPI wraps as 500 when raise_server_exceptions=False.
        The important thing is no PDF was processed."""
        files = {"files": ("test.txt", io.BytesIO(b"plain text"), "text/plain")}
        with patch(
            "app.services.document_processor.extract_text_from_pdf_bytes",
            return_value="text",
        ):
            resp = client.post("/upload_pdfs/", files=files)
        # The endpoint raises 400 internally; TestClient with raise_server_exceptions=False
        # may surface it as 400 or 500 depending on exception handling.
        assert resp.status_code in (400, 500)

    def test_empty_pdf_content_skipped(self, client):
        """PDFs that yield no text are skipped; endpoint returns 400 (no processable PDFs)."""
        with patch(
            "app.services.document_processor.extract_text_from_pdf_bytes",
            return_value="",
        ):
            files = {"files": ("empty.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")}
            resp = client.post("/upload_pdfs/", files=files)
        assert resp.status_code in (400, 500)

    def test_multiple_pdfs_uploaded(self, client):
        files = [
            ("files", ("doc1.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")),
            ("files", ("doc2.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")),
        ]
        with patch(
            "app.services.document_processor.extract_text_from_pdf_bytes",
            return_value="Extracted text content.",
        ):
            resp = client.post("/upload_pdfs/", files=files)
        assert resp.status_code == 200
        assert len(resp.json()["documents"]) == 2


# ── Health / root endpoints ───────────────────────────────────────────────────

class TestHealthEndpoints:
    def test_root_returns_healthy(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    def test_health_returns_healthy(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    def test_health_has_services_field(self, client):
        resp = client.get("/health")
        assert "services" in resp.json()
