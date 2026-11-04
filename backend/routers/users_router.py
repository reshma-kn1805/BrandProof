from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.auth import get_current_user, require_roles
from backend.schemas import UserOut

router = APIRouter(prefix="/api/users", tags=["Team & Roles"])

@router.get("/", response_model=List[UserOut])
def list_team_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(
        User.organization_id == current_user.organization_id
    ).order_by(User.full_name.asc()).all()

    return [
        UserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            organization_id=u.organization_id,
            organization_name=current_user.organization.name if current_user.organization else None,
            is_active=u.is_active
        )
        for u in users
    ]

@router.put("/{user_id}/role")
def update_user_role(
    user_id: int,
    new_role: str,
    current_user: User = Depends(require_roles(["Admin"])),
    db: Session = Depends(get_db)
):
    valid_roles = ["Creator", "Reviewer", "Manager", "Admin"]
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")

    target_user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.role = new_role
    db.commit()
    return {"message": f"Updated {target_user.full_name}'s role to {new_role}"}

