# Vector Store wrapper for ChromaDB
import chromadb
from typing import List, Optional, Dict, Any
from sentence_transformers import SentenceTransformer
from app.config import settings


class VectorStore:
    """
    ChromaDB vector store wrapper for document embeddings.
    Provides methods for storing and retrieving document chunks.
    """
    
    def __init__(
        self,
        collection_name: str = "document_embeddings",
        persist_dir: Optional[str] = None
    ):
        from chromadb.config import Settings
        self.persist_dir = persist_dir or settings.CHROMA_PERSIST_DIR
        self.client = chromadb.PersistentClient(
            path=self.persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(name=collection_name)
        self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    
    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        return self.embedding_model.encode(text).tolist()
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        return self.embedding_model.encode(texts).tolist()
    
    def add_documents(
        self,
        doc_id: str,
        chunks: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        """
        Add document chunks to the vector store.
        
        Args:
            doc_id: Unique document identifier
            chunks: List of text chunks
            metadatas: Optional metadata for each chunk
        """
        if not chunks:
            return
            
        embeddings = self.embed_texts(chunks)
        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        
        # Build metadata with text included
        chunk_metadatas = []
        for i, chunk in enumerate(chunks):
            meta = {
                "doc_id": doc_id,
                "chunk_id": i,
                "text": chunk
            }
            if metadatas and i < len(metadatas):
                meta.update(metadatas[i])
            chunk_metadatas.append(meta)
        
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=chunk_metadatas
        )
    
    def query(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Query the vector store for relevant chunks.
        
        Args:
            query: Search query
            document_ids: Optional list of doc IDs to filter by
            top_k: Number of results to return
            
        Returns:
            List of matching chunks with metadata
        """
        query_embedding = self.embed_text(query)
        
        where_filter = None
        if document_ids:
            where_filter = {"doc_id": {"$in": document_ids}}
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter
        )
        
        # Format results
        formatted_results = []
        if results["metadatas"]:
            for i, metadata in enumerate(results["metadatas"][0]):
                formatted_results.append({
                    "text": metadata.get("text", ""),
                    "doc_id": metadata.get("doc_id"),
                    "chunk_id": metadata.get("chunk_id"),
                    "distance": results["distances"][0][i] if results["distances"] else None
                })
        
        return formatted_results
    
    def delete_document(self, doc_id: str) -> None:
        """Delete all chunks for a document."""
        # Get all chunk IDs for this document
        results = self.collection.get(
            where={"doc_id": doc_id}
        )
        if results["ids"]:
            self.collection.delete(ids=results["ids"])
    
    def get_document_count(self) -> int:
        """Get total number of documents in store."""
        return self.collection.count()


# Default vector store instance
vector_store = VectorStore()
