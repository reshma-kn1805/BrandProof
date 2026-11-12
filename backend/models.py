import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, JSON
)
from sqlalchemy.orm import relationship
from backend.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_fictional_demo = Column(Boolean, default=False)
    confidential_mode_default = Column(Boolean, default=False)
    confidential_terms = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="organization")
    guidelines = relationship("GuidelineDocument", back_populates="organization")
    facts = relationship("ApprovedFact", back_populates="organization")
    terminology = relationship("Terminology", back_populates="organization")
    assets = relationship("BrandAsset", back_populates="organization")
    reviews = relationship("ContentReview", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Creator")  # Creator, Reviewer, Manager, Admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    reviews_authored = relationship("ContentReview", foreign_keys="ContentReview.author_id", back_populates="author")
    reviews_assigned = relationship("ContentReview", foreign_keys="ContentReview.reviewer_id", back_populates="reviewer")


class GuidelineDocument(Base):
    __tablename__ = "guideline_documents"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), default="General")
    source_filename = Column(String(255), nullable=True)
    file_type = Column(String(50), default="manual")  # pdf, docx, markdown, manual
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="guidelines")
    versions = relationship("GuidelineVersion", back_populates="document", cascade="all, delete-orphan")


class GuidelineVersion(Base):
    __tablename__ = "guideline_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("guideline_documents.id"), nullable=False, index=True)
    version_number = Column(String(50), nullable=False)  # e.g., "1.0", "1.1", "2.0"
    changelog = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("GuidelineDocument", back_populates="versions")
    clauses = relationship("GuidelineClause", back_populates="version", cascade="all, delete-orphan")


class GuidelineClause(Base):
    __tablename__ = "guideline_clauses"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("guideline_versions.id"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    clause_number = Column(String(50), nullable=False, index=True)  # e.g. "2.1", "3.4", "3.6", "4.1", "5.2"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), default="Compliance")  # Tone, Claims, Terminology, Accessibility, etc.
    severity = Column(String(50), default="warning")  # critical, warning, notice
    status = Column(String(50), default="active")  # active, archived
    rules_json = Column(JSON, nullable=True)  # regexes, prohibited patterns, keywords
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    version = relationship("GuidelineVersion", back_populates="clauses")


class ApprovedFact(Base):
    __tablename__ = "approved_facts"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    fact_code = Column(String(50), nullable=False, index=True)  # e.g. "F-07", "F-12"
    statement = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    source_evidence = Column(Text, nullable=False)  # e.g. "Clinical trial CT-2023", "Retail Audit 2024"
    responsible_owner = Column(String(255), default="Compliance Team")
    approval_status = Column(String(50), default="approved")  # approved, pending, rejected, expired
    effective_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)  # None if perpetual, or specific date
    last_verified_date = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="facts")


class Terminology(Base):
    __tablename__ = "terminology"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    preferred_term = Column(String(255), nullable=False)
    prohibited_term = Column(String(255), nullable=False)
    incorrect_variations = Column(JSON, default=list)  # ["Millet-Mix", "millet mix", "Nila-Millet-Mix"]
    approved_alternatives = Column(JSON, default=list)  # ["Nila Millet Mix", "Millet Mix by Nila"]
    case_sensitive = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="terminology")


class BrandAsset(Base):
    __tablename__ = "brand_assets"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    asset_type = Column(String(50), default="logo")  # logo, product_image, reference_doc, banner
    file_url = Column(String(500), nullable=False)
    alt_text = Column(String(500), nullable=True)
    guidelines_notes = Column(Text, nullable=True)
    status = Column(String(50), default="active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="assets")


class ContentReview(Base):
    __tablename__ = "content_reviews"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    original_content = Column(Text, nullable=False)
    current_content = Column(Text, nullable=False)
    source_filename = Column(String(255), nullable=True)
    source_file_type = Column(String(50), default="text")  # text, docx, pdf
    status = Column(String(50), default="draft")  # draft, in_review, changes_requested, resubmitted, approved, rejected
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    overall_score = Column(Float, default=100.0)  # 0 to 100 compliance health score
    has_critical_violations = Column(Boolean, default=False)
    requires_human_attention = Column(Boolean, default=False)
    review_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    confidential_mode = Column(Boolean, default=False)
    redaction_summary = Column(JSON, nullable=True)
    report_fingerprint = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="reviews")
    author = relationship("User", foreign_keys=[author_id], back_populates="reviews_authored")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_assigned")
    revisions = relationship("DocumentRevision", back_populates="review", cascade="all, delete-orphan", order_by="DocumentRevision.revision_number")
    findings = relationship("ReviewFinding", back_populates="review", cascade="all, delete-orphan")
    comments = relationship("ReviewComment", back_populates="review", cascade="all, delete-orphan", order_by="ReviewComment.created_at")
    approvals = relationship("ApprovalDecision", back_populates="review", cascade="all, delete-orphan")


class DocumentRevision(Base):
    __tablename__ = "document_revisions"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("content_reviews.id"), nullable=False, index=True)
    revision_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    diff_summary = Column(Text, nullable=True)
    change_type = Column(String(50), default="edit")  # submission, correction_accepted, manual_edit
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    review = relationship("ContentReview", back_populates="revisions")
    created_by = relationship("User")


class ReviewFinding(Base):
    __tablename__ = "review_findings"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("content_reviews.id"), nullable=False, index=True)
    clause_id = Column(Integer, ForeignKey("guideline_clauses.id"), nullable=True)
    fact_id = Column(Integer, ForeignKey("approved_facts.id"), nullable=True)
    clause_number = Column(String(50), nullable=True)
    fact_code = Column(String(50), nullable=True)
    title = Column(String(255), nullable=False)
    original_text = Column(Text, nullable=False)
    severity = Column(String(50), default="warning")  # critical, warning, notice
    explanation = Column(Text, nullable=False)
    suggested_correction = Column(Text, nullable=True)
    edited_correction = Column(Text, nullable=True)
    confidence = Column(Float, default=1.0)  # 0.0 - 1.0
    verification_status = Column(String(50), default="verified_clause")
    # verified_clause, verified_fact, expired_fact_detected, pending_human_review, abstain
    evidence_source = Column(Text, nullable=True)
    decision_status = Column(String(50), default="pending")  # pending, accepted, edited, rejected
    reject_reason = Column(String(100), nullable=True)
    reject_note = Column(Text, nullable=True)
    engine_source = Column(String(50), default="deterministic")  # deterministic, ai
    is_ai_assisted = Column(Boolean, default=False)
    needs_human_look = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    review = relationship("ContentReview", back_populates="findings")
    clause = relationship("GuidelineClause")
    fact = relationship("ApprovedFact")
    comments = relationship("ReviewComment", back_populates="finding")


class ReviewComment(Base):
    __tablename__ = "review_comments"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("content_reviews.id"), nullable=False, index=True)
    finding_id = Column(Integer, ForeignKey("review_findings.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment_type = Column(String(50), default="general")  # general, finding, ask_manager
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    review = relationship("ContentReview", back_populates="comments")
    user = relationship("User")
    finding = relationship("ReviewFinding", back_populates="comments")


class ApprovalDecision(Base):
    __tablename__ = "approval_decisions"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("content_reviews.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decision = Column(String(50), nullable=False)  # approved, rejected, changes_requested
    notes = Column(Text, nullable=True)
    decided_at = Column(DateTime, default=datetime.datetime.utcnow)

    review = relationship("ContentReview", back_populates="approvals")
    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "SUBMIT_DRAFT", "ACCEPT_SUGGESTION", "APPROVE_REVIEW"
    target_type = Column(String(100), nullable=False)  # "ContentReview", "GuidelineClause", "ApprovedFact", "User"
    target_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    prev_hash = Column(String(64), nullable=True)
    entry_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    organization = relationship("Organization", back_populates="audit_logs")
    user = relationship("User")


class AICallLog(Base):
    __tablename__ = "ai_calls"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    review_id = Column(Integer, ForeignKey("content_reviews.id"), nullable=True, index=True)
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    redaction_enabled = Column(Boolean, default=False)
    redaction_counts = Column(JSON, nullable=True)
    latency_ms = Column(Integer, default=0)
    status = Column(String(50), default="success")  # success, fallback, error
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    organization = relationship("Organization")
    review = relationship("ContentReview")

