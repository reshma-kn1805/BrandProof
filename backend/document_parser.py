import io
from typing import Tuple
from pypdf import PdfReader
from docx import Document

class DocumentParser:
    """
    Stage 1: Document Processing
    Extracts clean plain text from DOCX, PDF, and plain text files.
    """
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes, filename: str) -> Tuple[str, str]:
        ext = filename.lower().split(".")[-1] if "." in filename else "text"
        
        if ext == "pdf":
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                text_pages = []
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_pages.append(page_text)
                full_text = "\n\n".join(text_pages).strip()
                return full_text, "pdf"
            except Exception as e:
                return f"[PDF Extraction Error: {str(e)}]", "pdf"
                
        elif ext in ["docx", "doc"]:
            try:
                doc = Document(io.BytesIO(file_bytes))
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                full_text = "\n\n".join(paragraphs).strip()
                return full_text, "docx"
            except Exception as e:
                return f"[DOCX Extraction Error: {str(e)}]", "docx"
                
        else:
            # Assume text/markdown
            try:
                full_text = file_bytes.decode("utf-8")
                return full_text, "text"
            except UnicodeDecodeError:
                full_text = file_bytes.decode("latin-1", errors="ignore")
                return full_text, "text"

