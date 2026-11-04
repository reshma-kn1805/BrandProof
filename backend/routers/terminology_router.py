from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Terminology, AuditLog
from backend.auth import get_current_user, require_roles
from backend.schemas import TerminologyOut, TerminologyCreate

router = APIRouter(prefix="/api/terminology", tags=["Terminology Management"])

@router.get("/", response_model=List[TerminologyOut])
def list_terminology(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Terminology).filter(
        Terminology.organization_id == current_user.organization_id
    ).all()

@router.post("/", response_model=TerminologyOut)
def create_terminology(
    payload: TerminologyCreate,
    current_user: User = Depends(require_roles(["Admin", "Manager", "Reviewer"])),
    db: Session = Depends(get_db)
):
    term = Terminology(
        organization_id=current_user.organization_id,
        preferred_term=payload.preferred_term,
        prohibited_term=payload.prohibited_term,
        incorrect_variations=payload.incorrect_variations,
        approved_alternatives=payload.approved_alternatives,
        case_sensitive=payload.case_sensitive,
        notes=payload.notes
    )
    db.add(term)
    db.commit()
    db.refresh(term)

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CREATE_TERMINOLOGY_RULE",
        target_type="Terminology",
        target_id=term.id,
        details={"preferred": term.preferred_term, "prohibited": term.prohibited_term}
    )
    db.add(audit)
    db.commit()

    return term

@router.delete("/{term_id}")
def delete_terminology(
    term_id: int,
    current_user: User = Depends(require_roles(["Admin", "Manager"])),
    db: Session = Depends(get_db)
):
    term = db.query(Terminology).filter(
        Terminology.id == term_id,
        Terminology.organization_id == current_user.organization_id
    ).first()
    if not term:
        raise HTTPException(status_code=404, detail="Terminology rule not found")
    db.delete(term)
    db.commit()
    return {"message": "Rule removed successfully"}

