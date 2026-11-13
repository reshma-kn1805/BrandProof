# BrandProof Round 3 Changelog

This changelog records all updates, architecture additions, and verification suites implemented since tag `round2-final` (`478d30a`), grouped strictly by development phase.

---

## Phase 1: Safe, Reproducible Baseline
**Primary Commit**: `4b56d5b`
- **Security**: Removed hard-coded JWT secret keys. Implemented dynamic `JWT_SECRET_KEY` environment reading, automatic ephemeral secret generation with warning in development mode, and fail-fast startup enforcement in production mode (`ENV=production`).
- **Startup Idempotency**: Refactored database initialization and seed logic in `backend/database.py` to ensure schema migrations and Nila Foods demo workspace seeding are completely idempotent and safe across arbitrary restarts.
- **Self-Contained Test Fixtures**: Created isolated SQLite in-memory test databases in `tests/conftest.py`, ensuring all backend tests pass cleanly on a fresh clone without requiring a pre-started server.
- **Continuous Integration**: Added `.github/workflows/ci.yml` covering backend pytest execution and frontend static export builds (`NEXT_EXPORT=true`).
- **Resilient AI Configuration**: Added configurable model parameters (`GEMINI_MODEL`, `OPENAI_MODEL`) with graceful fallback to deterministic local rule engines when providers are unconfigured or return errors.

---

## Phase 2: Live Deployment, Persistence & Graceful Degradation
**Primary Commit**: `2f17175`
- **API Connectivity Probe**: Replaced GitHub Pages demo-forcing logic in `frontend/src/lib/api.ts` and `frontend/src/app/page.tsx`. App probes `GET /api/health` with a 6-second timeout; if cold, shows a friendly "Waking the server, one moment" state with backoff retries for up to 60 seconds before gracefully falling back to offline demo mode.
- **PostgreSQL & CORS Support**: Added PostgreSQL support (`postgresql+psycopg2://`) with `psycopg2-binary` dependency. Implemented CORS origin validation via `CORS_ORIGINS` environment variable (including `https://reshma-kn1805.github.io`).
- **Deployment Infrastructure**: Added production `Dockerfile`, Render blueprint `render.yaml`, Neon/Render step-by-step guide in `docs/DEPLOYMENT.md`, and automated 14-minute wake-up ping workflow in `.github/workflows/keep-warm.yml`.
- **System Health Endpoint**: Added `/api/health` endpoint returning database connectivity status and AI provider configuration flags.

---

## Phase 3: Robustness, Error Handling & Workflow Guards
**Commits**: `c9b4fdd`, `161692e`, `450a0fc`, `5141795`
- **Global Error Handling**: Added FastAPI exception handlers returning uniform JSON errors (`{"error": {"code": "...", "message": "..."}}`).
- **Strict Input Validation**: Enforced Pydantic validation on text inputs (non-empty trimmed text, maximum 50,000 characters). File uploads restricted to `.docx`, `.pdf`, `.txt` up to 5 MB with magic byte content sniffing.
- **Workflow Guards & Idempotency**: Atomic database transactions for multi-step writes. Finding actions (`accept`, `reject`, `edit`) and approval actions are strictly idempotent. Status transitions validated to prevent approving or rejecting locked drafts.
- **Rate Limiting**: In-memory token bucket rate limiting on `/api/reviews/submit` (15/min) and `/api/auth/login` (10/min).
- **Frontend Usability**: Added React `ErrorBoundary`, loading spinners on submit/action buttons, empty states with clear calls-to-action, request timeouts, and state preservation across browser refreshes.

---

## Phase 4: Suggestion Engine & Review Collaboration
**Commits**: `0527640`, `113ec24`, `0c1dbc8`, `8c2ecaa`
- **Phrase-Level Suggestion Rewriter**: Re-engineered correction engine to replace flagged phrases with fluent, grammatical substitutes without word doubling. Added 24-permutation golden tests (`test_golden_suggestions.py`) verifying 100% compliance regardless of action order.
- **Suggestion Pre-Checking**: Before rendering corrections, suggestions are tested against the rule engine. Proposed edits that would introduce unbacked claims or violate other guidelines are automatically suppressed and marked "Needs human review".
- **Structured Finding Rejections**: Rejection requires selecting a categorized reason (`brand_voice_exception`, `legal_preapproved`, `inaccurate_detection`, `other`) and optional rationale.
- **Inline Custom Edits**: Authors can provide custom text edits that are immediately re-verified against guidelines before acceptance.
- **"Ask Manager" Collaboration**: Built threaded comment discussions on individual findings with an explicit manager inquiry flag (`is_manager_question`).

---

## Phase 5: Improvement 3 — Privacy-Preserving AI & Tamper-Evident Audit
**Commits**: `c124108`, `39fe395`, `6442f99`, `1ca5fbd`, `d04f66b`
- **Confidential Mode & Redaction Engine**: Regex and token-based redaction engine replacing emails, Indian/international phone numbers, currencies, 8+ digit sequences, `[[ brackets ]]`, and workspace confidential terms with `[REDACTED_*]` tokens before transmitting copy to AI providers. Tokens are seamlessly re-substituted upon response.
- **Transparency Disclosure Log**: `ai_calls` table tracking AI provider requests, latencies, model versions, and redaction counts without storing sensitive content.
- **Tamper-Evident Audit Hash Chain**: Implemented SHA-256 cryptographic linkage across all audit log rows:
  $$\text{entry\_hash} = \text{SHA-256}(\text{canonical\_json}(\text{entry}) + \text{prev\_hash})$$
  Exposed `/api/audit/verify` endpoint to prove immutability and detect chain corruption.
- **Verifiable PDF Compliance Reports**: Built ReportLab PDF generator creating branded compliance certificates with embedded SHA-256 fingerprints, verifiable on the public `/verify-report` portal.

---

## Phase 6: Improvement 1 — Guideline Health, Telemetry & Backtesting
**Commits**: `b39ce58`, `9636025`, `eeca1e1`
- **Guideline Telemetry**: Added `/api/guidelines/health` endpoint calculating override frequencies per clause across all reviews. Automatically flags clauses with >40% override rates as candidates for revision.
- **Clause Conflict Detection**: Semantic analysis detecting contradictory rule requirements across guideline clauses.
- **Policy Backtesting Simulator**: Added `/api/guidelines/clauses/{clause_id}/backtest` to evaluate proposed clause modifications against past reviews, projecting false positive reductions and team impact before publishing.

---

## Phase 7: Improvement 2 — Visual Asset Accessibility & Contrast Engine
**Primary Commit**: `5d453c5`
- **Deterministic Image Analysis**: Pillow-based image analyzer inspecting uploaded visual assets.
- **WCAG Contrast Validation**: Color quantization and luminance calculations computing contrast ratios against WCAG 2.1 AA thresholds ($\ge 4.5:1$).
- **Palette Enforcement**: Delta-E ($\Delta E \le 12.0$) color distance calculations ensuring graphic elements match approved brand colors.
- **Alt-Text Governance**: Enforces descriptive alternative text on all embedded marketing images.

