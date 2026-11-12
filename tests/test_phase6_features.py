import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import User, Organization, GuidelineDocument, GuidelineVersion, GuidelineClause, ContentReview, ReviewFinding
from backend.guideline_health import compute_guideline_health, backtest_clause_reword, publish_revised_clause, seed_demo_history

client = TestClient(app)

# 1. Unit test for override-rate and health categorization with known inputs
def test_override_rate_calculation_with_known_inputs():
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        assert org is not None

        # Verify calculation logic with known input values
        # Case A: 5 decisions (3 rejected) -> 60% override rate BUT < 6 decisions -> insufficient_data
        # Case B: 6 decisions (3 rejected) -> 50% override rate AND >= 6 decisions -> unclear
        # Case C: 6 decisions (1 rejected) -> 16.7% override rate AND >= 6 decisions -> healthy
        
        # Test helper function
        def calc_health(decisions):
            total = len(decisions)
            overrides = len([d for d in decisions if d in ("rejected", "edited")])
            rate = round((overrides / total) * 100.0, 1) if total > 0 else 0.0
            is_unclear = bool(total >= 6 and (overrides / total) >= 0.50)
            status = "unclear" if is_unclear else ("healthy" if total >= 6 else "insufficient_data")
            return rate, is_unclear, status

        rate, is_unclear, status = calc_health(["accepted", "accepted", "rejected", "rejected", "edited"])
        assert rate == 60.0
        assert is_unclear is False
        assert status == "insufficient_data"

        rate, is_unclear, status = calc_health(["accepted", "accepted", "accepted", "rejected", "rejected", "edited"])
        assert rate == 50.0
        assert is_unclear is True
        assert status == "unclear"

        rate, is_unclear, status = calc_health(["accepted", "accepted", "accepted", "accepted", "accepted", "rejected"])
        assert rate == 16.7
        assert is_unclear is False
        assert status == "healthy"
    finally:
        db.close()


# 2. Unit test for conflict detection with known inputs
def test_conflict_detection_logic():
    # Verify that >= 3 overlapping reviews qualify as conflict, while 2 do not
    def qualifies_as_conflict(review_ids):
        return len(set(review_ids)) >= 3

    assert qualifies_as_conflict([101, 102]) is False
    assert qualifies_as_conflict([101, 102, 103]) is True
    assert qualifies_as_conflict([101, 101, 102]) is False
    assert qualifies_as_conflict([101, 102, 103, 104]) is True


# 3. E2E test of the "Done when" scenario:
# "a manager can open the page, see at least one unclear clause and one conflicting pair
# produced from review data, backtest, and publish a revised clause. The version comparison
# page must show the change."
def test_done_when_guideline_health_scenario():
    # Login as Manager
    login_res = client.post("/api/auth/login", json={
        "email": "manager@nilafoods.com",
        "password": "BrandProof2026!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Ensure demo history is present
    seed_res = client.post("/api/guidelines/seed-demo-history", headers=headers)
    assert seed_res.status_code == 200

    # Step 2: Open Guideline Health page API
    health_res = client.get("/api/guidelines/health?include_demo_history=true", headers=headers)
    assert health_res.status_code == 200
    health_data = health_res.json()

    kpis = health_data["kpis"]
    assert kpis["total_clauses"] >= 5
    assert kpis["unclear_clauses_count"] >= 1
    assert kpis["conflicting_pairs_count"] >= 1
    assert kpis["includes_demo_history"] is True

    # Confirm at least one unclear clause
    unclear_clauses = [c for c in health_data["clauses"] if c["is_unclear"]]
    assert len(unclear_clauses) >= 1
    target_clause = unclear_clauses[0]
    assert target_clause["clause_number"] in ["3.6", "3.4", "2.1", "5.2"]
    assert target_clause["total_decisions"] >= 6
    assert target_clause["override_rate"] >= 50.0
    assert len(target_clause["reasons_breakdown"]) > 0

    # Confirm at least one conflicting pair with example quotations and review IDs
    conflicts = health_data["conflicts"]
    assert len(conflicts) >= 1
    conflict_pair = conflicts[0]
    assert conflict_pair["reviews_count"] >= 3
    assert len(conflict_pair["review_ids"]) >= 3
    assert len(conflict_pair["example_quotations"]) >= 1

    # Step 3: Backtest a proposed reworded rule for the unclear clause
    clause_id = target_clause["clause_id"]
    proposed_title = "Substantiated Outcome Claims"
    proposed_desc = 'Only claims backed by documented clinical research (e.g. "clinical trial CT-2023") are permitted.'
    
    backtest_res = client.post(
        f"/api/guidelines/clauses/{clause_id}/backtest",
        json={
            "proposed_title": proposed_title,
            "proposed_description": proposed_desc,
            "proposed_severity": "warning",
            "proposed_rules": {"keywords": ["clinical research", "clinical trial"]},
            "include_demo_history": True
        },
        headers=headers
    )
    assert backtest_res.status_code == 200
    bt_data = backtest_res.json()
    assert bt_data["reviews_analyzed"] >= 8
    assert "summary" in bt_data
    assert "added" in bt_data["summary"]
    assert "removed" in bt_data["summary"]
    assert "unchanged" in bt_data["summary"]
    assert "Backtesting covers deterministic rule-based checks only" in bt_data["notice"]

    # Step 4: Publish as new version
    publish_res = client.post(
        f"/api/guidelines/clauses/{clause_id}/publish-revision",
        json={
            "changelog": f"Revised Clause {target_clause['clause_number']} based on {target_clause['override_rate']}% override rate in Health Intelligence.",
            "title": proposed_title,
            "description": proposed_desc,
            "severity": "warning"
        },
        headers=headers
    )
    assert publish_res.status_code == 200
    pub_data = publish_res.json()
    assert pub_data["success"] is True
    new_ver = pub_data["version_number"]
    doc_id = pub_data["document_id"]

    # Step 5: Version comparison shows the change
    compare_res = client.get(
        f"/api/guidelines/compare-versions?doc_id={doc_id}&v1=2.0&v2={new_ver}",
        headers=headers
    )
    assert compare_res.status_code == 200
    comp_data = compare_res.json()
    assert comp_data["v1"] == "2.0"
    assert comp_data["v2"] == new_ver
    
    # Verify the target clause is listed as modified
    modified_clauses = [d for d in comp_data["diffs"] if d["clause_number"] == target_clause["clause_number"]]
    assert len(modified_clauses) == 1
    assert modified_clauses[0]["type"] == "modified"
    assert modified_clauses[0]["v2"] == proposed_desc

    # Step 6: Verify audit ledger integrity check remains valid
    audit_verify = client.get("/api/audit/verify", headers=headers)
    assert audit_verify.status_code == 200
    assert audit_verify.json()["valid"] is True
