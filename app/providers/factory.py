# LLM Provider Factory
from typing import Optional
from app.providers.base import BaseLLMProvider
from app.config import settings


def get_llm_provider(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    **kwargs
) -> BaseLLMProvider:
    """
    Factory function to get the appropriate LLM provider.
    
    Args:
        provider: Provider name ("deepinfra", "openai", "ollama", "gemini", "bedrock")
        model: Model name (uses default if not specified)
        **kwargs: Additional provider-specific arguments
        
    Returns:
        Configured LLM provider instance
        
    Example:
        >>> llm = get_llm_provider("gemini", model="gemini-2.0-flash")
        >>> response = await llm.generate([LLMMessage(role="user", content="Hello")])
    """
    provider_name = provider or settings.LLM_PROVIDER
    
    # Lazy imports to avoid missing dependency errors
    if provider_name == "deepinfra":
        from app.providers.deepinfra import DeepInfraProvider
        return DeepInfraProvider(model=model, **kwargs) if model else DeepInfraProvider(**kwargs)
    
    elif provider_name == "openai":
        from app.providers.openai import OpenAIProvider
        return OpenAIProvider(model=model, **kwargs) if model else OpenAIProvider(**kwargs)
    
    elif provider_name == "ollama":
        from app.providers.ollama import OllamaProvider
        return OllamaProvider(model=model, **kwargs) if model else OllamaProvider(**kwargs)
    
    elif provider_name == "gemini":
        from app.providers.gemini import GeminiProvider
        return GeminiProvider(model=model, **kwargs) if model else GeminiProvider(**kwargs)
    
    elif provider_name == "bedrock":
        from app.providers.bedrock import BedrockProvider
        return BedrockProvider(model=model, **kwargs) if model else BedrockProvider(**kwargs)
    
    else:
        raise ValueError(
            f"Unknown provider: {provider_name}. "
            f"Available: deepinfra, openai, ollama, gemini, bedrock"
        )


# Default provider instance (lazy loaded on first use)
_default_llm = None

def get_default_llm() -> BaseLLMProvider:
    """Get or create the default LLM provider."""
    global _default_llm
    if _default_llm is None:
        _default_llm = get_llm_provider()
    return _default_llm
