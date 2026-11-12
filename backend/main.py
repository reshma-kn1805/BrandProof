import os
from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.database import engine, Base, get_db
from backend.seed import seed_database
from backend.routers import (
    auth_router,
    guidelines_router,
    facts_router,
    terminology_router,
    assets_router,
    reviews_router,
    analytics_router,
    audit_router,
    users_router,
    settings_router,
)

app = FastAPI(
    title="BrandProof API",
    description="Evidence-first brand-governance & content verification platform. 'No citation, no flag.'",
    version="1.0.0"
)

# CORS configuration
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://reshma-kn1805.github.io",
]
cors_origins_env = os.getenv("CORS_ORIGINS", "")
origins = list(default_origins)
if cors_origins_env:
    for o in cors_origins_env.split(","):
        cleaned = o.strip()
        if cleaned and cleaned not in origins:
            origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router.router)
app.include_router(guidelines_router.router)
app.include_router(facts_router.router)
app.include_router(terminology_router.router)
app.include_router(assets_router.router)
app.include_router(reviews_router.router)
app.include_router(analytics_router.router)
app.include_router(audit_router.router)
app.include_router(users_router.router)
app.include_router(settings_router.router)

# --- Global Exception Handlers Returning {"error": {"code": "...", "message": "..."}} ---
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": msg
            },
            "detail": msg
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_messages = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []) if loc != "body")
        raw_msg = err.get("msg", "Invalid value")
        # Remove Value error, prefix from pydantic custom messages
        clean_msg = raw_msg.replace("Value error, ", "").strip()
        if field:
            error_messages.append(f"{field}: {clean_msg}")
        else:
            error_messages.append(clean_msg)
    full_message = "; ".join(error_messages) if error_messages else "Invalid request data provided."
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": full_message
            },
            "detail": full_message
        }
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print(f"[Unhandled Error] {request.method} {request.url.path}: {exc}", flush=True)
    friendly_msg = "An unexpected server error occurred while processing your request. Please try again or contact support."
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": friendly_msg
            },
            "detail": friendly_msg
        }
    )

@app.on_event("startup")
def startup_event():
    # Create tables and auto-seed demo workspace
    Base.metadata.create_all(bind=engine)
    from backend.database import migrate_columns
    migrate_columns(engine)
    try:
        seed_database()
    except Exception as e:
        print(f"[Startup] Seed notice: {e}")

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    gemini_key = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    openai_key = bool(os.getenv("OPENAI_API_KEY"))
    ai_configured = bool(gemini_key or openai_key)

    is_healthy = db_status == "connected"
    return {
        "status": "healthy" if is_healthy else "degraded",
        "service": "BrandProof API",
        "version": "1.0.0",
        "tagline": "No citation, no flag.",
        "tenant_isolation": "enabled",
        "independent_verifier": "operational",
        "database": db_status,
        "ai_configured": ai_configured
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

