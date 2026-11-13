# BrandProof API Documentation

BrandProof exposes a complete RESTful API built with **FastAPI**. All endpoints are versioned under `/api/` and output standard JSON responses. In addition to programmatic JSON schemas, the interactive OpenAPI specification is exportable and viewable at `/docs` (Swagger UI) or `/redoc`.

The complete machine-readable OpenAPI schema is persisted at [docs/openapi.json](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/docs/openapi.json).

---

## 1. Authentication & Security

BrandProof uses standard **OAuth2 Bearer Tokens (JWT)**.
To access protected endpoints, supply the authorization header:
```http
Authorization: Bearer <access_token>
```

### Endpoints
- `POST /api/auth/login`: Authenticate with email and password (`OAuth2PasswordRequestForm` or JSON). Returns access token and user profile. Rate limited (max 10 requests per minute).
- `POST /api/auth/token`: RFC 6749 standard token exchange.
- `POST /api/auth/register`: Register a new user in the workspace.
- `GET /api/auth/me`: Fetch authenticated user profile and permissions.
- `GET /api/auth/demo-users`: Retrieve seed user accounts for 1-click workspace demonstrations (Creator, Reviewer, Manager, Admin).

---

## 2. Reviews & Verification Pipeline

- `POST /api/reviews/submit`: Submit text copy for compliance analysis. Validates non-empty input (max 50,000 characters). Supports `confidential_mode: true` with automatic PII redaction. Rate-limited.
- `POST /api/reviews/upload`: Upload `.docx`, `.pdf`, or `.txt` document (max 5 MB). File is validated by content sniffing (magic bytes) to prevent corrupt uploads.
- `GET /api/reviews/`: List review submissions with filters for status, search query, and pagination.
- `GET /api/reviews/{review_id}`: Retrieve full review details, including compliance score, clause findings, suggested corrections, pre-check status, and comments.
- `POST /api/reviews/{review_id}/findings/{finding_id}/action`: Execute an idempotent decision on a finding (`action: "accept" | "edit" | "reject"`).
  - `edit`: Requires `edited_text`, re-verifies text against guidelines before updating.
  - `reject`: Requires `reject_reason` (e.g., `brand_voice_exception`, `legal_preapproved`, `inaccurate_detection`) and optional comment.
- `POST /api/reviews/{review_id}/comments`: Post a finding-specific comment or manager inquiry thread (`is_manager_question: true`).
- `POST /api/reviews/{review_id}/assign-reviewer`: Assign a team reviewer to a draft review.
- `POST /api/reviews/{review_id}/decision`: Record Manager approval or rejection (`decision: "approved" | "rejected"`). Requires Manager role. Guarded by review status checks.
- `POST /api/reviews/redaction-preview`: Preview PII redaction token mapping and counts before submission.
- `GET /api/reviews/{review_id}/report.pdf`: Generate and stream a tamper-evident PDF compliance report with SHA-256 fingerprint.
- `POST /api/reviews/verify-report`: Public verification endpoint to authenticate a report's SHA-256 fingerprint against the cryptographic audit log.

---

## 3. Guideline Governance & Health Engine (Improvement 1)

- `GET /api/guidelines/`: List all guidelines and sections.
- `GET /api/guidelines/clauses`: List individual clauses with severity, category, and health status.
- `POST /api/guidelines/clauses`: Create a new guideline clause.
- `PUT /api/guidelines/clauses/{clause_id}`: Update clause details and trigger version comparison.
- `POST /api/guidelines/upload`: Upload PDF or DOCX brand book to ingest and parse guideline clauses.
- `GET /api/guidelines/compare-versions`: Diff two guideline versions showing added, modified, and deprecated clauses.
- `GET /api/guidelines/health`: Retrieve guideline health telemetry:
  - Override rates per clause across reviews.
  - High-override warnings (override rate > 40%).
  - Conflicting clause pairs detected through contradictory text rules.
  - Unclear clause detection.
- `POST /api/guidelines/clauses/{clause_id}/backtest`: Simulate revising a clause against past reviews to calculate impact and false positive rate changes.
- `POST /api/guidelines/clauses/{clause_id}/publish-revision`: Commit a revised clause with historical telemetry tracking.

---

## 4. Brand Facts & Terminology Ledger

- `GET /api/facts/`: List verified facts with claim statements, source documents, effective dates, and expiration dates.
- `POST /api/facts/`: Register a verified brand claim.
- `PUT /api/facts/{fact_id}`: Update fact validity and expiration dates.
- `GET /api/terminology/`: Retrieve approved, preferred, and prohibited brand terms.
- `POST /api/terminology/`: Add term definitions with suggested replacements.
- `DELETE /api/terminology/{term_id}`: Deprecate or remove brand term.

---

## 5. Tamper-Evident Audit & AI Privacy (Improvement 3)

- `GET /api/audit/`: List cryptographically linked audit log entries.
- `GET /api/audit/verify`: Verify the integrity of the audit log SHA-256 hash chain:
  $$\text{entry\_hash} = \text{SHA-256}(\text{canonical\_json}(\text{entry}) + \text{prev\_hash})$$
  Returns chain integrity status, verified row count, and any broken links.
- `GET /api/audit/ai-calls`: Query transparency log of external AI provider requests (model, latency, redactions applied, token counts; never raw PII or secret prompt payload).
- `GET /api/settings/ai-privacy`: Retrieve workspace-level redaction rules and confidential term lists.

---

## 6. System Health & Infrastructure

- `GET /api/health`: Comprehensive system health endpoint.
  - Returns `{"status": "ok", "database": "connected", "ai_configured": true|false}`.
  - Used by Render health checks and the frontend graceful degradation probe.

---

## 7. Global Error Format

All error responses from BrandProof follow a unified, user-friendly JSON schema:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Content must be between 1 and 50,000 characters."
  }
}
```
Standard error codes:
- `UNAUTHORIZED`: Invalid or expired authentication token.
- `FORBIDDEN`: Role lacks permission for this action (e.g. Creator attempting to approve).
- `VALIDATION_ERROR`: Pydantic schema validation failure or bad input format.
- `RATE_LIMIT_EXCEEDED`: Too many requests submitted in a 60-second window.
- `INVALID_STATE`: Operation attempted on a review not in the proper workflow state.
- `NOT_FOUND`: Resource does not exist.

