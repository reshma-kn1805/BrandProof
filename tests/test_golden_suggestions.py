import itertools
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.rate_limiter import login_limiter, submit_limiter

client = TestClient(app)

SAMPLE_TEXT = "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."
EXPECTED_GOLDEN_TEXT = "Nila Millet Mix is a healthy breakfast! Made with 5 whole millets. Discover our blend."

@pytest.fixture(autouse=True)
def reset_limiters():
    login_limiter.reset()
    submit_limiter.reset()

@pytest.fixture(scope="module")
def creator_auth():
    login_limiter.reset()
    res = client.post("/api/auth/login", json={"email": "creator@nilafoods.com", "password": "BrandProof2026!"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_initial_sample_findings(creator_auth):
    """Submitting the golden sample must produce exactly 4 verified findings."""
    res = client.post("/api/reviews/submit", json={
        "title": "Initial Sample Test",
        "content": SAMPLE_TEXT
    }, headers=creator_auth)
    assert res.status_code == 200
    data = res.json()
    assert len(data["findings"]) == 4

    # Verify no doubled words or awkward fragments in suggestions
    for f in data["findings"]:
        sugg = f.get("suggested_correction")
        assert sugg is not None
        assert "Nila Nila" not in sugg
        assert "healthy breakfast healthy breakfast" not in sugg

@pytest.mark.parametrize("order_indices", list(itertools.permutations(range(4))))
def test_all_permutations_accept_golden_sample(creator_auth, order_indices):
    """
    Accepting all 4 findings in any of the 24 possible permutations (orders)
    must always produce clean, fluent text and a compliance score of 100.0.
    """
    submit_limiter.reset()
    res = client.post("/api/reviews/submit", json={
        "title": f"Golden Permutation {order_indices}",
        "content": SAMPLE_TEXT
    }, headers=creator_auth)
    assert res.status_code == 200
    review_id = res.json()["id"]

    for step_num, idx in enumerate(order_indices):
        # Fetch current review state
        cur_res = client.get(f"/api/reviews/{review_id}", headers=creator_auth)
        active_findings = [f for f in cur_res.json()["findings"] if f["decision_status"] == "pending"]
        assert len(active_findings) == 4 - step_num

        # Pick the finding based on current index modulo remaining findings
        target_finding = active_findings[idx % len(active_findings)]

        # Accept the finding
        action_res = client.post(
            f"/api/reviews/{review_id}/findings/{target_finding['id']}/action",
            json={"action": "accept"},
            headers=creator_auth
        )
        assert action_res.status_code == 200
        intermediate_content = action_res.json()["current_content"]

        # Ensure no doubled words in intermediate content
        assert "Nila Nila" not in intermediate_content
        assert "healthy breakfast healthy breakfast" not in intermediate_content

    # Final review state verification
    final_res = client.get(f"/api/reviews/{review_id}", headers=creator_auth)
    final_data = final_res.json()

    assert final_data["overall_score"] == 100.0
    assert final_data["has_critical_violations"] is False
    assert final_data["requires_human_attention"] is False
    assert len([f for f in final_data["findings"] if f["decision_status"] == "pending"]) == 0
    assert final_data["current_content"] == EXPECTED_GOLDEN_TEXT

