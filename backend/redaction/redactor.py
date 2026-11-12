import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

@dataclass
class RedactionResult:
    original_text: str
    redacted_text: str
    token_map: Dict[str, str] = field(default_factory=dict)
    counts: Dict[str, int] = field(default_factory=dict)
    tokens_detail: List[Dict[str, str]] = field(default_factory=list)


class RedactionEngine:
    # Bracketed [[ ... ]]
    RE_BRACKETED = re.compile(r'\[\[(.*?)\]\]', re.DOTALL)
    
    # Email addresses
    RE_EMAIL = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b')
    
    # Currencies (e.g., $100, ₹50,000, Rs. 1500, Rs 500, 100 USD, 500 INR, €45, £20, etc.)
    RE_CURRENCY = re.compile(
        r'(?:(?:\$|₹|Rs\.?|INR|EUR|€|GBP|£)\s*\d+(?:,\d{2,3})*(?:\.\d+)?(?:\s*(?:crores?|lakhs?|millions?|billions?|[kKM]))?|\b\d+(?:,\d{2,3})*(?:\.\d+)?\s*(?:USD|INR|EUR|GBP|crores?|lakhs?)\b)',
        re.IGNORECASE
    )
    
    # Phone numbers (Indian & international formats)
    # Examples: +91 9876543210, +91-98765-43210, 9876543210, +1 (555) 123-4567, +44 20 7946 0958, 080-23456789
    RE_PHONE = re.compile(
        r'(?:(?:\+91[\s.-]?)?[6-9]\d{9}\b|(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)|\d{2,5})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b)',
        re.IGNORECASE
    )
    
    # Long digit sequences: 8 or more digits
    RE_DIGITS = re.compile(r'\b\d{8,}\b')

    def __init__(self, confidential_terms: Optional[List[str]] = None):
        self.confidential_terms = [t.strip() for t in (confidential_terms or []) if t.strip()]

    def redact(self, text: str) -> RedactionResult:
        if not text:
            return RedactionResult(
                original_text="",
                redacted_text="",
                token_map={},
                counts={"email": 0, "phone": 0, "currency": 0, "digits": 0, "bracketed": 0, "terms": 0, "total": 0},
                tokens_detail=[]
            )

        token_map: Dict[str, str] = {}
        tokens_detail: List[Dict[str, str]] = []
        counts = {
            "bracketed": 0,
            "terms": 0,
            "email": 0,
            "currency": 0,
            "phone": 0,
            "digits": 0,
            "total": 0
        }

        current_text = text

        # 1. Bracketed [[ confidential text ]]
        def replace_bracketed(match):
            nonlocal counts
            counts["bracketed"] += 1
            idx = counts["bracketed"]
            token = f"[REDACTED_CONFIDENTIAL_{idx}]"
            original_val = match.group(0) # include the brackets or the inner? Spec: "any text wrapped in [[ ]]"
            token_map[token] = original_val
            tokens_detail.append({"token": token, "type": "bracketed", "original": original_val})
            return token

        current_text = self.RE_BRACKETED.sub(replace_bracketed, current_text)

        # 2. Per-workspace confidential terms
        for term in sorted(self.confidential_terms, key=len, reverse=True):
            pattern = re.compile(r'\b' + re.escape(term) + r'\b', re.IGNORECASE)
            def replace_term(match):
                nonlocal counts
                counts["terms"] += 1
                idx = counts["terms"]
                token = f"[REDACTED_TERM_{idx}]"
                original_val = match.group(0)
                token_map[token] = original_val
                tokens_detail.append({"token": token, "type": "term", "original": original_val})
                return token
            current_text = pattern.sub(replace_term, current_text)

        # 3. Email addresses
        def replace_email(match):
            nonlocal counts
            counts["email"] += 1
            idx = counts["email"]
            token = f"[REDACTED_EMAIL_{idx}]"
            original_val = match.group(0)
            token_map[token] = original_val
            tokens_detail.append({"token": token, "type": "email", "original": original_val})
            return token

        current_text = self.RE_EMAIL.sub(replace_email, current_text)

        # 4. Currency amounts
        def replace_currency(match):
            nonlocal counts
            # check if not already inside a token
            val = match.group(0)
            counts["currency"] += 1
            idx = counts["currency"]
            token = f"[REDACTED_CURRENCY_{idx}]"
            token_map[token] = val
            tokens_detail.append({"token": token, "type": "currency", "original": val})
            return token

        current_text = self.RE_CURRENCY.sub(replace_currency, current_text)

        # 5. Phone numbers
        def replace_phone(match):
            nonlocal counts
            val = match.group(0)
            # Avoid replacing if it's already a REDACTED token
            if val.startswith("[REDACTED_"):
                return val
            counts["phone"] += 1
            idx = counts["phone"]
            token = f"[REDACTED_PHONE_{idx}]"
            token_map[token] = val
            tokens_detail.append({"token": token, "type": "phone", "original": val})
            return token

        current_text = self.RE_PHONE.sub(replace_phone, current_text)

        # 6. Long digit sequences (8+ digits)
        def replace_digits(match):
            nonlocal counts
            val = match.group(0)
            if val.startswith("[REDACTED_"):
                return val
            counts["digits"] += 1
            idx = counts["digits"]
            token = f"[REDACTED_DIGITS_{idx}]"
            token_map[token] = val
            tokens_detail.append({"token": token, "type": "digits", "original": val})
            return token

        current_text = self.RE_DIGITS.sub(replace_digits, current_text)

        counts["total"] = sum(v for k, v in counts.items() if k != "total")

        return RedactionResult(
            original_text=text,
            redacted_text=current_text,
            token_map=token_map,
            counts=counts,
            tokens_detail=tokens_detail
        )

    def restore(self, text: str, token_map: Dict[str, str]) -> str:
        if not text or not token_map:
            return text
        result = text
        # Restore longer tokens first to avoid substring collisions
        sorted_tokens = sorted(token_map.keys(), key=len, reverse=True)
        for token in sorted_tokens:
            result = result.replace(token, token_map[token])
        return result


def redact_content(text: str, confidential_terms: Optional[List[str]] = None) -> RedactionResult:
    engine = RedactionEngine(confidential_terms=confidential_terms)
    return engine.redact(text)

def restore_content(text: str, token_map: Dict[str, str]) -> str:
    engine = RedactionEngine()
    return engine.restore(text, token_map)

