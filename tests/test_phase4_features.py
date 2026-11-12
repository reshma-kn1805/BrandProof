import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.rate_limiter import login_limiter, submit_limiter
from backend.engine.suggestion_prechecker import pre_check_suggestions
from backend.engine.deterministic_engine import DeterministicEngine

client = TestClient(app)

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

# --- 1. Pre-Check Suggestions Tests ---

def test_precheck_withholds_unbacked_claims():
    """Suggestions introducing unbacked numbers or claims must be marked 'Needs a human look' with no rewrite."""
    evidence_ctx = {
        "clauses": [{"clause_number": "3.4", "title": "Superlative claims", "severity": "critical"}],
        "facts": [{"fact_code": "F-12", "statement": "Made with 5 whole millets", "is_expired": False}],
        "terminology": []
    }
    engine = DeterministicEngine(evidence_ctx)
    content = "Our cereal is tasty."

    findings = [
        {
            "title": "Unverified claim",
            "original_text": "tasty",
            "clause_number": "3.4",
            "suggested_correction": "Ranked #1 in India"  # Unbacked ranking
        },
        {
            "title": "Numerical claim",
            "original_text": "tasty",
            "clause_number": "3.4",
            "suggested_correction": "Contains 10 different superfoods"  # Unbacked number 10
        },
        {
            "title": "Valid claim",
            "original_text": "tasty",
            "clause_number": "3.4",
            "suggested_correction": "Made with 5 whole millets"  # Backed by F-12
        }
    ]

    checked = pre_check_suggestions(findings, content, evidence_ctx, engine)

    # First finding must be withheld
    assert checked[0]["suggested_correction"] is None
    assert checked[0]["needs_human_look"] is True
    assert "Needs a human look" in checked[0]["title"]

    # Second finding must be withheld
    assert checked[1]["suggested_correction"] is None
    assert checked[1]["needs_human_look"] is True

    # Third finding is backed by Fact F-12 and must be retained
    assert checked[2]["suggested_correction"] == "Made with 5 whole millets"
    assert checked[2].get("needs_human_look") is not True

# --- 2. Finish Reject and Edit Tests ---

def test_reject_finding_requires_reason(creator_auth):
    """Rejecting a finding without a reason must fail with HTTP 400. With a reason it must persist."""
    sub_res = client.post("/api/reviews/submit", json={
        "title": "Reject Reason Test",
        "content": "Nila Millet-Mix is great."
    }, headers=creator_auth)
    review_id = sub_res.json()["id"]
    finding_id = sub_res.json()["findings"][0]["id"]

    # 1. Attempt reject with no reason
    bad_rej = client.post(
        f"/api/reviews/{review_id}/findings/{finding_id}/action",
        json={"action": "reject"},
        headers=creator_auth
    )
    assert bad_rej.status_code == 400
    assert "requires a reason" in bad_rej.json()["error"]["message"].lower()

    # 2. Reject with reason and note
    good_rej = client.post(
        f"/api/reviews/{review_id}/findings/{finding_id}/action",
        json={
            "action": "reject",
            "reject_reason": "Contextually permitted",
            "reject_note": "Approved in legacy packaging run."
        },
        headers=creator_auth
    )
    assert good_rej.status_code == 200
    rej_finding = [f for f in good_rej.json()["findings"] if f["id"] == finding_id][0]
    assert rej_finding["decision_status"] == "rejected"
    assert rej_finding["reject_reason"] == "Contextually permitted"
    assert rej_finding["reject_note"] == "Approved in legacy packaging run."

def test_edit_finding_re_verifies_before_accepting(creator_auth):
    """Custom edits must be re-verified against brand rules before acceptance."""
    sub_res = client.post("/api/reviews/submit", json={
        "title": "Edit Verification Test",
        "content": "Nila Millet-Mix is great."
    }, headers=creator_auth)
    review_id = sub_res.json()["id"]
    finding_id = sub_res.json()["findings"][0]["id"]

    # 1. Edit that still contains prohibited terminology
    bad_edit = client.post(
        f"/api/reviews/{review_id}/findings/{finding_id}/action",
        json={
            "action": "edit",
            "edited_text": "Millet-Mix brand"
        },
        headers=creator_auth
    )
    assert bad_edit.status_code == 400
    assert "failed brand verification" in bad_edit.json()["error"]["message"].lower()

    # 2. Clean compliant edit
    good_edit = client.post(
        f"/api/reviews/{review_id}/findings/{finding_id}/action",
        json={
            "action": "edit",
            "edited_text": "Nila Millet Mix"
        },
        headers=creator_auth
    )
    assert good_edit.status_code == 200
    updated_review = good_edit.json()
    assert "Nila Millet Mix is great." in updated_review["current_content"]
    assert len(updated_review["revisions"]) >= 2

# --- 3. Comments and Ask Manager Thread Tests ---

def test_comments_and_ask_manager_thread(creator_auth):
    """Comments tied to a finding and 'Ask manager' thread creation must update review status and activity feed."""
    sub_res = client.post("/api/reviews/submit", json={
        "title": "Comment Thread Test",
        "content": "Nila Millet-Mix is great."
    }, headers=creator_auth)
    review_id = sub_res.json()["id"]
    finding_id = sub_res.json()["findings"][0]["id"]

    # 1. Add finding-specific comment
    comm_res = client.post(
        f"/api/reviews/{review_id}/comments",
        json={
            "message": "Can we double-check if this packaging run is exempt?",
            "finding_id": finding_id,
            "comment_type": "finding"
        },
        headers=creator_auth
    )
    assert comm_res.status_code == 200
    comm_data = comm_res.json()
    assert comm_data["finding_id"] == finding_id
    assert comm_data["comment_type"] == "finding"
    assert comm_data["user_name"] == "Arjun Mehta"

    # 2. Create 'Ask Manager' thread
    ask_res = client.post(
        f"/api/reviews/{review_id}/comments",
        json={
            "message": "Manager review required: need clause override approval.",
            "finding_id": finding_id,
            "comment_type": "ask_manager"
        },
        headers=creator_auth
    )
    assert ask_res.status_code == 200
    ask_data = ask_res.json()
    assert ask_data["comment_type"] == "ask_manager"

    # Verify review flagged for human attention
    rev_res = client.get(f"/api/reviews/{review_id}", headers=creator_auth)
    assert rev_res.json()["requires_human_attention"] is True
    assert len(rev_res.json()["comments"]) >= 2

# --- 4. AI Path & Fabricated Citation Dropping Tests ---

def test_ai_path_drops_fabricated_clause_and_quote(creator_auth):
    """
    Independent Verifier must drop AI findings citing fabricated clauses (Clause 99.9)
    or quotes that do not exist verbatim in the text ('No citation, no flag').
    """
    mock_ai_output = {
        "ai_active": True,
        "ai_unavailable": False,
        "provider": "gemini-mock",
        "findings": [
            # 1. Valid AI finding (Clause 4.1 exists, text exists)
            {
                "title": "AI: Prohibited Terminology",
                "original_text": "Millet-Mix",
                "clause_number": "4.1",
                "fact_code": None,
                "severity": "critical",
                "explanation": "AI flagged prohibited terminology.",
                "suggested_correction": "Nila Millet Mix",
                "confidence": 0.95
            },
            # 2. Deliberately fabricated clause (Clause 99.9 does NOT exist in Nila Foods)
            {
                "title": "Hallucinated Clause Violation",
                "original_text": "Millet-Mix",
                "clause_number": "99.9",
                "fact_code": None,
                "severity": "critical",
                "explanation": "Fabricated clause citation from hallucinated LLM.",
                "suggested_correction": "safe",
                "confidence": 0.99
            },
            # 3. Deliberately fabricated quote (Phantom text not in submitted content)
            {
                "title": "Hallucinated Quote Violation",
                "original_text": "100% organic golden wheat from Himalayas",
                "clause_number": "3.4",
                "fact_code": None,
                "severity": "critical",
                "explanation": "LLM hallucinated text not present in input.",
                "suggested_correction": "safe",
                "confidence": 0.99
            }
        ]
    }

    with patch("backend.engine.ai_review_engine.AIReviewEngine.analyze", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = mock_ai_output

        sub_res = client.post("/api/reviews/submit", json={
            "title": "AI Verifier Test",
            "content": "Nila Millet-Mix is great."
        }, headers=creator_auth)
        assert sub_res.status_code == 200
        findings = sub_res.json()["findings"]

        # Ensure fabricated clause 99.9 is DROPPED by verifier
        assert not any(f.get("clause_number") == "99.9" for f in findings)

        # Ensure fabricated quote is DROPPED by verifier
        assert not any("Himalayas" in f.get("original_text", "") for f in findings)

        # Ensure valid finding exists and is labeled
        assert any(f.get("clause_number") == "4.1" for f in findings)
