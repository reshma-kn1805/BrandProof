import json
import base64
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request, Response
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import (
    User, ContentReview, DocumentRevision, ReviewFinding,
    ReviewComment, ApprovalDecision, AuditLog, GuidelineClause, ApprovedFact
)
from backend.auth import get_current_user, require_roles
from backend.schemas import (
    ContentReviewOut, ReviewSubmission, FindingAction,
    ReviewCommentCreate, ReviewCommentOut, ApprovalDecisionCreate,
    RedactionPreviewRequest, RedactionPreviewOut, ReportVerifyRequest, ReportVerifyOut
)
from backend.document_parser import DocumentParser
from backend.engine.review_pipeline import ReviewPipeline
from backend.engine.text_replacer import apply_clean_replacement
from backend.redaction.redactor import redact_content
from backend.report_generator import generate_pdf_report
from backend.audit_chain import record_audit_log
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

    org = current_user.organization
    confidential_mode = bool(payload.confidential_mode) if payload.confidential_mode is not None else bool(getattr(org, "confidential_mode_default", False))
    raw_terms = getattr(org, "confidential_terms", [])
    confidential_terms = []
    if isinstance(raw_terms, str):
        try:
            confidential_terms = json.loads(raw_terms)
        except Exception:
            confidential_terms = []
    elif isinstance(raw_terms, list):
        confidential_terms = raw_terms

    # Decode image data if present
    image_bytes = None
    raw_b64 = None
    if payload.image_data:
        raw_b64 = payload.image_data
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(raw_b64)
            if len(image_bytes) > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Image exceeds maximum 5 MB limit.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image encoding: {str(e)}")

    # Run the verification pipeline
    pipeline = ReviewPipeline(db, current_user.organization_id)
    pipeline_res = await pipeline.execute(
        content=payload.content,
        confidential_mode=confidential_mode,
        confidential_terms=confidential_terms,
        image_bytes=image_bytes,
        image_alt_text=payload.image_alt_text
    )

    ai_notice = pipeline_res.get("ai_notice") if pipeline_res.get("ai_unavailable") else None

    try:
        review = ContentReview(
            organization_id=current_user.organization_id,
            title=payload.title,
            original_content=payload.content,
            current_content=payload.content,
            source_filename=payload.file_name or ("mockup.png" if image_bytes else "direct_input.txt"),
            source_file_type=payload.file_type or ("image" if image_bytes else "text"),
            status="in_review" if pipeline_res["total_issues"] > 0 else "draft",
            author_id=current_user.id,
            overall_score=pipeline_res["overall_score"],
            has_critical_violations=pipeline_res["has_critical_violations"],
            requires_human_attention=pipeline_res["requires_human_attention"],
            confidential_mode=confidential_mode,
            redaction_summary=pipeline_res.get("redaction_summary"),
            review_notes=ai_notice,
            image_filename=payload.image_filename or (payload.file_name if image_bytes else None),
            image_url=f"data:image/png;base64,{raw_b64}" if raw_b64 else None,
            image_alt_text=payload.image_alt_text,
            image_analysis=pipeline_res.get("image_analysis"),
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
                engine_source=f.get("engine_source", "deterministic"),
                is_ai_assisted=f.get("is_ai_assisted", False),
                needs_human_look=f.get("needs_human_look", False),
                decision_status="pending"
            )
            db.add(finding)

        # Log to audit trail
        record_audit_log(
            db=db,
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="SUBMIT_CONTENT_REVIEW",
            target_type="ContentReview",
            target_id=review.id,
            details={
                "title": review.title,
                "overall_score": review.overall_score,
                "issues_count": pipeline_res["total_issues"],
                "confidential_mode": confidential_mode,
                "redaction_summary": pipeline_res.get("redaction_summary")
            }
        )
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
    alt_text: Optional[str] = Form(None),
    confidential_mode: Optional[bool] = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submit_limiter.check(request)
    filename_lower = (file.filename or "").lower()
    is_image = filename_lower.endswith((".png", ".jpg", ".jpeg", ".webp"))

    try:
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Uploaded file exceeds 5 MB size limit.")
        
        if is_image:
            image_b64 = base64.b64encode(contents).decode("utf-8")
            submission = ReviewSubmission(
                title=title,
                content=f"[Attached Visual Asset: {file.filename}]",
                file_name=file.filename,
                file_type="image",
                confidential_mode=confidential_mode,
                image_filename=file.filename,
                image_data=image_b64,
                image_alt_text=alt_text
            )
            return await submit_content_text(submission, request, current_user, db)
        else:
            extracted_text, file_type = DocumentParser.extract_text_from_bytes(contents, file.filename)
            submission = ReviewSubmission(
                title=title,
                content=extracted_text,
                file_name=file.filename,
                file_type=file_type,
                confidential_mode=confidential_mode
            )
            return await submit_content_text(submission, request, current_user, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
        if not finding.suggested_correction:
            raise HTTPException(
                status_code=400,
                detail="Cannot accept finding without an automated suggested correction. Please use Edit to specify your correction."
            )
        finding.decision_status = "accepted"
        replacement_text = finding.suggested_correction
    elif action == "edit":
        if not action_data.edited_text or not action_data.edited_text.strip():
            raise HTTPException(status_code=400, detail="Edited correction text cannot be empty.")
        clean_edit = action_data.edited_text.strip()

        # Re-verify the creator's proposed edit before accepting
        candidate_content = apply_clean_replacement(review.current_content, finding.original_text, clean_edit)
        pipeline = ReviewPipeline(db, current_user.organization_id)
        test_res = await pipeline.execute(candidate_content)

        # Check if the proposed edit still triggers brand violations
        offending = [
            f for f in test_res["findings"]
            if f["original_text"].lower() in clean_edit.lower() or clean_edit.lower() in f["original_text"].lower()
        ]
        if offending:
            raise HTTPException(
                status_code=400,
                detail=f"The proposed edit '{clean_edit}' failed brand verification: {offending[0]['explanation']} Please revise your correction."
            )

        finding.decision_status = "edited"
        finding.edited_correction = clean_edit
        replacement_text = clean_edit
    elif action == "reject":
        if not action_data.reject_reason or not action_data.reject_reason.strip():
            raise HTTPException(
                status_code=400,
                detail="Rejecting a finding requires a reason (dropdown selection)."
            )
        finding.decision_status = "rejected"
        finding.reject_reason = action_data.reject_reason.strip()
        finding.reject_note = action_data.reject_note.strip() if action_data.reject_note else None
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be accept, edit, or reject.")

    finding.decision_user_id = current_user.id
    finding.decision_at = datetime.datetime.utcnow()
    db.flush()

    # If text changed, update content, create new revision, and re-review
    if replacement_text and (finding.original_text in review.current_content or finding.original_text.lower() in review.current_content.lower()):
        # Perform grammatical phrase-level replacement
        updated_content = apply_clean_replacement(review.current_content, finding.original_text, replacement_text)
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
                engine_source=f.get("engine_source", "deterministic"),
                is_ai_assisted=f.get("is_ai_assisted", False),
                needs_human_look=f.get("needs_human_look", False),
                decision_status="pending"
            )
            db.add(new_f)
    else:
        # Image findings or non-content modifications: recalculate compliance score from pending findings
        all_findings = db.query(ReviewFinding).filter(ReviewFinding.review_id == review.id).all()
        pending_findings = [f for f in all_findings if f.decision_status not in ("accepted", "rejected")]
        new_score = 100.0
        has_crit = False
        req_attn = False
        for f in pending_findings:
            sev = (f.severity or "warning").lower()
            if sev == "critical":
                new_score -= 22.0
                has_crit = True
            elif sev == "warning":
                new_score -= 12.0
            else:
                new_score -= 5.0
            if f.verification_status in ["pending_human_review", "expired_fact_detected"] or f.needs_human_look:
                req_attn = True
        review.overall_score = max(0.0, round(new_score, 1))
        review.has_critical_violations = has_crit
        review.requires_human_attention = req_attn

    record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=f"FINDING_{action.upper()}",
        target_type="ReviewFinding",
        target_id=finding.id,
        details={
            "action": action,
            "original_text": finding.original_text,
            "replacement": replacement_text,
            "reject_reason": finding.reject_reason,
            "reject_note": finding.reject_note
        }
    )
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

    if payload.finding_id:
        finding = db.query(ReviewFinding).filter(
            ReviewFinding.id == payload.finding_id,
            ReviewFinding.review_id == review.id
        ).first()
        if not finding:
            raise HTTPException(status_code=404, detail="Finding not found for this review")

    comment_type = payload.comment_type or "general"
    if comment_type == "ask_manager":
        review.requires_human_attention = True
        action_name = "ASK_MANAGER_THREAD"
    else:
        action_name = "ADD_REVIEW_COMMENT"

    comm = ReviewComment(
        review_id=review.id,
        finding_id=payload.finding_id,
        user_id=current_user.id,
        comment_type=comment_type,
        message=payload.message
    )
    db.add(comm)

    record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=action_name,
        target_type="ContentReview",
        target_id=review.id,
        details={
            "finding_id": payload.finding_id,
            "comment_type": comment_type,
            "message": payload.message[:200]
        }
    )
    db.commit()
    db.refresh(comm)

    return ReviewCommentOut(
        id=comm.id,
        review_id=comm.review_id,
        finding_id=comm.finding_id,
        user_id=comm.user_id,
        comment_type=comm.comment_type,
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

    try:
        db.add(decision_record)
        record_audit_log(
            db=db,
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action=f"REVIEW_{review.status.upper()}",
            target_type="ContentReview",
            target_id=review.id,
            details={"decision": review.status, "notes": payload.notes}
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return get_review(review.id, current_user, db)


# --- Phase 5: Redaction Preview, Report Export & Integrity Verification ---

@router.get("/redaction-preview", response_model=RedactionPreviewOut)
@router.post("/redaction-preview", response_model=RedactionPreviewOut)
def preview_redaction(
    text: Optional[str] = None,
    payload: Optional[RedactionPreviewRequest] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Shows a 'What will be sent' preview with redactions highlighted and entity counts.
    """
    content_text = ""
    terms: List[str] = []
    if payload and payload.text:
        content_text = payload.text
        terms = payload.confidential_terms or []
    elif text:
        content_text = text

    if not terms and current_user.organization:
        raw_terms = getattr(current_user.organization, "confidential_terms", [])
        if isinstance(raw_terms, str):
            try:
                terms = json.loads(raw_terms)
            except Exception:
                terms = []
        elif isinstance(raw_terms, list):
            terms = raw_terms

    res = redact_content(content_text, confidential_terms=terms)
    return RedactionPreviewOut(
        original_text=res.original_text,
        redacted_text=res.redacted_text,
        counts=res.counts,
        tokens=res.tokens_detail
    )


@router.get("/{review_id}/report.pdf")
def export_pdf_report(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a cryptographic PDF audit report containing complete findings,
    citations, decisions, comments, revisions, AI disclosure, and hash-chain fingerprint.
    """
    review = db.query(ContentReview).filter(
        ContentReview.id == review_id,
        ContentReview.organization_id == current_user.organization_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    pdf_bytes, fingerprint = generate_pdf_report(review, db)
    review.report_fingerprint = fingerprint
    db.commit()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=brandproof-audit-report-{review.id}.pdf",
            "X-Report-Fingerprint": fingerprint
        }
    )


def _do_verify_report(search_q: Optional[str], db: Session) -> ReportVerifyOut:
    q = (search_q or "").strip()
    if not q:
        return ReportVerifyOut(matched=False, message="Please provide a review ID or 64-character SHA-256 fingerprint.")

    review = None
    if q.isdigit():
        review = db.query(ContentReview).filter(ContentReview.id == int(q)).first()
        if review and not review.report_fingerprint:
            return ReportVerifyOut(
                matched=False,
                message="Review exists, but no official cryptographic audit report has been generated for it yet."
            )
    else:
        review = db.query(ContentReview).filter(ContentReview.report_fingerprint == q).first()

    if not review or not review.report_fingerprint:
        return ReportVerifyOut(
            matched=False,
            message="No audit report matches this identifier or cryptographic fingerprint."
        )

    return ReportVerifyOut(
        matched=True,
        review_id=review.id,
        title=review.title,
        status=review.status,
        score=review.overall_score,
        fingerprint=review.report_fingerprint,
        stored_fingerprint=review.report_fingerprint,
        message="Cryptographic integrity verified. Record exactly matches database and tamper-evident audit ledger."
    )


@router.get("/verify-report", response_model=ReportVerifyOut)
def verify_report_integrity_get(
    query: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return _do_verify_report(query, db)


@router.post("/verify-report", response_model=ReportVerifyOut)
def verify_report_integrity_post(
    payload: ReportVerifyRequest,
    db: Session = Depends(get_db)
):
    return _do_verify_report(payload.query, db)

