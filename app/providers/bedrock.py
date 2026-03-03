# AWS Bedrock LLM Provider
import json
from typing import AsyncIterator, List
from app.providers.base import BaseLLMProvider, LLMMessage, LLMResponse

try:
    import boto3
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False


class BedrockProvider(BaseLLMProvider):
    """
    AWS Bedrock LLM provider implementation.
    Supports Claude, Llama, and other Bedrock models.
    
    Requires: pip install boto3
    Configure AWS credentials via:
    - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    - AWS credentials file (~/.aws/credentials)
    - IAM role (when running on AWS)
    """
    
    def __init__(
        self,
        model: str = "anthropic.claude-3-sonnet-20240229-v1:0",
        region: str = "us-east-1",
        **kwargs
    ):
        if not BOTO3_AVAILABLE:
            raise ImportError(
                "boto3 is required for AWS Bedrock. "
                "Install it with: pip install boto3"
            )
        
        super().__init__(model=model)
        self.region = region
        self.client = boto3.client(
            "bedrock-runtime",
            region_name=region
        )
    
    def _build_request_body(
        self,
        messages: List[LLMMessage],
        temperature: float,
        max_tokens: int
    ) -> dict:
        """Build request body based on model type."""
        # Extract system message
        system_msg = ""
        chat_messages = []
        for msg in messages:
            if msg.role == "system":
                system_msg = msg.content
            else:
                chat_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        # Claude models
        if "anthropic" in self.model or "claude" in self.model:
            return {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": system_msg,
                "messages": chat_messages
            }
        
        # Llama models
        elif "llama" in self.model.lower():
            prompt = ""
            if system_msg:
                prompt += f"<s>[INST] <<SYS>>\n{system_msg}\n<</SYS>>\n\n"
            for msg in chat_messages:
                if msg["role"] == "user":
                    prompt += f"{msg['content']} [/INST] "
                else:
                    prompt += f"{msg['content']} </s><s>[INST] "
            
            return {
                "prompt": prompt,
                "max_gen_len": max_tokens,
                "temperature": temperature
            }
        
        # Default format
        else:
            return {
                "inputText": "\n".join([m.content for m in messages]),
                "textGenerationConfig": {
                    "maxTokenCount": max_tokens,
                    "temperature": temperature
                }
            }
    
    def _parse_response(self, response_body: dict) -> str:
        """Parse response based on model type."""
        if "anthropic" in self.model or "claude" in self.model:
            return response_body.get("content", [{}])[0].get("text", "")
        elif "llama" in self.model.lower():
            return response_body.get("generation", "")
        else:
            return response_body.get("results", [{}])[0].get("outputText", "")
    
    async def _generate_impl(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """Generate completion using AWS Bedrock."""
        body = self._build_request_body(messages, temperature, max_tokens)
        
        response = self.client.invoke_model(
            modelId=self.model,
            body=json.dumps(body),
            contentType="application/json",
            accept="application/json"
        )
        
        response_body = json.loads(response["body"].read())
        content = self._parse_response(response_body)
        
        return LLMResponse(
            content=content,
            model=self.model,
            usage=response_body.get("usage")
        )
    
    async def stream(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> AsyncIterator[str]:
        """Stream completion using AWS Bedrock."""
        body = self._build_request_body(messages, temperature, max_tokens)
        
        response = self.client.invoke_model_with_response_stream(
            modelId=self.model,
            body=json.dumps(body),
            contentType="application/json",
            accept="application/json"
        )
        
        for event in response["body"]:
            chunk = json.loads(event["chunk"]["bytes"])
            
            # Claude streaming
            if "anthropic" in self.model or "claude" in self.model:
                if chunk.get("type") == "content_block_delta":
                    text = chunk.get("delta", {}).get("text", "")
                    if text:
                        yield text
            # Llama streaming
            elif "llama" in self.model.lower():
                text = chunk.get("generation", "")
                if text:
                    yield text
