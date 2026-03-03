# Google Gemini LLM Provider
import httpx
from typing import AsyncIterator, List, Optional
from app.providers.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.config import settings


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini LLM provider implementation.
    Uses the Gemini API with generativeai SDK or REST.
    
    Supports: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash, etc.
    """
    
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    
    def __init__(
        self,
        model: str = "gemini-2.0-flash",
        api_key: Optional[str] = None
    ):
        super().__init__(
            model=model,
            api_key=api_key or settings.GOOGLE_API_KEY
        )
        if not self.api_key:
            raise ValueError(
                "Google API key is required. "
                "Set GOOGLE_API_KEY in your .env file."
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
        
        max_retries = 3
        retry_delay = 2  # Initial delay in seconds
        
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
                            wait_time = retry_delay * (2 ** attempt)
                            msg = (
                                f"[Gemini] Rate limited (429). "
                                f"Retrying in {wait_time}s... "
                                f"(Attempt {attempt + 1}/{max_retries})"
                            )
                            print(msg)
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            print("[Gemini] Max retries reached.")
                            response.raise_for_status()
                    
                    response.raise_for_status()
                    data = response.json()
                    break  # Success!
                except httpx.HTTPStatusError as e:
                    if e.response.status_code != 429 or attempt == max_retries:
                        raise e
                except Exception as e:
                    if attempt == max_retries:
                        raise e
                    await asyncio.sleep(retry_delay * (attempt + 1))
        
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
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                url,
                params={"key": self.api_key, "alt": "sse"},
                json=body,
                timeout=120.0
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            import json
                            data = json.loads(line[6:])
                            if "candidates" in data and data["candidates"]:
                                candidate = data["candidates"][0]
                                if "content" in candidate:
                                    parts = candidate["content"].get(
                                        "parts", []
                                    )
                                    for part in parts:
                                        text = part.get("text", "")
                                        if text:
                                            yield text
                        except (json.JSONDecodeError, KeyError):
                            continue
