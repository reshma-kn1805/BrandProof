from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, BrandAsset, AuditLog
from backend.auth import get_current_user, require_roles
from backend.schemas import BrandAssetOut, BrandAssetCreate

router = APIRouter(prefix="/api/assets", tags=["Brand Asset Management"])

@router.get("/", response_model=List[BrandAssetOut])
def list_assets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(BrandAsset).filter(
        BrandAsset.organization_id == current_user.organization_id
    ).all()

@router.post("/", response_model=BrandAssetOut)
def create_asset(
    payload: BrandAssetCreate,
    current_user: User = Depends(require_roles(["Admin", "Manager", "Reviewer"])),
    db: Session = Depends(get_db)
):
    asset = BrandAsset(
        organization_id=current_user.organization_id,
        title=payload.title,
        asset_type=payload.asset_type,
        file_url=payload.file_url,
        alt_text=payload.alt_text,
        guidelines_notes=payload.guidelines_notes,
        status="active"
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="ADD_BRAND_ASSET",
        target_type="BrandAsset",
        target_id=asset.id,
        details={"title": asset.title, "type": asset.asset_type}
    )
    db.add(audit)
    db.commit()

    return asset

