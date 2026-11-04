import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend.models import (
    User, ContentReview, ReviewFinding, GuidelineClause,
    ApprovedFact, AuditLog
)
from backend.auth import get_current_user
from backend.schemas import DashboardMetrics

router = APIRouter(prefix="/api/analytics", tags=["Dashboard & Analytics"])

@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    org_id = current_user.organization_id
    now = datetime.datetime.utcnow()

    total_reviews = db.query(ContentReview).filter(ContentReview.organization_id == org_id).count()
    in_progress = db.query(ContentReview).filter(
        ContentReview.organization_id == org_id,
        ContentReview.status.in_(["in_review", "changes_requested", "draft", "resubmitted"])
    ).count()
    approved = db.query(ContentReview).filter(
        ContentReview.organization_id == org_id,
        ContentReview.status == "approved"
    ).count()
    requiring_attention = db.query(ContentReview).filter(
        ContentReview.organization_id == org_id,
        (ContentReview.requires_human_attention == True) | (ContentReview.has_critical_violations == True)
    ).count()

    # Average compliance score
    avg_score_res = db.query(func.avg(ContentReview.overall_score)).filter(
        ContentReview.organization_id == org_id
    ).scalar()
    compliance_avg = round(float(avg_score_res or 100.0), 1)

    total_clauses = db.query(GuidelineClause).filter(
        GuidelineClause.organization_id == org_id,
        GuidelineClause.status == "active"
    ).count()

    total_facts = db.query(ApprovedFact).filter(ApprovedFact.organization_id == org_id).count()
    expired_facts = db.query(ApprovedFact).filter(
        ApprovedFact.organization_id == org_id,
        ApprovedFact.expiry_date != None,
        ApprovedFact.expiry_date < now
    ).count()

    # Status distribution
    status_counts = {}
    for st in ["draft", "in_review", "changes_requested", "resubmitted", "approved", "rejected"]:
        status_counts[st] = db.query(ContentReview).filter(
            ContentReview.organization_id == org_id,
            ContentReview.status == st
        ).count()

    # Frequently triggered clauses
    top_clauses_query = (
        db.query(
            ReviewFinding.clause_number,
            func.count(ReviewFinding.id).label("count")
        )
        .join(ContentReview, ContentReview.id == ReviewFinding.review_id)
        .filter(ContentReview.organization_id == org_id, ReviewFinding.clause_number != None)
        .group_by(ReviewFinding.clause_number)
        .order_by(func.count(ReviewFinding.id).desc())
        .limit(5)
        .all()
    )

    frequent_clauses = []
    for c_num, count in top_clauses_query:
        clause_obj = db.query(GuidelineClause).filter(
            GuidelineClause.organization_id == org_id,
            GuidelineClause.clause_number == c_num
        ).first()
        frequent_clauses.append({
            "clause_number": c_num,
            "title": clause_obj.title if clause_obj else f"Clause {c_num}",
            "category": clause_obj.category if clause_obj else "General",
            "trigger_count": count
        })

    # Recent activity
    recent_logs = (
        db.query(AuditLog)
        .filter(AuditLog.organization_id == org_id)
        .order_by(AuditLog.created_at.desc())
        .limit(7)
        .all()
    )
    recent_activity = [
        {
            "id": log.id,
            "action": log.action,
            "target_type": log.target_type,
            "user_name": log.user.full_name if log.user else "System",
            "time_ago": log.created_at.strftime("%b %d, %H:%M"),
            "details": log.details
        }
        for log in recent_logs
    ]

    # Pending approvals
    pending_reviews = (
        db.query(ContentReview)
        .filter(
            ContentReview.organization_id == org_id,
            ContentReview.status.in_(["in_review", "resubmitted"])
        )
        .order_by(ContentReview.updated_at.desc())
        .limit(5)
        .all()
    )
    pending_approvals = [
        {
            "id": r.id,
            "title": r.title,
            "author": r.author.full_name if r.author else "Creator",
            "score": r.overall_score,
            "status": r.status,
            "date": r.created_at.strftime("%b %d")
        }
        for r in pending_reviews
    ]

    return DashboardMetrics(
        total_reviews=total_reviews,
        reviews_in_progress=in_progress,
        approved_submissions=approved,
        submissions_requiring_attention=requiring_attention,
        compliance_average=compliance_avg,
        total_clauses=total_clauses,
        total_approved_facts=total_facts,
        expired_facts_count=expired_facts,
        recent_activity=recent_activity,
        frequently_triggered_clauses=frequent_clauses,
        pending_approvals=pending_approvals,
        status_distribution=status_counts
    )

