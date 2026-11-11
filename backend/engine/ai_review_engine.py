import os
import json
import logging
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger("brandproof.ai_review")

class AIReviewEngine:
    """
    Stage 4: AI-Assisted Review
    Uses an external LLM (Gemini or OpenAI API) when configured, or transparently falls back
    to deterministic intelligence. Always enforces structured JSON output constrained strictly
    to the organization's existing clauses and approved facts.
    """
    def __init__(self, evidence_context: Dict[str, Any]):
        self.evidence_context = evidence_context
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def is_ai_available(self) -> bool:
        return bool(self.gemini_api_key or self.openai_api_key)

    async def analyze(self, content: str) -> Dict[str, Any]:
        """
        Runs AI contextual review. Returns structured JSON containing contextual findings.
        """
        if not self.is_ai_available():
            return {
                "ai_active": False,
                "ai_unavailable": False,
                "provider": "offline-rules",
                "notice": "External LLM API key not configured. Using deterministic compliance engine.",
                "findings": []
            }

        prompt = self._construct_prompt(content)

        if self.gemini_api_key:
            return await self._call_gemini(prompt)
        elif self.openai_api_key:
            return await self._call_openai(prompt)
        
        return {"ai_active": False, "ai_unavailable": False, "findings": []}

    def _construct_prompt(self, content: str) -> str:
        clauses_summary = "\n".join([
            f"- Clause {c['clause_number']} ({c['title']}): {c['description']} [Category: {c['category']}, Severity: {c['severity']}]"
            for c in self.evidence_context.get("clauses", [])
        ])
        facts_summary = "\n".join([
            f"- Fact {f['fact_code']}: '{f['statement']}' (Status: {f['approval_status']}, Expired: {f['is_expired']}, Source: {f['source_evidence']})"
            for f in self.evidence_context.get("facts", [])
        ])
        terminology_summary = "\n".join([
            f"- Preferred: '{t['preferred_term']}', Prohibited: '{t['prohibited_term']}'"
            for t in self.evidence_context.get("terminology", [])
        ])

        return f"""You are the BrandProof AI Governance Reviewer.
CORE PRINCIPLE: No citation, no flag. Do NOT invent clauses, facts, or citations.

AUTHORIZED CLAUSES:
{clauses_summary}

AUTHORIZED APPROVED FACTS:
{facts_summary}

AUTHORIZED TERMINOLOGY:
{terminology_summary}

CONTENT TO REVIEW:
\"\"\"{content}\"\"\"

TASK:
Analyze the content for tone inconsistencies, unsubstantiated claims, misleading statements, or terminology issues.
For every issue found:
1. Provide the exact substring from the content as "original_text".
2. Match it strictly to one of the authorized clause_number values above.
3. If an approved fact is relevant or violated (e.g. an expired fact), cite the exact fact_code.
4. Provide a constructive, minimal "suggested_correction" that preserves author intent while achieving compliance.

OUTPUT FORMAT:
Respond with ONLY valid JSON with this exact structure:
{{
  "findings": [
    {{
      "title": "Short issue title",
      "original_text": "exact substring in content",
      "clause_number": "2.1 or 3.4 or 3.6 or 4.1 or 5.2",
      "fact_code": "F-07 or F-12 or null",
      "severity": "critical or warning or notice",
      "explanation": "Clear explanation citing the clause requirement",
      "suggested_correction": "Safe replacement text",
      "confidence": 0.95
    }}
  ]
}}
"""

    async def _call_gemini(self, prompt: str) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }
        error_detail = "Unknown error"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(raw_text)
                    for f in parsed.get("findings", []):
                        f["engine_source"] = "ai_gemini"
                    return {
                        "ai_active": True,
                        "ai_unavailable": False,
                        "provider": f"Gemini ({self.gemini_model})",
                        "findings": parsed.get("findings", [])
                    }
                else:
                    error_detail = f"HTTP {res.status_code}: {res.text[:200]}"
                    logger.warning("Gemini API error (model: %s): %s", self.gemini_model, error_detail)
        except httpx.TimeoutException:
            error_detail = "Request timed out after 15 seconds"
            logger.warning("Gemini API timeout (model: %s)", self.gemini_model)
        except Exception as e:
            error_detail = str(e)
            logger.warning("Gemini API call failed (model: %s): %s", self.gemini_model, error_detail)

        return {
            "ai_active": False,
            "ai_unavailable": True,
            "provider": f"Gemini ({self.gemini_model}) - offline fallback",
            "notice": f"AI review unavailable ({error_detail}). Offline deterministic engine applied.",
            "findings": []
        }

    async def _call_openai(self, prompt: str) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.openai_model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }
        error_detail = "Unknown error"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    parsed = json.loads(raw_text)
                    for f in parsed.get("findings", []):
                        f["engine_source"] = "ai_openai"
                    return {
                        "ai_active": True,
                        "ai_unavailable": False,
                        "provider": f"OpenAI ({self.openai_model})",
                        "findings": parsed.get("findings", [])
                    }
                else:
                    error_detail = f"HTTP {res.status_code}: {res.text[:200]}"
                    logger.warning("OpenAI API error (model: %s): %s", self.openai_model, error_detail)
        except httpx.TimeoutException:
            error_detail = "Request timed out after 15 seconds"
            logger.warning("OpenAI API timeout (model: %s)", self.openai_model)
        except Exception as e:
            error_detail = str(e)
            logger.warning("OpenAI API call failed (model: %s): %s", self.openai_model, error_detail)

        return {
            "ai_active": False,
            "ai_unavailable": True,
            "provider": f"OpenAI ({self.openai_model}) - offline fallback",
            "notice": f"AI review unavailable ({error_detail}). Offline deterministic engine applied.",
            "findings": []
        }

