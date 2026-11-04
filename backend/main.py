import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
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
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "*",
]

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

@app.on_event("startup")
def startup_event():
    # Create tables and auto-seed demo workspace
    Base.metadata.create_all(bind=engine)
    try:
        seed_database()
    except Exception as e:
        print(f"[Startup] Seed notice: {e}")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "BrandProof API",
        "version": "1.0.0",
        "tagline": "No citation, no flag.",
        "tenant_isolation": "enabled",
        "independent_verifier": "operational"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

