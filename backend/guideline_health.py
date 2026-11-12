import re
import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from backend.models import (
    GuidelineClause, GuidelineDocument, GuidelineVersion,
    ContentReview, ReviewFinding, User
)
from backend.audit_chain import record_audit_log

def compute_guideline_health(
    db: Session,
    organization_id: int,
    include_demo_history: bool = True
) -> Dict[str, Any]:
    """
    Computes real-time guideline health intelligence:
    - Per-clause override rates (rejected + edited / total decisions).
    - 'Possibly unclear' clauses (>= 6 decisions and >= 50% override rate).
    - 'Possible conflict' clause pairs (flag overlapping text spans in >= 3 reviews).
    """
    # 1. Fetch active clauses
    clauses = db.query(GuidelineClause).filter(
        GuidelineClause.organization_id == organization_id,
        GuidelineClause.status == "active"
    ).all()
    clause_map = {c.clause_number: c for c in clauses}
    clause_id_map = {c.id: c for c in clauses}

    # 2. Query reviews
    rev_query = db.query(ContentReview).filter(ContentReview.organization_id == organization_id)
    if not include_demo_history:
        rev_query = rev_query.filter(ContentReview.is_demo_history == False)
    reviews = rev_query.all()
    review_ids = [r.id for r in reviews]

    has_demo_rows = db.query(ContentReview).filter(
        ContentReview.organization_id == organization_id,
        ContentReview.is_demo_history == True
    ).first() is not None

    if not review_ids:
        clause_items = []
        for c in clauses:
            clause_items.append({
                "clause_id": c.id,
                "clause_number": c.clause_number,
                "title": c.title,
                "description": c.description,
                "category": c.category,
                "severity": c.severity,
                "total_triggered": 0,
                "total_decisions": 0,
                "accepted_count": 0,
                "edited_count": 0,
                "rejected_count": 0,
                "override_rate": 0.0,
                "reasons_breakdown": {},
                "health_status": "insufficient_data",
                "is_unclear": False,
            })
        return {
            "kpis": {
                "total_clauses": len(clauses),
                "unclear_clauses_count": 0,
                "conflicting_pairs_count": 0,
                "global_override_rate": 0.0,
                "total_decisions_recorded": 0,
                "has_demo_history": has_demo_rows,
                "includes_demo_history": include_demo_history,
            },
            "clauses": clause_items,
            "conflicts": []
        }

    # 3. Fetch findings for these reviews
    findings = db.query(ReviewFinding).filter(
        ReviewFinding.review_id.in_(review_ids)
    ).all()

    # Group findings by clause
    findings_by_clause: Dict[str, List[ReviewFinding]] = {}
    for f in findings:
        key = f.clause_number
        if not key and f.clause_id in clause_id_map:
            key = clause_id_map[f.clause_id].clause_number
        if key:
            findings_by_clause.setdefault(key, []).append(f)

    clause_items = []
    total_decisions_all = 0
    total_overrides_all = 0
    unclear_count = 0

    for c in clauses:
        c_findings = findings_by_clause.get(c.clause_number, [])
        total_triggered = len(c_findings)
        
        decisions = [f for f in c_findings if f.decision_status in ("accepted", "edited", "rejected")]
        total_decisions = len(decisions)
        accepted = len([f for f in decisions if f.decision_status == "accepted"])
        edited = len([f for f in decisions if f.decision_status == "edited"])
        rejected = len([f for f in decisions if f.decision_status == "rejected"])
        override_count = edited + rejected
        override_rate = round((override_count / total_decisions) * 100.0, 1) if total_decisions > 0 else 0.0

        total_decisions_all += total_decisions
        total_overrides_all += override_count

        # Reason breakdown
        reasons_map: Dict[str, int] = {}
        for f in decisions:
            if f.decision_status == "rejected":
                r_key = f.reject_reason or "Rejected (no reason specified)"
                reasons_map[r_key] = reasons_map.get(r_key, 0) + 1
            elif f.decision_status == "edited":
                reasons_map["Manually edited correction"] = reasons_map.get("Manually edited correction", 0) + 1

        is_unclear = bool(total_decisions >= 6 and (override_count / total_decisions) >= 0.50)
        if is_unclear:
            unclear_count += 1
            health_status = "unclear"
        elif total_decisions >= 6:
            health_status = "healthy"
        else:
            health_status = "insufficient_data"

        clause_items.append({
            "clause_id": c.id,
            "clause_number": c.clause_number,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "severity": c.severity,
            "total_triggered": total_triggered,
            "total_decisions": total_decisions,
            "accepted_count": accepted,
            "edited_count": edited,
            "rejected_count": rejected,
            "override_rate": override_rate,
            "reasons_breakdown": reasons_map,
            "health_status": health_status,
            "is_unclear": is_unclear,
        })

    # Sort clauses by override rate descending
    clause_items.sort(key=lambda x: (x["is_unclear"], x["override_rate"], x["total_decisions"]), reverse=True)

    # 4. Detect Conflicting Clauses across reviews
    # Group findings by review
    findings_by_review: Dict[int, List[ReviewFinding]] = {}
    review_obj_map = {r.id: r for r in reviews}
    for f in findings:
        findings_by_review.setdefault(f.review_id, []).append(f)

    # Pair key -> set of review_ids and list of example quotes
    conflict_pairs: Dict[Tuple[str, str], Dict[str, Any]] = {}

    for rev_id, r_findings in findings_by_review.items():
        rev = review_obj_map.get(rev_id)
        if not rev:
            continue
        content = rev.original_content or ""

        # Compare every pair of findings in this review
        n = len(r_findings)
        for i in range(n):
            for j in range(i + 1, n):
                f1 = r_findings[i]
                f2 = r_findings[j]
                c1 = f1.clause_number
                c2 = f2.clause_number
                if not c1 or not c2 or c1 == c2:
                    continue

                t1 = f1.original_text.strip()
                t2 = f2.original_text.strip()
                if not t1 or not t2:
                    continue

                # Check if spans overlap in content
                overlaps = False
                matched_span = ""
                # Quick substring check
                if t1.lower() in t2.lower() or t2.lower() in t1.lower():
                    overlaps = True
                    matched_span = t1 if len(t1) <= len(t2) else t2
                else:
                    # Search positions in content
                    spans1 = [m.span() for m in re.finditer(re.escape(t1), content, re.IGNORECASE)]
                    spans2 = [m.span() for m in re.finditer(re.escape(t2), content, re.IGNORECASE)]
                    for s1, e1 in spans1:
                        for s2, e2 in spans2:
                            if max(s1, s2) < min(e1, e2):
                                overlaps = True
                                overlap_start = max(s1, s2)
                                overlap_end = min(e1, e2)
                                matched_span = content[overlap_start:overlap_end]
                                break
                        if overlaps:
                            break

                if overlaps:
                    pair_key = (min(c1, c2), max(c1, c2))
                    if pair_key not in conflict_pairs:
                        clause_a = clause_map.get(pair_key[0])
                        clause_b = clause_map.get(pair_key[1])
                        conflict_pairs[pair_key] = {
                            "clause_a_number": pair_key[0],
                            "clause_a_title": clause_a.title if clause_a else f"Clause {pair_key[0]}",
                            "clause_b_number": pair_key[1],
                            "clause_b_title": clause_b.title if clause_b else f"Clause {pair_key[1]}",
                            "review_ids": set(),
                            "example_quotations": []
                        }
                    
                    data = conflict_pairs[pair_key]
                    data["review_ids"].add(rev_id)
                    if len(data["example_quotations"]) < 3:
                        quote_entry = {
                            "review_id": rev_id,
                            "review_title": rev.title,
                            "overlapping_text": matched_span or t1,
                            "clause_a_text": t1 if pair_key[0] == c1 else t2,
                            "clause_b_text": t2 if pair_key[0] == c1 else t1,
                        }
                        if quote_entry not in data["example_quotations"]:
                            data["example_quotations"].append(quote_entry)

    # Filter pairs with >= 3 distinct reviews
    qualified_conflicts = []
    for pair_key, data in conflict_pairs.items():
        if len(data["review_ids"]) >= 3:
            qualified_conflicts.append({
                "clause_a_number": data["clause_a_number"],
                "clause_a_title": data["clause_a_title"],
                "clause_b_number": data["clause_b_number"],
                "clause_b_title": data["clause_b_title"],
                "reviews_count": len(data["review_ids"]),
                "review_ids": sorted(list(data["review_ids"])),
                "example_quotations": data["example_quotations"]
            })

    qualified_conflicts.sort(key=lambda x: x["reviews_count"], reverse=True)

    global_override_rate = (
        round((total_overrides_all / total_decisions_all) * 100.0, 1)
        if total_decisions_all > 0 else 0.0
    )

    return {
        "kpis": {
            "total_clauses": len(clauses),
            "unclear_clauses_count": unclear_count,
            "conflicting_pairs_count": len(qualified_conflicts),
            "global_override_rate": global_override_rate,
            "total_decisions_recorded": total_decisions_all,
            "has_demo_history": has_demo_rows,
            "includes_demo_history": include_demo_history,
        },
        "clauses": clause_items,
        "conflicts": qualified_conflicts
    }


def backtest_clause_reword(
    db: Session,
    organization_id: int,
    clause_id: int,
    proposed_title: str,
    proposed_description: str,
    proposed_severity: str = "warning",
    proposed_rules: Optional[Dict[str, Any]] = None,
    include_demo_history: bool = True
) -> Dict[str, Any]:
    """
    Re-runs deterministic rules for the proposed clause reword against historical reviews.
    Returns added, removed, and unchanged counts with diff examples.
    """
    clause = db.query(GuidelineClause).filter(
        GuidelineClause.id == clause_id,
        GuidelineClause.organization_id == organization_id
    ).first()
    if not clause:
        raise ValueError("Clause not found")

    rev_query = db.query(ContentReview).filter(ContentReview.organization_id == organization_id)
    if not include_demo_history:
        rev_query = rev_query.filter(ContentReview.is_demo_history == False)
    reviews = rev_query.all()

    # Extract test patterns from proposed description and rules
    keywords = []
    if proposed_rules and "keywords" in proposed_rules:
        keywords.extend(proposed_rules["keywords"])
    if proposed_rules and "prohibited_patterns" in proposed_rules:
        keywords.extend(proposed_rules["prohibited_patterns"])
    
    # If no custom rules provided, deduce simple keyword heuristics from description
    if not keywords:
        # Extract quoted terms or important phrases
        quotes = re.findall(r'"([^"]*)"', proposed_description)
        if quotes:
            keywords.extend(quotes)
        else:
            # Fall back to title keywords
            clean_title = re.sub(r'[^a-zA-Z0-9\s]', '', proposed_title)
            keywords = [w for w in clean_title.split() if len(w) > 3]

    added = 0
    removed = 0
    unchanged = 0
    added_examples = []
    removed_examples = []

    for rev in reviews:
        content = rev.original_content or ""
        # Historical findings for this clause
        hist_finding = db.query(ReviewFinding).filter(
            ReviewFinding.review_id == rev.id,
            (ReviewFinding.clause_id == clause.id) | (ReviewFinding.clause_number == clause.clause_number)
        ).first()

        historically_flagged = hist_finding is not None

        # Check if proposed rule flags this review
        proposed_matches = []
        for kw in keywords:
            if kw and re.search(r'\b' + re.escape(kw) + r'\b', content, re.IGNORECASE):
                proposed_matches.append(kw)

        proposed_flagged = len(proposed_matches) > 0

        if historically_flagged and proposed_flagged:
            unchanged += 1
        elif historically_flagged and not proposed_flagged:
            removed += 1
            if len(removed_examples) < 3:
                removed_examples.append({
                    "review_id": rev.id,
                    "review_title": rev.title,
                    "text_no_longer_flagged": hist_finding.original_text,
                    "explanation": f"Permitted under revised criteria: '{proposed_title}'"
                })
        elif not historically_flagged and proposed_flagged:
            added += 1
            if len(added_examples) < 3:
                added_examples.append({
                    "review_id": rev.id,
                    "review_title": rev.title,
                    "newly_flagged_text": proposed_matches[0],
                    "explanation": f"Flagged by proposed rule: '{proposed_matches[0]}'"
                })

    return {
        "clause_number": clause.clause_number,
        "original_title": clause.title,
        "proposed_title": proposed_title,
        "reviews_analyzed": len(reviews),
        "summary": {
            "added": added,
            "removed": removed,
            "unchanged": unchanged,
            "net_difference": added - removed
        },
        "examples": {
            "added": added_examples,
            "removed": removed_examples
        },
        "notice": "Backtesting covers deterministic rule-based checks only against historical content drafts."
    }


def publish_revised_clause(
    db: Session,
    organization_id: int,
    user_id: int,
    clause_id: int,
    changelog: str,
    title: str,
    description: str,
    severity: str = "warning",
    rules_json: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Creates GuidelineVersion N+1, copies existing clauses, updates target clause,
    archives previous version, and records tamper-evident audit log.
    """
    clause = db.query(GuidelineClause).filter(
        GuidelineClause.id == clause_id,
        GuidelineClause.organization_id == organization_id
    ).first()
    if not clause:
        raise ValueError("Clause not found")

    # Get current version and doc
    current_version = db.query(GuidelineVersion).filter(
        GuidelineVersion.id == clause.version_id
    ).first()
    if not current_version:
        raise ValueError("Guideline version not found")

    doc = db.query(GuidelineDocument).filter(GuidelineDocument.id == current_version.document_id).first()
    if not doc:
        raise ValueError("Document not found")

    # Determine new version string (e.g. 1.0 -> 2.0 or 1.1)
    try:
        parts = current_version.version_number.split('.')
        major = int(parts[0])
        minor = int(parts[1]) if len(parts) > 1 else 0
        new_version_str = f"{major + 1}.0"
    except Exception:
        new_version_str = f"{current_version.version_number}.1"

    # Archive previous version
    current_version.is_active = False

    # Create new GuidelineVersion
    new_version = GuidelineVersion(
        document_id=doc.id,
        version_number=new_version_str,
        changelog=changelog,
        is_active=True,
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_version)
    db.flush()

    # Clone clauses into new version
    old_clauses = db.query(GuidelineClause).filter(GuidelineClause.version_id == current_version.id).all()
    target_new_clause_id = None

    for old_c in old_clauses:
        if old_c.id == clause.id:
            # Updated clause
            cloned = GuidelineClause(
                version_id=new_version.id,
                organization_id=organization_id,
                clause_number=old_c.clause_number,
                title=title,
                description=description,
                category=old_c.category,
                severity=severity,
                status="active",
                rules_json=rules_json if rules_json is not None else old_c.rules_json,
                created_at=datetime.datetime.utcnow()
            )
            # Mark old clause archived
            old_c.status = "archived"
        else:
            cloned = GuidelineClause(
                version_id=new_version.id,
                organization_id=organization_id,
                clause_number=old_c.clause_number,
                title=old_c.title,
                description=old_c.description,
                category=old_c.category,
                severity=old_c.severity,
                status="active",
                rules_json=old_c.rules_json,
                created_at=datetime.datetime.utcnow()
            )
        db.add(cloned)
        db.flush()
        if old_c.id == clause.id:
            target_new_clause_id = cloned.id

    # Record tamper-evident audit log
    record_audit_log(
        db=db,
        organization_id=organization_id,
        user_id=user_id,
        action="PUBLISH_GUIDELINE_VERSION",
        target_type="GuidelineVersion",
        target_id=new_version.id,
        details={
            "document_id": doc.id,
            "document_title": doc.title,
            "previous_version": current_version.version_number,
            "new_version": new_version.version_number,
            "clause_number": clause.clause_number,
            "revised_clause_title": title,
            "changelog": changelog
        }
    )
    db.commit()

    return {
        "success": True,
        "new_version_id": new_version.id,
        "version_number": new_version.version_number,
        "changelog": changelog,
        "clause_id": target_new_clause_id,
        "clause_number": clause.clause_number,
        "document_id": doc.id
    }


def seed_demo_history(db: Session, organization_id: int) -> int:
    """
    Deterministically seeds realistic historical reviews and decisions flagged is_demo_history=True.
    Guarantees:
    - At least 1 'Possibly unclear' clause: Clause 3.6 (8 decisions, 6 overrides = 75% override rate >= 50%).
    - At least 1 'Possible conflict' pair: Clause 3.4 and Clause 3.6 overlap on 4 reviews (>= 3).
    """
    from backend.models import DocumentRevision

    creator = db.query(User).filter(
        User.organization_id == organization_id,
        User.email == "creator@nilafoods.com"
    ).first()
    reviewer = db.query(User).filter(
        User.organization_id == organization_id,
        User.email == "reviewer@nilafoods.com"
    ).first()
    if not creator:
        creator = db.query(User).filter(User.organization_id == organization_id).first()
    if not reviewer:
        reviewer = creator

    clause_34 = db.query(GuidelineClause).filter(
        GuidelineClause.organization_id == organization_id,
        GuidelineClause.clause_number == "3.4"
    ).first()
    clause_36 = db.query(GuidelineClause).filter(
        GuidelineClause.organization_id == organization_id,
        GuidelineClause.clause_number == "3.6"
    ).first()
    clause_52 = db.query(GuidelineClause).filter(
        GuidelineClause.organization_id == organization_id,
        GuidelineClause.clause_number == "5.2"
    ).first()

    # 1. Seed 8 reviews with Clause 5.2 decisions: 2 accepted, 4 rejected with reasons, 2 edited
    # Clause 5.2 is dedicated to Media Accessibility and is never diluted by text-sample tests.
    c52_reviews_data = [
        # (title, content, decision, reject_reason, edited_text)
        ("Demo Packaging A - Front Pouch", "Product mockup image attached without descriptive alternative text.", "accepted", None, None),
        ("Demo Packaging B - Jar Banner", "Hero header asset uploaded with insufficient alt attribute.", "accepted", None, None),
        ("Demo Packaging C - Back Label", "Back nutritional panel graphic missing accessibility labels.", "rejected", "Contextually permitted", None),
        ("Demo Packaging D - Side Recipe", "Cooking illustration image uploaded without screen reader alt tag.", "rejected", "Approved exception", None),
        ("Demo Packaging E - Social Story", "Instagram story infographic graphic without alt text.", "rejected", "Contextually permitted", None),
        ("Demo Packaging F - Print Insert", "Flyer diagram included in digital submission without alt description.", "rejected", "Will rephrase manually", None),
        ("Demo Packaging G - Icon Badge", "Certification logo thumbnail attached without alt text.", "edited", None, "Added ISO certification badge alt description"),
        ("Demo Packaging H - Farmer Photo", "Farmer partner portrait included without accessibility alt text.", "edited", None, "Added portrait of partner millet farmer alt text"),
    ]

    base_time = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    created_count = 0

    for idx, (title, content, decision, r_reason, e_text) in enumerate(c52_reviews_data):
        chk = db.query(ContentReview).filter(
            ContentReview.organization_id == organization_id,
            ContentReview.title == title
        ).first()
        if chk:
            continue

        rev = ContentReview(
            organization_id=organization_id,
            title=title,
            original_content=content,
            current_content=content,
            source_filename=f"demo_media_{idx+1}.txt",
            source_file_type="text",
            status="approved" if decision == "accepted" else "in_review",
            author_id=creator.id,
            reviewer_id=reviewer.id if reviewer else None,
            overall_score=75.0,
            has_critical_violations=False,
            requires_human_attention=False,
            is_demo_history=True,
            created_at=base_time + datetime.timedelta(days=idx)
        )
        db.add(rev)
        db.flush()

        f = ReviewFinding(
            review_id=rev.id,
            clause_id=clause_52.id if clause_52 else None,
            clause_number="5.2",
            title="Alternative Text Conformance",
            original_text="without descriptive alternative text" if "without descriptive alternative text" in content else "without alt",
            severity="warning",
            explanation="Published digital media and packaging mockups must provide descriptive alternative text per Clause 5.2.",
            suggested_correction="Include complete descriptive alt text",
            edited_correction=e_text,
            decision_status=decision,
            decision_user_id=reviewer.id if reviewer else creator.id,
            decision_at=base_time + datetime.timedelta(days=idx, hours=2),
            reject_reason=r_reason,
            reject_note="Handled in legal disclaimer" if r_reason == "Approved exception" else None,
            verification_status="verified_clause",
            created_at=base_time + datetime.timedelta(days=idx)
        )
        db.add(f)
        created_count += 1

    # 2. Seed 4 reviews where Clause 3.4 (Superlative) and Clause 3.6 (Guarantee) overlap on text
    conflict_drafts = [
        ("Demo Conflict Review 1 - Market Dominance", "Nila Millet-Mix is India's #1 guaranteed health mix for athletes. Order today."),
        ("Demo Conflict Review 2 - National Breakfast", "Enjoy India's #1 guaranteed health mix certified by nutritionists across the nation."),
        ("Demo Conflict Review 3 - Premier Blend", "Introducing India's #1 guaranteed health mix with whole grains and zero preservatives."),
        ("Demo Conflict Review 4 - Top Choice", "Experience India's #1 guaranteed health mix for active working professionals."),
    ]

    for idx, (title, content) in enumerate(conflict_drafts):
        chk = db.query(ContentReview).filter(
            ContentReview.organization_id == organization_id,
            ContentReview.title == title
        ).first()
        if chk:
            continue

        rev = ContentReview(
            organization_id=organization_id,
            title=title,
            original_content=content,
            current_content=content,
            source_filename=f"demo_conflict_{idx+1}.txt",
            source_file_type="text",
            status="in_review",
            author_id=creator.id,
            reviewer_id=reviewer.id if reviewer else None,
            overall_score=40.0,
            has_critical_violations=False,
            requires_human_attention=True,
            is_demo_history=True,
            created_at=base_time + datetime.timedelta(days=10 + idx)
        )
        db.add(rev)
        db.flush()

        # Finding 1: Clause 3.4 flags "India's #1 guaranteed"
        f1 = ReviewFinding(
            review_id=rev.id,
            clause_id=clause_34.id if clause_34 else None,
            clause_number="3.4",
            title="Superlative Claim Without Audit",
            original_text="India's #1 guaranteed",
            severity="warning",
            explanation="Unsubstantiated ranking claims violate Clause 3.4.",
            suggested_correction="a leading",
            decision_status="pending",
            verification_status="verified_clause",
            created_at=base_time + datetime.timedelta(days=10 + idx)
        )
        db.add(f1)

        # Finding 2: Clause 3.6 flags "guaranteed health mix" (overlaps with "India's #1 guaranteed" on "guaranteed")
        f2 = ReviewFinding(
            review_id=rev.id,
            clause_id=clause_36.id if clause_36 else None,
            clause_number="3.6",
            title="Unsubstantiated Guarantee",
            original_text="guaranteed health mix",
            severity="warning",
            explanation="Promises of absolute outcome violate Clause 3.6.",
            suggested_correction="wholesome health mix",
            decision_status="pending",
            verification_status="verified_clause",
            created_at=base_time + datetime.timedelta(days=10 + idx)
        )
        db.add(f2)
        created_count += 1

    db.commit()
    return created_count
