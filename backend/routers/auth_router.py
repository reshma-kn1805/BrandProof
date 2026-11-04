from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Organization
from backend.auth import verify_password, get_password_hash, create_access_token, get_current_user
from backend.schemas import UserRegister, UserLogin, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login_json(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": str(user.id), "role": user.role, "org_id": user.organization_id})
    user_out = UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        organization_name=user.organization.name if user.organization else None,
        is_active=user.is_active
    )
    return TokenResponse(access_token=token, user=user_out)

@router.post("/token", response_model=TokenResponse)
def login_oauth2(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": str(user.id), "role": user.role, "org_id": user.organization_id})
    user_out = UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        organization_name=user.organization.name if user.organization else None,
        is_active=user.is_active
    )
    return TokenResponse(access_token=token, user=user_out)

@router.post("/register", response_model=TokenResponse)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    # Check or create organization
    org = db.query(Organization).filter(Organization.name == payload.organization_name).first()
    if not org:
        slug = payload.organization_name.lower().replace(" ", "-")
        org = Organization(name=payload.organization_name, slug=slug)
        db.add(org)
        db.commit()
        db.refresh(org)

    new_user = User(
        organization_id=org.id,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role, "org_id": new_user.organization_id})
    user_out = UserOut(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        organization_id=new_user.organization_id,
        organization_name=org.name,
        is_active=new_user.is_active
    )
    return TokenResponse(access_token=token, user=user_out)

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        organization_id=current_user.organization_id,
        organization_name=current_user.organization.name if current_user.organization else None,
        is_active=current_user.is_active
    )

@router.get("/demo-users")
def get_demo_users():
    return {
        "workspace": "Nila Foods (Fictional Demo)",
        "users": [
            {
                "email": "creator@nilafoods.com",
                "role": "Creator",
                "full_name": "Arjun Mehta",
                "description": "Creates, uploads, and edits marketing and packaging drafts.",
                "password": "BrandProof2026!"
            },
            {
                "email": "reviewer@nilafoods.com",
                "role": "Reviewer",
                "full_name": "Ananya Deshmukh",
                "description": "Reviews findings, validates citations, requests changes, adds comments.",
                "password": "BrandProof2026!"
            },
            {
                "email": "manager@nilafoods.com",
                "role": "Manager",
                "full_name": "Vikram Patel",
                "description": "Holds sign-off authority; approves or rejects resubmitted campaigns.",
                "password": "BrandProof2026!"
            },
            {
                "email": "admin@nilafoods.com",
                "role": "Admin",
                "full_name": "Priya Sharma",
                "description": "Configures guidelines, approved facts, terminology, assets, and audit logs.",
                "password": "BrandProof2026!"
            }
        ]
    }

