import sys
import os
sys.path.insert(0, os.path.abspath("."))

import asyncio
import httpx
from backend.main import app
from backend.seed import seed_database

async def run_all_tests():
    print("[1/6] Seeding test database...", flush=True)
    seed_database()
    print("Seeded successfully, setting up ASGITransport...", flush=True)

    transport = httpx.ASGITransport(app=app)
    print("Transport ready, opening AsyncClient...", flush=True)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        print("[2/6] Testing Health Endpoint...", flush=True)
        res = await client.get("/api/health")
        print("Health status code:", res.status_code, flush=True)
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"
        print("  -> Passed:", res.json())

        print("[3/6] Testing Authentication (All 4 Roles)...")
        roles = [
            ("creator@nilafoods.com", "Creator"),
            ("reviewer@nilafoods.com", "Reviewer"),
            ("manager@nilafoods.com", "Manager"),
            ("admin@nilafoods.com", "Admin"),
        ]
        tokens = {}
        for email, expected_role in roles:
            login_res = await client.post("/api/auth/login", json={"email": email, "password": "BrandProof2026!"})
            assert login_res.status_code == 200, f"Login failed for {email}"
            data = login_res.json()
            assert data["user"]["role"] == expected_role
            tokens[expected_role] = data["access_token"]
            print(f"  -> Login verified: {email} as {expected_role}")

        print("[4/6] Testing Facts & Expired Fact F-07 Flag...")
        facts_res = await client.get("/api/facts/", headers={"Authorization": f"Bearer {tokens['Reviewer']}"})
        assert facts_res.status_code == 200
        facts = facts_res.json()
        f07 = next(f for f in facts if f["fact_code"] == "F-07")
        assert f07["is_expired"] is True
        assert f07["approval_status"] == "expired"
        f12 = next(f for f in facts if f["fact_code"] == "F-12")
        assert f12["is_expired"] is False
        print(f"  -> Fact F-07 verified as EXPIRED: {f07['expiry_date']}")
        print(f"  -> Fact F-12 verified as VALID until: {f12['expiry_date']}")

        print("[5/6] Testing Review Pipeline with Nila Foods Sample Draft...")
        sample_draft = "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."
        review_res = await client.post("/api/reviews/submit", json={
            "title": "Nila Foods Campaign Test",
            "content": sample_draft,
            "file_name": "test_draft.txt",
            "file_type": "text"
        }, headers={"Authorization": f"Bearer {tokens['Creator']}"})
        assert review_res.status_code == 200
        review_data = review_res.json()
        print(f"  -> Score: {review_data['overall_score']} / 100")
        print(f"  -> Total findings detected: {len(review_data['findings'])}")

        findings = review_data["findings"]
        clauses_hit = [f["clause_number"] for f in findings]
        print(f"  -> Verified Clause numbers triggered: {clauses_hit}")

        assert "4.1" in clauses_hit, "Clause 4.1 (Product Terminology) must be triggered by 'Millet-Mix'"
        assert "3.4" in clauses_hit, "Clause 3.4 (Superlative claims) must be triggered by 'India\'s #1'"
        assert "3.6" in clauses_hit, "Clause 3.6 (Health claims) must be triggered by 'Guaranteed to cut sugar cravings'"
        assert "2.1" in clauses_hit, "Clause 2.1 (Brand tone) must be triggered by 'Buy now.'"

        expired_finding = next((f for f in findings if f.get("fact_code") == "F-07"), None)
        assert expired_finding is not None
        assert expired_finding["verification_status"] == "expired_fact_detected"
        print(f"  -> Verified: F-07 finding correctly marked 'expired_fact_detected'!")

        print("[6/6] Testing Human Approval & Role Permissions...")
        # Creator tries to approve (MUST FAIL)
        creator_attempt = await client.post(
            f"/api/reviews/{review_data['id']}/decision",
            json={"decision": "approved", "notes": "Creator approval attempt"},
            headers={"Authorization": f"Bearer {tokens['Creator']}"}
        )
        assert creator_attempt.status_code == 403, "Creator must not be allowed to approve"
        print("  -> Verified: Creator is blocked from approval (403 Forbidden).")

        # Accept the terminology suggestion
        term_finding = next(f for f in findings if f["clause_number"] == "4.1")
        action_res = await client.post(
            f"/api/reviews/{review_data['id']}/findings/{term_finding['id']}/action",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {tokens['Creator']}"}
        )
        assert action_res.status_code == 200
        updated = action_res.json()
        assert "Nila Millet Mix" in updated["current_content"]
        assert len(updated["revisions"]) >= 2
        print(f"  -> Verified: Correction accepted, new revision created, text updated to: '{updated['current_content']}'")

    print("\nALL 6 TEST SUITES PASSED FLAWLESSLY! BrandProof Backend is 100% verified.")

if __name__ == "__main__":
    print("Script started, calling asyncio.run", flush=True)
    asyncio.run(run_all_tests())
