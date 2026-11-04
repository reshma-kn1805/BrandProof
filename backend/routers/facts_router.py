import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, ApprovedFact, AuditLog
from backend.auth import get_current_user, require_roles
from backend.schemas import ApprovedFactOut, ApprovedFactCreate, ApprovedFactUpdate

router = APIRouter(prefix="/api/facts", tags=["Approved Facts Ledger"])

@router.get("/", response_model=List[ApprovedFactOut])
def list_facts(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ApprovedFact).filter(
        ApprovedFact.organization_id == current_user.organization_id
    )
    now = datetime.datetime.utcnow()
    facts = query.order_by(ApprovedFact.fact_code.asc()).all()

    result = []
    for f in facts:
        is_expired = bool(f.expiry_date and f.expiry_date < now)
        days_left = (f.expiry_date - now).days if f.expiry_date else None
        
        # dynamic status calculation
        eff_status = "expired" if is_expired else f.approval_status
        if status_filter and status_filter.lower() != "all" and eff_status.lower() != status_filter.lower():
            continue

        result.append(
            ApprovedFactOut(
                id=f.id,
                fact_code=f.fact_code,
                statement=f.statement,
                description=f.description,
                source_evidence=f.source_evidence,
                responsible_owner=f.responsible_owner,
                approval_status=eff_status,
                effective_date=f.effective_date,
                expiry_date=f.expiry_date,
                last_verified_date=f.last_verified_date,
                is_expired=is_expired,
                days_until_expiry=days_left
            )
        )
    return result

@router.post("/", response_model=ApprovedFactOut)
def create_fact(
    payload: ApprovedFactCreate,
    current_user: User = Depends(require_roles(["Admin", "Manager", "Reviewer"])),
    db: Session = Depends(get_db)
):
    existing = db.query(ApprovedFact).filter(
        ApprovedFact.organization_id == current_user.organization_id,
        ApprovedFact.fact_code == payload.fact_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Fact code {payload.fact_code} already exists.")

    fact = ApprovedFact(
        organization_id=current_user.organization_id,
        fact_code=payload.fact_code,
        statement=payload.statement,
        description=payload.description,
        source_evidence=payload.source_evidence,
        responsible_owner=payload.responsible_owner,
        approval_status=payload.approval_status,
        effective_date=payload.effective_date,
        expiry_date=payload.expiry_date,
        last_verified_date=datetime.datetime.utcnow()
    )
    db.add(fact)
    db.commit()
    db.refresh(fact)

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CREATE_APPROVED_FACT",
        target_type="ApprovedFact",
        target_id=fact.id,
        details={"code": fact.fact_code, "statement": fact.statement[:80]}
    )
    db.add(audit)
    db.commit()

    now = datetime.datetime.utcnow()
    is_expired = bool(fact.expiry_date and fact.expiry_date < now)
    return ApprovedFactOut(
        id=fact.id,
        fact_code=fact.fact_code,
        statement=fact.statement,
        description=fact.description,
        source_evidence=fact.source_evidence,
        responsible_owner=fact.responsible_owner,
        approval_status="expired" if is_expired else fact.approval_status,
        effective_date=fact.effective_date,
        expiry_date=fact.expiry_date,
        last_verified_date=fact.last_verified_date,
        is_expired=is_expired,
        days_until_expiry=(fact.expiry_date - now).days if fact.expiry_date else None
    )

@router.put("/{fact_id}", response_model=ApprovedFactOut)
def update_fact(
    fact_id: int,
    payload: ApprovedFactUpdate,
    current_user: User = Depends(require_roles(["Admin", "Manager"])),
    db: Session = Depends(get_db)
):
    fact = db.query(ApprovedFact).filter(
        ApprovedFact.id == fact_id,
        ApprovedFact.organization_id == current_user.organization_id
    ).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")

    if payload.statement is not None:
        fact.statement = payload.statement
    if payload.description is not None:
        fact.description = payload.description
    if payload.source_evidence is not None:
        fact.source_evidence = payload.source_evidence
    if payload.responsible_owner is not None:
        fact.responsible_owner = payload.responsible_owner
    if payload.approval_status is not None:
        fact.approval_status = payload.approval_status
    if payload.effective_date is not None:
        fact.effective_date = payload.effective_date
    if payload.expiry_date is not None:
        fact.expiry_date = payload.expiry_date

    fact.last_verified_date = datetime.datetime.utcnow()
    db.commit()
    db.refresh(fact)

    now = datetime.datetime.utcnow()
    is_expired = bool(fact.expiry_date and fact.expiry_date < now)
    return ApprovedFactOut(
        id=fact.id,
        fact_code=fact.fact_code,
        statement=fact.statement,
        description=fact.description,
        source_evidence=fact.source_evidence,
        responsible_owner=fact.responsible_owner,
        approval_status="expired" if is_expired else fact.approval_status,
        effective_date=fact.effective_date,
        expiry_date=fact.expiry_date,
        last_verified_date=fact.last_verified_date,
        is_expired=is_expired,
        days_until_expiry=(fact.expiry_date - now).days if fact.expiry_date else None
    )

