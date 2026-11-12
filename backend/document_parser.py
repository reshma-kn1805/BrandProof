import io
from typing import Tuple
from pypdf import PdfReader
from docx import Document

class DocumentParser:
    """
    Stage 1: Document Processing & Strict Security Validation
    Extracts plain text from DOCX, PDF, and plain text files with content-level integrity checks.
    """
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes, filename: str) -> Tuple[str, str]:
        # 1. Size Validation
        if not file_bytes or len(file_bytes) == 0:
            raise ValueError("The uploaded file is empty. Please upload a valid document.")

        if len(file_bytes) > DocumentParser.MAX_FILE_SIZE:
            raise ValueError("File exceeds the 5 MB limit. Please upload a smaller document.")

        # 2. Extension Normalization
        clean_name = filename.lower().strip() if filename else "draft.txt"
        ext = clean_name.split(".")[-1] if "." in clean_name else "txt"

        if ext not in ["pdf", "docx", "txt"]:
            raise ValueError(
                f"Unsupported file format '.{ext}'. BrandProof supports .docx, .pdf, and .txt files only."
            )

        # 3. Content Validation & Extraction
        if ext == "pdf":
            # Verify PDF magic bytes (%PDF)
            if not file_bytes.startswith(b"%PDF"):
                raise ValueError("Corrupt file: The uploaded file has a .pdf extension but lacks valid PDF binary headers.")

            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                text_pages = []
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_pages.append(page_text.strip())
                full_text = "\n\n".join(text_pages).strip()
            except Exception as e:
                raise ValueError(f"Corrupt or unreadable PDF: Unable to parse document pages ({str(e)}).")

            if not full_text:
                raise ValueError("The uploaded PDF contains no extractable or readable text.")

            return full_text, "pdf"

        elif ext == "docx":
            # Verify DOCX zip magic bytes (PK\x03\x04)
            if not file_bytes.startswith(b"PK\x03\x04"):
                raise ValueError("Corrupt file: The uploaded file has a .docx extension but lacks valid Word document headers.")

            try:
                doc = Document(io.BytesIO(file_bytes))
                paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                full_text = "\n\n".join(paragraphs).strip()
            except Exception as e:
                raise ValueError(f"Corrupt or unreadable DOCX: Unable to parse document structure ({str(e)}).")

            if not full_text:
                raise ValueError("The uploaded Word document contains no readable text paragraphs.")

            return full_text, "docx"

        else:
            # Plain Text (.txt)
            try:
                full_text = file_bytes.decode("utf-8").strip()
            except UnicodeDecodeError:
                try:
                    full_text = file_bytes.decode("latin-1").strip()
                except Exception as e:
                    raise ValueError(f"Corrupt text file: Character encoding cannot be decoded ({str(e)}).")

            if not full_text:
                raise ValueError("The uploaded text file is empty or contains whitespace only.")

            return full_text, "text"
