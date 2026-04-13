# Ollama LLM Provider (for local models)
import httpx
from typing import AsyncIterator, List, Optional
from app.providers.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.config import settings


class OllamaProvider(BaseLLMProvider):
    """
    Ollama LLM provider for running local models.
    """
    
    def __init__(self, model: str = "llama3:latest", host: Optional[str] = None):
        super().__init__(model=model)
        self.host = host or settings.OLLAMA_HOST
    
    async def _generate_impl(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """Internal completion implementation using Ollama API."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.host}/api/chat",
                json={
                    "model": self.model,
                    "messages": self._format_messages(messages),
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    },
                    "stream": False
                },
                timeout=300.0  # Local models can be slower
            )
            response.raise_for_status()
            data = response.json()
            
            return LLMResponse(
                content=data["message"]["content"],
                model=self.model
            )
    
    async def stream(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> AsyncIterator[str]:
        """Stream completion using Ollama API."""
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.host}/api/chat",
                json={
                    "model": self.model,
                    "messages": self._format_messages(messages),
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    },
                    "stream": True
                },
                timeout=300.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        try:
                            import json
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError):
                            continue
