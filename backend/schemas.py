import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- User & Auth Schemas ---
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "Creator"  # Creator, Reviewer, Manager, Admin
    organization_name: Optional[str] = "Nila Foods"

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization_id: int
    organization_name: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Guideline Schemas ---
class GuidelineClauseCreate(BaseModel):
    clause_number: str
    title: str
    description: str
    category: str = "Compliance"
    severity: str = "warning"
    rules_json: Optional[Dict[str, Any]] = None

class GuidelineClauseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    rules_json: Optional[Dict[str, Any]] = None

class GuidelineClauseOut(BaseModel):
    id: int
    clause_number: str
    title: str
    description: str
    category: str
    severity: str
    status: str
    rules_json: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class GuidelineDocumentCreate(BaseModel):
    title: str
    category: str = "General"
    version_number: str = "1.0"
    clauses: List[GuidelineClauseCreate] = []

class GuidelineVersionOut(BaseModel):
    id: int
    version_number: str
    changelog: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime
    clauses: List[GuidelineClauseOut] = []

    class Config:
        from_attributes = True

class GuidelineDocumentOut(BaseModel):
    id: int
    title: str
    category: str
    file_type: str
    source_filename: Optional[str] = None
    created_at: datetime.datetime
    versions: List[GuidelineVersionOut] = []

    class Config:
        from_attributes = True

# --- Approved Fact Schemas ---
class ApprovedFactCreate(BaseModel):
    fact_code: str  # e.g. "F-07", "F-12"
    statement: str
    description: Optional[str] = None
    source_evidence: str
    responsible_owner: str = "Compliance Team"
    approval_status: str = "approved"
    effective_date: datetime.datetime
    expiry_date: Optional[datetime.datetime] = None

class ApprovedFactUpdate(BaseModel):
    statement: Optional[str] = None
    description: Optional[str] = None
    source_evidence: Optional[str] = None
    responsible_owner: Optional[str] = None
    approval_status: Optional[str] = None
    effective_date: Optional[datetime.datetime] = None
    expiry_date: Optional[datetime.datetime] = None

class ApprovedFactOut(BaseModel):
    id: int
    fact_code: str
    statement: str
    description: Optional[str] = None
    source_evidence: str
    responsible_owner: str
    approval_status: str
    effective_date: datetime.datetime
    expiry_date: Optional[datetime.datetime] = None
    last_verified_date: datetime.datetime
    is_expired: bool = False
    days_until_expiry: Optional[int] = None

    class Config:
        from_attributes = True

# --- Terminology Schemas ---
class TerminologyCreate(BaseModel):
    preferred_term: str
    prohibited_term: str
    incorrect_variations: List[str] = []
    approved_alternatives: List[str] = []
    case_sensitive: bool = False
    notes: Optional[str] = None

class TerminologyOut(BaseModel):
    id: int
    preferred_term: str
    prohibited_term: str
    incorrect_variations: List[str] = []
    approved_alternatives: List[str] = []
    case_sensitive: bool = False
    notes: Optional[str] = None

    class Config:
        from_attributes = True

# --- Brand Asset Schemas ---
class BrandAssetCreate(BaseModel):
    title: str
    asset_type: str = "logo"
    file_url: str
    alt_text: Optional[str] = None
    guidelines_notes: Optional[str] = None

class BrandAssetOut(BaseModel):
    id: int
    title: str
    asset_type: str
    file_url: str
    alt_text: Optional[str] = None
    guidelines_notes: Optional[str] = None
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Review & Findings Schemas ---
class ReviewSubmission(BaseModel):
    title: str
    content: str
    file_name: Optional[str] = None
    file_type: Optional[str] = "text"

class FindingAction(BaseModel):
    action: str  # "accept", "edit", "reject"
    edited_text: Optional[str] = None

class ReviewFindingOut(BaseModel):
    id: int
    review_id: int
    clause_id: Optional[int] = None
    fact_id: Optional[int] = None
    clause_number: Optional[str] = None
    fact_code: Optional[str] = None
    title: str
    original_text: str
    severity: str
    explanation: str
    suggested_correction: Optional[str] = None
    edited_correction: Optional[str] = None
    confidence: float
    verification_status: str
    evidence_source: Optional[str] = None
    decision_status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class DocumentRevisionOut(BaseModel):
    id: int
    revision_number: int
    content: str
    diff_summary: Optional[str] = None
    change_type: str
    created_at: datetime.datetime
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True

class ReviewCommentCreate(BaseModel):
    message: str

class ReviewCommentOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_role: str
    message: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ApprovalDecisionCreate(BaseModel):
    decision: str  # "approved", "rejected", "changes_requested"
    notes: Optional[str] = None

class ApprovalDecisionOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    decision: str
    notes: Optional[str] = None
    decided_at: datetime.datetime

    class Config:
        from_attributes = True

class ContentReviewOut(BaseModel):
    id: int
    title: str
    original_content: str
    current_content: str
    source_filename: Optional[str] = None
    source_file_type: str
    status: str
    author_id: int
    author_name: str
    reviewer_id: Optional[int] = None
    reviewer_name: Optional[str] = None
    overall_score: float
    has_critical_violations: bool
    requires_human_attention: bool
    review_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    findings: List[ReviewFindingOut] = []
    revisions: List[DocumentRevisionOut] = []
    comments: List[ReviewCommentOut] = []
    approvals: List[ApprovalDecisionOut] = []

    class Config:
        from_attributes = True

# --- Dashboard & Analytics Schemas ---
class DashboardMetrics(BaseModel):
    total_reviews: int
    reviews_in_progress: int
    approved_submissions: int
    submissions_requiring_attention: int
    compliance_average: float
    total_clauses: int
    total_approved_facts: int
    expired_facts_count: int
    recent_activity: List[Dict[str, Any]]
    frequently_triggered_clauses: List[Dict[str, Any]]
    pending_approvals: List[Dict[str, Any]]
    status_distribution: Dict[str, int]

# --- Audit Log Schemas ---
class AuditLogOut(BaseModel):
    id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    target_type: str
    target_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

