import base64
import fitz

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    try:
        if not pdf_bytes:
            return ""
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            text_parts = []
            for page in doc:
                text_parts.append(page.get_text())
        return "\n".join(text_parts)
    except Exception as e:
        print(f"Error extracting text from PDF bytes: {e}")
        return ""

def test():
    pdf_path = r"f:\Esther\ESTHER PROJECT\AI-POWERED-STUDY-ASSISTANT\AI-POWERED-STUDY-ASSISTANT\application-data\estheredwardsamuel@gmail.com\workspaces\69aa6121dd7657c7af1208e1\pdfs\1772773671837-ML.pdf"
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    text = extract_text_from_pdf_bytes(pdf_bytes)
    print("Extracted text len:", len(text))
    print("Extracted text preview:", repr(text[:200]))

if __name__ == "__main__":
    test()
