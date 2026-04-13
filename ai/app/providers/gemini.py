# Google Gemini LLM Provider
import httpx
from typing import AsyncIterator, List, Optional
from app.providers.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.config import settings


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini LLM provider implementation.
    Uses the Gemini API with generativeai SDK or REST.

    Supports active Gemini API model names such as gemini-1.5-flash.
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    DEFAULT_MODEL = "gemini-2.5-flash"
    DEPRECATED_MODEL_ALIASES = {
        "gemini-1.5-flash": "gemini-2.5-flash",
        "gemini-1.5-pro": "gemini-2.5-flash",
        "gemini-2.0-flash": "gemini-2.5-flash",
        "gemini-2.0-flash-lite": "gemini-2.5-flash",
        "gemini-2.5-flash-lite": "gemini-2.5-flash",
    }

    def __init__(
        self,
        model: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        # Respect .env LLM_MODEL when it is a Gemini model
        configured_model = (settings.LLM_MODEL or "").strip()
        default_model = (
            configured_model if configured_model.startswith("gemini-") else self.DEFAULT_MODEL
        )
        resolved_model = self._resolve_model_name(model or default_model)

        super().__init__(
            model=resolved_model,
            api_key=api_key or settings.GOOGLE_API_KEY
        )
        if not self.api_key:
            raise ValueError(
                "Google API key is required. "
                "Set GOOGLE_API_KEY in your .env file."
            )

    @classmethod
    def _resolve_model_name(cls, model_name: str) -> str:
        normalized_model = model_name.strip()
        replacement = cls.DEPRECATED_MODEL_ALIASES.get(normalized_model)
        if replacement:
            print(
                f"[Gemini] Model '{normalized_model}' is deprecated. "
                f"Using '{replacement}' instead."
            )
            return replacement
        return normalized_model

    @staticmethod
    def _extract_api_error_message(response: httpx.Response) -> str:
        try:
            payload = response.json()
            error_data = payload.get("error", {})
            if isinstance(error_data, dict):
                message = error_data.get("message")
                if message:
                    return str(message)
        except Exception:
            pass

        raw_text = response.text.strip().replace("\n", " ")
        if not raw_text:
            return "No additional error details."
        return raw_text[:200]

    def _raise_sanitized_http_error(self, response: httpx.Response) -> None:
        status_code = response.status_code
        if status_code == 404:
            raise RuntimeError(
                f"Gemini model '{self.model}' was not found (HTTP 404). "
                f"Update LLM_MODEL to an active model such as '{self.DEFAULT_MODEL}'."
            )
        details = self._extract_api_error_message(response)
        raise RuntimeError(
            f"Gemini API request failed with HTTP {status_code}: {details}"
        )

    def _format_messages_for_gemini(
        self,
        messages: List[LLMMessage]
    ) -> tuple[str, list]:
        """Convert messages to Gemini format."""
        system_instruction = ""
        contents = []

        for msg in messages:
            if msg.role == "system":
                system_instruction = msg.content
            else:
                role = "user" if msg.role == "user" else "model"
                contents.append({
                    "role": role,
                    "parts": [{"text": msg.content}]
                })

        return system_instruction, contents

    async def _generate_impl(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """Generate completion using Google Gemini API."""
        import asyncio

        sys_instr, contents = (
            self._format_messages_for_gemini(messages)
        )
        url = f"{self.BASE_URL}/models/{self.model}:generateContent"

        body = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            }
        }

        if sys_instr:
            body["systemInstruction"] = {
                "parts": [{"text": sys_instr}]
            }

        max_retries = 2
        base_delay = 30  # 30s then 60s

        async with httpx.AsyncClient() as client:
            for attempt in range(max_retries + 1):
                try:
                    response = await client.post(
                        url,
                        params={"key": self.api_key},
                        json=body,
                        timeout=120.0
                    )

                    if response.status_code == 429:
                        if attempt < max_retries:
                            # Try to read retry-after from response
                            try:
                                err_data = response.json()
                                detail = str(err_data)
                                import re as _re
                                m = _re.search(r'retry in (\d+\.?\d*)s', detail)
                                wait_time = float(m.group(1)) + 2 if m else base_delay * (attempt + 1)
                            except Exception:
                                wait_time = base_delay * (attempt + 1)
                            print(
                                f"[Gemini] Rate limited (429). "
                                f"Retrying in {wait_time:.0f}s... "
                                f"(Attempt {attempt + 1}/{max_retries})"
                            )
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            print("[Gemini] Max retries reached.")
                            self._raise_sanitized_http_error(response)

                    if response.status_code >= 400:
                        self._raise_sanitized_http_error(response)

                    data = response.json()
                    break  # Success!
                except Exception as e:
                    if attempt == max_retries:
                        raise e
                    wait_time = base_delay * (attempt + 1)
                    print(f"[Gemini] Error {e}, retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)

        # Extract text from response
        content = ""
        if "candidates" in data and data["candidates"]:
            candidate = data["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                content = candidate["content"]["parts"][0].get("text", "")

        return LLMResponse(
            content=content,
            model=self.model,
            usage=data.get("usageMetadata")
        )

    async def stream(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> AsyncIterator[str]:
        """Stream completion using Google Gemini API."""
        sys_instr, contents = (
            self._format_messages_for_gemini(messages)
        )

        url = f"{self.BASE_URL}/models/{self.model}:streamGenerateContent"

        body = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            }
        }

        if sys_instr:
            body["systemInstruction"] = {
                "parts": [{"text": sys_instr}]
            }

        import asyncio
        import json

        max_retries = 3   # ✅ Fixed: was 1
        retry_delay = 60  # ✅ Fixed: was 3 (quota needs ~30-60s to reset)

        async with httpx.AsyncClient() as client:
            for attempt in range(max_retries + 1):
                try:
                    async with client.stream(
                        "POST",
                        url,
                        params={"key": self.api_key, "alt": "sse"},
                        json=body,
                        timeout=120.0
                    ) as response:
                        if response.status_code == 429:
                            if attempt < max_retries:
                                wait_time = retry_delay * (attempt + 1)  # Linear backoff: 60s, 120s, 180s
                                print(
                                    f"[Gemini Stream] Rate limited (429). "
                                    f"Retrying in {wait_time}s... "
                                    f"(Attempt {attempt + 1}/{max_retries})"
                                )
                                await asyncio.sleep(wait_time)
                                continue
                            else:
                                print("[Gemini Stream] Max retries reached.")
                                self._raise_sanitized_http_error(response)

                        if response.status_code >= 400:
                            self._raise_sanitized_http_error(response)

                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                try:
                                    data = json.loads(line[6:])
                                    if "candidates" in data and data["candidates"]:
                                        candidate = data["candidates"][0]
                                        if "content" in candidate:
                                            parts = candidate["content"].get("parts", [])
                                            for part in parts:
                                                text = part.get("text", "")
                                                if text:
                                                    yield text
                                except (json.JSONDecodeError, KeyError):
                                    continue
                    break  # Success, exit retry loop
                except Exception as e:
                    if attempt == max_retries:
                        raise e
                    wait_time = retry_delay * (attempt + 1)
                    print(f"[Gemini Stream] Error {e}, retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)