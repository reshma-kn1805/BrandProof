import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import (
    User, ContentReview, DocumentRevision, ReviewFinding,
    ReviewComment, ApprovalDecision, AuditLog, GuidelineClause, ApprovedFact
)
from backend.auth import get_current_user, require_roles
from backend.schemas import (
    ContentReviewOut, ReviewSubmission, FindingAction,
    ReviewCommentCreate, ReviewCommentOut, ApprovalDecisionCreate
)
from backend.document_parser import DocumentParser
from backend.engine.review_pipeline import ReviewPipeline
from backend.rate_limiter import submit_limiter

router = APIRouter(prefix="/api/reviews", tags=["Content Reviews"])

@router.get("/", response_model=List[ContentReviewOut])
def list_reviews(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ContentReview).filter(
        ContentReview.organization_id == current_user.organization_id
    )
    if status_filter and status_filter.lower() != "all":
        query = query.filter(ContentReview.status == status_filter)
    
    reviews = query.order_by(ContentReview.updated_at.desc()).all()
    # Populate author_name & reviewer_name
    for r in reviews:
        r.author_name = r.author.full_name if r.author else "Unknown"
        r.reviewer_name = r.reviewer.full_name if r.reviewer else "Unassigned"
        for rev in r.revisions:
            rev.created_by_name = rev.created_by.full_name if rev.created_by else "System"
        for c in r.comments:
            c.user_name = c.user.full_name if c.user else "User"
            c.user_role = c.user.role if c.user else "Creator"
        for a in r.approvals:
            a.user_name = a.user.full_name if a.user else "Manager"
    return reviews

@router.get("/{review_id}", response_model=ContentReviewOut)
def get_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    review = db.query(ContentReview).filter(
        ContentReview.id == review_id,
        ContentReview.organization_id == current_user.organization_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.author_name = review.author.full_name if review.author else "Unknown"
    review.reviewer_name = review.reviewer.full_name if review.reviewer else "Unassigned"
    for rev in review.revisions:
        rev.created_by_name = rev.created_by.full_name if rev.created_by else "System"
    for c in review.comments:
        c.user_name = c.user.full_name if c.user else "User"
        c.user_role = c.user.role if c.user else "Creator"
    for a in review.approvals:
        a.user_name = a.user.full_name if a.user else "Manager"

    return review

@router.post("/submit", response_model=ContentReviewOut)
async def submit_content_text(
    payload: ReviewSubmission,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submit_limiter.check(request)

    # Run the verification pipeline
    pipeline = ReviewPipeline(db, current_user.organization_id)
    pipeline_res = await pipeline.execute(payload.content)

    ai_notice = pipeline_res.get("ai_notice") if pipeline_res.get("ai_unavailable") else None

    try:
        review = ContentReview(
            organization_id=current_user.organization_id,
            title=payload.title,
            original_content=payload.content,
            current_content=payload.content,
            source_filename=payload.file_name or "direct_input.txt",
            source_file_type=payload.file_type or "text",
            status="in_review" if pipeline_res["total_issues"] > 0 else "draft",
            author_id=current_user.id,
            overall_score=pipeline_res["overall_score"],
            has_critical_violations=pipeline_res["has_critical_violations"],
            requires_human_attention=pipeline_res["requires_human_attention"],
            review_notes=ai_notice,
        )
        db.add(review)
        db.flush()

        # Initial Document Revision
        rev = DocumentRevision(
            review_id=review.id,
            revision_number=1,
            content=payload.content,
            diff_summary="Initial submission",
            change_type="submission",
            created_by_id=current_user.id
        )
        db.add(rev)

        # Add verified findings
        for f in pipeline_res["findings"]:
            finding = ReviewFinding(
                review_id=review.id,
                clause_id=f.get("clause_id"),
                fact_id=f.get("fact_id"),
                clause_number=f.get("clause_number"),
                fact_code=f.get("fact_code"),
                title=f["title"],
                original_text=f["original_text"],
                severity=f["severity"],
                explanation=f["explanation"],
                suggested_correction=f.get("suggested_correction"),
                confidence=f["confidence"],
                verification_status=f["verification_status"],
                evidence_source=f.get("evidence_source"),
                decision_status="pending"
            )
            db.add(finding)

        # Log to audit trail
        audit = AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="SUBMIT_CONTENT_REVIEW",
            target_type="ContentReview",
            target_id=review.id,
            details={
                "title": review.title,
                "overall_score": review.overall_score,
                "issues_count": pipeline_res["total_issues"]
            }
        )
        db.add(audit)
        db.commit()
        db.refresh(review)
    except Exception:
        db.rollback()
        raise

    review.author_name = current_user.full_name
    review.reviewer_name = "Unassigned"
    return review

@router.post("/upload", response_model=ContentReviewOut)
async def upload_content_file(
    request: Request,
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submit_limiter.check(request)
    try:
        contents = await file.read()
        extracted_text, file_type = DocumentParser.extract_text_from_bytes(contents, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    submission = ReviewSubmission(
        title=title,
        content=extracted_text,
        file_name=file.filename,
        file_type=file_type
    )
    return await submit_content_text(submission, request, current_user, db)

@router.post("/{review_id}/findings/{finding_id}/action", response_model=ContentReviewOut)
async def handle_finding_action(
    review_id: int,
    finding_id: int,
    action_data: FindingAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    review = db.query(ContentReview).filter(
        ContentReview.id == review_id,
        ContentReview.organization_id == current_user.organization_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    finding = db.query(ReviewFinding).filter(
        ReviewFinding.id == finding_id,
        ReviewFinding.review_id == review_id
    ).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    action = action_data.action.lower()
    # Idempotency guard: if finding already in requested decision state, return without duplicating revisions
    if finding.decision_status == action:
        return get_review(review.id, current_user, db)

    replacement_text = None

    if action == "accept":
        finding.decision_status = "accepted"
        replacement_text = finding.suggested_correction
    elif action == "edit":
        finding.decision_status = "edited"
        finding.edited_correction = action_data.edited_text
        replacement_text = action_data.edited_text
    elif action == "reject":
        finding.decision_status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be accept, edit, or reject.")

    db.flush()

    # If text changed, update content, create new revision, and re-review
    if replacement_text and finding.original_text in review.current_content:
        # Perform replacement
        updated_content = review.current_content.replace(finding.original_text, replacement_text, 1)
        review.current_content = updated_content

        # Count current revisions
        rev_count = db.query(DocumentRevision).filter(DocumentRevision.review_id == review.id).count()

        new_rev = DocumentRevision(
            review_id=review.id,
            revision_number=rev_count + 1,
            content=updated_content,
            diff_summary=f"Applied {action}: '{finding.original_text}' → '{replacement_text}'",
            change_type="correction_accepted",
            created_by_id=current_user.id
        )
        db.add(new_rev)

        # RE-RUN the verification pipeline on the updated content!
        pipeline = ReviewPipeline(db, current_user.organization_id)
        pipeline_res = await pipeline.execute(updated_content)

        review.overall_score = pipeline_res["overall_score"]
        review.has_critical_violations = pipeline_res["has_critical_violations"]
        review.requires_human_attention = pipeline_res["requires_human_attention"]

        # Clear old pending findings and repopulate active findings
        db.query(ReviewFinding).filter(
            ReviewFinding.review_id == review.id,
            ReviewFinding.decision_status == "pending"
        ).delete()

        for f in pipeline_res["findings"]:
            new_f = ReviewFinding(
                review_id=review.id,
                clause_id=f.get("clause_id"),
                fact_id=f.get("fact_id"),
                clause_number=f.get("clause_number"),
                fact_code=f.get("fact_code"),
                title=f["title"],
                original_text=f["original_text"],
                severity=f["severity"],
                explanation=f["explanation"],
                suggested_correction=f.get("suggested_correction"),
                confidence=f["confidence"],
                verification_status=f["verification_status"],
                evidence_source=f.get("evidence_source"),
                decision_status="pending"
            )
            db.add(new_f)

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=f"FINDING_{action.upper()}",
        target_type="ReviewFinding",
        target_id=finding.id,
        details={
            "action": action,
            "original_text": finding.original_text,
            "replacement": replacement_text
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(review)

    return get_review(review.id, current_user, db)

@router.post("/{review_id}/comments", response_model=ReviewCommentOut)
def add_comment(
    review_id: int,
    payload: ReviewCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    review = db.query(ContentReview).filter(
        ContentReview.id == review_id,
        ContentReview.organization_id == current_user.organization_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    comm = ReviewComment(
        review_id=review.id,
        user_id=current_user.id,
        message=payload.message
    )
    db.add(comm)

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="ADD_REVIEW_COMMENT",
        target_type="ContentReview",
        target_id=review.id,
        details={"message": payload.message[:100]}
    )
    db.add(audit)
    db.commit()
    db.refresh(comm)

    return ReviewCommentOut(
        id=comm.id,
        user_id=comm.user_id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        message=comm.message,
        created_at=comm.created_at
    )

@router.post("/{review_id}/assign-reviewer")
def assign_reviewer(
    review_id: int,
    reviewer_id: int,
    current_user: User = Depends(require_roles(["Admin", "Manager", "Reviewer"])),
    db: Session = Depends(get_db)
):
    review = db.query(ContentReview).filter(
        ContentReview.id == review_id,
        ContentReview.organization_id == current_user.organization_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    rev_user = db.query(User).filter(
        User.id == reviewer_id,
        User.organization_id == current_user.organization_id
    ).first()
    if not rev_user:
        raise HTTPException(status_code=404, detail="Reviewer user not found")

    review.reviewer_id = rev_user.id
    review.status = "in_review"
    db.commit()

    return {"message": f"Assigned to {rev_user.full_name}"}

@router.post("/{review_id}/decision", response_model=ContentReviewOut)
def decide_review(
    review_id: int,
    payload: ApprovalDecisionCreate,
    current_user: User = Depends(require_roles(["Reviewer", "Manager", "Admin"])),
    db: Session = Depends(get_db)
):
    review = db.query(ContentReview).filter(
        ContentReview.id == review_id,
        ContentReview.organization_id == current_user.organization_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    decision_val = payload.decision.lower()
    # Creator role cannot approve
    if current_user.role == "Creator":
        raise HTTPException(status_code=403, detail="Creators cannot make final approval decisions.")

    # Status guard: Finalized reviews cannot be transitioned to incompatible states
    if review.status == "approved" and decision_val != "approved":
        raise HTTPException(
            status_code=400,
            detail="Review has already been finalized as approved and cannot be changed."
        )
    if review.status == "rejected" and decision_val != "rejected":
        raise HTTPException(
            status_code=400,
            detail="Review has already been finalized as rejected and cannot be approved."
        )
    if review.status == "changes_requested" and decision_val == "approved":
        raise HTTPException(
            status_code=400,
            detail="Content has pending changes requested. Updates must be applied before final approval."
        )

    # Idempotency guard: Return current state if review is already in the requested decision status
    if review.status == decision_val:
        return get_review(review.id, current_user, db)

    if decision_val == "approved":
        # Check if there are unresolved critical violations
        if review.has_critical_violations:
            raise HTTPException(
                status_code=400,
                detail="Cannot approve content while unresolved critical violations or expired facts exist. Corrections must be applied first."
            )
        review.status = "approved"
    elif decision_val == "rejected":
        review.status = "rejected"
        review.rejection_reason = payload.notes
    elif decision_val == "changes_requested":
        review.status = "changes_requested"
        review.review_notes = payload.notes
    else:
        raise HTTPException(status_code=400, detail="Decision must be approved, rejected, or changes_requested.")

    decision_record = ApprovalDecision(
        review_id=review.id,
        user_id=current_user.id,
        decision=review.status,
        notes=payload.notes
    )

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=f"REVIEW_{review.status.upper()}",
        target_type="ContentReview",
        target_id=review.id,
        details={"decision": review.status, "notes": payload.notes}
    )

    try:
        db.add(decision_record)
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return get_review(review.id, current_user, db)

