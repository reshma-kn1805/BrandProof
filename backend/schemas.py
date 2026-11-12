import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict

def _validate_trimmed(v: Any, field_name: str, max_len: int = 50000, required: bool = True) -> Optional[str]:
    if v is None:
        if required:
            raise ValueError(f"{field_name} is required")
        return None
    s = str(v).strip()
    if required and len(s) == 0:
        raise ValueError(f"{field_name} cannot be empty or whitespace only")
    if len(s) > max_len:
        raise ValueError(f"{field_name} cannot exceed {max_len} characters")
    return s if s else (None if not required else s)

# --- User & Auth Schemas ---
class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_trimmed(v, "Email", max_len=255, required=True) or ""

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Password cannot be empty")
        return v

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "Creator"  # Creator, Reviewer, Manager, Admin
    organization_name: Optional[str] = "Nila Foods"

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_trimmed(v, "Email", max_len=255, required=True) or ""

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        return _validate_trimmed(v, "Full name", max_len=255, required=True) or ""

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    organization_id: int
    organization_name: Optional[str] = None
    is_active: bool

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

    @field_validator("clause_number")
    @classmethod
    def val_clause_number(cls, v: str) -> str:
        return _validate_trimmed(v, "Clause number", max_len=50, required=True) or ""

    @field_validator("title")
    @classmethod
    def val_title(cls, v: str) -> str:
        return _validate_trimmed(v, "Title", max_len=255, required=True) or ""

    @field_validator("description")
    @classmethod
    def val_desc(cls, v: str) -> str:
        return _validate_trimmed(v, "Description", max_len=50000, required=True) or ""

class GuidelineClauseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    rules_json: Optional[Dict[str, Any]] = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def val_opt_fields(cls, v: Any) -> Optional[str]:
        return _validate_trimmed(v, "Field", max_len=50000, required=False)

class GuidelineClauseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clause_number: str
    title: str
    description: str
    category: str
    severity: str
    status: str
    rules_json: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime

class GuidelineDocumentCreate(BaseModel):
    title: str
    category: str = "General"
    version_number: str = "1.0"
    clauses: List[GuidelineClauseCreate] = []

    @field_validator("title")
    @classmethod
    def val_doc_title(cls, v: str) -> str:
        return _validate_trimmed(v, "Guideline title", max_len=255, required=True) or ""

class GuidelineVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version_number: str
    changelog: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime
    clauses: List[GuidelineClauseOut] = []

class GuidelineDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    file_type: str
    source_filename: Optional[str] = None
    created_at: datetime.datetime
    versions: List[GuidelineVersionOut] = []

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

    @field_validator("fact_code")
    @classmethod
    def val_code(cls, v: str) -> str:
        return _validate_trimmed(v, "Fact code", max_len=50, required=True) or ""

    @field_validator("statement")
    @classmethod
    def val_stmt(cls, v: str) -> str:
        return _validate_trimmed(v, "Fact statement", max_len=50000, required=True) or ""

    @field_validator("source_evidence")
    @classmethod
    def val_evid(cls, v: str) -> str:
        return _validate_trimmed(v, "Source evidence", max_len=50000, required=True) or ""

class ApprovedFactUpdate(BaseModel):
    statement: Optional[str] = None
    description: Optional[str] = None
    source_evidence: Optional[str] = None
    responsible_owner: Optional[str] = None
    approval_status: Optional[str] = None
    effective_date: Optional[datetime.datetime] = None
    expiry_date: Optional[datetime.datetime] = None

class ApprovedFactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

# --- Terminology Schemas ---
class TerminologyCreate(BaseModel):
    preferred_term: str
    prohibited_term: str
    incorrect_variations: List[str] = []
    approved_alternatives: List[str] = []
    case_sensitive: bool = False
    notes: Optional[str] = None

    @field_validator("preferred_term")
    @classmethod
    def val_pref(cls, v: str) -> str:
        return _validate_trimmed(v, "Preferred term", max_len=255, required=True) or ""

    @field_validator("prohibited_term")
    @classmethod
    def val_prohib(cls, v: str) -> str:
        return _validate_trimmed(v, "Prohibited term", max_len=255, required=True) or ""

class TerminologyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    preferred_term: str
    prohibited_term: str
    incorrect_variations: List[str] = []
    approved_alternatives: List[str] = []
    case_sensitive: bool = False
    notes: Optional[str] = None

# --- Brand Asset Schemas ---
class BrandAssetCreate(BaseModel):
    title: str
    asset_type: str = "logo"
    file_url: str
    alt_text: Optional[str] = None
    guidelines_notes: Optional[str] = None

    @field_validator("title")
    @classmethod
    def val_title(cls, v: str) -> str:
        return _validate_trimmed(v, "Asset title", max_len=255, required=True) or ""

    @field_validator("file_url")
    @classmethod
    def val_url(cls, v: str) -> str:
        return _validate_trimmed(v, "File URL", max_len=1000, required=True) or ""

class BrandAssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    asset_type: str
    file_url: str
    alt_text: Optional[str] = None
    guidelines_notes: Optional[str] = None
    status: str
    created_at: datetime.datetime

# --- Review & Findings Schemas ---
class ReviewSubmission(BaseModel):
    title: str
    content: str
    file_name: Optional[str] = None
    file_type: Optional[str] = "text"

    @field_validator("title")
    @classmethod
    def val_sub_title(cls, v: str) -> str:
        return _validate_trimmed(v, "Review title", max_len=500, required=True) or ""

    @field_validator("content")
    @classmethod
    def val_sub_content(cls, v: str) -> str:
        return _validate_trimmed(v, "Review content", max_len=50000, required=True) or ""

    @field_validator("file_name", "file_type", mode="before")
    @classmethod
    def val_opt_meta(cls, v: Any) -> Optional[str]:
        return _validate_trimmed(v, "Metadata", max_len=255, required=False)

class FindingAction(BaseModel):
    action: str  # "accept", "edit", "reject"
    edited_text: Optional[str] = None

    @field_validator("action")
    @classmethod
    def val_action(cls, v: str) -> str:
        s = _validate_trimmed(v, "Action", max_len=50, required=True) or ""
        s_lower = s.lower()
        if s_lower not in ["accept", "edit", "reject"]:
            raise ValueError("Action must be 'accept', 'edit', or 'reject'")
        return s_lower

    @field_validator("edited_text")
    @classmethod
    def val_edited_text(cls, v: Optional[str]) -> Optional[str]:
        return _validate_trimmed(v, "Edited text", max_len=50000, required=False)

class ReviewFindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

class DocumentRevisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    revision_number: int
    content: str
    diff_summary: Optional[str] = None
    change_type: str
    created_at: datetime.datetime
    created_by_name: Optional[str] = None

class ReviewCommentCreate(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def val_comment(cls, v: str) -> str:
        return _validate_trimmed(v, "Comment message", max_len=5000, required=True) or ""

class ReviewCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    user_role: str
    message: str
    created_at: datetime.datetime

class ApprovalDecisionCreate(BaseModel):
    decision: str  # "approved", "rejected", "changes_requested"
    notes: Optional[str] = None

    @field_validator("decision")
    @classmethod
    def val_decision(cls, v: str) -> str:
        s = _validate_trimmed(v, "Decision", max_len=50, required=True) or ""
        s_lower = s.lower()
        if s_lower not in ["approved", "rejected", "changes_requested"]:
            raise ValueError("Decision must be 'approved', 'rejected', or 'changes_requested'")
        return s_lower

    @field_validator("notes")
    @classmethod
    def val_notes(cls, v: Optional[str]) -> Optional[str]:
        return _validate_trimmed(v, "Decision notes", max_len=5000, required=False)

class ApprovalDecisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    decision: str
    notes: Optional[str] = None
    decided_at: datetime.datetime

class ContentReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    recent_activity: List[Dict[str, Any]] = []
    frequently_triggered_clauses: List[Dict[str, Any]] = []
    pending_approvals: List[Dict[str, Any]] = []
    status_distribution: Dict[str, int] = {}

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    target_type: str
    target_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime.datetime
