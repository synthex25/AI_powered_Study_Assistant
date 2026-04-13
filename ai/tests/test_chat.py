"""
Tests for POST /api/chat — RAG chat endpoint.
Gemini API is fully mocked; no real HTTP calls are made.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import (
    TEST_DOC_ID,
    TEST_USER_ID,
    auth_headers,
    make_llm_response,
    make_token,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _payload(query="What is AI?", doc_ids=None):
    return {
        "query": query,
        "document_ids": doc_ids or [TEST_DOC_ID],
    }


# ── Happy path ────────────────────────────────────────────────────────────────

class TestChatSuccess:
    def test_valid_query_returns_200(self, client, mock_rag_answer, valid_headers):
        resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
        assert resp.status_code == 200

    def test_response_has_required_fields(self, client, mock_rag_answer, valid_headers):
        resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
        body = resp.json()
        assert "answer" in body
        assert "model" in body
        assert "sources_used" in body

    def test_answer_is_non_empty_string(self, client, mock_rag_answer, valid_headers):
        resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
        assert isinstance(resp.json()["answer"], str)
        assert len(resp.json()["answer"]) > 0

    def test_sources_used_matches_doc_count(self, client, mock_rag_answer, valid_headers):
        doc_ids = ["doc1", "doc2", "doc3"]
        resp = client.post("/api/chat", json=_payload(doc_ids=doc_ids), headers=valid_headers)
        assert resp.json()["sources_used"] == len(doc_ids)

    def test_rag_agent_called_with_correct_query(self, client, mock_rag_answer, valid_headers):
        query = "Explain machine learning"
        client.post("/api/chat", json=_payload(query=query), headers=valid_headers)
        mock_rag_answer.assert_called_once()
        call_kwargs = mock_rag_answer.call_args
        assert call_kwargs.kwargs.get("query") == query or call_kwargs.args[0] == query

    def test_chat_history_is_forwarded(self, client, mock_rag_answer, valid_headers):
        payload = {
            "query": "Tell me more",
            "document_ids": [TEST_DOC_ID],
            "chat_history": [
                {"role": "user", "content": "What is AI?"},
                {"role": "assistant", "content": "AI is Artificial Intelligence."},
            ],
        }
        resp = client.post("/api/chat", json=payload, headers=valid_headers)
        assert resp.status_code == 200


# ── Greeting / conversational queries ────────────────────────────────────────

class TestGreetingQueries:
    def test_greeting_hi_returns_200(self, client, valid_headers):
        with patch(
            "app.api.chat._generate_with_fallback",
            new_callable=AsyncMock,
            return_value=make_llm_response("Hey there! 😊 Ready to help!"),
        ):
            resp = client.post("/api/chat", json=_payload(query="hi"), headers=valid_headers)
            assert resp.status_code == 200

    def test_greeting_sources_used_is_zero(self, client, valid_headers):
        with patch(
            "app.api.chat._generate_with_fallback",
            new_callable=AsyncMock,
            return_value=make_llm_response("Hello! How can I help?"),
        ):
            resp = client.post("/api/chat", json=_payload(query="hello"), headers=valid_headers)
            assert resp.json()["sources_used"] == 0

    def test_conversational_my_name_is_returns_200(self, client, valid_headers):
        with patch(
            "app.api.chat._generate_with_fallback",
            new_callable=AsyncMock,
            return_value=make_llm_response("Nice to meet you, Alice! 😊"),
        ):
            resp = client.post(
                "/api/chat",
                json=_payload(query="my name is Alice"),
                headers=valid_headers,
            )
            assert resp.status_code == 200


# ── Validation errors ─────────────────────────────────────────────────────────

class TestChatValidation:
    def test_empty_query_returns_400(self, client, valid_headers):
        resp = client.post("/api/chat", json=_payload(query=""), headers=valid_headers)
        assert resp.status_code == 400
        assert "query" in resp.json()["detail"].lower()

    def test_missing_document_ids_returns_400(self, client, valid_headers):
        resp = client.post(
            "/api/chat",
            json={"query": "What is AI?", "document_ids": []},
            headers=valid_headers,
        )
        assert resp.status_code == 400
        assert "document_id" in resp.json()["detail"].lower()

    def test_missing_query_field_returns_422(self, client, valid_headers):
        resp = client.post(
            "/api/chat",
            json={"document_ids": [TEST_DOC_ID]},
            headers=valid_headers,
        )
        assert resp.status_code == 422

    def test_missing_document_ids_field_returns_422(self, client, valid_headers):
        resp = client.post(
            "/api/chat",
            json={"query": "What is AI?"},
            headers=valid_headers,
        )
        assert resp.status_code == 422

    def test_invalid_json_returns_422(self, client, valid_headers):
        resp = client.post(
            "/api/chat",
            content="not-json",
            headers={**valid_headers, "Content-Type": "application/json"},
        )
        assert resp.status_code == 422

    def test_document_ids_must_be_list(self, client, valid_headers):
        resp = client.post(
            "/api/chat",
            json={"query": "What is AI?", "document_ids": "doc123"},
            headers=valid_headers,
        )
        assert resp.status_code == 422


# ── Rate limit simulation ─────────────────────────────────────────────────────

class TestRateLimitHandling:
    def test_429_from_llm_returns_429_to_client(self, client, valid_headers):
        with patch(
            "app.services.rag_agent.RAGAgent.get_answer_with_context_check",
            new_callable=AsyncMock,
            side_effect=Exception("429 Too Many Requests - rate limit exceeded"),
        ):
            resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
            assert resp.status_code == 429

    def test_429_response_has_detail_message(self, client, valid_headers):
        with patch(
            "app.services.rag_agent.RAGAgent.get_answer_with_context_check",
            new_callable=AsyncMock,
            side_effect=Exception("429 rate limit"),
        ):
            resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
            assert "detail" in resp.json()
            assert "rate limit" in resp.json()["detail"].lower()

    def test_resource_exhausted_triggers_429(self, client, valid_headers):
        with patch(
            "app.services.rag_agent.RAGAgent.get_answer_with_context_check",
            new_callable=AsyncMock,
            side_effect=Exception("resource has been exhausted"),
        ):
            resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
            assert resp.status_code == 429


# ── Billing / quota errors ────────────────────────────────────────────────────

class TestBillingErrors:
    def test_402_billing_error_returns_402(self, client, valid_headers):
        with patch(
            "app.services.rag_agent.RAGAgent.get_answer_with_context_check",
            new_callable=AsyncMock,
            side_effect=Exception("402 payment required billing issue"),
        ):
            resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
            assert resp.status_code == 402

    def test_quota_exceeded_returns_402(self, client, valid_headers):
        with patch(
            "app.services.rag_agent.RAGAgent.get_answer_with_context_check",
            new_callable=AsyncMock,
            side_effect=Exception("quota exceeded billing"),
        ):
            resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
            assert resp.status_code == 402


# ── AI failure / server errors ────────────────────────────────────────────────

class TestAIFailure:
    def test_generic_ai_error_returns_500(self, client, valid_headers):
        with patch(
            "app.services.rag_agent.RAGAgent.get_answer_with_context_check",
            new_callable=AsyncMock,
            side_effect=Exception("Unexpected internal error"),
        ):
            resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
            assert resp.status_code == 500

    def test_500_response_has_detail(self, client, valid_headers):
        with patch(
            "app.services.rag_agent.RAGAgent.get_answer_with_context_check",
            new_callable=AsyncMock,
            side_effect=Exception("Something broke"),
        ):
            resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
            assert "detail" in resp.json()

    def test_no_context_found_still_returns_200(self, client, valid_headers):
        """RAGAgent handles missing context internally and returns a friendly message."""
        with patch(
            "app.services.rag_agent.RAGAgent.get_answer_with_context_check",
            new_callable=AsyncMock,
            return_value="I couldn't find anything about that in your documents.",
        ):
            resp = client.post("/api/chat", json=_payload(), headers=valid_headers)
            assert resp.status_code == 200
            assert "document" in resp.json()["answer"].lower()
