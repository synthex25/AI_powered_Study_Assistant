# Rate Limiter Utility
"""
Token bucket rate limiter with exponential backoff for API calls.
Prevents 429 Too Many Requests errors during content generation.
"""

import asyncio
import time
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class TokenBucketRateLimiter:
    """
    Token bucket algorithm for API rate limiting.
    
    Features:
    - Configurable tokens per minute
    - Automatic token refill
    - Async-safe with locks
    - Exponential backoff on 429 errors
    
    Usage:
        rate_limiter = TokenBucketRateLimiter(tokens_per_minute=60)
        await rate_limiter.acquire()  # Wait for available token
        response = await api_call()
    """
    
    def __init__(
        self, 
        tokens_per_minute: int = 60, 
        max_tokens: Optional[int] = None,
        max_wait_seconds: float = 60.0
    ):
        """
        Initialize rate limiter.
        
        Args:
            tokens_per_minute: Tokens added per minute
            max_tokens: Maximum burst capacity (defaults to tokens_per_minute)
            max_wait_seconds: Maximum time to wait for a token
        """
        self.tokens_per_minute = tokens_per_minute
        self.max_tokens = max_tokens or tokens_per_minute
        self.max_wait_seconds = max_wait_seconds
        
        self.tokens = float(self.max_tokens)
        self.last_refill = time.monotonic()
        self._lock = asyncio.Lock()
        
        # Backoff state for 429 errors
        self._consecutive_429s = 0
        self._backoff_until = 0.0
    
    def _refill(self) -> None:
        """Refill tokens based on elapsed time."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        
        # Calculate tokens to add (fractional time since last refill)
        tokens_to_add = elapsed * (self.tokens_per_minute / 60.0)
        self.tokens = min(self.max_tokens, self.tokens + tokens_to_add)
        self.last_refill = now
    
    async def acquire(self, tokens: int = 1) -> None:
        """
        Wait until tokens are available.
        
        Args:
            tokens: Number of tokens to acquire (default: 1)
            
        Raises:
            TimeoutError: If max_wait_seconds exceeded
        """
        start_time = time.monotonic()
        
        async with self._lock:
            while True:
                # Check if we're in backoff period
                now = time.monotonic()
                if now < self._backoff_until:
                    wait_time = self._backoff_until - now
                    logger.debug(f"Rate limiter in backoff, waiting {wait_time:.2f}s")
                    await asyncio.sleep(wait_time)
                    continue
                
                # Refill tokens
                self._refill()
                
                # Check if we have enough tokens
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    logger.debug(f"Acquired {tokens} token(s), {self.tokens:.1f} remaining")
                    return
                
                # Check timeout
                elapsed = time.monotonic() - start_time
                if elapsed >= self.max_wait_seconds:
                    raise TimeoutError(
                        f"Rate limiter timeout: waited {elapsed:.1f}s for tokens"
                    )
                
                # Calculate wait time until next token
                tokens_needed = tokens - self.tokens
                wait_time = tokens_needed / (self.tokens_per_minute / 60.0)
                wait_time = min(wait_time, self.max_wait_seconds - elapsed, 1.0)
                
                logger.debug(f"Waiting {wait_time:.2f}s for tokens")
                await asyncio.sleep(wait_time)
    
    def record_429(self) -> float:
        """
        Record a 429 error and calculate backoff time.
        
        Returns:
            Backoff duration in seconds
        """
        self._consecutive_429s += 1
        
        # Exponential backoff: 1s, 2s, 4s, 8s... max 60s
        backoff = min(2 ** (self._consecutive_429s - 1), 60.0)
        self._backoff_until = time.monotonic() + backoff
        
        logger.warning(
            f"Rate limit hit (429), backoff {backoff:.1f}s "
            f"(attempt {self._consecutive_429s})"
        )
        return backoff
    
    def record_success(self) -> None:
        """Record a successful request, resetting backoff state."""
        if self._consecutive_429s > 0:
            logger.debug("Rate limit recovered, resetting backoff")
        self._consecutive_429s = 0
    
    @property
    def available_tokens(self) -> float:
        """Get current available tokens (without acquiring lock)."""
        self._refill()
        return self.tokens


# Default rate limiters for different providers
# These can be imported and used by provider implementations

# Conservative default: 20 requests/minute
default_rate_limiter = TokenBucketRateLimiter(tokens_per_minute=20, max_tokens=30)

# OpenAI tier-1: ~60 RPM
openai_rate_limiter = TokenBucketRateLimiter(tokens_per_minute=60, max_tokens=60)

# DeepInfra: ~30 RPM for free tier
deepinfra_rate_limiter = TokenBucketRateLimiter(tokens_per_minute=30, max_tokens=40)

# Gemini: ~60 RPM
gemini_rate_limiter = TokenBucketRateLimiter(tokens_per_minute=60, max_tokens=60)


async def rate_limited_call(
    rate_limiter: TokenBucketRateLimiter,
    async_func,
    *args,
    max_retries: int = 3,
    **kwargs
):
    """
    Execute an async function with rate limiting and retry on 429.
    
    Args:
        rate_limiter: Rate limiter instance to use
        async_func: Async function to call
        *args: Positional arguments for the function
        max_retries: Maximum retry attempts on 429 errors
        **kwargs: Keyword arguments for the function
        
    Returns:
        Result from async_func
        
    Raises:
        Exception: After max_retries exceeded
    """
    last_error = None
    
    for attempt in range(max_retries + 1):
        try:
            # Wait for rate limit token
            await rate_limiter.acquire()
            
            # Make the call
            result = await async_func(*args, **kwargs)
            
            # Success - reset backoff
            rate_limiter.record_success()
            return result
            
        except Exception as e:
            error_str = str(e).lower()
            
            # Check if it's a rate limit error
            if "429" in error_str or "rate" in error_str or "too many" in error_str:
                last_error = e
                backoff = rate_limiter.record_429()
                
                if attempt < max_retries:
                    logger.warning(f"Rate limited, retrying in {backoff:.1f}s...")
                    await asyncio.sleep(backoff)
                    continue
            else:
                # Non-rate-limit error, re-raise immediately
                raise
    
    # All retries exhausted
    raise last_error or Exception("Rate limit retries exhausted")
