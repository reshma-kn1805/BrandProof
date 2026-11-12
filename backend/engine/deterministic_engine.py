import re
import datetime
from typing import List, Dict, Any, Optional

class DeterministicEngine:
    """
    Stage 2: Deterministic Rule Engine
    Runs first to catch rule-based, terminology, and claim violations without requiring LLM.
    Works reliably 100% offline or when AI is unreachable.
    """
    def __init__(self, evidence_context: Dict[str, Any]):
        self.clauses = {c["clause_number"]: c for c in evidence_context.get("clauses", [])}
        self.facts = {f["fact_code"]: f for f in evidence_context.get("facts", [])}
        self.terminology = evidence_context.get("terminology", [])
        self.assets = evidence_context.get("assets", [])

    def scan(self, content: str) -> List[Dict[str, Any]]:
        findings = []

        # 1. Terminology Checks (e.g., Clause 4.1 Product Terminology)
        for term in self.terminology:
            prohibited = term.get("prohibited_term")
            preferred = term.get("preferred_term")
            variations = [prohibited] + term.get("incorrect_variations", [])
            case_sensitive = term.get("case_sensitive", False)
            flags = 0 if case_sensitive else re.IGNORECASE

            # Locate approved preferred term occurrences to avoid false-flagging sub-phrases
            pref_spans = [m.span() for m in re.finditer(re.escape(preferred), content, flags)] if preferred else []

            for variant in variations:
                if not variant:
                    continue
                if variant.strip().lower() == preferred.strip().lower():
                    continue

                pattern = re.compile(r'\b' + re.escape(variant) + r'\b', flags)
                for match in pattern.finditer(content):
                    # Check if this match falls entirely inside an approved preferred term occurrence
                    in_approved = any(p_start <= match.start() and match.end() <= p_end for p_start, p_end in pref_spans)
                    if in_approved:
                        continue

                    start_idx = match.start()
                    end_idx = match.end()
                    matched_text = match.group(0)

                    # Phrase-level expansion: avoid doubling brand name prefix (e.g. 'Nila Millet-Mix')
                    if preferred and " " in preferred:
                        pref_first_word = preferred.split()[0]
                        prefix_match = re.search(r'\b' + re.escape(pref_first_word) + r'\s+$', content[:start_idx], re.IGNORECASE)
                        if prefix_match:
                            start_idx = prefix_match.start()
                            matched_text = content[start_idx:end_idx]

                    if matched_text.strip().lower() == preferred.strip().lower():
                        continue

                    clause_info = self.clauses.get("4.1", {})
                    findings.append({
                        "title": f"Prohibited Terminology: '{matched_text}'",
                        "original_text": matched_text,
                        "clause_number": "4.1",
                        "clause_id": clause_info.get("id"),
                        "fact_code": None,
                        "fact_id": None,
                        "severity": clause_info.get("severity", "critical"),
                        "explanation": f"The term '{matched_text}' is prohibited. Approved brand terminology is '{preferred}'.",
                        "suggested_correction": preferred,
                        "confidence": 1.0,
                        "verification_status": "verified_clause",
                        "evidence_source": f"Clause 4.1: Product Terminology — Preferred: '{preferred}'",
                        "engine_source": "deterministic",
                    })

        # 2. Superlative & Ranking Claims (Clause 3.4) & Expired Fact F-07 Check
        superlative_patterns = [
            (r"(India['’]s\s+#1|#1\s+healthy\s+breakfast|#1\s+brand|India['’]s\s+number\s+one)", "India's #1"),
            (r"(world['’]s\s+best|best\s+in\s+India|undisputed\s+leader)", "Superlative market leadership claim"),
            (r"(Top\s+3\s+in\s+breakfast\s+cereal|Top\s+3\s+in\s+category)", "Top 3 claim"),
        ]

        fact_07 = self.facts.get("F-07")
        is_f07_expired = fact_07.get("is_expired", True) if fact_07 else True

        for pat_str, label in superlative_patterns:
            matches = list(re.finditer(pat_str, content, re.IGNORECASE))
            for match in matches:
                start_idx = match.start()
                end_idx = match.end()
                matched_text = match.group(0)

                # Phrase-level expansion: if followed by 'healthy breakfast' or 'breakfast', expand span to avoid repetition
                post_slice = content[end_idx:]
                phrase_match = re.match(r'^\s+(healthy\s+breakfast|wholesome\s+breakfast|breakfast)', post_slice, re.IGNORECASE)
                if phrase_match:
                    end_idx = end_idx + phrase_match.end()
                    matched_text = content[start_idx:end_idx]
                    suggested_corr = "a healthy breakfast"
                else:
                    suggested_corr = "a healthy breakfast"

                clause_34 = self.clauses.get("3.4", {})

                # If claim connects to ranking (India's #1 or Top 3), link with Fact F-07 which expired Dec 31, 2025
                if fact_07 and ("#1" in matched_text.lower() or "top" in matched_text.lower() or "india" in matched_text.lower()):
                    findings.append({
                        "title": f"Unsupported Ranking Claim & Expired Fact: '{matched_text}'",
                        "original_text": matched_text,
                        "clause_number": "3.4",
                        "clause_id": clause_34.get("id"),
                        "fact_code": "F-07",
                        "fact_id": fact_07.get("id"),
                        "severity": "critical",
                        "explanation": (
                            f"Ranking claim '{matched_text}' cites or relies on market audit evidence. "
                            f"However, Fact F-07 ('Top 3 in breakfast cereal category') expired on 31 December 2025 and cannot be used as valid evidence. "
                            f"Clause 3.4 forbids ranking or superlative claims without current, verified third-party audit."
                        ),
                        "suggested_correction": suggested_corr,
                        "confidence": 1.0,
                        "verification_status": "expired_fact_detected" if is_f07_expired else "verified_fact",
                        "evidence_source": f"Clause 3.4 (Superlative claims) & Fact F-07 (Expired: {fact_07.get('expiry_date')})",
                        "engine_source": "deterministic",
                    })
                else:
                    findings.append({
                        "title": f"Unsupported Superlative Claim: '{matched_text}'",
                        "original_text": matched_text,
                        "clause_number": "3.4",
                        "clause_id": clause_34.get("id"),
                        "fact_code": None,
                        "fact_id": None,
                        "severity": "critical",
                        "explanation": (
                            f"The phrase '{matched_text}' constitutes a superlative claim. "
                            f"Under Clause 3.4, superlative claims require verifiable, current certification."
                        ),
                        "suggested_correction": suggested_corr,
                        "confidence": 0.95,
                        "verification_status": "verified_clause",
                        "evidence_source": "Clause 3.4: Superlative Claims",
                        "engine_source": "deterministic",
                    })

        # 3. Health & Medical Guarantee Claims (Clause 3.6)
        health_patterns = [
            r"(guaranteed\s+to\s+cut\s+sugar\s+cravings|cuts\s+sugar\s+cravings|cure[s]?\s+diabetes|100%\s+guaranteed\s+health)[\.]?",
            r"(prevents\s+heart\s+disease|guaranteed\s+weight\s+loss)[\.]?",
        ]
        clause_36 = self.clauses.get("3.6", {})
        fact_12 = self.facts.get("F-12")

        for pat_str in health_patterns:
            matches = list(re.finditer(pat_str, content, re.IGNORECASE))
            for match in matches:
                matched_text = match.group(0)
                # Correction using approved valid Fact F-12 ("Made with 5 whole millets")
                f12_statement = fact_12.get("statement", "made with 5 whole millets") if fact_12 else "made with whole millets"
                
                # Check sentence capitalization context
                is_sentence_start = match.start() == 0 or bool(re.search(r'[\.!\?]\s*$', content[:match.start()]))
                has_period = matched_text.endswith(".")
                
                corr = "Made with 5 whole millets" if is_sentence_start else "made with 5 whole millets"
                if has_period:
                    corr += "."

                findings.append({
                    "title": f"Unverified Health Guarantee: '{matched_text}'",
                    "original_text": matched_text,
                    "clause_number": "3.6",
                    "clause_id": clause_36.get("id"),
                    "fact_code": "F-12" if fact_12 else None,
                    "fact_id": fact_12.get("id") if fact_12 else None,
                    "severity": "critical",
                    "explanation": (
                        f"Health claim '{matched_text}' promises clinical physiological outcomes. "
                        f"Under Clause 3.6 (Health claims), therapeutic guarantees are prohibited without regulatory approval. "
                        f"Recommend replacing with verified ingredient fact F-12 ('{f12_statement}')."
                    ),
                    "suggested_correction": corr,
                    "confidence": 1.0,
                    "verification_status": "verified_clause",
                    "evidence_source": "Clause 3.6: Health Claims",
                    "engine_source": "deterministic",
                })

        # 4. Brand Tone Violations: Aggressive Sales Urgency (Clause 2.1)
        tone_patterns = [
            r"(buy\s+now[\.\!]?|hurry[\.\!]?|order\s+immediately[\.\!]?|act\s+fast[\.\!]?|limited\s+time\s+only[\.\!]?)",
        ]
        clause_21 = self.clauses.get("2.1", {})
        for pat_str in tone_patterns:
            matches = list(re.finditer(pat_str, content, re.IGNORECASE))
            for match in matches:
                matched_text = match.group(0)
                corr = "Discover our blend." if matched_text.endswith((".", "!")) else "Discover our blend"
                findings.append({
                    "title": f"Tone Inconsistency: Aggressive Sales Call-to-Action '{matched_text}'",
                    "original_text": matched_text,
                    "clause_number": "2.1",
                    "clause_id": clause_21.get("id"),
                    "fact_code": None,
                    "fact_id": None,
                    "severity": "warning",
                    "explanation": (
                        f"The aggressive urgency phrase '{matched_text}' conflicts with Brand Tone Guideline 2.1. "
                        f"Nila Foods emphasizes grounded, educational, and warm communication rather than high-pressure sales triggers."
                    ),
                    "suggested_correction": corr,
                    "confidence": 0.92,
                    "verification_status": "verified_clause",
                    "evidence_source": "Clause 2.1: Brand Tone",
                    "engine_source": "deterministic",
                })

        # 5. Accessibility Checks: Alt Text on Media (Clause 5.2)
        clause_52 = self.clauses.get("5.2", {})
        # Check markdown images: ![alt](url)
        img_matches = list(re.finditer(r"!\[(.*?)\]\((.*?)\)", content))
        for img in img_matches:
            alt_text = img.group(1).strip()
            if not alt_text or len(alt_text) < 5:
                findings.append({
                    "title": "Missing or Insufficient Image Alt Text",
                    "original_text": img.group(0),
                    "clause_number": "5.2",
                    "clause_id": clause_52.get("id"),
                    "fact_code": None,
                    "fact_id": None,
                    "severity": "warning",
                    "explanation": "Clause 5.2 requires all visual assets to have descriptive, informative alternative text.",
                    "suggested_correction": "![Nila Millet Mix 500g pouch packaging](asset_url)",
                    "confidence": 0.95,
                    "verification_status": "verified_clause",
                    "evidence_source": "Clause 5.2: Accessibility and alt text",
                    "engine_source": "deterministic",
                })

        return findings

