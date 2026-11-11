# BrandProof Round 3 Execution Log

This document tracks phase-by-phase execution, timestamps, changes, and verification for Round 3.

---

## [Phase 1] Safe, Reproducible Baseline
- **Timestamp**: 2026-11-11 19:45:00 IST
- **Status**: Completed & Verified
- **Tag Verification**: Confirmed `round2-final` exists at `478d30a` on remote repository.
- **Key Changes**:
  - `backend/auth.py`: Removed hardcoded JWT secret. Reads `JWT_SECRET_KEY` from environment. In dev (`ENV != "production"`), generates an ephemeral secret and logs a warning. In prod (`ENV == "production"`), fails fast with `RuntimeError` if missing.
  - `.env.example`: Updated with documented keys for `JWT_SECRET_KEY`, `ENV`, `GEMINI_MODEL`, and `OPENAI_MODEL`.
  - `backend/seed.py`: Made table creation and Nila Foods workspace seeding idempotent using `db.get_bind()` and duplicate existence checks across all models.
  - `tests/conftest.py` & `tests/test_engine_unit.py`: Made test runs self-contained on fresh temporary databases, seeding tables automatically so `pytest` and engine unit tests run without prior server execution.
  - `.github/workflows/ci.yml`: Added GitHub Actions CI pipeline running backend tests (Python 3.11) and frontend static build (`NEXT_EXPORT=true npm run build`, Node 20).
  - `backend/engine/ai_review_engine.py`: Made Gemini/OpenAI models configurable via `GEMINI_MODEL` and `OPENAI_MODEL` environment variables. Added error/timeout resilience falling back to offline rules without crashing.
  - `frontend/src/components/ReviewDetailView.tsx`: Added AI unavailable fallback banner display when review notes indicate external AI provider fallback.
- **Verification Results**:
  - `python -m pytest tests -q`: 6 passed, 88 warnings in 8.31s.
  - `python tests/test_engine_unit.py`: All 4 phases passed (100% engine verification).
  - Production fail-fast test: `RuntimeError: FATAL: JWT_SECRET_KEY environment variable must be set when ENV=production.` verified.
  - Frontend build: `NEXT_EXPORT=true npm run build` compiled and exported successfully (0 errors).

---

## [Phase 2] Real Backend Integration, Persistence & Graceful Degradation
- **Timestamp**: 2026-11-11 20:02:00 IST
- **Status**: Completed & Verified
- **Key Changes**:
  - `frontend/src/lib/api.ts`: Replaced `isGitHubPages()` demo mode forcing. Reads `NEXT_PUBLIC_API_URL` at build time. Added `checkBackendHealth(timeoutMs)` probing `/api/health`. In real mode, calls hit the live API; if 401 occurs, safely clears token and dispatches session expiration. Never silently mixes real and mock data.
  - `frontend/src/app/page.tsx`: Implemented backend waking probe (6s timeout initial ping). If cold/sleeping, displays friendly *"Waking the server, one moment"* screen and retries with backoff for up to 60s before falling back to demo mode with banner: `"Demo mode: sample data in your browser. The full engine could not be reached."` Added localStorage persistence for `brandproof_active_view` and `brandproof_selected_review_id`, maintaining active view across page refreshes.
  - `frontend/src/components/AuthModal.tsx`: Added `sessionExpiredMessage` rendering for seamless session expiration feedback.
  - `backend/main.py`: Configured CORS allow-list with `CORS_ORIGINS` support and included `https://reshma-kn1805.github.io`. Updated `/api/health` to report `database: "connected"` and `ai_configured: bool`.
  - `backend/database.py`: Added support for PostgreSQL dialect normalization (`postgres://` and `postgresql://` -> `postgresql+psycopg2://`) with `pool_pre_ping=True`.
  - `backend/requirements.txt`: Added `psycopg2-binary>=2.9.9`.
  - `Dockerfile`: Added production container specification for backend web service.
  - `render.yaml`: Added Render Blueprint specification with `/api/health` check and production environment variables.
  - `docs/DEPLOYMENT.md`: Created deployment guide with 5-step numbered checklist for Neon PostgreSQL, Render backend, and GitHub Pages frontend.
  - `.github/workflows/deploy.yml`: Updated to pass `NEXT_PUBLIC_API_URL` from GitHub repository variable `vars.NEXT_PUBLIC_API_URL`.
  - `.github/workflows/keep-warm.yml`: Created 10-minute scheduled workflow pinging `/api/health` to prevent cold starts.
  - `README.md`: Documented keep-warm measure.
- **Verification Results**:
  - Full-lifecycle production verification (`tests/test_phase2_verification.py`): All 9 steps passed (health check, creator login, draft submission, finding acceptances, manager approval, persisted database reload, 401 session expiration).
  - Offline backend simulation (`tests/test_offline_fallback.js`): Gracefully returned false in 48ms, showing waking retry and fallback banner without crash.
  - `python -m pytest tests -q`: 6 passed, 88 warnings in 7.40s.
  - `python tests/test_engine_unit.py`: 100% verified.
  - Frontend static export (`NEXT_EXPORT=true npm run build`): Compiled and exported successfully with 0 errors.
