from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.engine.evidence_retriever import EvidenceRetriever
from backend.engine.deterministic_engine import DeterministicEngine
from backend.engine.ai_review_engine import AIReviewEngine
from backend.engine.verification_layer import IndependentVerificationLayer

class ReviewPipeline:
    """
    Main BrandProof Multi-Stage Content Verification Pipeline:
    Stage 1: Ingestion & Validation
    Stage 2: Deterministic Rule Engine
    Stage 3: Evidence Retrieval
    Stage 4: AI-Assisted Contextual Review
    Stage 5: Independent Python Verification Layer
    Stage 6: Scoring, Abstention, & Routing
    """
    def __init__(self, db: Session, organization_id: int):
        self.db = db
        self.organization_id = organization_id
        self.retriever = EvidenceRetriever(db, organization_id)
        self.verifier = IndependentVerificationLayer(db, organization_id)

    async def execute(self, content: str) -> Dict[str, Any]:
        # Stage 3: Retrieve tenant evidence context
        evidence_ctx = self.retriever.get_all_evidence_context()

        # Stage 2: Deterministic Rule Checks
        deterministic_engine = DeterministicEngine(evidence_ctx)
        deterministic_findings = deterministic_engine.scan(content)

        # Stage 4: AI-Assisted Review (Contextual tone, intent, guarantees)
        ai_engine = AIReviewEngine(evidence_ctx)
        ai_res = await ai_engine.analyze(content)
        ai_findings = ai_res.get("findings", [])

        # Combine candidates
        raw_candidates = deterministic_findings + ai_findings

        # Stage 5 & 6: Independent Verification Layer & Abstention
        verified_findings = self.verifier.verify_findings(raw_candidates, content)

        # Calculate Compliance Score (100 base, deductions based on severity)
        score = 100.0
        has_critical = False
        requires_attention = False

        for f in verified_findings:
            sev = f.get("severity", "warning").lower()
            if sev == "critical":
                score -= 22.0
                has_critical = True
            elif sev == "warning":
                score -= 12.0
            else:
                score -= 5.0

            if f.get("verification_status") in ["pending_human_review", "expired_fact_detected"]:
                requires_attention = True

        score = max(0.0, round(score, 1))

        return {
            "findings": verified_findings,
            "overall_score": score,
            "has_critical_violations": has_critical,
            "requires_human_attention": requires_attention,
            "ai_active": ai_res.get("ai_active", False),
            "ai_provider": ai_res.get("provider", "deterministic-fallback"),
            "total_issues": len(verified_findings),
        }

