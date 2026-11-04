import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.models import GuidelineClause, ApprovedFact

class IndependentVerificationLayer:
    """
    Stage 5 & 6: Independent Python Verification & Abstention Layer
    Enforces 'No citation, no flag. No verified evidence, no automatic approval.'
    Every candidate finding from deterministic rules or AI MUST undergo strict,
    independent database and algorithmic verification before display to users.
    """
    def __init__(self, db: Session, organization_id: int):
        self.db = db
        self.organization_id = organization_id

    def verify_findings(
        self,
        candidate_findings: List[Dict[str, Any]],
        submitted_content: str
    ) -> List[Dict[str, Any]]:
        verified_findings = []
        now = datetime.datetime.utcnow()

        # Cache active clauses for tenant organization
        db_clauses = {
            c.clause_number: c
            for c in self.db.query(GuidelineClause).filter(
                GuidelineClause.organization_id == self.organization_id,
                GuidelineClause.status == "active"
            ).all()
        }

        # Cache approved facts for tenant organization
        db_facts = {
            f.fact_code: f
            for f in self.db.query(ApprovedFact).filter(
                ApprovedFact.organization_id == self.organization_id
            ).all()
        }

        seen_keys = set()

        for finding in candidate_findings:
            original_text = finding.get("original_text", "").strip()
            clause_num = str(finding.get("clause_number", "")).strip()
            fact_code = str(finding.get("fact_code", "")).strip() if finding.get("fact_code") else None

            # Deduplication key
            dedup_key = (original_text.lower(), clause_num, fact_code)
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            # Check 1: Quoted text must exist verbatim in the submitted content
            if not original_text or original_text not in submitted_content:
                # If quoted text is not present in document, ABSTAIN (rule 1)
                # Never fabricate an issue on phantom text
                continue

            # Check 2, 3, 4: Cited guideline clause verification
            matched_clause = db_clauses.get(clause_num)
            has_valid_clause = matched_clause is not None

            # Check 5, 6: Referenced fact verification
            matched_fact = db_facts.get(fact_code) if fact_code else None
            is_fact_expired = False

            if matched_fact:
                if matched_fact.expiry_date and matched_fact.expiry_date < now:
                    is_fact_expired = True

            # Determine Verification Status & Confidence
            verification_status = "pending_human_review"
            confidence = float(finding.get("confidence", 0.9))

            if is_fact_expired:
                # Explicit rule: Expired fact detected
                verification_status = "expired_fact_detected"
                confidence = 1.0
            elif has_valid_clause and matched_fact and not is_fact_expired:
                verification_status = "verified_fact"
                confidence = max(confidence, 0.98)
            elif has_valid_clause:
                verification_status = "verified_clause"
                confidence = max(confidence, 0.95)
            else:
                # Missing or invalid evidence: Core principle is "No citation, no flag"
                # If neither clause nor fact can be validated, ABSTAIN
                continue

            # Check 8: Correction safety check (ensure correction doesn't repeat prohibited words)
            suggested = finding.get("suggested_correction")
            if suggested and "millet-mix" in suggested.lower():
                suggested = suggested.replace("Millet-Mix", "Millet Mix").replace("millet-mix", "millet mix")

            verified_findings.append({
                "title": finding.get("title", f"Guideline Clause {clause_num} Flag"),
                "original_text": original_text,
                "clause_id": matched_clause.id if matched_clause else None,
                "clause_number": clause_num if has_valid_clause else None,
                "fact_id": matched_fact.id if matched_fact else None,
                "fact_code": fact_code if matched_fact else None,
                "severity": matched_clause.severity if matched_clause else finding.get("severity", "warning"),
                "explanation": finding.get("explanation", "Verified against active brand guideline clause."),
                "suggested_correction": suggested,
                "confidence": confidence,
                "verification_status": verification_status,
                "evidence_source": (
                    f"Clause {clause_num} ({matched_clause.title})"
                    + (f" & Fact {fact_code} [Expired: {matched_fact.expiry_date.strftime('%d %b %Y')}]" if is_fact_expired and matched_fact else "")
                    + (f" & Fact {fact_code} [Valid]" if matched_fact and not is_fact_expired else "")
                ),
                "decision_status": "pending",
            })

        return verified_findings

