import io
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.rate_limiter import login_limiter, submit_limiter

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_limiters_between_tests():
    login_limiter.reset()
    submit_limiter.reset()
    yield

@pytest.fixture(scope="module")
def creator_auth():
    login_limiter.reset()
    res = client.post("/api/auth/login", json={"email": "creator@nilafoods.com", "password": "BrandProof2026!"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def manager_auth():
    login_limiter.reset()
    res = client.post("/api/auth/login", json={"email": "manager@nilafoods.com", "password": "BrandProof2026!"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# --- 1. Pydantic Input Validation & Global Error Format Tests ---

def test_validation_empty_whitespace_draft(creator_auth):
    """Empty or whitespace-only review submission must return 422 with structured error format."""
    res = client.post("/api/reviews/submit", json={
        "title": "   ",
        "content": "Valid content"
    }, headers=creator_auth)
    assert res.status_code == 422
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "cannot be empty or whitespace only" in data["error"]["message"].lower()

def test_validation_whitespace_content(creator_auth):
    res = client.post("/api/reviews/submit", json={
        "title": "Valid Title",
        "content": "   \n\t  "
    }, headers=creator_auth)
    assert res.status_code == 422
    data = res.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"

def test_validation_oversized_content_50k(creator_auth):
    """Content exceeding 50,000 characters must return 422."""
    giant_text = "Nila Millet Mix is wholesome healthy breakfast. " * 1500  # > 70,000 chars
    res = client.post("/api/reviews/submit", json={
        "title": "Giant Draft",
        "content": giant_text
    }, headers=creator_auth)
    assert res.status_code == 422
    data = res.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "50000" in data["error"]["message"]

# --- 2. File Upload Integrity & Security Tests ---

def test_upload_empty_file(creator_auth):
    """0-byte file must be rejected with HTTP 400."""
    empty_file = io.BytesIO(b"")
    res = client.post(
        "/api/reviews/upload",
        data={"title": "Empty File Test"},
        files={"file": ("empty.txt", empty_file, "text/plain")},
        headers=creator_auth
    )
    assert res.status_code == 400
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "HTTP_400"
    assert "empty" in data["error"]["message"].lower()

def test_upload_oversized_file(creator_auth):
    """File exceeding 5 MB must be rejected with HTTP 400."""
    giant_bytes = b"X" * (5 * 1024 * 1024 + 1024)  # 5 MB + 1 KB
    giant_file = io.BytesIO(giant_bytes)
    res = client.post(
        "/api/reviews/upload",
        data={"title": "Oversized File Test"},
        files={"file": ("large.txt", giant_file, "text/plain")},
        headers=creator_auth
    )
    assert res.status_code == 400
    data = res.json()
    assert "5 mb" in data["error"]["message"].lower()

def test_upload_corrupt_docx(creator_auth):
    """DOCX without PK zip headers must be rejected."""
    corrupt_file = io.BytesIO(b"Not a real word docx binary file")
    res = client.post(
        "/api/reviews/upload",
        data={"title": "Corrupt Docx Test"},
        files={"file": ("test.docx", corrupt_file, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers=creator_auth
    )
    assert res.status_code == 400
    data = res.json()
    assert "corrupt" in data["error"]["message"].lower()

def test_upload_corrupt_pdf(creator_auth):
    """PDF without %PDF header must be rejected."""
    corrupt_file = io.BytesIO(b"Not a real PDF file")
    res = client.post(
        "/api/reviews/upload",
        data={"title": "Corrupt PDF Test"},
        files={"file": ("test.pdf", corrupt_file, "application/pdf")},
        headers=creator_auth
    )
    assert res.status_code == 400
    data = res.json()
    assert "corrupt" in data["error"]["message"].lower()

def test_upload_unsupported_extension(creator_auth):
    """Unsupported extension (.exe) must be rejected."""
    exe_file = io.BytesIO(b"MZ executable header")
    res = client.post(
        "/api/reviews/upload",
        data={"title": "Malware Test"},
        files={"file": ("payload.exe", exe_file, "application/x-msdownload")},
        headers=creator_auth
    )
    assert res.status_code == 400
    data = res.json()
    assert "unsupported" in data["error"]["message"].lower()

# --- 3. Idempotency & State Guard Tests ---

def test_idempotent_finding_action(creator_auth):
    """Accepting an already accepted finding must be harmless and return current state without duplicate revisions."""
    # Submit draft
    sub_res = client.post("/api/reviews/submit", json={
        "title": "Idempotency Draft",
        "content": "Nila Millet-Mix is healthy. Buy now."
    }, headers=creator_auth)
    review_id = sub_res.json()["id"]
    finding = sub_res.json()["findings"][0]
    finding_id = finding["id"]

    # First accept
    res1 = client.post(
        f"/api/reviews/{review_id}/findings/{finding_id}/action",
        json={"action": "accept"},
        headers=creator_auth
    )
    assert res1.status_code == 200
    revs_count_1 = len(res1.json()["revisions"])

    # Second accept (identical action)
    res2 = client.post(
        f"/api/reviews/{review_id}/findings/{finding_id}/action",
        json={"action": "accept"},
        headers=creator_auth
    )
    assert res2.status_code == 200
    revs_count_2 = len(res2.json()["revisions"])

    # Revisions must NOT duplicate
    assert revs_count_1 == revs_count_2

def test_idempotent_approval_decision(creator_auth, manager_auth):
    """Approving an already approved review must be harmless and not duplicate approval records."""
    # Submit clean draft
    sub_res = client.post("/api/reviews/submit", json={
        "title": "Clean Approval Test",
        "content": "Nila Millet Mix is a healthy breakfast made with 5 whole millets."
    }, headers=creator_auth)
    review_id = sub_res.json()["id"]

    # First approve
    app1 = client.post(
        f"/api/reviews/{review_id}/decision",
        json={"decision": "approved", "notes": "First approval"},
        headers=manager_auth
    )
    assert app1.status_code == 200
    approvals_count_1 = len(app1.json()["approvals"])

    # Second approve (identical decision)
    app2 = client.post(
        f"/api/reviews/{review_id}/decision",
        json={"decision": "approved", "notes": "Duplicate click"},
        headers=manager_auth
    )
    assert app2.status_code == 200
    approvals_count_2 = len(app2.json()["approvals"])

    # Must be idempotent
    assert approvals_count_1 == approvals_count_2

def test_status_guard_reject_on_approved_review(creator_auth, manager_auth):
    """Rejecting an already approved review must be blocked with HTTP 400."""
    sub_res = client.post("/api/reviews/submit", json={
        "title": "Status Guard Test",
        "content": "Nila Millet Mix is a healthy breakfast made with 5 whole millets."
    }, headers=creator_auth)
    review_id = sub_res.json()["id"]

    # Approve first
    client.post(
        f"/api/reviews/{review_id}/decision",
        json={"decision": "approved"},
        headers=manager_auth
    )

    # Attempt to reject finalized approved review
    rej_res = client.post(
        f"/api/reviews/{review_id}/decision",
        json={"decision": "rejected", "notes": "Too late to reject"},
        headers=manager_auth
    )
    assert rej_res.status_code == 400
    assert "already been finalized as approved" in rej_res.json()["error"]["message"].lower()

# --- 4. Rate Limiting Tests ---

def test_login_rate_limiting():
    """Rapid repeated login attempts must trigger HTTP 429."""
    hit_rate_limit = False
    for i in range(15):
        res = client.post("/api/auth/login", json={"email": "wrong@nilafoods.com", "password": "WrongPassword!"})
        if res.status_code == 429:
            hit_rate_limit = True
            data = res.json()
            assert "error" in data
            assert data["error"]["code"] == "HTTP_429"
            assert "too many" in data["error"]["message"].lower()
            break
    assert hit_rate_limit, "Expected HTTP 429 rate limit trigger on repeated login attempts"
