import os
import sys
import time
import subprocess

sys.path.insert(0, os.path.abspath("."))

# Set production environment variables
os.environ["ENV"] = "production"
os.environ["JWT_SECRET_KEY"] = "prod-secret-round3-phase2-verification-key-123456789"
os.environ["DATABASE_URL"] = "sqlite:///./phase2_prod_test.db"
os.environ["CORS_ORIGINS"] = "https://reshma-kn1805.github.io,http://localhost:3000"

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Base, engine, SessionLocal
from backend.seed import seed_database

def run_phase2_verification():
    print("=" * 60)
    print("PHASE 2 FULL-LIFECYCLE PRODUCTION VERIFICATION")
    print("=" * 60)

    # Step 1: Initialize and seed clean production database
    print("\n[Step 1] Initializing production SQLite/PostgreSQL schema & seed...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()
    print("  -> Schema initialized and Nila Foods workspace seeded.")

    client = TestClient(app)

    # Step 2: Health check
    print("\n[Step 2] Testing /api/health endpoint...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health = res.json()
    print("  -> Health response:", health)
    assert health["status"] == "healthy"
    assert health["database"] == "connected"
    assert "ai_configured" in health
    print("  -> Database connectivity and health verified.")

    # Step 3: Sign in as Creator
    print("\n[Step 3] Signing in as Creator (creator@nilafoods.com)...")
    login_res = client.post("/api/auth/login", json={
        "email": "creator@nilafoods.com",
        "password": "BrandProof2026!"
    })
    assert login_res.status_code == 200, f"Creator login failed: {login_res.text}"
    creator_token = login_res.json()["access_token"]
    creator_headers = {"Authorization": f"Bearer {creator_token}"}
    print("  -> Creator JWT acquired.")

    # Check /api/auth/me
    me_res = client.get("/api/auth/me", headers=creator_headers)
    assert me_res.status_code == 200
    user_me = me_res.json()
    print(f"  -> Verified session: {user_me['full_name']} ({user_me['role']})")

    # Step 4: Submit sample draft
    print("\n[Step 4] Submitting draft copy with violations for audit...")
    sample_draft = "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."
    submit_res = client.post("/api/reviews/submit", json={
        "title": "Phase 2 Production Verification Draft",
        "content": sample_draft,
        "file_name": "sample.txt",
        "file_type": "text"
    }, headers=creator_headers)
    assert submit_res.status_code == 200, f"Draft submission failed: {submit_res.text}"
    review_data = submit_res.json()
    review_id = review_data["id"]
    findings = review_data["findings"]
    print(f"  -> Review #{review_id} created with {len(findings)} findings.")
    for f in findings:
        print(f"     - [{f.get('clause_number', 'N/A')}] {f['title']} (status: {f['verification_status']})")
    assert len(findings) >= 4, "Expected 4 cited findings"

    # Step 5: Accept all findings
    print("\n[Step 5] Accepting all suggested remediations...")
    for f in findings:
        action_res = client.post(
            f"/api/reviews/{review_id}/findings/{f['id']}/action",
            json={"action": "accept"},
            headers=creator_headers
        )
        assert action_res.status_code == 200, f"Action failed on finding {f['id']}: {action_res.text}"
    
    # Verify updated review content and score
    review_after = client.get(f"/api/reviews/{review_id}", headers=creator_headers).json()
    print(f"  -> Remediated Content: \"{review_after['current_content']}\"")
    print(f"  -> Compliance Score after remediation: {review_after['overall_score']}%")

    # Step 6: Sign in as Manager and Approve
    print("\n[Step 6] Signing in as Manager (manager@nilafoods.com)...")
    mgr_login = client.post("/api/auth/login", json={
        "email": "manager@nilafoods.com",
        "password": "BrandProof2026!"
    })
    assert mgr_login.status_code == 200
    mgr_token = mgr_login.json()["access_token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    print("  -> Manager JWT acquired.")

    print(f"\n[Step 7] Granting publication approval for Review #{review_id} via /decision...")
    approve_res = client.post(
        f"/api/reviews/{review_id}/decision",
        json={"decision": "approved", "notes": "Phase 2 production lifecycle verified"},
        headers=mgr_headers
    )
    assert approve_res.status_code == 200, f"Approval failed: {approve_res.text}"
    approved_review = approve_res.json()
    assert approved_review["status"] == "approved"
    print(f"  -> Review #{review_id} successfully approved by Manager.")

    # Step 8: Simulate Page Refresh & Persistence
    print("\n[Step 8] Simulating Page Refresh (persisted JWT & DB re-fetch)...")
    refreshed_res = client.get(f"/api/reviews/{review_id}", headers=creator_headers)
    assert refreshed_res.status_code == 200
    refreshed = refreshed_res.json()
    assert refreshed["id"] == review_id
    assert refreshed["status"] == "approved"
    assert len(refreshed["approvals"]) > 0
    print(f"  -> Successfully verified persistence across simulated refresh: Status='{refreshed['status']}'")

    # Step 9: 401 Session Expiration Verification
    print("\n[Step 9] Testing 401 Session Expiration on invalid/expired token...")
    expired_headers = {"Authorization": "Bearer invalid.expired.token"}
    exp_res = client.get("/api/auth/me", headers=expired_headers)
    assert exp_res.status_code == 401, f"Expected 401 on expired token, got {exp_res.status_code}"
    print(f"  -> 401 correctly returned: {exp_res.json()}")

    print("\n" + "=" * 60)
    print("ALL PRODUCTION LIFECYCLE STEPS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_phase2_verification()
