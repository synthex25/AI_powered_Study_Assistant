"""
Tests for JWT authentication — token validation, missing headers, expiry.
No real Gemini calls are made; all LLM dependencies are mocked via conftest.
"""
import time
from unittest.mock import patch

import jwt
import pytest

from tests.conftest import (
    TEST_EMAIL,
    TEST_JWT_SECRET,
    TEST_USER_ID,
    auth_headers,
    make_expired_token,
    make_token,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _chat_payload():
    return {
        "query": "What is AI?",
        "document_ids": ["doc123"],
    }


# ── Token generation ─────────────────────────────────────────────────────────

class TestTokenGeneration:
    def test_valid_token_decodes_correctly(self):
        token = make_token()
        payload = jwt.decode(token, TEST_JWT_SECRET, algorithms=["HS256"])
        assert payload["userId"] == TEST_USER_ID
        assert payload["email"] == TEST_EMAIL
        assert payload["exp"] > time.time()

    def test_expired_token_raises_on_decode(self):
        token = make_expired_token()
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(token, TEST_JWT_SECRET, algorithms=["HS256"])

    def test_token_with_wrong_secret_raises(self):
        token = make_token(secret="wrong-secret")
        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(token, TEST_JWT_SECRET, algorithms=["HS256"])


# ── Missing / malformed Authorization header ─────────────────────────────────

class TestMissingAuth:
    def test_no_auth_header_returns_401(self, client):
        resp = client.post("/api/chat", json=_chat_payload())
        assert resp.status_code == 401

    def test_empty_bearer_returns_401(self, client):
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers={"Authorization": "Bearer "},
        )
        assert resp.status_code == 401

    def test_malformed_header_no_bearer_prefix_returns_401(self, client):
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers={"Authorization": make_token()},   # missing "Bearer " prefix
        )
        assert resp.status_code == 401

    def test_wrong_scheme_returns_401(self, client):
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers={"Authorization": f"Basic {make_token()}"},
        )
        assert resp.status_code == 401


# ── Expired token ─────────────────────────────────────────────────────────────

class TestExpiredToken:
    def test_expired_token_returns_401(self, client):
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers=auth_headers(make_expired_token()),
        )
        assert resp.status_code == 401

    def test_expired_token_error_message(self, client):
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers=auth_headers(make_expired_token()),
        )
        body = resp.json()
        assert "detail" in body
        assert "expired" in body["detail"].lower()


# ── Invalid token ─────────────────────────────────────────────────────────────

class TestInvalidToken:
    def test_garbage_token_returns_401(self, client):
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers={"Authorization": "Bearer not.a.real.token"},
        )
        assert resp.status_code == 401

    def test_token_signed_with_wrong_secret_returns_401(self, client):
        bad_token = make_token(secret="completely-wrong-secret")
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers=auth_headers(bad_token),
        )
        assert resp.status_code == 401

    def test_token_missing_user_id_returns_401(self, client):
        # Token with no userId / sub / id field
        payload = {
            "email": TEST_EMAIL,
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        }
        token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers=auth_headers(token),
        )
        assert resp.status_code == 401
        assert "missing user ID" in resp.json()["detail"]


# ── Valid token ───────────────────────────────────────────────────────────────

class TestValidToken:
    def test_valid_token_passes_auth_check(self, client, mock_rag_answer):
        """A valid token should not be rejected by auth (endpoint may return 200 or 400 for other reasons)."""
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers=auth_headers(make_token()),
        )
        # Auth passed — should NOT be 401
        assert resp.status_code != 401

    def test_token_with_sub_field_accepted(self, client, mock_rag_answer):
        """Node.js sometimes uses 'sub' instead of 'userId'."""
        payload = {
            "sub": TEST_USER_ID,
            "email": TEST_EMAIL,
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        }
        token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
        resp = client.post(
            "/api/chat",
            json=_chat_payload(),
            headers=auth_headers(token),
        )
        assert resp.status_code != 401

    def test_health_endpoint_requires_no_auth(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_root_endpoint_requires_no_auth(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
