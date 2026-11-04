import sys
import os
sys.path.insert(0, os.path.abspath("."))

from backend.database import SessionLocal, Base, engine
from backend.models import ContentReview, ReviewFinding, ApprovedFact, GuidelineClause
from backend.engine.evidence_retriever import EvidenceRetriever
from backend.engine.deterministic_engine import DeterministicEngine
from backend.engine.verification_layer import IndependentVerificationLayer

def run_unit_tests():
    print("--- [1/4] Database Verification ---", flush=True)
    db = SessionLocal()

    try:
        # Check seed data
        clauses = db.query(GuidelineClause).all()
        print(f"Total Guideline Clauses in DB: {len(clauses)}", flush=True)
        assert len(clauses) >= 5, "Must have at least 5 clauses (2.1, 3.4, 3.6, 4.1, 5.2)"

        clause_numbers = [c.clause_number for c in clauses]
        for expected in ["2.1", "3.4", "3.6", "4.1", "5.2"]:
            assert expected in clause_numbers, f"Missing clause {expected}"
        print("  -> Guideline clauses 2.1, 3.4, 3.6, 4.1, 5.2 verified.", flush=True)

        # Check Facts (F-07 expired, F-12 valid)
        facts = db.query(ApprovedFact).all()
        f07 = next((f for f in facts if f.fact_code == "F-07"), None)
        f12 = next((f for f in facts if f.fact_code == "F-12"), None)
        assert f07 is not None, "Fact F-07 must exist"
        assert f12 is not None, "Fact F-12 must exist"
        assert f07.expiry_date.year == 2025, "Fact F-07 must expire in 2025"
        assert f12.expiry_date.year == 2027, "Fact F-12 must be valid until 2027"
        print("  -> Fact F-07 (Expired 2025) and Fact F-12 (Valid 2027) verified.", flush=True)

        print("\n--- [2/4] Deterministic Review Engine Test ---", flush=True)
        retriever = EvidenceRetriever(db, organization_id=1)
        evidence_ctx = retriever.get_all_evidence_context()

        engine_inst = DeterministicEngine(evidence_ctx)
        test_draft = "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."
        findings = engine_inst.scan(test_draft)

        print(f"Deterministic scan found {len(findings)} issues:", flush=True)
        for idx, f in enumerate(findings, 1):
            print(f"  {idx}. [{f['clause_number']}] {f['title']} -> '{f['original_text']}'", flush=True)

        assert any(f['clause_number'] == '4.1' for f in findings), "Missing Clause 4.1 for Millet-Mix"
        assert any(f['clause_number'] == '3.4' for f in findings), "Missing Clause 3.4 for India's #1"
        assert any(f.get('fact_code') == 'F-07' for f in findings), "Missing Fact F-07 expired link"
        assert any(f['clause_number'] == '3.6' for f in findings), "Missing Clause 3.6 for health guarantee"
        assert any(f['clause_number'] == '2.1' for f in findings), "Missing Clause 2.1 for Buy now tone"

        print("\n--- [3/4] Independent Verification & Abstention Layer ---", flush=True)
        verifier = IndependentVerificationLayer(db, organization_id=1)
        verified = verifier.verify_findings(findings, test_draft)

        print(f"Independent Verifier validated {len(verified)} findings:", flush=True)
        for v in verified:
            print(f"  -> {v['clause_number']}: status='{v['verification_status']}', confidence={v['confidence']}", flush=True)
            assert v['original_text'] in test_draft, f"Text '{v['original_text']}' not in test draft"

        f07_v = next(v for v in verified if v.get('fact_code') == 'F-07')
        assert f07_v['verification_status'] == 'expired_fact_detected', "F-07 must be flagged as expired_fact_detected"

        # Test Abstention Rule: Candidate with non-existent clause or phantom text
        fake_candidates = [
            {
                "title": "Fabricated Citation",
                "original_text": "Non-existent phrase in text",
                "clause_number": "9.9",
                "confidence": 0.99
            }
        ]
        abstained = verifier.verify_findings(fake_candidates, test_draft)
        assert len(abstained) == 0, "Verifier MUST abstain on unverified/phantom findings"
        print("  -> Abstention verified: 'No citation, no flag' enforced on unverified candidates.", flush=True)

        print("\n--- [4/4] Clean Compliant Draft Verification ---", flush=True)
        clean_draft = "Nila Millet Mix: a healthy breakfast made with 5 whole millets."
        clean_findings = engine_inst.scan(clean_draft)
        clean_verified = verifier.verify_findings(clean_findings, clean_draft)

        print(f"Clean Draft Issues: {len(clean_verified)}", flush=True)
        assert len(clean_verified) == 0, "Clean draft must pass with 0 issues!"

        print("\n========================================================", flush=True)
        print("ALL TESTS PASSED! BrandProof Engine is verified 100%!", flush=True)
        print("========================================================", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    run_unit_tests()
