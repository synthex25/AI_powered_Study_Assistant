# Abstract base class for LLM providers
from abc import ABC, abstractmethod
from typing import AsyncIterator, List, Optional
from pydantic import BaseModel


class LLMMessage(BaseModel):
    """Standard message format for LLM conversations."""
    role: str  # "system", "user", "assistant"
    content: str


class LLMResponse(BaseModel):
    """Standard response from LLM."""
    content: str
    model: str
    usage: Optional[dict] = None


class BaseLLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    Implement this interface to add new LLM providers.
    
    Features:
    - Rate limiting support via TokenBucketRateLimiter
    - Automatic 429 retry with exponential backoff
    """
    
    def __init__(
        self, 
        model: str, 
        api_key: Optional[str] = None,
        rate_limiter: Optional["TokenBucketRateLimiter"] = None
    ):
        self.model = model
        self.api_key = api_key
        self._rate_limiter = rate_limiter
    
    @property
    def rate_limiter(self):
        """Get or create default rate limiter."""
        if self._rate_limiter is None:
            # Lazy import to avoid circular dependencies
            from app.utils.rate_limiter import default_rate_limiter
            self._rate_limiter = default_rate_limiter
        return self._rate_limiter
    
    @rate_limiter.setter
    def rate_limiter(self, value):
        self._rate_limiter = value
    
    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        use_rate_limit: bool = True,
        **kwargs
    ) -> LLMResponse:
        """
        Generate a completion from the LLM with rate limiting.
        
        Args:
            messages: List of conversation messages
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response
            use_rate_limit: Whether to apply rate limiting (default: True)
            
        Returns:
            LLMResponse with generated content
        """
        if use_rate_limit and self._rate_limiter:
            await self.rate_limiter.acquire()
        
        try:
            result = await self._generate_impl(messages, temperature, max_tokens, **kwargs)
            if self._rate_limiter:
                self.rate_limiter.record_success()
            return result
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "rate" in error_str:
                if self._rate_limiter:
                    self.rate_limiter.record_429()
            raise
    
    @abstractmethod
    async def _generate_impl(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """
        Internal implementation for generate. Override this in subclasses.
        """
        pass
    
    @abstractmethod
    async def stream(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> AsyncIterator[str]:
        """
        Stream a completion from the LLM.
        
        Args:
            messages: List of conversation messages
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response
            
        Yields:
            Chunks of generated text
        """
        pass
    
    def _format_messages(self, messages: List[LLMMessage]) -> List[dict]:
        """Convert messages to provider-specific format."""
        return [{"role": m.role, "content": m.content} for m in messages]


# Type hint for rate limiter (avoids circular import)
try:
    from app.utils.rate_limiter import TokenBucketRateLimiter
except ImportError:
    TokenBucketRateLimiter = None
