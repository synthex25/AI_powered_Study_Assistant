# Advanced Retrieval Engine
"""
Advanced retrieval with:
- Cross-encoder re-ranking
- Hybrid search (BM25 + vector)
- HyDE query expansion
"""

import asyncio
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class AdvancedRetriever:
    """
    Advanced retrieval engine combining multiple techniques for
    significantly improved retrieval accuracy.
    
    Techniques:
    1. Re-Ranker: Cross-encoder scoring of initial results
    2. Hybrid Search: BM25 keyword + vector similarity
    3. HyDE: Hypothetical document embeddings
    """
    
    def __init__(
        self,
        vector_store=None,
        llm_provider=None,
        use_reranker: bool = True,
        use_hyde: bool = True
    ):
        from app.core.vector_store import vector_store as default_store
        from app.providers.factory import get_llm_provider
        
        self.vector_store = vector_store or default_store
        self.llm = llm_provider or get_llm_provider()
        self.use_reranker = use_reranker
        self.use_hyde = use_hyde
        
        # Lazy-load reranker to avoid startup delays
        self._reranker = None
        self._bm25_indices: Dict[str, Any] = {}  # Cache BM25 indices per doc
    
    @property
    def reranker(self):
        """Lazy-load cross-encoder model."""
        if self._reranker is None and self.use_reranker:
            try:
                from sentence_transformers import CrossEncoder
                self._reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
                logger.info("[Retriever] Loaded cross-encoder re-ranker")
            except ImportError:
                logger.warning("[Retriever] sentence-transformers not available, skipping re-ranker")
                self.use_reranker = False
        return self._reranker
    
    def _get_bm25_index(self, doc_id: str, chunks: List[str]):
        """Get or create BM25 index for a document."""
        if doc_id not in self._bm25_indices:
            try:
                from rank_bm25 import BM25Okapi
                # Tokenize chunks
                tokenized = [chunk.lower().split() for chunk in chunks]
                self._bm25_indices[doc_id] = {
                    "index": BM25Okapi(tokenized),
                    "chunks": chunks
                }
            except ImportError:
                logger.warning("[Retriever] rank-bm25 not available, skipping BM25")
                return None
        return self._bm25_indices[doc_id]
    
    def _bm25_search(
        self,
        query: str,
        doc_ids: List[str],
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """Perform BM25 keyword search across documents."""
        try:
            from rank_bm25 import BM25Okapi
        except ImportError:
            return []
        
        # Get all chunks for the documents
        all_results = []
        for doc_id in doc_ids:
            # Retrieve all chunks for this doc from vector store
            results = self.vector_store.collection.get(
                where={"doc_id": doc_id}
            )
            
            if not results["metadatas"]:
                continue
            
            chunks = [m.get("text", "") for m in results["metadatas"]]
            chunk_ids = [m.get("chunk_id", i) for i, m in enumerate(results["metadatas"])]
            
            # Get or create BM25 index
            bm25_data = self._get_bm25_index(doc_id, chunks)
            if not bm25_data:
                continue
            
            # Search
            tokenized_query = query.lower().split()
            scores = bm25_data["index"].get_scores(tokenized_query)
            
            # Get top results
            top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
            
            for idx in top_indices:
                if scores[idx] > 0:  # Only include if there's a match
                    all_results.append({
                        "text": chunks[idx],
                        "doc_id": doc_id,
                        "chunk_id": chunk_ids[idx],
                        "bm25_score": float(scores[idx]),
                        "source": "bm25"
                    })
        
        return all_results
    
    async def _generate_hyde_query(self, query: str) -> str:
        """
        Generate a Hypothetical Document Embedding (HyDE) query.
        
        Uses the LLM to generate a hypothetical answer, which is often
        semantically closer to the stored chunks than the original question.
        """
        from app.providers.base import LLMMessage
        
        prompt = f"""Given this question, write a brief, factual passage that would answer it.
Write as if you're excerpting from a document that contains the answer.
Be concise (2-3 sentences max).

Question: {query}

Hypothetical answer passage:"""

        messages = [
            LLMMessage(role="system", content="You generate hypothetical document passages to help with search."),
            LLMMessage(role="user", content=prompt)
        ]
        
        try:
            response = await self.llm.generate(messages, max_tokens=150, temperature=0.3)
            hyde_query = response.content.strip()
            logger.debug(f"[Retriever] HyDE query: {hyde_query[:100]}...")
            return hyde_query
        except Exception as e:
            logger.warning(f"[Retriever] HyDE generation failed: {e}")
            return query  # Fall back to original query
    
    def _rerank_results(
        self,
        query: str,
        results: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Re-rank results using cross-encoder."""
        if not self.reranker or not results:
            return results[:top_k]
        
        # Prepare pairs for cross-encoder
        pairs = [(query, r["text"]) for r in results]
        
        # Score with cross-encoder
        scores = self.reranker.predict(pairs)
        
        # Add scores and sort
        for i, result in enumerate(results):
            result["rerank_score"] = float(scores[i])
        
        results.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
        
        return results[:top_k]
    
    def _reciprocal_rank_fusion(
        self,
        result_lists: List[List[Dict[str, Any]]],
        k: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Combine multiple result lists using Reciprocal Rank Fusion (RRF).
        
        RRF score = sum(1 / (k + rank)) across all lists
        """
        scores = defaultdict(float)
        result_map = {}
        
        for results in result_lists:
            for rank, result in enumerate(results):
                # Use text as key for deduplication
                key = result["text"][:200]  # First 200 chars as key
                scores[key] += 1.0 / (k + rank + 1)
                
                # Keep the result with highest individual score
                if key not in result_map:
                    result_map[key] = result
        
        # Sort by RRF score
        sorted_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        
        fused_results = []
        for key in sorted_keys:
            result = result_map[key].copy()
            result["rrf_score"] = scores[key]
            fused_results.append(result)
        
        return fused_results
    
    async def retrieve(
        self,
        query: str,
        document_ids: List[str],
        top_k: int = 5,
        initial_k: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Advanced retrieval pipeline:
        
        1. (Optional) Generate HyDE query for better vector matching
        2. Vector similarity search
        3. BM25 keyword search
        4. Combine with Reciprocal Rank Fusion
        5. Re-rank with cross-encoder
        6. Return top_k results
        """
        logger.info(f"[Retriever] Query: {query[:80]}...")
        
        # Step 1: HyDE query expansion (if enabled)
        search_query = query
        if self.use_hyde:
            search_query = await self._generate_hyde_query(query)
        
        # Step 2: Vector search
        vector_results = self.vector_store.query(
            query=search_query,
            document_ids=document_ids,
            top_k=initial_k
        )
        for r in vector_results:
            r["source"] = "vector"
        
        logger.debug(f"[Retriever] Vector results: {len(vector_results)}")
        
        # Step 3: BM25 keyword search (use original query for exact matching)
        bm25_results = self._bm25_search(query, document_ids, top_k=initial_k)
        logger.debug(f"[Retriever] BM25 results: {len(bm25_results)}")
        
        # Step 4: Combine with RRF
        if bm25_results:
            combined_results = self._reciprocal_rank_fusion([vector_results, bm25_results])
        else:
            combined_results = vector_results
        
        logger.debug(f"[Retriever] Combined results: {len(combined_results)}")
        
        # Step 5: Re-rank with cross-encoder (use original query)
        if self.use_reranker and combined_results:
            final_results = self._rerank_results(query, combined_results, top_k=top_k)
        else:
            final_results = combined_results[:top_k]
        
        logger.info(f"[Retriever] Final results: {len(final_results)}")
        
        return final_results


# Default retriever instance
advanced_retriever = AdvancedRetriever()
