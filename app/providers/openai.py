# OpenAI LLM Provider
import httpx
from typing import AsyncIterator, List, Optional
from app.providers.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.config import settings


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI LLM provider implementation.
    """
    
    BASE_URL = "https://api.openai.com/v1"
    
    def __init__(self, model: str = "gpt-4o-mini", api_key: Optional[str] = None):
        # Import rate limiter
        from app.utils.rate_limiter import openai_rate_limiter
        
        super().__init__(
            model=model,
            api_key=api_key or settings.OPENAI_API_KEY,
            rate_limiter=openai_rate_limiter
        )
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
    
    async def _generate_impl(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """Generate completion using OpenAI API."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": self._format_messages(messages),
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    **kwargs
                },
                timeout=120.0
            )
            
            # Handle 429 by raising exception for rate limiter
            if response.status_code == 429:
                raise Exception(f"Rate limited (429): {response.text}")
            
            response.raise_for_status()
            data = response.json()
            
            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=self.model,
                usage=data.get("usage")
            )
    
    async def stream(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> AsyncIterator[str]:
        """Stream completion using OpenAI API."""
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": self._format_messages(messages),
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True,
                    **kwargs
                },
                timeout=120.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            import json
                            chunk = json.loads(data)
                            content = chunk["choices"][0]["delta"].get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError):
                            continue
