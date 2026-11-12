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
---

## [Phase 3] Robustness, Guards, Idempotency & Error Handling
- **Timestamp**: 2026-11-12 10:25:00 IST
- **Status**: Completed & Verified
- **Key Changes**:
  - `backend/schemas.py`: Implemented robust Pydantic input validation across all request schemas, ensuring all text inputs are trimmed, rejecting empty or whitespace-only submissions, and enforcing a 50,000-character upper bound.
  - `backend/document_parser.py`: Implemented strict file upload guards (5 MB max size, 0-byte check, content magic byte validation for `.pdf` `%PDF` and `.docx` `PK\x03\x04`, with descriptive friendly errors for empty, oversized, corrupt, or unsupported files).
  - `backend/rate_limiter.py`: Implemented sliding-window in-memory rate limiting on `/api/auth/login` (10/min) and `/api/reviews/submit` (30/min) returning HTTP 429 with retry-after guidance.
  - `backend/main.py`: Configured global exception handlers formatting `HTTPException`, `RequestValidationError`, and unexpected exceptions as `{"error": {"code": "...", "message": "..."}}`.
  - `backend/routers/reviews_router.py`: Wrapped multi-step draft submissions and approvals in single atomic database transactions. Enforced finding action idempotency (accept/reject on already-actioned findings returns current state without duplicate revisions). Added review status guards blocking illegal transitions on finalized reviews and preventing approval with unresolved critical violations.
  - `frontend/src/components/ErrorBoundary.tsx`: Implemented global React error boundary rendering *"Something went wrong. Reload or go back to the dashboard."* with reload and navigation controls.
  - `frontend/src/app/page.tsx`: Wrapped application in `<ErrorBoundary>`, implemented deep link capture in `sessionStorage` (`brandproof_return_view`) with automatic redirection on authentication, and preserved offline demo mode selections across browser page reloads.
  - `frontend/src/lib/api.ts`: Added 20-second timeout via `AbortController`, graceful `AbortError` handling, and extraction of structured backend error messages.
  - `frontend/src/components/ReviewsView.tsx`, `ApprovalQueueView.tsx`, `AuditLogView.tsx`: Added meaningful empty states with clear calls to action, and retry buttons on network errors.
  - `frontend/src/components/ReviewDetailView.tsx`: Added button disabling with spinners for finding actions and decision confirmations, and retry buttons on network failure.
  - `tests/test_phase3_guards.py`: Added 12 unit tests covering empty/whitespace input, 50k character limit, empty files, oversized files, corrupt DOCX, corrupt PDF, unsupported extensions, finding action idempotency, approval idempotency, review status guards, and login rate limiting.
  - `tests/test_playwright_e2e.py`: Added Playwright browser E2E test verifying rapid double-click handling and page reload persistence across Guidelines, Facts Ledger, Terminology, Content Reviews, and Review Detail views.
- **Verification Results**:
  - `python -m pytest tests -q`: 19 passed, 110 warnings in 15.65s (all baseline, guard, and E2E tests).
  - `python tests/test_engine_unit.py`: 100% verified (all 4 phases passed).
  - `python tests/test_phase2_verification.py`: All 9 full-lifecycle production steps passed.
  - Manual edge cases:
    - Empty input: HTTP 422 `{'error': {'code': 'VALIDATION_ERROR', 'message': 'content: Review content cannot be empty or whitespace only'}}`.
    - 1 MB paste (1,035,000 chars): HTTP 422 `{'error': {'code': 'VALIDATION_ERROR', 'message': 'content: Review content cannot exceed 50000 characters'}}`.
    - Corrupt DOCX upload: HTTP 400 `{'error': {'code': 'HTTP_400', 'message': 'Corrupt file: The uploaded file has a .docx extension but lacks valid Word document headers.'}}`.
    - Double-click accept: Click 1 HTTP 200 (revisions: 2), Click 2 HTTP 200 (revisions: 2, 0 duplicate revisions).
    - Page refresh on every page: Verified persistent across Guidelines, Facts, Terminology, Reviews, and Review Detail.
  - Frontend static export (`NEXT_EXPORT=true npm run build`): Compiled and exported successfully with 0 errors.

---

## [Phase 4] Feature Completion, Suggestion Engine & Human Workflows
- **Timestamp**: 2026-11-12 12:45:00 IST
- **Status**: Completed & Verified
- **Key Changes**:
  - `backend/engine/text_replacer.py`: Implemented phrase-level text replacement with grammatical fluency normalization: automatically eliminates duplicate adjacent words (e.g. `Nila Nila` -> `Nila`) and multi-word phrases (e.g. `healthy breakfast healthy breakfast` -> `healthy breakfast`), fixes punctuation spacing (`!` / `.` / `,`), and enforces sentence capitalization.
  - `backend/engine/deterministic_engine.py`: Updated scanning rules to target full phrase/clause spans: brand prefix expansion for terminology (`Nila Millet-Mix` -> `Nila Millet Mix`), trailing noun phrase expansion for superlatives (`India's #1 healthy breakfast` -> `a healthy breakfast`), sentence-cased fact-backed guarantee replacements (`Made with 5 whole millets.`), and clean imperative tone correction (`Discover our blend.`).
  - `backend/engine/suggestion_prechecker.py`: Implemented pre-flight suggestion validation: dry-runs candidate replacements against the deterministic engine, validates numerical and health claims against approved active facts in the facts ledger (`F-12`), and withholds unsafe suggestions as `"Needs a human look"` if new violations or unbacked claims are introduced.
  - `backend/engine/review_pipeline.py`: Integrated `pre_check_suggestions()`, labeled findings with `engine_source` ("deterministic" vs "ai") and `is_ai_assisted`, and flagged findings as `needs_human_look` when suggestions are withheld.
  - `backend/models.py` & `backend/schemas.py`: Added `reject_reason`, `reject_note`, `engine_source`, `is_ai_assisted`, `needs_human_look` to `ReviewFinding`; added `finding_id` foreign key and `comment_type` ("general", "finding", "ask_manager") to `ReviewComment`.
  - `backend/database.py` & `backend/main.py`: Added `migrate_columns()` to idempotently execute `ALTER TABLE ADD COLUMN` for SQLite and PostgreSQL across restarts.
  - `backend/routers/reviews_router.py`:
    - Enforced mandatory `reject_reason` validation on finding rejections with persistent audit logging.
    - Added real-time re-verification on creator `edit` action, rejecting edits with HTTP 400 if they introduce brand violations.
    - Switched finding replacement to `apply_clean_replacement()`.
    - Extended `/comments` endpoint with finding linkage (`finding_id`) and `"ask_manager"` thread creation, setting review `requires_human_attention=True` and logging `ASK_MANAGER_THREAD`.
  - `frontend/src/lib/api.ts`: Updated API interfaces and mock store for reject reasons, edit verification, finding comments, and Ask Manager threads in demo mode.
  - `frontend/src/components/ReviewDetailView.tsx`:
    - Added Reject Finding Modal with reason selector ("False positive", "Approved exception", "Contextually permitted", "Will rephrase manually", "Other") and optional note.
    - Added Edit Finding Modal with live error display and re-verification feedback.
    - Displayed `✨ AI-Assisted` badges and `Needs a human look` labels with withheld rewrites.
    - Added inline finding comment and "Ask Manager" discussion thread component.
    - Enhanced comments feed with `Ask Manager Thread` and `Finding #{id}` badges.
  - `tests/test_golden_suggestions.py`: Added comprehensive permutation test suite verifying all 24 ordering permutations of accepting 4 sample findings result in 100% compliance score, 0 violations, and exact golden text: `"Nila Millet Mix is a healthy breakfast! Made with 5 whole millets. Discover our blend."`.
  - `tests/test_phase4_features.py`: Added 5 unit tests for suggestion withholding on unbacked claims, mandatory reject reason validation, custom edit re-verification rejection, finding comments and Ask Manager threads, and AI verifier dropping fabricated citations/quotes.
- **Verification Results**:
  - `python -m pytest tests -q`: 49 passed, 1030 warnings in 34.92s.
  - All 24 permutations in `tests/test_golden_suggestions.py` passed (25/25 tests).
  - Real backend sample end-to-end execution:
    - Input: `"Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."`
    - Initial violations: 4 (Score: 20.0).
    - Sequential acceptance of all 4 findings -> Final Content: `"Nila Millet Mix is a healthy breakfast! Made with 5 whole millets. Discover our blend."`
    - Final violations: 0 (Score: 100.0).
  - AI Verification: Mocked verification test confirmed fabricated citations (e.g. Clause 99.9) and quotes not present in content are dropped per the "No citation, no flag" principle. Confirmed AI-assisted findings receive `is_ai_assisted=True` and `✨ AI-Assisted` badges in UI. Noted `GEMINI_API_KEY` was not present in environment during run.
  - Frontend static export (`NEXT_EXPORT=true npm run build`): Compiled and exported successfully with 0 errors.


