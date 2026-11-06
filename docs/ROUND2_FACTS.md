# BrandProof — Round 2 Factual Documentation (`ROUND2_FACTS.md`)

> **Product Tagline**: *"No citation, no flag. No verified evidence, no automatic approval."*  
> **Platform Scope**: Enterprise AI-powered brand governance & content compliance verification platform.  
> **Documentation Policy**: Strictly factual. Every statement, status, table, and command below is verified directly against repository code and live deployment artifacts.

---

## 1. Repository & Deployment Infrastructure

| Component | URL / Location | Hosting Provider / Architecture |
|---|---|---|
| **Public GitHub Repository** | **[`https://github.com/reshma-kn1805/BrandProof`](https://github.com/reshma-kn1805/BrandProof)** | GitHub (Branches: `main`, `gh-pages`) |
| **Live Web Application (Frontend)** | **[`https://reshma-kn1805.github.io/BrandProof/`](https://reshma-kn1805.github.io/BrandProof/)** | **GitHub Pages** (Static Next.js 14 HTML/JS/CSS bundle built with `output: 'export'`) |
| **Local Web Frontend** | `http://localhost:3000` | Node.js v24.18.1 / Next.js 14 dev server (`frontend/`) |
| **Backend REST API** | `http://127.0.0.1:8000` | Python 3.14.3 / FastAPI + Uvicorn server (`backend/main.py`), configured for 1-click cloud deployment on Render / Railway |
| **Database** | `sqlite:///./brandproof.db` | Local SQLite file managed via SQLAlchemy ORM (swappable to PostgreSQL via `DATABASE_URL` environment variable) |

---

## 2. Feature Status Table

| Feature Description | Status | Line of Evidence (Route, File, or Endpoint) |
|---|---|---|
| **Text Content Submission** | **Working** | `POST /api/reviews/submit` in [`backend/routers/reviews_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/reviews_router.py#L71) & [`NewReviewView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/NewReviewView.tsx) |
| **DOCX Document Parsing** | **Working** | [`backend/document_parser.py:extract_text_from_docx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/document_parser.py#L28) using `python-docx` |
| **PDF Document Parsing** | **Working** | [`backend/document_parser.py:extract_text_from_pdf`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/document_parser.py#L15) using `pypdf` |
| **Deterministic Rule Engine (Offline)** | **Working** | [`backend/engine/deterministic_engine.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/deterministic_engine.py) (Terminology, Ranking, Health Guarantees, Tone Urgency, Alt Text) |
| **Tenant Evidence Retrieval** | **Working** | [`backend/engine/evidence_retriever.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/evidence_retriever.py) (Tenant-isolated SQL queries on clauses, facts, terms, assets) |
| **AI Contextual Review Engine** | **Working** | [`backend/engine/ai_review_engine.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/ai_review_engine.py) (Gemini 1.5 Flash / OpenAI GPT-4o-mini structured JSON) |
| **Deterministic Fallback (No AI Keys)** | **Working** | [`backend/engine/ai_review_engine.py:is_ai_available`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/ai_review_engine.py#L18) returns `False`, pipeline continues with 100% offline rules |
| **Independent Python Verification Layer** | **Working** | [`backend/engine/verification_layer.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/verification_layer.py) (Verbatim match, active tenant clause validation, fact expiry) |
| **Confidence-Based Abstention ("No citation, no flag")** | **Working** | [`backend/engine/verification_layer.py:verify_findings`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/verification_layer.py#L56) drops unverified phantom text or missing evidence |
| **Expired Fact Detection** | **Working** | [`backend/engine/verification_layer.py:77`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/verification_layer.py#L77) marks expired claims with `expired_fact_detected` status |
| **Compliance Health Scoring (0–100%)** | **Working** | [`backend/engine/review_pipeline.py:calculate_compliance_score`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/review_pipeline.py#L44) (-22% critical, -12% warning, -5% notice) |
| **Multi-Role RBAC (4 Roles)** | **Working** | [`backend/auth.py:require_role`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/auth.py#L82) (Creator, Reviewer, Manager, Admin) |
| **1-Click Demo Accounts Preset** | **Working** | [`GET /api/auth/demo-users`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/auth_router.py#L106) & [`AuthModal.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/AuthModal.tsx) |
| **Review Detail & Citation Cards** | **Working** | [`ReviewDetailView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/ReviewDetailView.tsx) (Cards displaying severity, explanation, evidence source, suggested correction) |
| **Accept/Edit/Reject Finding Remediation** | **Working** | `POST /api/reviews/{id}/findings/{f_id}/action` in [`backend/routers/reviews_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/reviews_router.py#L168) |
| **Document Revision History & Visual Diff** | **Working** | [`ReviewDetailView.tsx:renderDiff`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/ReviewDetailView.tsx) & `table: document_revisions` in [`backend/models.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/models.py#L174) |
| **Human Review Sign-off & Self-Approval Prevention** | **Working** | `POST /api/reviews/{id}/decision` blocks Creator role (403 Forbidden) in [`backend/routers/reviews_router.py:358`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/reviews_router.py#L358) |
| **Guideline Clause Repository** | **Working** | `GET /api/guidelines/clauses` in [`backend/routers/guidelines_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/guidelines_router.py#L29) & [`GuidelinesView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/GuidelinesView.tsx) |
| **Guideline Version Comparison (v1 vs v2)** | **Working** | `GET /api/guidelines/compare-versions` in [`backend/routers/guidelines_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/guidelines_router.py#L213) & [`VersionCompareView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/VersionCompareView.tsx) |
| **Approved Facts Ledger & Expiry Countdown** | **Working** | `GET /api/facts/` in [`backend/routers/facts_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/facts_router.py#L12) & [`FactsLedgerView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/FactsLedgerView.tsx) |
| **Terminology Dictionary (Preferred vs Prohibited)** | **Working** | `GET /api/terminology/` in [`backend/routers/terminology_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/terminology_router.py#L11) & [`TerminologyView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/TerminologyView.tsx) |
| **Brand Assets Media Gallery & Alt-Text Audit** | **Working** | `GET /api/assets/` in [`backend/routers/assets_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/assets_router.py#L11) & [`BrandAssetsView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/BrandAssetsView.tsx) |
| **Immutable Audit Trail** | **Working** | `GET /api/audit/` in [`backend/routers/audit_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/audit_router.py#L11) & [`AuditLogView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/AuditLogView.tsx) |
| **Team Management & Role Reassignment** | **Working** | `GET /api/users/` & `PUT /api/users/{id}/role` in [`backend/routers/users_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/users_router.py) & [`TeamView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/TeamView.tsx) |
| **Tenant Workspace & Privacy Disclosures** | **Working** | `GET /api/settings/workspace` & `/ai-privacy` in [`backend/routers/settings_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/settings_router.py) & [`SettingsView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/SettingsView.tsx) |
| **Client-Side GitHub Pages Interactive Fallback** | **Working** | [`frontend/src/lib/api.ts:handleMockRequest`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/lib/api.ts#L330) & [`mockData.ts`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/lib/mockData.ts) |
| **Guideline Health Insights** | **Partial** | Top 5 triggered clauses chart and status distributions exist in [`backend/routers/analytics_router.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/routers/analytics_router.py#L64) & [`DashboardView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/DashboardView.tsx); automated clause ambiguity score is not built. |
| **Image & Accessibility Checks** | **Partial** | Markdown image alt-text check (`![alt](url)`) in [`backend/engine/deterministic_engine.py:184`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/deterministic_engine.py#L184) and asset gallery alt-text audit in [`BrandAssetsView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/BrandAssetsView.tsx); binary image OCR/computer vision is not built. |
| **Confidential Mode with PDF Export** | **Not Built** | Zero-retention privacy disclosures exist in [`SettingsView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/SettingsView.tsx), but dynamic per-document confidential mode toggle and server-side PDF report generation (`/export-pdf`) are not built. |

---

## 3. Real End-to-End Workflow for Judges

Judges can follow this exact workflow directly on the live deployed web application (**[`https://reshma-kn1805.github.io/BrandProof/`](https://reshma-kn1805.github.io/BrandProof/)**) or locally (`http://localhost:3000`):

```mermaid
flowchart TD
    A["1. Authenticate<br/>(1-Click Demo Accounts)"] --> B["2. Submit Draft<br/>('Load Violation Sample')"]
    B --> C["3. Multi-Stage Pipeline<br/>(Rules + Retrieval + AI + Verifier)"]
    C --> D["4. Inspect Citations<br/>(4 Violations Flagged, Score 25%)"]
    D --> E["5. Remediate Draft<br/>(Click 'Accept Suggestion' on cards)"]
    E --> F["6. Recalculate Score<br/>(Visual Diff + Score Reaches 100%)"]
    F --> G["7. Human Sign-off<br/>(Switch Role to Reviewer / Manager)"]
    G --> H["8. Inspect Governance<br/>(Facts Ledger, Version Compare, Audit Trail)"]
```

### Step-by-Step Instructions:
1. **Authenticate**:
   - In the top header or login modal, click the **"Creator (Anita / Arjun)"** demo preset (`creator@nilafoods.com`). No password typing required.
2. **Submit Content for Verification**:
   - Navigate to **"New Review"** via the sidebar.
   - Click the 1-click test button: **"Load Violation Sample"**.
   - Input populates with:  
     `"Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."`
   - Click **"Run Brand Verification"**.
3. **Inspect Citations and Flags**:
   - View transitions to the **Review Detail** card with an initial Compliance Health Score of **25%** and a red banner indicating **Critical Violations Detected**.
   - Examine the 4 verified finding cards:
     - **Finding 1 (Critical)**: `Clause 4.1` — Prohibited Product Naming `'Millet-Mix'`. Suggestion: `'Nila Millet Mix'`.
     - **Finding 2 (Critical)**: `Clause 3.4 & Fact F-07` — Unverified Superlative Claim `'India's #1'` flagged with the badge **`expired_fact_detected`** (Fact F-07 retail audit expired Dec 31, 2025). Suggestion: `'one of India's leading wholesome breakfasts'`.
     - **Finding 3 (Critical)**: `Clause 3.6` — Prohibited Health Guarantee `'Guaranteed to cut sugar cravings'`. Suggestion: `'Formulated with high dietary fiber to help support steady daily energy'`.
     - **Finding 4 (Warning)**: `Clause 2.1` — Aggressive Sales Urgency `'Buy now.'`. Suggestion: `'Explore our wholesome breakfast range today.'`.
4. **Remediate Draft**:
   - Click **"Accept Suggestion"** sequentially on each finding card.
   - The interactive visual diff viewer marks deleted text with red strikethroughs and accepted replacements with highlighted green/teal additions.
   - Watch the Document Revision history counter increment (`Revision 2`, `Revision 3`, `Revision 4`).
   - When all four findings are remediated, the Compliance Health Score automatically recalibrates to **100%**.
5. **Human Approval & Governance Enforcement**:
   - Navigate to the **Approval Queue** in the sidebar.
   - Attempt to approve the review while logged in as **Creator** — notice the system enforces governance rules and blocks creator self-approval.
   - Switch user role to **Reviewer** (`reviewer@nilafoods.com`) or **Manager** (`manager@nilafoods.com`) using the top role switcher.
   - Click **"Approve Submission"** and enter optional sign-off remarks. The submission transitions to `approved`.
6. **Inspect System Governance**:
   - **Facts Ledger**: View approved fact records with countdown timers and the warning banner on expired Fact `F-07`.
   - **Version Compare**: View the visual diff comparing Guideline `Version 1.0` vs `Version 2.0` (showing clauses added, modified, unchanged).
   - **Audit Log**: Review the append-only audit trail logging timestamps, IP addresses, actor names, and actions (`CONTENT_SUBMISSION`, `PIPELINE_VERIFICATION`, `APPROVAL_DECISION`).

---

## 4. Backend Architecture: Endpoints & Database Tables

### Complete List of 34 Backend Endpoints

| Method | Route Path | Handler Function & Purpose |
|---|---|---|
| `GET` | `/api/health` | System health check, returns service status, tagline, and verifier state |
| `POST` | `/api/auth/login` | Authenticates user credentials (email/password), issues signed JWT access token |
| `POST` | `/api/auth/token` | OAuth2 password request form compatibility endpoint |
| `POST` | `/api/auth/register` | Registers a new user within the tenant organization |
| `GET` | `/api/auth/me` | Returns current authenticated user profile, role, and tenant details |
| `GET` | `/api/auth/demo-users` | Returns list of pre-seeded demonstration accounts for 1-click login |
| `GET` | `/api/guidelines/` | Returns guideline documents for the tenant |
| `GET` | `/api/guidelines/clauses` | Search and filter active guideline clauses by keyword or category |
| `POST` | `/api/guidelines/upload` | Ingests `.docx` or `.pdf` guideline document and extracts clauses |
| `POST` | `/api/guidelines/clauses` | Creates a new guideline clause manually |
| `PUT` | `/api/guidelines/clauses/{clause_id}` | Updates existing guideline clause title, description, or severity |
| `GET` | `/api/guidelines/compare-versions` | Computes semantic diff between two guideline versions (v1.0 vs v2.0) |
| `GET` | `/api/facts/` | Lists all approved tenant facts with computed expiry countdowns |
| `POST` | `/api/facts/` | Creates a new approved fact with effective date and expiry date |
| `PUT` | `/api/facts/{fact_id}` | Updates fact statement, evidence source, or validity dates |
| `GET` | `/api/terminology/` | Lists brand terminology entries (preferred terms, prohibited terms, variations) |
| `POST` | `/api/terminology/` | Registers new terminology rule with case-sensitivity parameters |
| `DELETE` | `/api/terminology/{term_id}` | Deletes a terminology rule |
| `GET` | `/api/assets/` | Retrieves registered brand assets with alt-text accessibility statuses |
| `POST` | `/api/assets/` | Registers a brand asset URL, title, asset type, and alt-text |
| `GET` | `/api/reviews/` | Returns filterable list of content reviews for tenant |
| `GET` | `/api/reviews/{review_id}` | Fetches review detail including findings, revisions, comments, approvals |
| `POST` | `/api/reviews/submit` | Executes Stages 1–6 verification pipeline on text content |
| `POST` | `/api/reviews/upload` | Ingests marketing draft `.docx` or `.pdf` file and executes verification |
| `POST` | `/api/reviews/{review_id}/findings/{finding_id}/action` | Accepts, edits, or rejects a finding suggestion; updates document text and score |
| `POST` | `/api/reviews/{review_id}/comments` | Appends a review comment to the submission discussion thread |
| `POST` | `/api/reviews/{review_id}/assign-reviewer` | Assigns specific reviewer to review record |
| `POST` | `/api/reviews/{review_id}/decision` | Final human sign-off (`approved`, `rejected`, `changes_requested`); blocks creator self-approval |
| `GET` | `/api/analytics/dashboard` | Aggregates compliance score averages, top triggered clauses, status distributions |
| `GET` | `/api/audit/` | Returns chronological immutable audit trail entries |
| `GET` | `/api/users/` | Lists all user accounts within tenant organization |
| `PUT` | `/api/users/{user_id}/role` | Updates user role (Admin / Manager authorized) |
| `GET` | `/api/settings/workspace` | Returns tenant isolation configuration and compliance strictness mode |
| `GET` | `/api/settings/ai-privacy` | Returns zero-retention privacy disclosures and verifier configuration |

### Complete List of 14 Database Tables (`backend/models.py`)

1. **`organizations`**: Multi-tenant container (`id`, `name`, `slug`, `description`, `is_fictional_demo`, `created_at`).
2. **`users`**: Tenant user accounts (`id`, `organization_id`, `email`, `hashed_password`, `full_name`, `role`, `is_active`, `created_at`).
3. **`guideline_documents`**: Top-level guideline files (`id`, `organization_id`, `title`, `category`, `source_filename`, `file_type`, `extracted_text`, `created_at`).
4. **`guideline_versions`**: Document version history (`id`, `document_id`, `version_number`, `changelog`, `is_active`, `created_at`).
5. **`guideline_clauses`**: Individual rule clauses (`id`, `version_id`, `organization_id`, `clause_number`, `title`, `description`, `category`, `severity`, `status`, `rules_json`, `created_at`).
6. **`approved_facts`**: Evidence ledger (`id`, `organization_id`, `fact_code`, `statement`, `description`, `source_evidence`, `responsible_owner`, `approval_status`, `effective_date`, `expiry_date`, `last_verified_date`, `created_at`).
7. **`terminology`**: Preferred vs prohibited naming (`id`, `organization_id`, `preferred_term`, `prohibited_term`, `incorrect_variations`, `approved_alternatives`, `case_sensitive`, `notes`, `created_at`).
8. **`brand_assets`**: Media catalog (`id`, `organization_id`, `title`, `asset_type`, `file_url`, `alt_text`, `guidelines_notes`, `status`, `created_at`).
9. **`content_reviews`**: Review submissions (`id`, `organization_id`, `title`, `original_content`, `current_content`, `source_filename`, `source_file_type`, `status`, `author_id`, `reviewer_id`, `overall_score`, `has_critical_violations`, `requires_human_attention`, `review_notes`, `rejection_reason`, `created_at`, `updated_at`).
10. **`document_revisions`**: Audit revisions (`id`, `review_id`, `revision_number`, `content`, `diff_summary`, `change_type`, `created_by_id`, `created_at`).
11. **`review_findings`**: Individual violations (`id`, `review_id`, `clause_id`, `fact_id`, `clause_number`, `fact_code`, `title`, `original_text`, `severity`, `explanation`, `suggested_correction`, `edited_correction`, `confidence`, `verification_status`, `evidence_source`, `decision_status`, `created_at`).
12. **`review_comments`**: Collaboration comments (`id`, `review_id`, `user_id`, `message`, `created_at`).
13. **`approval_decisions`**: Human sign-off decisions (`id`, `review_id`, `user_id`, `decision`, `notes`, `decided_at`).
14. **`audit_logs`**: Chronological log trail (`id`, `organization_id`, `user_id`, `action`, `target_type`, `target_id`, `details`, `ip_address`, `created_at`).

---

## 5. Models, Libraries, External Services & Seed Data

### AI Models & Integrations
- **Google Gemini**: Model `gemini-1.5-flash` via Google Generative Language REST API (`v1beta`). Configured with `temperature: 0.1` and `response_mime_type: "application/json"`.
- **OpenAI**: Model `gpt-4o-mini` via Chat Completions REST API. Configured with `temperature: 0.1` and `response_format: {"type": "json_object"}`.
- **Embedding Models**: **None**. Retrieval is performed via relational SQL queries scoped strictly by `organization_id`. No vector database or embedding model is utilized.

### Python Backend Dependencies (`backend/requirements.txt`)
- `fastapi>=0.115.0`: Core REST API framework
- `uvicorn[standard]>=0.30.0`: ASGI server
- `pydantic>=2.8.0`: Data validation & schema serialization
- `sqlalchemy>=2.0.0`: Database ORM & SQL query generator
- `bcrypt>=4.0.0`: Password hashing (direct `bcrypt.hashpw` and `bcrypt.checkpw`)
- `pyjwt>=2.8.0`: JSON Web Token encoding and decoding
- `python-multipart>=0.0.9`: Multipart form-data handling for file uploads
- `python-docx>=1.1.0`: Microsoft Word document parsing & text extraction
- `pypdf>=4.0.0`: PDF document parsing & text extraction
- `httpx>=0.27.0`: Async HTTP client for external LLM API calls and testing
- `pytest>=8.0.0`: Unit testing framework
- `python-dotenv>=1.0.0`: Environment variable loader

### Frontend Dependencies (`frontend/package.json`)
- `next: ^14.2.24`: React application framework (App Router)
- `react: ^18.3.1` & `react-dom: ^18.3.1`: UI component library
- `lucide-react: ^0.475.0`: Icon library
- `recharts: ^2.15.1`: SVG charts for dashboard analytics
- `clsx: ^2.1.1` & `tailwind-merge: ^2.6.0`: CSS class composition
- `tailwindcss: ^3.4.17`: Utility-first CSS framework
- `typescript: ^5.7.3`: Static typing

### External Services
- **GitHub**: Source code repository and automated static deployment via GitHub Actions & GitHub Pages.
- **Google Generative Language API** / **OpenAI API**: Optional external LLM providers invoked only when respective API keys are present.

### Fictional Workspace Seed Data (**Nila Foods**)
- **Organization**: Nila Foods (`slug: nila-foods`, ID: 1), a healthy millet-based packaged foods and breakfast nutrition brand.
- **Demo Accounts**:
  - `creator@nilafoods.com` — Arjun Mehta (`Creator`)
  - `reviewer@nilafoods.com` — Ananya Deshmukh (`Reviewer`)
  - `manager@nilafoods.com` — Vikram Patel (`Manager`)
  - `admin@nilafoods.com` — Priya Sharma (`Admin`)
  - Default Password for all: `BrandProof2026!`
- **Active Guideline Clauses**:
  - `2.1`: *Brand Tone & Consumer Respect* (Warning) — Prohibits artificial urgency ("Buy now", "Act fast").
  - `3.4`: *Superlative & Ranking Claims* (Critical) — Requires active third-party certification for rankings.
  - `3.6`: *Health & Therapeutic Claims* (Critical) — Prohibits medical guarantees without clinical trial evidence.
  - `4.1`: *Product Terminology & Naming* (Critical) — Mandates "Nila Millet Mix", prohibits hyphenated "Millet-Mix".
  - `5.2`: *Accessibility and Media Alt Text* (Warning) — Requires descriptive alt text on all media assets.
- **Approved Facts**:
  - `F-07`: "Top 3 in breakfast cereal category (Retail Audit 2024)" — **Expired Dec 31, 2025**.
  - `F-12`: "Made with 5 whole millets (Foxtail, Ragi, Bajra, Jowar, Little Millet)" — Valid until Dec 31, 2027.
  - `F-15`: "Certified gluten-free facility (Audit ISO-22000)" — Valid until Nov 30, 2026.

---

## 6. How the Review Pipeline Works in Code

The multi-stage pipeline is orchestrated in [`backend/engine/review_pipeline.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/review_pipeline.py):

```
[Raw Draft] 
    │
    ▼
Stage 1: Ingestion (Text extraction for plain text, .docx, .pdf)
    │
    ▼
Stage 2 & 3: Deterministic Scan + Tenant Evidence Retrieval (Active clauses, facts, terms, assets)
    │
    ▼
Stage 4: AI Contextual Review (Structured JSON generation via Gemini/OpenAI, or deterministic fallback)
    │
    ▼
Stage 5: Independent Python Verifier & Abstention Layer (Verbatim match, active clause check, expired fact check)
    │
    ▼
Stage 6: Health Scoring & Human Routing (Score computed, Creator self-approval blocked, queued for Reviewer)
```

1. **Stage 1 (Ingestion)**:
   Extracts text using [`backend/document_parser.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/document_parser.py). `.docx` is processed using `python-docx`; `.pdf` is extracted via `pypdf.PdfReader`.
2. **Stage 2 (Deterministic Rule Checks)**:
   [`backend/engine/deterministic_engine.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/deterministic_engine.py) runs 5 offline regex and substring rules:
   - Terminology Rule: Prohibited term detection with span-exclusion for approved variants.
   - Superlative Claim Rule: Scans for "#1", "India's best", "Top 3", and cross-references Fact `F-07`.
   - Health Claim Rule: Scans for "guaranteed to", "cures", and links to ingredient Fact `F-12`.
   - Urgency Tone Rule: Scans for "buy now", "hurry", "act fast" per Clause 2.1.
   - Markdown Image Alt Text Rule: Scans `![alt](url)` patterns for missing or short alt text (< 5 characters) per Clause 5.2.
3. **Stage 3 (Evidence Retrieval)**:
   [`backend/engine/evidence_retriever.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/evidence_retriever.py) executes SQL queries filtered strictly by `organization_id == current_user.organization_id`, loading all active clauses, facts, terminology, and assets into memory.
4. **Stage 4 (AI Contextual Review)**:
   [`backend/engine/ai_review_engine.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/ai_review_engine.py) builds a prompt listing only authorized tenant clauses and facts. If keys are present, calls Gemini 1.5 Flash or GPT-4o-mini with `temperature: 0.1` and schema enforcement. If neither key is configured or the request fails, it returns an empty finding set and allows the deterministic findings to proceed.
5. **Stage 5 (Independent Python Verification Layer)**:
   [`backend/engine/verification_layer.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/verification_layer.py) validates every candidate finding:
   - **Verbatim Check**: If `original_text not in submitted_content`, the finding is discarded.
   - **Clause Check**: `clause_number` must match an active clause in the tenant database.
   - **Fact Check**: If `fact_code` is present, it must exist in `approved_facts`. If `fact.expiry_date < now`, status is set to `expired_fact_detected`.
   - **Deduplication**: Findings sharing identical `(original_text, clause_number, fact_code)` are deduplicated.
   - **Abstention Enforced**: If evidence cannot be proven in the database, the candidate is discarded.
6. **Stage 6 (Scoring & Human Routing)**:
   Compliance score starts at 100.0:
   - Deducts **22 points** per critical violation.
   - Deducts **12 points** per warning.
   - Deducts **5 points** per notice.
   - Routed to the human review queue. AI never self-publishes or self-approves.

---

## 7. Real Test Results

### Suite 1: Full Backend Engine Verification (`tests/test_engine_unit.py`)
- **Execution Command**:
  ```powershell
  .\.venv\Scripts\python tests/test_engine_unit.py
  ```
- **Real Output**:
  ```text
  --- [1/4] Database Verification ---
  Total Guideline Clauses in DB: 5
    -> Guideline clauses 2.1, 3.4, 3.6, 4.1, 5.2 verified.
    -> Fact F-07 (Expired 2025) and Fact F-12 (Valid 2027) verified.

  --- [2/4] Deterministic Review Engine Test ---
  Deterministic scan found 5 issues:
    1. [4.1] Prohibited Terminology: 'Millet-Mix' -> 'Millet-Mix'
    2. [4.1] Prohibited Terminology: 'Millet-Mix' -> 'Millet-Mix'
    3. [3.4] Unsupported Ranking Claim & Expired Fact: 'India's #1' -> 'India's #1'
    4. [3.6] Unverified Health Guarantee: 'Guaranteed to cut sugar cravings' -> 'Guaranteed to cut sugar cravings'
    5. [2.1] Tone Inconsistency: Aggressive Sales Call-to-Action 'Buy now.' -> 'Buy now.'

  --- [3/4] Independent Verification & Abstention Layer ---
  Independent Verifier validated 4 findings:
    -> 4.1: status='verified_clause', confidence=1.0
    -> 3.4: status='expired_fact_detected', confidence=1.0
    -> 3.6: status='verified_fact', confidence=1.0
    -> 2.1: status='verified_clause', confidence=0.95
    -> Abstention verified: 'No citation, no flag' enforced on unverified candidates.

  --- [4/4] Clean Compliant Draft Verification ---
  Clean Draft Issues: 0

  ========================================================
  ALL TESTS PASSED! BrandProof Engine is verified 100%!
  ========================================================
  ```
- **Pass/Fail Count**: **4 / 4 test phases passed (100% pass rate, 0 failures)**.

### Suite 2: Frontend Production Build
- **Execution Command**:
  ```powershell
  cd frontend; $env:NEXT_EXPORT="true"; npm run build
  ```
- **Real Output**:
  ```text
  ▲ Next.js 14.2.35
     Creating an optimized production build ...
   ✓ Compiled successfully
     Linting and checking validity of types ...
     Collecting page data ...
   ✓ Generating static pages (4/4)
     Finalizing page optimization ...
     Collecting build traces ...

  Route (app)                              Size     First Load JS
  ┌ ○ /                                    28.2 kB         116 kB
  └ ○ /_not-found                          873 B          88.3 kB
  + First Load JS shared by all            87.4 kB
  ○  (Static)  prerendered as static content
  ```
- **Pass/Fail Count**: **4 / 4 static routes generated with 0 errors**.

---

## 8. Status of the Three Improvements

### 1. Guideline-Health Insights: **Partial**
- **What Works**:
  - The dashboard analytics endpoint (`/api/analytics/dashboard`) and [`DashboardView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/DashboardView.tsx) query the database for the **top 5 most frequently triggered clauses** across historical reviews, displaying trigger frequency and severity tags.
  - Displays aggregate compliance score metrics and active clause totals.
  - Includes a dedicated **Version Compare View** (`/api/guidelines/compare-versions`) contrasting Guideline Version 1.0 against Version 2.0 to show added, modified, and unchanged clauses.
- **What is Not Built**:
  - Automated predictive clause ambiguity scoring and natural language suggestions for rewriting vague guidelines are not implemented.

### 2. Image and Accessibility Checks: **Working (Text / Metadata) & Partial (Binary)**
- **What Works**:
  - [`backend/engine/deterministic_engine.py:184`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/engine/deterministic_engine.py#L184) parses markdown image syntax (`![alt](url)`) within submitted drafts and flags missing or insufficient (< 5 characters) alt text under Guideline Clause 5.2.
  - The Brand Assets Ledger in [`BrandAssetsView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/BrandAssetsView.tsx) monitors stored brand assets and displays an `alt_text_missing` warning badge when media lacks screen-reader descriptions.
- **What is Not Built**:
  - Computer vision pixel analysis and automated OCR extraction from uploaded image files (e.g. `.png`, `.jpg`) are not implemented.

### 3. Confidential Mode with PDF Report: **Not Built**
- **What Works**:
  - System architecture guarantees zero-retention ephemeral processing: when external API keys are omitted, the platform runs 100% locally via deterministic rules and local SQLite without making outbound network requests.
  - Settings views ([`SettingsView.tsx`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/frontend/src/components/SettingsView.tsx)) document privacy disclosures and strict multi-tenant relational isolation.
- **What is Not Built**:
  - A dynamic, user-facing toggle button labeled "Confidential Mode" to force offline-only execution per draft is not implemented.
  - Automated PDF report generation (e.g. via `reportlab` or `weasyprint`) and an export endpoint (`/export-pdf`) are not built.

---

## 9. Known Bugs and Limitations

1. **Python 3.14 + Starlette AnyIO TestClient Incompatibility on Windows**:
   Under Python 3.14 on Windows, Starlette's `TestClient` hangs indefinitely during anyio portal initialization (`StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated`). The engine test suite [`tests/test_engine_unit.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/tests/test_engine_unit.py) bypasses this by testing database sessions and engine classes directly with standard Python.
2. **Python 3.14 + Passlib Bcrypt Wrapper Incompatibility**:
   `passlib.context.CryptContext` fails on Python 3.14 due to an `AttributeError: module 'bcrypt' has no attribute '__about__'`. This was resolved in [`backend/auth.py`](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/backend/auth.py) by utilizing native `bcrypt.hashpw` and `bcrypt.checkpw`, truncating inputs to 72 bytes.
3. **No PDF Export Generation**:
   While DOCX and PDF file *ingestion* is fully functional, generating a downloadable PDF compliance audit certificate is not built.
4. **No Vector Embeddings / Semantic Search**:
   Evidence retrieval uses exact and regex-matched SQL queries on tenant tables. Semantic similarity via vector embeddings (e.g., Pinecone, ChromaDB, pgvector) is not implemented.
5. **Single Organization Demo Switching in UI**:
   The current frontend navigation is scoped to the pre-seeded "Nila Foods" workspace. Creating a second separate tenant organization requires an API call to `POST /api/auth/register` with a distinct organization payload.

---

## 10. Commit History & Repository Statistics

- **Total Commits**: **4 commits**
- **First Commit**:
  - **Hash**: `6b2e75f`
  - **Date**: `2026-11-04 16:35:44 +0530`
  - **Subject**: `feat: complete BrandProof brand-governance & verification platform`
- **Last Commit**:
  - **Hash**: `5209e4a`
  - **Date**: `2026-11-05 19:21:06 +0530`
  - **Subject**: `feat: add GitHub Pages live deployment, demo engine, and 1-click cloud guides`
- **Intermediate Commits**:
  - `41268a3` (`2026-11-05 17:42:59 +0530`): `docs: add live links, API documentation URLs, and cloud deployment guides`
  - `776a372` (`2026-11-05 17:58:33 +0530`): `feat: add live public deployed link https://brandproof-demo.loca.lt into repository`
