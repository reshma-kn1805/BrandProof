from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, AuditLog
from backend.auth import get_current_user
from backend.schemas import AuditLogOut

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
                created_at=log.created_at
            )
        )
    return result

