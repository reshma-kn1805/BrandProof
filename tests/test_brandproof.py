import pytest
import datetime
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, Base, engine
from backend.seed import seed_database
from backend.engine.review_pipeline import ReviewPipeline

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["tagline"] == "No citation, no flag."

def test_auth_login_all_roles():
    roles = [
        ("creator@nilafoods.com", "Creator"),
        ("reviewer@nilafoods.com", "Reviewer"),
        ("manager@nilafoods.com", "Manager"),
        ("admin@nilafoods.com", "Admin"),
    ]
    for email, expected_role in roles:
        res = client.post("/api/auth/login", json={"email": email, "password": "BrandProof2026!"})
        assert res.status_code == 200, f"Failed login for {email}"
        data = res.json()
        assert "access_token" in data
        assert data["user"]["role"] == expected_role

def test_expired_fact_detection():
    # Login as reviewer
    login_res = client.post("/api/auth/login", json={"email": "reviewer@nilafoods.com", "password": "BrandProof2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/facts/", headers=headers)
    assert res.status_code == 200
    facts = res.json()
    
    # Check F-07 is marked expired (expiry was Dec 31, 2025)
    f07 = next((f for f in facts if f["fact_code"] == "F-07"), None)
    assert f07 is not None
    assert f07["is_expired"] is True
    assert f07["approval_status"] == "expired"

    # Check F-12 is valid (expiry Dec 2027)
    f12 = next((f for f in facts if f["fact_code"] == "F-12"), None)
    assert f12 is not None
    assert f12["is_expired"] is False

def test_review_pipeline_nila_foods_sample():
    # Login as creator
    login_res = client.post("/api/auth/login", json={"email": "creator@nilafoods.com", "password": "BrandProof2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    draft_text = "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."

    res = client.post("/api/reviews/submit", json={
        "title": "Automated Test Sample Draft",
        "content": draft_text,
        "file_name": "test_draft.txt",
        "file_type": "text"
    }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert data["overall_score"] < 70.0
    assert data["has_critical_violations"] is True
    assert len(data["findings"]) >= 4

    # Verify specific findings
    findings = data["findings"]
    clause_numbers = [f["clause_number"] for f in findings]
    
    # 1. Terminology violation (Clause 4.1)
    assert "4.1" in clause_numbers
    
    # 2. Ranking & Expired Fact F-07 violation (Clause 3.4)
    assert "3.4" in clause_numbers
    f07_finding = next((f for f in findings if f.get("fact_code") == "F-07"), None)
    assert f07_finding is not None
    assert f07_finding["verification_status"] == "expired_fact_detected"

    # 3. Health guarantee claim (Clause 3.6)
    assert "3.6" in clause_numbers

    # 4. Brand tone urgency (Clause 2.1)
    assert "2.1" in clause_numbers

def test_correction_workflow_and_re_review():
    # Login as creator
    login_res = client.post("/api/auth/login", json={"email": "creator@nilafoods.com", "password": "BrandProof2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Submit sample draft
    draft_text = "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."
    sub_res = client.post("/api/reviews/submit", json={
        "title": "Correction Workflow Test",
        "content": draft_text
    }, headers=headers)
    review = sub_res.json()
    review_id = review["id"]

    # Find terminology finding
    term_finding = next(f for f in review["findings"] if f["clause_number"] == "4.1")

    # Accept the suggestion
    action_res = client.post(
        f"/api/reviews/{review_id}/findings/{term_finding['id']}/action",
        json={"action": "accept"},
        headers=headers
    )
    assert action_res.status_code == 200
    updated_review = action_res.json()

    # Verify updated content has "Nila Millet Mix"
    assert "Nila Millet Mix" in updated_review["current_content"]
    assert "Millet-Mix" not in updated_review["current_content"]
    assert len(updated_review["revisions"]) >= 2

def test_human_approval_permissions():
    # Creator tries to approve (MUST FAIL with 403)
    c_login = client.post("/api/auth/login", json={"email": "creator@nilafoods.com", "password": "BrandProof2026!"})
    c_token = c_login.json()["access_token"]

    # Submit clean draft
    sub_res = client.post("/api/reviews/submit", json={
        "title": "Clean Compliance Sample",
        "content": "Nila Millet Mix: a healthy breakfast made with 5 whole millets."
    }, headers={"Authorization": f"Bearer {c_token}"})
    review_id = sub_res.json()["id"]

    creator_attempt = client.post(
        f"/api/reviews/{review_id}/decision",
        json={"decision": "approved", "notes": "I approve my own post"},
        headers={"Authorization": f"Bearer {c_token}"}
    )
    assert creator_attempt.status_code == 403

    # Manager approves (MUST SUCCEED)
    m_login = client.post("/api/auth/login", json={"email": "manager@nilafoods.com", "password": "BrandProof2026!"})
    m_token = m_login.json()["access_token"]

    manager_decision = client.post(
        f"/api/reviews/{review_id}/decision",
        json={"decision": "approved", "notes": "Approved for publication"},
        headers={"Authorization": f"Bearer {m_token}"}
    )
    assert manager_decision.status_code == 200
    assert manager_decision.json()["status"] == "approved"

