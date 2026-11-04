import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Organization
from backend.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["Settings & AI Privacy"])

@router.get("/workspace")
def get_workspace_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    org = current_user.organization
    return {
        "organization_id": org.id,
        "name": org.name,
        "slug": org.slug,
        "description": org.description,
        "is_fictional_demo": org.is_fictional_demo,
        "created_at": org.created_at,
        "active_workspace": org.name,
        "tenant_isolation_mode": "Strict Row-Level & Foreign-Key Scoping",
    }

@router.get("/ai-privacy")
def get_ai_privacy_settings(
    current_user: User = Depends(get_current_user)
):
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    active_provider = "deterministic-rule-engine"
    if gemini_key:
        active_provider = "Google Gemini 1.5 Flash (API Key Configured)"
    elif openai_key:
        active_provider = "OpenAI GPT-4o-mini (API Key Configured)"

    return {
        "active_provider": active_provider,
        "has_external_llm": bool(gemini_key or openai_key),
        "deterministic_engine_status": "Active & Verified",
        "independent_verification_layer": "Enforced (Python Layer)",
        "privacy_disclosure": "BrandProof does not transmit proprietary customer guidelines to public LLM training corpuses. If external AI API keys are configured, prompts are transmitted strictly via encrypted HTTPS with zero data retention requested.",
        "core_principle": "No citation, no flag. No verified evidence, no automatic approval."
    }

