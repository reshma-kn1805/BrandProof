from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.engine.evidence_retriever import EvidenceRetriever
from backend.engine.deterministic_engine import DeterministicEngine
from backend.engine.ai_review_engine import AIReviewEngine
from backend.engine.verification_layer import IndependentVerificationLayer
from backend.engine.suggestion_prechecker import pre_check_suggestions

class ReviewPipeline:
    """
    Main BrandProof Multi-Stage Content Verification Pipeline:
    Stage 1: Ingestion & Validation
    Stage 2: Deterministic Rule Engine
    Stage 3: Evidence Retrieval
    Stage 4: AI-Assisted Contextual Review
    Stage 5: Independent Python Verification Layer
    Stage 5.5: Suggestion Pre-Check & Human Attention Routing
    Stage 6: Scoring, Abstention, & Routing
    """
    def __init__(self, db: Session, organization_id: int):
        self.db = db
        self.organization_id = organization_id
        self.retriever = EvidenceRetriever(db, organization_id)
        self.verifier = IndependentVerificationLayer(db, organization_id)

    async def execute(
        self,
        content: str,
        confidential_mode: bool = False,
        confidential_terms: Optional[List[str]] = None,
        review_id: Optional[int] = None
    ) -> Dict[str, Any]:
        # Stage 3: Retrieve tenant evidence context
        evidence_ctx = self.retriever.get_all_evidence_context()

        # Stage 2: Deterministic Rule Checks
        deterministic_engine = DeterministicEngine(evidence_ctx)
        deterministic_findings = deterministic_engine.scan(content)
        for df in deterministic_findings:
            df["engine_source"] = "deterministic"
            df["is_ai_assisted"] = False

        # Stage 4: AI-Assisted Review (Contextual tone, intent, guarantees)
        ai_engine = AIReviewEngine(evidence_ctx)
        ai_res = await ai_engine.analyze(
            content=content,
            confidential_mode=confidential_mode,
            confidential_terms=confidential_terms,
            review_id=review_id,
            organization_id=self.organization_id,
            db=self.db
        )
        ai_findings = ai_res.get("findings", [])
        for af in ai_findings:
            af["engine_source"] = "ai"
            af["is_ai_assisted"] = True

        # Combine candidates
        raw_candidates = deterministic_findings + ai_findings

        # Stage 5 & 6: Independent Verification Layer & Abstention
        verified_findings = self.verifier.verify_findings(raw_candidates, content)

        # Stage 5.5: Pre-Check Suggested Corrections
        verified_findings = pre_check_suggestions(
            verified_findings,
            content,
            evidence_ctx,
            deterministic_engine
        )

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

            if f.get("verification_status") in ["pending_human_review", "expired_fact_detected"] or f.get("needs_human_look"):
                requires_attention = True

        score = max(0.0, round(score, 1))

        return {
            "findings": verified_findings,
            "overall_score": score,
            "has_critical_violations": has_critical,
            "requires_human_attention": requires_attention,
            "ai_active": ai_res.get("ai_active", False),
            "ai_unavailable": ai_res.get("ai_unavailable", False),
            "ai_provider": ai_res.get("provider", "deterministic-fallback"),
            "ai_notice": ai_res.get("notice"),
            "redaction_summary": ai_res.get("redaction_summary"),
            "total_issues": len(verified_findings),
        }

