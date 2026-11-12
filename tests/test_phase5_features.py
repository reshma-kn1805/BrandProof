import io
import json
import pytest
from pypdf import PdfReader
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import get_db, Base, engine
from backend.models import User, Organization, ContentReview, ReviewFinding, AuditLog, GuidelineClause
from backend.auth import create_access_token
from backend.redaction.redactor import redact_content, restore_content, RedactionEngine
from backend.audit_chain import verify_audit_chain, record_audit_log, compute_entry_hash, canonical_entry_dict
from backend.report_generator import generate_pdf_report, compute_report_fingerprint

client = TestClient(app)

# 1. Redaction unit tests (each pattern + round trip)
def test_redaction_patterns_and_round_trip():
    original = (
        "Inquiries to director@nilafoods.com. "
        "Call Indian desk +91 9876543210 or US line +1 (555) 234-5678. "
        "Authorized budget is ₹50,000 and extra $1,200. "
        "Tracking id 98765432100. "
        "Classified notes [[Top Secret Project Alpha]]. "
        "Confidential ingredient: Sacred Spice."
    )
    confidential_terms = ["Sacred Spice"]

    res = redact_content(original, confidential_terms=confidential_terms)

    # Check each pattern replaced
    assert "director@nilafoods.com" not in res.redacted_text
    assert "[REDACTED_EMAIL_1]" in res.redacted_text
    assert res.counts["email"] == 1

    assert "+91 9876543210" not in res.redacted_text
    assert "[REDACTED_PHONE_1]" in res.redacted_text
    assert res.counts["phone"] >= 2

    assert "₹50,000" not in res.redacted_text
    assert "[REDACTED_CURRENCY_1]" in res.redacted_text
    assert res.counts["currency"] >= 2

    assert "98765432100" not in res.redacted_text

    assert "Top Secret Project Alpha" not in res.redacted_text
    assert "[REDACTED_CONFIDENTIAL_1]" in res.redacted_text
    assert res.counts["bracketed"] == 1

    assert "Sacred Spice" not in res.redacted_text
    assert "[REDACTED_TERM_1]" in res.redacted_text
    assert res.counts["terms"] == 1

    # Round trip verification
    restored = restore_content(res.redacted_text, res.token_map)
    assert restored == original


# 2. Tamper-evident audit hash-chain tests (tamper row and confirm verify fails)
def test_tamper_evident_audit_hash_chain():
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        assert org is not None

        # Add two chained audit logs
        log1 = record_audit_log(
            db=db,
            organization_id=org.id,
            action="TEST_ACTION_1",
            target_type="System",
            details={"step": 1}
        )
        log2 = record_audit_log(
            db=db,
            organization_id=org.id,
            action="TEST_ACTION_2",
            target_type="System",
            details={"step": 2}
        )
        db.commit()

        # Verify chain passes initially
        status = verify_audit_chain(db, organization_id=org.id)
        assert status["valid"] is True
        assert status["first_broken_entry"] is None
        assert status["entries"] >= 2

        # Now tamper with log1 details directly
        original_details = log1.details
        log1.details = {"step": 1, "tampered": True}
        db.commit()

        # Verification MUST fail and point to log1
        tampered_status = verify_audit_chain(db, organization_id=org.id)
        assert tampered_status["valid"] is False
        assert tampered_status["first_broken_entry"] == log1.id

        # Restore and confirm valid again
        log1.details = original_details
        db.commit()

        restored_status = verify_audit_chain(db, organization_id=org.id)
        assert restored_status["valid"] is True
        assert restored_status["first_broken_entry"] is None

    finally:
        db.close()


# 3. PDF report test (parses generated PDF text and verifies required sections)
def test_pdf_report_sections_and_fingerprint():
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        creator = db.query(User).filter(User.email == "creator@nilafoods.com").first()
        assert org is not None and creator is not None

        review = ContentReview(
            organization_id=org.id,
            title="Sample PDF Audit Campaign",
            original_content="Original text before governance checks.",
            current_content="Revised text after governance checks.",
            status="approved",
            author_id=creator.id,
            overall_score=95.0,
            has_critical_violations=False,
            confidential_mode=True,
            redaction_summary={"email": 1, "phone": 1, "total": 2}
        )
        db.add(review)
        db.flush()

        finding = ReviewFinding(
            review_id=review.id,
            title="Superlative Claim",
            original_text="#1 breakfast",
            severity="warning",
            explanation="Requires substantiation.",
            verification_status="verified_clause",
            decision_status="accepted"
        )
        db.add(finding)
        db.commit()
        db.refresh(review)

        # Generate PDF report
        pdf_bytes, fingerprint = generate_pdf_report(review, db)
        assert len(pdf_bytes) > 0
        assert len(fingerprint) == 64

        # Parse with pypdf
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) >= 1
        full_text = " ".join([page.extract_text() for page in reader.pages])

        # Verify required sections per spec
        assert "BRANDPROOF AUDIT & COMPLIANCE REPORT" in full_text
        assert "Sample PDF Audit Campaign" in full_text
        assert "Compliance Score" in full_text or "95.0 / 100" in full_text
        assert "Content Evolution" in full_text or "Original Submitted Text" in full_text
        assert "Findings & Evidence Citations" in full_text
        assert "Confidential Mode & AI Services Disclosure" in full_text
        assert "CRYPTOGRAPHIC VERIFICATION FINGERPRINT" in full_text
        assert fingerprint in full_text
    finally:
        db.close()


# 4. E2E test of the "Done when" scenario:
# "a draft with an email and a phone number is reviewed with confidential mode on,
# the preview shows both redacted, and the exported PDF contains the review record."
def test_done_when_confidential_draft_e2e():
    # Creator login
    login_res = client.post("/api/auth/login", json={
        "email": "creator@nilafoods.com",
        "password": "BrandProof2026!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    draft_content = (
        "Nila Millet-Mix is India's #1 healthy breakfast! "
        "For wholesale pricing email partner@nilafoods.com or call +91 9876543210. "
        "Guaranteed to cut sugar cravings. Buy now."
    )

    # Step 1: Preview "What will be sent"
    preview_res = client.post(
        "/api/reviews/redaction-preview",
        json={"text": draft_content},
        headers=auth_headers
    )
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert preview_data["counts"]["email"] == 1
    assert preview_data["counts"]["phone"] == 1
    assert "[REDACTED_EMAIL_1]" in preview_data["redacted_text"]
    assert "[REDACTED_PHONE_1]" in preview_data["redacted_text"]
    assert "partner@nilafoods.com" not in preview_data["redacted_text"]
    assert "+91 9876543210" not in preview_data["redacted_text"]

    # Step 2: Submit with confidential mode ON
    sub_res = client.post(
        "/api/reviews/submit",
        json={
            "title": "Phase 5 E2E Confidential Draft",
            "content": draft_content,
            "confidential_mode": True
        },
        headers=auth_headers
    )
    assert sub_res.status_code == 200
    review = sub_res.json()
    assert review["confidential_mode"] is True
    assert review["redaction_summary"] is not None
    assert review["redaction_summary"]["email"] == 1
    assert review["redaction_summary"]["phone"] == 1

    review_id = review["id"]

    # Step 3: Export PDF Report
    pdf_res = client.get(f"/api/reviews/{review_id}/report.pdf", headers=auth_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert "X-Report-Fingerprint" in pdf_res.headers
    fingerprint = pdf_res.headers["X-Report-Fingerprint"]
    assert len(fingerprint) == 64

    # Step 4: Parse PDF text and confirm it contains the full review record
    reader = PdfReader(io.BytesIO(pdf_res.content))
    pdf_text = " ".join([page.extract_text() for page in reader.pages])
    assert "Phase 5 E2E Confidential Draft" in pdf_text
    assert "CONFIDENTIAL MODE" in pdf_text.upper()
    assert fingerprint in pdf_text

    # Step 5: Verify Report via Public Endpoint
    verify_res = client.post("/api/reports/verify", json={"query": fingerprint})
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["matched"] is True
    assert v_data["review_id"] == review_id
    assert v_data["fingerprint"] == fingerprint

    # Step 6: Also verify audit ledger integrity check passes
    audit_verify = client.get("/api/audit/verify", headers=auth_headers)
    assert audit_verify.status_code == 200
    assert audit_verify.json()["valid"] is True
