import asyncio
from app.core.vector_store import vector_store
from app.services.document_processor import chunk_text
import fitz

def test():
    pdf_path = r"f:\Esther\ESTHER PROJECT\AI-POWERED-STUDY-ASSISTANT\AI-POWERED-STUDY-ASSISTANT\application-data\estheredwardsamuel@gmail.com\workspaces\69aa6121dd7657c7af1208e1\pdfs\1772773671837-ML.pdf"
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    print("Extracting...")
    text_parts = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text())
    content = "\n".join(text_parts)
    print(f"Extracted {len(content)} chars")
    
    chunks = chunk_text(content)
    print(f"Chunked into {len(chunks)} parts")
    
    print("Adding to vector store...")
    vector_store.add_documents(
        doc_id="test_workspace_id",
        chunks=chunks,
        metadatas=[
            {
                "source": "test.pdf",
                "type": "pdf",
                "workspace_id": "test_workspace_id",
            }
        ]
    )
    print("Success!")

if __name__ == "__main__":
    test()
