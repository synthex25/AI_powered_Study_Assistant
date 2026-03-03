# Chat API Routes (REST + WebSocket for RAG)
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.services.rag_agent import rag_agent
from app.providers.factory import get_llm_provider
from app.providers.base import LLMMessage
from app.core.auth import get_current_user, TokenPayload

router = APIRouter(tags=["chat"])


# ============================================================================
# REST API for Chat (Recommended - more reliable)
# ============================================================================

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    document_ids: List[str]
    chat_history: Optional[List[ChatMessage]] = []
    workspace_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    model: str
    sources_used: int


@router.post("/chat", response_model=ChatResponse)
async def chat_with_rag(request: ChatRequest, user: TokenPayload = Depends(get_current_user)):
    """
    REST endpoint for RAG chat - context-restricted and friendly.
    Uses LLM for greeting responses to make them dynamic and human-like.
    Requires authentication.
    """
    if not request.query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    if not request.document_ids or len(request.document_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one document_id is required")
    
    print(f"[Chat API] User {user.user_id} querying with {len(request.document_ids)} documents")
    
    try:
        query_lower = request.query.lower().strip()
        
        # ─────────────────────────────────────────────────────────────────────
        # Detect if query is a greeting/casual conversation/personal statement
        # ─────────────────────────────────────────────────────────────────────
        greeting_patterns = [
            'hi', 'hello', 'hey', 'hallo', 'hii', 'heyy', 'yo', 'sup', 'whats up', "what's up",
            'good morning', 'gm', 'morning', 'good afternoon', 'good evening', 'good night',
            'thanks', 'thank you', 'thx', 'ty', 'appreciate', 
            'bye', 'goodbye', 'see you', 'cya', 'later', 'gtg',
            'how are you', 'how r u', 'how you doing', 'hows it going',
            'who are you', 'what are you', 'your name', 'introduce yourself',
            'help', 'what can you do'
        ]
        
        # Patterns for personal/conversational statements (not document questions)
        conversational_patterns = [
            'my name is', 'i am ', 'i\'m ', 'im ', 'call me', 'this is ',
            'nice to meet', 'pleased to meet', 'i love', 'i hate', 'i like',
            'i think', 'i feel', 'i want', 'i need help', 'can you help',
            'i don\'t understand', 'i dont understand', 'what do you mean',
            'that\'s cool', 'thats cool', 'awesome', 'great', 'ok', 'okay',
            'got it', 'i see', 'makes sense', 'interesting', 'wow', 'nice',
            'lol', 'haha', 'lmao', '😊', '👍', '❤️'
        ]
        
        is_greeting = any(
            query_lower.startswith(g) or query_lower == g or (len(g) > 3 and g in query_lower)
            for g in greeting_patterns
        )
        
        is_conversational = any(
            query_lower.startswith(p) or p in query_lower
            for p in conversational_patterns
        )
        
        if is_greeting:
            # Use LLM to generate a natural, human-like greeting response
            llm = get_llm_provider()
            
            greeting_prompt = f"""You are a friendly AI Study Tutor chatbot. The user just said: "{request.query}"

Respond naturally and warmly like a helpful human tutor would. Be:
- Friendly and conversational (use 1-2 appropriate emojis)
- Brief (1-3 sentences max)
- If they're greeting you, greet them back and mention you're ready to help with their study materials
- If they're asking who you are, introduce yourself as their AI Study Tutor who helps with uploaded documents
- If they're saying thanks, acknowledge warmly
- If they're saying bye, wish them well with their studies
- If asking for help, briefly explain you can answer questions, summarize content, and explain concepts

Keep it natural and conversational, like chatting with a friendly tutor."""

            messages = [
                LLMMessage(role="user", content=greeting_prompt)
            ]
            
            response = await llm.generate(messages, max_tokens=200, temperature=0.9)
            
            return ChatResponse(
                answer=response.content,
                model=response.model,
                sources_used=0
            )
        
        if is_conversational:
            # Handle casual conversation / personal statements without RAG
            llm = get_llm_provider()
            
            convo_prompt = f"""You are a friendly AI Study Tutor chatbot. The user just said: "{request.query}"

This seems like casual conversation, not a question about their study materials. Respond naturally:

- If they're introducing themselves ("my name is X", "I'm X", "call me X"):
  → Warmly greet them by name! "Nice to meet you, X! 😊 Ready to help with your studies!"
  
- If they're expressing an opinion or feeling:
  → Acknowledge it briefly and stay friendly
  
- If they seem confused or need help:
  → Offer to help with their documents
  
- If it's just casual chat:
  → Be friendly but gently steer toward helping with their materials

Keep it super brief (1-2 sentences). Be warm and human."""

            messages = [
                LLMMessage(role="user", content=convo_prompt)
            ]
            
            response = await llm.generate(messages, max_tokens=150, temperature=0.9)
            
            return ChatResponse(
                answer=response.content,
                model=response.model,
                sources_used=0
            )
        
        # ─────────────────────────────────────────────────────────────────────
        # Regular RAG query - get answer from context
        # ─────────────────────────────────────────────────────────────────────
        answer = await rag_agent.get_answer_with_context_check(
            query=request.query,
            document_ids=request.document_ids,
            chat_history=[{"role": m.role, "content": m.content} for m in request.chat_history or []]
        )
        
        return ChatResponse(
            answer=answer,
            model=rag_agent.llm.model if hasattr(rag_agent, 'llm') else "unknown",
            sources_used=len(request.document_ids)
        )
        
    except Exception as e:
        print(f"[Chat API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WebSocket for Streaming (Legacy support)
# ============================================================================

active_connections: list[WebSocket] = []


@router.websocket("/ws/rag_chat")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket endpoint for real-time RAG chat (streaming).
    """
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            query = message.get("query", "")
            document_ids = message.get("document_id", message.get("document_ids", []))
            chat_history = message.get("chat_history", [])
            
            # Normalize document_ids to list
            if isinstance(document_ids, str):
                document_ids = [document_ids]
            
            if not query or not document_ids:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "answer": "Query and document_ids are required"
                }))
                continue
            
            try:
                # Use the new context-aware method
                answer = await rag_agent.get_answer_with_context_check(
                    query=query,
                    document_ids=document_ids,
                    chat_history=chat_history
                )
                
                await websocket.send_text(json.dumps({
                    "type": "complete",
                    "answer": answer
                }))
                
            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "answer": f"Sorry, I encountered an error: {str(e)}"
                }))
    
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)
