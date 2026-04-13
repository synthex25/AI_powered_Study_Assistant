# RAG Agent Service - AI Tutor with Rich Responses
from typing import List, Dict, Any, AsyncIterator, Optional
from app.core.vector_store import vector_store
from app.providers.base import LLMMessage
from app.providers.factory import get_llm_provider
from app.config import settings


class RAGAgent:
    """
    RAG-based AI Tutor agent.
    Retrieves relevant context and generates rich, formatted responses.
    """
    
    SYSTEM_PROMPT = """You are a friendly, conversational AI study tutor. You help students learn from their uploaded documents.

PERSONALITY:
- Talk like a helpful friend, not a robot
- Be warm, natural, and conversational
- Match your response length to the question complexity
- For simple questions, give simple answers (1-3 sentences)
- Only use tables/headers for genuinely complex comparisons
- Use emojis sparingly (1-2 max, only when natural)

RESPONSE STYLE:
- Simple questions → Short, direct answers. No tables, no headers.
  Example: "Your name is Jayesh V A, based on the invoice! 😊"
- Medium questions → Brief explanation with some structure
- Complex/analytical questions → Use markdown formatting, tables if comparing data

CITATIONS (IMPORTANT):
- When you use information from the provided context, cite it as [Source 1], [Source 2], etc.
- The source numbers match the "[Source N]:" labels in the context provided
- Example: "The total amount is $500 [Source 1]."
- Only cite when directly using information from a specific source

ACCURACY (CRITICAL):
- If the context does NOT contain the answer, say: "I don't have information about that in your documents."
- NEVER make up or infer information that isn't explicitly in the provided context
- It's better to say "I'm not sure based on your documents" than to hallucinate
- If you're uncertain, express that uncertainty clearly

AVOID:
- Over-formatting simple answers with tables and headers
- Repeating the same information multiple ways
- Being overly formal or robotic
- Starting every response with "Based on..."
- Excessive emoji use
- Making up information not in the context

BE NATURAL:
- Vary your sentence openings
- Use contractions (I'm, you're, that's)
- Acknowledge the user's intent, not just their literal words
- If they ask the same thing differently, don't repeat yourself - just clarify"""

    def __init__(
        self,
        llm_provider: str = None,
        llm_model: str = None,
        use_advanced_retrieval: bool = True
    ):
        self.provider_name = (llm_provider or settings.LLM_PROVIDER).lower()
        self.llm = get_llm_provider(provider=llm_provider, model=llm_model)
        self.vector_store = vector_store
        self.use_advanced_retrieval = use_advanced_retrieval
        self._advanced_retriever = None
        self._fallback_used = False

    def _is_billing_error(self, error: Exception) -> bool:
        msg = str(error).lower()
        return (
            "402" in msg
            or "payment required" in msg
            or "billing" in msg
            or "quota" in msg
        )

    def _is_rate_limit_error(self, error: Exception) -> bool:
        msg = str(error).lower()
        return (
            "429" in msg
            or "too many requests" in msg
            or "rate limit" in msg
            or "resource has been exhausted" in msg
        )

    async def _generate_with_fallback(self, messages: List[LLMMessage], **kwargs):
        try:
            return await self.llm.generate(messages, **kwargs)
        except Exception as e:
            can_fallback = (
                not self._fallback_used
                and self.provider_name == "deepinfra"
                and bool(settings.GOOGLE_API_KEY)
                and self._is_billing_error(e)
            )
            if not can_fallback:
                raise

            print("[RAGAgent] DeepInfra billing error detected; switching to Gemini fallback.")
            self.llm = get_llm_provider(provider="gemini")
            self.provider_name = "gemini"
            self._fallback_used = True
            self._advanced_retriever = None  # rebuild with new provider if needed
            return await self.llm.generate(messages, **kwargs)
    
    @property
    def advanced_retriever(self):
        """Lazy-load advanced retriever."""
        if self._advanced_retriever is None and self.use_advanced_retrieval:
            try:
                from app.core.retrieval_engine import AdvancedRetriever
                self._advanced_retriever = AdvancedRetriever(
                    vector_store=self.vector_store,
                    llm_provider=self.llm
                )
                print("[RAGAgent] Using advanced retrieval (re-ranker + BM25 + HyDE)")
            except Exception as e:
                print(f"[RAGAgent] Advanced retrieval unavailable: {e}")
                self.use_advanced_retrieval = False
        return self._advanced_retriever
    
    async def retrieve_context_advanced(
        self,
        query: str,
        document_ids: List[str],
        top_k: int = 5
    ) -> str:
        """
        Retrieve context using advanced techniques:
        - HyDE query expansion
        - Hybrid vector + BM25 search
        - Cross-encoder re-ranking
        """
        if self.advanced_retriever:
            results = await self.advanced_retriever.retrieve(
                query=query,
                document_ids=document_ids,
                top_k=top_k
            )
        else:
            # Fallback to basic retrieval
            results = self.vector_store.query(
                query=query,
                document_ids=document_ids,
                top_k=top_k
            )
        
        if not results:
            return ""
        
        context_parts = []
        for i, result in enumerate(results, 1):
            text = result.get('text', '')
            if text:
                context_parts.append(f"[Source {i}]: {text}")
        
        return "\n\n".join(context_parts)
    
    def retrieve_context(
        self,
        query: str,
        document_ids: List[str],
        top_k: int = 8
    ) -> str:
        """Retrieve relevant context from vector store (legacy sync method)."""
        print(f"[RAGAgent] Querying for: {query[:100]}...")
        print(f"[RAGAgent] Document IDs: {document_ids}")
        
        results = self.vector_store.query(
            query=query,
            document_ids=document_ids,
            top_k=top_k
        )
        
        print(f"[RAGAgent] Found {len(results)} results")
        
        if not results:
            return ""
        
        context_parts = []
        for i, result in enumerate(results, 1):
            text = result.get('text', '')
            if text:
                context_parts.append(f"[Source {i}]: {text}")
        
        return "\n\n".join(context_parts)
    
    def _format_chat_summary(self, chat_history: List[Dict[str, str]]) -> str:
        """Format recent chat history into a readable summary."""
        if not chat_history:
            return ""
        
        summary_parts = []
        for msg in chat_history[-6:]:  
            role = "Student" if msg.get("role") == "user" else "Tutor"
            content = msg.get("content", "")[:200] 
            if len(msg.get("content", "")) > 200:
                content += "..."
            summary_parts.append(f"- **{role}**: {content}")
        
        return "\n".join(summary_parts)

    def build_prompt(
        self,
        query: str,
        context: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> List[LLMMessage]:
        """Build the prompt with context and chat history."""
        messages = [
            LLMMessage(role="system", content=self.SYSTEM_PROMPT)
        ]
        
        # Add conversation context awareness if there's history
        if chat_history and len(chat_history) > 0:
            conversation_context = self._format_chat_summary(chat_history)
            messages.append(LLMMessage(
                role="system",
                content=f"""## Conversation Memory
You are continuing an ongoing conversation with the student. Here's what was discussed:
{conversation_context}

**Important**: The student may refer to previous answers or ask follow-up questions. Use this context to provide coherent, connected responses."""
            ))
        
        # Add previous exchanges for direct context (helps with "the above" references)
        if chat_history:
            for msg in chat_history[-4:]:  # Last 4 exchanges
                messages.append(LLMMessage(
                    role=msg.get("role", "user"),
                    content=msg.get("content", "")
                ))
        
        # Add current query with document context
        user_message = f"""Context from documents:
{context}

---

Question: {query}

Please provide a helpful, well-formatted answer based on the context above."""
        
        messages.append(LLMMessage(role="user", content=user_message))
        
        return messages
    
    async def answer(
        self,
        query: str,
        document_ids: List[str],
        chat_history: Optional[List[Dict[str, str]]] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """Generate an answer to the query using RAG."""
        context = self.retrieve_context(query, document_ids, top_k)
        messages = self.build_prompt(query, context, chat_history)
        response = await self._generate_with_fallback(messages)
        
        return {
            "answer": response.content,
            "model": response.model,
            "context_used": context,
            "usage": response.usage
        }
    
    async def stream_answer(
        self,
        query: str,
        document_ids: List[str],
        chat_history: Optional[List[Dict[str, str]]] = None,
        top_k: int = 5
    ) -> AsyncIterator[str]:
        """Stream an answer to the query using RAG."""
        context = self.retrieve_context(query, document_ids, top_k)
        messages = self.build_prompt(query, context, chat_history)
        
        async for chunk in self.llm.stream(messages):
            yield chunk
    
    async def get_answer_with_context_check(
        self,
        query: str,
        document_ids: List[str],
        chat_history: Optional[List[Dict[str, str]]] = None,
        top_k: int = 8
    ) -> str:
        """
        Generate a rich, markdown-formatted answer based on document context.
        More lenient context checking for better user experience.
        """
        # Retrieve context
        context = self.retrieve_context(query, document_ids, top_k)
        
        print(f"[RAGAgent] Context length: {len(context)} chars")
        
        # Check if we have any context at all
        has_context = len(context.strip()) > 0
        
        # Build conversational, adaptive prompt
        system_prompt = """You are a friendly AI study tutor having a natural conversation with a student.

CORE PRINCIPLE: Match your response complexity to the question complexity.

FOR SIMPLE QUESTIONS (names, dates, single facts):
- Give a direct 1-3 sentence answer
- NO tables, NO headers, NO bullet points
- Example: "That's Jayesh V A - I found it in the bill-to section of your invoice! [Source 1]"

FOR MEDIUM QUESTIONS (explanations, how something works):
- A few short paragraphs with maybe some bold text
- Only use bullets if listing 3+ items

FOR COMPLEX QUESTIONS (analysis, comparisons, study plans):
- Use structured markdown with headers and tables
- Break into clear sections

CITATIONS:
- Cite your sources as [Source 1], [Source 2], etc. matching the context labels
- Example: "The deadline is March 15th [Source 2]."

ACCURACY (CRITICAL):
- If the context does NOT contain the answer, say: "I don't have information about that in your documents."
- NEVER make up information - only use what's in the provided context
- It's okay to say "I'm not sure based on your documents"

PERSONALITY:
- Be warm and conversational, like chatting with a smart friend
- Use contractions (I'm, you're, that's, don't)
- Vary how you start sentences - not always "Based on..."
- 1-2 emojis max, only when natural
- If they rephrase a question, don't repeat your answer - acknowledge and clarify

NEVER:
- Use tables for single pieces of information
- Create headers for short answers
- Repeat the same fact multiple ways
- Sound robotic or overly formal
- Make up information not in the context"""

        if not has_context:
            return """Hmm, I couldn't find anything about that in your documents. 🤔

A few things that might help:
- Have you uploaded your study materials yet?
- Try asking about something specific from your docs
- The AI might still be processing - give it a sec!

What else can I help you with?"""
        
        messages = [
            LLMMessage(role="system", content=system_prompt)
        ]
        
        # Add conversation memory awareness
        if chat_history and len(chat_history) > 0:
            memory_summary = self._format_chat_summary(chat_history)
            messages.append(LLMMessage(
                role="system",
                content=f"""## Conversation Memory
You are continuing an ongoing conversation. Previous discussion:
{memory_summary}

Remember this context when answering. The student may ask follow-up questions or reference previous answers."""
            ))
        
        # Add recent chat exchanges for direct context
        if chat_history:
            for msg in chat_history[-4:]:  # Last 4 for immediate context
                messages.append(LLMMessage(
                    role=msg.get("role", "user"),
                    content=msg.get("content", "")
                ))
        
        user_message = f"""Here's some relevant info from their documents:
{context}

---

Student asks: {query}

(Remember: simple questions get simple answers!)"""
        
        messages.append(LLMMessage(role="user", content=user_message))
        
        try:
            response = await self._generate_with_fallback(
                messages,
                max_tokens=2000,
                temperature=0.7
            )
            return response.content
        except Exception as e:
            print(f"[RAGAgent] Error generating response: {e}")
            if self._is_rate_limit_error(e):
                return (
                    "The AI provider is currently rate-limited (429 Too Many Requests). "
                    "Please wait about a minute and try again."
                )
            if self._is_billing_error(e):
                return (
                    "The AI provider has a billing/quota issue (402 Payment Required). "
                    "Please update credits or switch provider."
                )
            return "I encountered an error while generating the response. Please try again."


# Default RAG agent instance
rag_agent = RAGAgent()
