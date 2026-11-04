import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.models import GuidelineClause, ApprovedFact, Terminology, BrandAsset

class EvidenceRetriever:
    """
    Stage 3: Relevant evidence retrieval.
    Strictly scoped to the tenant organization to enforce workspace isolation.
    """
    def __init__(self, db: Session, organization_id: int):
        self.db = db
        self.organization_id = organization_id

    def get_active_clauses(self) -> List[GuidelineClause]:
        return (
            self.db.query(GuidelineClause)
            .filter(
                GuidelineClause.organization_id == self.organization_id,
                GuidelineClause.status == "active"
            )
            .all()
        )

    def get_facts(self) -> List[ApprovedFact]:
        return (
            self.db.query(ApprovedFact)
            .filter(ApprovedFact.organization_id == self.organization_id)
            .all()
        )

    def get_terminology_rules(self) -> List[Terminology]:
        return (
            self.db.query(Terminology)
            .filter(Terminology.organization_id == self.organization_id)
            .all()
        )

    def get_brand_assets(self) -> List[BrandAsset]:
        return (
            self.db.query(BrandAsset)
            .filter(BrandAsset.organization_id == self.organization_id)
            .all()
        )

    def get_all_evidence_context(self) -> Dict[str, Any]:
        clauses = self.get_active_clauses()
        facts = self.get_facts()
        terms = self.get_terminology_rules()
        assets = self.get_brand_assets()
        now = datetime.datetime.utcnow()

        return {
            "clauses": [
                {
                    "id": c.id,
                    "clause_number": c.clause_number,
                    "title": c.title,
                    "description": c.description,
                    "category": c.category,
                    "severity": c.severity,
                    "rules_json": c.rules_json,
                }
                for c in clauses
            ],
            "facts": [
                {
                    "id": f.id,
                    "fact_code": f.fact_code,
                    "statement": f.statement,
                    "source_evidence": f.source_evidence,
                    "approval_status": f.approval_status,
                    "effective_date": f.effective_date.isoformat() if f.effective_date else None,
                    "expiry_date": f.expiry_date.isoformat() if f.expiry_date else None,
                    "is_expired": bool(f.expiry_date and f.expiry_date < now),
                }
                for f in facts
            ],
            "terminology": [
                {
                    "id": t.id,
                    "preferred_term": t.preferred_term,
                    "prohibited_term": t.prohibited_term,
                    "incorrect_variations": t.incorrect_variations or [],
                    "approved_alternatives": t.approved_alternatives or [],
                    "case_sensitive": t.case_sensitive,
                }
                for t in terms
            ],
            "assets": [
                {"id": a.id, "title": a.title, "alt_text": a.alt_text, "asset_type": a.asset_type}
                for a in assets
            ],
        }

