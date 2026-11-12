import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal, Base, engine
from backend.models import (
    Organization, User, GuidelineDocument, GuidelineVersion, GuidelineClause,
    ApprovedFact, Terminology, BrandAsset, ContentReview, DocumentRevision,
    ReviewFinding, ReviewComment, ApprovalDecision, AuditLog
)
from backend.auth import get_password_hash

def seed_database(db: Session = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    # Ensure tables exist on the active engine/bind
    target_bind = db.get_bind() if db is not None else engine
    Base.metadata.create_all(bind=target_bind)

    try:
        # Check if organization exists
        org = db.query(Organization).filter(Organization.slug == "nila-foods").first()
        if not org:
            org = Organization(
                name="Nila Foods",
                slug="nila-foods",
                description="Fictional demonstration workspace for healthy millet-based packaged foods and breakfast nutrition.",
                is_fictional_demo=True,
                created_at=datetime.datetime(2025, 1, 15, 10, 0)
            )
            db.add(org)
            db.commit()
            db.refresh(org)

        # Demo Users
        password_hash = get_password_hash("BrandProof2026!")
        users_data = [
            ("admin@nilafoods.com", "Priya Sharma", "Admin"),
            ("manager@nilafoods.com", "Vikram Patel", "Manager"),
            ("reviewer@nilafoods.com", "Ananya Deshmukh", "Reviewer"),
            ("creator@nilafoods.com", "Arjun Mehta", "Creator"),
        ]
        user_map = {}
        for email, full_name, role in users_data:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    organization_id=org.id,
                    email=email,
                    hashed_password=password_hash,
                    full_name=full_name,
                    role=role,
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            user_map[role] = user

        # Guideline Document & Clauses
        doc = db.query(GuidelineDocument).filter(
            GuidelineDocument.organization_id == org.id,
            GuidelineDocument.title == "Nila Foods Brand & Marketing Compliance Guidelines"
        ).first()

        if not doc:
            doc = GuidelineDocument(
                organization_id=org.id,
                title="Nila Foods Brand & Marketing Compliance Guidelines",
                category="Marketing & Communication",
                source_filename="Nila_Brand_Guidelines_v2.docx",
                file_type="docx",
                extracted_text="Brand governance guidelines governing claims, tone, and product names."
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

        # Version 2.0 (Active)
        ver = db.query(GuidelineVersion).filter(
            GuidelineVersion.document_id == doc.id,
            GuidelineVersion.version_number == "2.0"
        ).first()
        if not ver:
            ver = GuidelineVersion(
                document_id=doc.id,
                version_number="2.0",
                changelog="Updated claims compliance requirements and millet terminology rules.",
                is_active=True
            )
            db.add(ver)
            db.commit()
            db.refresh(ver)

        # Version 1.0 (Archived, for version comparison demo)
        ver_old = db.query(GuidelineVersion).filter(
            GuidelineVersion.document_id == doc.id,
            GuidelineVersion.version_number == "1.0"
        ).first()
        if not ver_old:
            ver_old = GuidelineVersion(
                document_id=doc.id,
                version_number="1.0",
                changelog="Initial release of brand voice standards.",
                is_active=False,
                created_at=datetime.datetime(2024, 6, 1)
            )
            db.add(ver_old)
            db.commit()

        # Clauses
        clauses_data = [
            {
                "clause_number": "2.1",
                "title": "Brand Tone & Consumer Respect",
                "description": "Brand communication must remain warm, grounded, authentic, and informative. High-pressure sales triggers, aggressive urgency (such as 'Buy now', 'Hurry', 'Act fast'), and artificial scarcity are strictly prohibited.",
                "category": "Brand Voice",
                "severity": "warning",
            },
            {
                "clause_number": "3.4",
                "title": "Superlative & Ranking Claims",
                "description": "Superlative claims (such as '#1', 'India\'s best', 'top-ranked') require current, independently verifiable third-party certification or retail audit data. If supporting evidence has expired or does not substantiate the claim, the statement must be rejected.",
                "category": "Claims & Advertising",
                "severity": "critical",
            },
            {
                "clause_number": "3.6",
                "title": "Health & Therapeutic Claims",
                "description": "Health guarantees or clinical therapeutic promises (e.g. 'Guaranteed to cut sugar cravings', 'cures fatigue') are strictly prohibited without licensed clinical certification. Product benefits must be framed around verifiable nutritional facts.",
                "category": "Health & Nutrition",
                "severity": "critical",
            },
            {
                "clause_number": "4.1",
                "title": "Product Terminology & Naming",
                "description": "The approved, registered trademarked product title is 'Nila Millet Mix'. Hyphenated forms such as 'Millet-Mix' or uncapitalized variants are brand compliance violations.",
                "category": "Terminology",
                "severity": "critical",
            },
            {
                "clause_number": "5.2",
                "title": "Accessibility and Media Alt Text",
                "description": "All published digital media, packaging mockups, and images must include clear, descriptive alternative text for screen readers and accessibility conformance.",
                "category": "Accessibility",
                "severity": "warning",
            },
        ]

        for c in clauses_data:
            existing_clause = db.query(GuidelineClause).filter(
                GuidelineClause.organization_id == org.id,
                GuidelineClause.clause_number == c["clause_number"],
                GuidelineClause.version_id == ver.id
            ).first()
            if not existing_clause:
                clause = GuidelineClause(
                    version_id=ver.id,
                    organization_id=org.id,
                    clause_number=c["clause_number"],
                    title=c["title"],
                    description=c["description"],
                    category=c["category"],
                    severity=c["severity"],
                    status="active"
                )
                db.add(clause)
        db.commit()

        # Approved Facts (F-07 Expired Dec 31 2025, F-12 Valid until Dec 2027)
        fact_f07 = db.query(ApprovedFact).filter(
            ApprovedFact.organization_id == org.id,
            ApprovedFact.fact_code == "F-07"
        ).first()

        if not fact_f07:
            f07 = ApprovedFact(
                organization_id=org.id,
                fact_code="F-07",
                statement="Top 3 in breakfast cereal category (Retail Audit 2024)",
                description="NielsenIQ Retail Audit 2024 ranked Nila Foods in the top 3 urban breakfast cereal segment.",
                source_evidence="NielsenIQ Retail Audit Report #NIQ-2024-CEREAL-Q3",
                responsible_owner="Market Intelligence Lead",
                approval_status="expired",
                effective_date=datetime.datetime(2024, 1, 1),
                expiry_date=datetime.datetime(2025, 12, 31, 23, 59, 59),  # Expired!
                last_verified_date=datetime.datetime(2025, 1, 10)
            )
            db.add(f07)

        fact_f12 = db.query(ApprovedFact).filter(
            ApprovedFact.organization_id == org.id,
            ApprovedFact.fact_code == "F-12"
        ).first()

        if not fact_f12:
            f12 = ApprovedFact(
                organization_id=org.id,
                fact_code="F-12",
                statement="Made with 5 whole millets (Foxtail, Ragi, Bajra, Jowar, Little Millet)",
                description="Certified formulation containing 100% whole grain millets sourced directly from organic farmer cooperatives.",
                source_evidence="Laboratory Formulation Certificate & Organic Board Cert #ORG-MIL-2025-089",
                responsible_owner="R&D Quality Director",
                approval_status="approved",
                effective_date=datetime.datetime(2025, 1, 1),
                expiry_date=datetime.datetime(2027, 12, 31, 23, 59, 59),  # Valid!
                last_verified_date=datetime.datetime(2026, 2, 1)
            )
            db.add(f12)

        # Additional approved fact
        fact_f15 = db.query(ApprovedFact).filter(
            ApprovedFact.organization_id == org.id,
            ApprovedFact.fact_code == "F-15"
        ).first()
        if not fact_f15:
            f15 = ApprovedFact(
                organization_id=org.id,
                fact_code="F-15",
                statement="Zero added refined white sugar",
                description="Naturally sweetened exclusively with sun-dried dates and palm jaggery.",
                source_evidence="Nutritional Lab Assay NABL Accr. Report #NUT-2025-442",
                responsible_owner="Nutrition Lead",
                approval_status="approved",
                effective_date=datetime.datetime(2025, 3, 1),
                expiry_date=datetime.datetime(2027, 6, 30),
                last_verified_date=datetime.datetime(2026, 1, 15)
            )
            db.add(f15)

        db.commit()

        # Terminology Rules
        term1 = db.query(Terminology).filter(
            Terminology.organization_id == org.id,
            Terminology.preferred_term == "Nila Millet Mix"
        ).first()
        if not term1:
            t1 = Terminology(
                organization_id=org.id,
                preferred_term="Nila Millet Mix",
                prohibited_term="Millet-Mix",
                incorrect_variations=["Millet-Mix", "millet mix", "Nila-Millet-Mix", "MilletMix"],
                approved_alternatives=["Nila Millet Mix", "Millet Mix breakfast blend"],
                case_sensitive=False,
                notes="Registered trademark requires capital Mix and single space separator."
            )
            db.add(t1)

        term2 = db.query(Terminology).filter(
            Terminology.organization_id == org.id,
            Terminology.preferred_term == "Whole Grain Millets"
        ).first()
        if not term2:
            t2 = Terminology(
                organization_id=org.id,
                preferred_term="Whole Grain Millets",
                prohibited_term="Processed Millets",
                incorrect_variations=["Millet flour blend", "Millet powder"],
                approved_alternatives=["Ancient Millets", "100% Whole Millets"],
                case_sensitive=False,
                notes="Emphasize whole grain integrity."
            )
            db.add(t2)
        db.commit()

        # Brand Assets
        asset1 = db.query(BrandAsset).filter(
            BrandAsset.organization_id == org.id,
            BrandAsset.title == "Nila Foods Primary Logo Mark"
        ).first()
        if not asset1:
            a1 = BrandAsset(
                organization_id=org.id,
                title="Nila Foods Primary Logo Mark",
                asset_type="logo",
                file_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
                alt_text="Official Nila Foods logo badge in forest green and harvest gold with single grain ear illustration",
                guidelines_notes="Minimum clear space 24px; never alter color spectrum or aspect ratio.",
                status="active"
            )
            db.add(a1)

        asset2 = db.query(BrandAsset).filter(
            BrandAsset.organization_id == org.id,
            BrandAsset.title == "Millet Mix 500g Packaging Mockup"
        ).first()
        if not asset2:
            a2 = BrandAsset(
                organization_id=org.id,
                title="Millet Mix 500g Packaging Mockup",
                asset_type="product_image",
                file_url="https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
                alt_text="Eco-friendly kraft pouch of Nila Millet Mix surrounded by raw whole grain ears",
                guidelines_notes="Must display organic certification seal prominently.",
                status="active"
            )
            db.add(a2)
        db.commit()

        # Fictional Demonstration Initial Content Review: Sample with violations
        review = db.query(ContentReview).filter(
            ContentReview.organization_id == org.id,
            ContentReview.title == "Q1 Millet-Mix Social Launch Campaign"
        ).first()

        sample_draft_text = "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."

        creator_user = user_map.get("Creator")
        reviewer_user = user_map.get("Reviewer")

        if not review and creator_user:
            review = ContentReview(
                organization_id=org.id,
                title="Q1 Millet-Mix Social Launch Campaign",
                original_content=sample_draft_text,
                current_content=sample_draft_text,
                source_filename="social_launch_draft_v1.txt",
                source_file_type="text",
                status="changes_requested",
                author_id=creator_user.id,
                reviewer_id=reviewer_user.id if reviewer_user else None,
                overall_score=39.0,
                has_critical_violations=True,
                requires_human_attention=True,
                review_notes="Automated review detected expired fact reference F-07 and unsupported health guarantee. Changes requested.",
                created_at=datetime.datetime(2026, 3, 2, 9, 30)
            )
            db.add(review)
            db.commit()
            db.refresh(review)

            # Revision 1
            rev1 = DocumentRevision(
                review_id=review.id,
                revision_number=1,
                content=sample_draft_text,
                diff_summary="Initial submission by creator.",
                change_type="submission",
                created_by_id=creator_user.id,
                created_at=datetime.datetime(2026, 3, 2, 9, 30)
            )
            db.add(rev1)

            # Seed findings for this sample
            clause_map = {c.clause_number: c.id for c in db.query(GuidelineClause).filter(GuidelineClause.organization_id == org.id).all()}
            fact_map = {f.fact_code: f.id for f in db.query(ApprovedFact).filter(ApprovedFact.organization_id == org.id).all()}

            f1 = ReviewFinding(
                review_id=review.id,
                clause_id=clause_map.get("4.1"),
                clause_number="4.1",
                fact_id=None,
                fact_code=None,
                title="Prohibited Terminology: 'Millet-Mix'",
                original_text="Millet-Mix",
                severity="critical",
                explanation="The term 'Millet-Mix' is prohibited. Approved brand terminology is 'Nila Millet Mix'.",
                suggested_correction="Nila Millet Mix",
                confidence=1.0,
                verification_status="verified_clause",
                evidence_source="Clause 4.1: Product Terminology — Preferred: 'Nila Millet Mix'",
                decision_status="pending"
            )

            f2 = ReviewFinding(
                review_id=review.id,
                clause_id=clause_map.get("3.4"),
                clause_number="3.4",
                fact_id=fact_map.get("F-07"),
                fact_code="F-07",
                title="Unsupported Ranking Claim & Expired Fact: 'India\'s #1'",
                original_text="India's #1",
                severity="critical",
                explanation="Ranking claim 'India\'s #1' relies on retail audit data. Fact F-07 ('Top 3 in breakfast cereal category') expired on 31 December 2025 and cannot be used as valid evidence. Clause 3.4 forbids ranking claims without current certification.",
                suggested_correction="a healthy breakfast",
                confidence=1.0,
                verification_status="expired_fact_detected",
                evidence_source="Clause 3.4 (Superlative claims) & Fact F-07 [Expired: 31 Dec 2025]",
                decision_status="pending"
            )

            f3 = ReviewFinding(
                review_id=review.id,
                clause_id=clause_map.get("3.6"),
                clause_number="3.6",
                fact_id=fact_map.get("F-12"),
                fact_code="F-12",
                title="Unverified Health Guarantee: 'Guaranteed to cut sugar cravings'",
                original_text="Guaranteed to cut sugar cravings",
                severity="critical",
                explanation="Health claim 'Guaranteed to cut sugar cravings' promises clinical physiological outcomes. Under Clause 3.6, therapeutic guarantees are prohibited. Replace with verified ingredient fact F-12 ('Made with 5 whole millets').",
                suggested_correction="made with 5 whole millets",
                confidence=1.0,
                verification_status="verified_clause",
                evidence_source="Clause 3.6: Health Claims",
                decision_status="pending"
            )

            f4 = ReviewFinding(
                review_id=review.id,
                clause_id=clause_map.get("2.1"),
                clause_number="2.1",
                fact_id=None,
                fact_code=None,
                title="Tone Inconsistency: Aggressive Sales Urgency 'Buy now.'",
                original_text="Buy now.",
                severity="warning",
                explanation="The urgency phrase 'Buy now.' conflicts with Brand Tone Guideline 2.1. Nila Foods communicates with warm, grounded consumer respect rather than aggressive sales pressure.",
                suggested_correction="Discover our blend.",
                confidence=0.92,
                verification_status="verified_clause",
                evidence_source="Clause 2.1: Brand Tone",
                decision_status="pending"
            )

            db.add_all([f1, f2, f3, f4])

            # Seed Comment
            comm = ReviewComment(
                review_id=review.id,
                user_id=reviewer_user.id if reviewer_user else creator_user.id,
                message="Please address the expired Fact F-07 reference and switch the product terminology to the registered mark before resubmission.",
                created_at=datetime.datetime(2026, 3, 2, 10, 15)
            )
            db.add(comm)

            # Audit log
            audit = AuditLog(
                organization_id=org.id,
                user_id=creator_user.id,
                action="SUBMIT_CONTENT_DRAFT",
                target_type="ContentReview",
                target_id=review.id,
                details={"title": review.title, "score": 39.0, "violations": 4},
                ip_address="127.0.0.1"
            )
            db.add(audit)
            db.commit()

        # Seed clean compliant draft as well for demonstration
        clean_review = db.query(ContentReview).filter(
            ContentReview.organization_id == org.id,
            ContentReview.title == "Compliant Social Snippet - Summer Morning"
        ).first()

        if not clean_review and creator_user:
            clean_review = ContentReview(
                organization_id=org.id,
                title="Compliant Social Snippet - Summer Morning",
                original_content="Nila Millet Mix: a healthy breakfast made with 5 whole millets.",
                current_content="Nila Millet Mix: a healthy breakfast made with 5 whole millets.",
                source_filename="clean_social_post.txt",
                source_file_type="text",
                status="approved",
                author_id=creator_user.id,
                reviewer_id=reviewer_user.id if reviewer_user else None,
                overall_score=100.0,
                has_critical_violations=False,
                requires_human_attention=False,
                review_notes="Fully compliant with Clause 4.1, Clause 3.4, and verified against Fact F-12.",
                created_at=datetime.datetime(2026, 3, 1, 14, 0)
            )
            db.add(clean_review)
            db.commit()

        # Ensure audit chain is initialized and hashed
        try:
            from backend.audit_chain import backfill_audit_chain
            backfill_audit_chain(db)
        except Exception as be:
            print(f"[Seed] Audit chain backfill note: {be}")

        print("[Seed] BrandProof database seeded successfully with Nila Foods workspace.")
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()

