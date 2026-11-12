from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, AuditLog, AICallLog
from backend.auth import get_current_user
from backend.schemas import AuditLogOut, AuditVerifyOut, AICallLogOut
from backend.audit_chain import verify_audit_chain

router = APIRouter(prefix="/api/audit", tags=["Audit Log & Governance"])

@router.get("/", response_model=List[AuditLogOut])
def list_audit_logs(
    action_filter: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).filter(
        AuditLog.organization_id == current_user.organization_id
    )
    if action_filter and action_filter.lower() != "all":
        query = query.filter(AuditLog.action.ilike(f"%{action_filter}%"))

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    result = []
    for log in logs:
        result.append(
            AuditLogOut(
                id=log.id,
                user_name=log.user.full_name if log.user else "System",
                user_email=log.user.email if log.user else "system@brandproof.internal",
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                details=log.details,
                ip_address=log.ip_address,
                prev_hash=log.prev_hash,
                entry_hash=log.entry_hash,
                created_at=log.created_at
            )
        )
    return result

@router.get("/verify", response_model=AuditVerifyOut)
def verify_audit_log_chain(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recomputes the cryptographic SHA-256 hash chain of the organization's audit log
    and verifies that no entry has been altered, deleted, or inserted out-of-order.
    """
    return verify_audit_chain(db, organization_id=current_user.organization_id)

@router.get("/ai-calls", response_model=List[AICallLogOut])
def list_ai_call_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns transparency log of external AI calls (provider, model, redactions, latency).
    Raw content is NEVER stored.
    """
    calls = db.query(AICallLog).filter(
        AICallLog.organization_id == current_user.organization_id
    ).order_by(AICallLog.created_at.desc()).limit(limit).all()
    return calls

