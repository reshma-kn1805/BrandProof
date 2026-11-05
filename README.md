# BrandProof

> **"No citation, no flag. No verified evidence, no automatic approval."**

BrandProof is an intelligent, evidence-first brand-governance and content compliance verification platform built for Round 2 of the hackathon. It empowers organizations to verify their marketing, packaging, and digital communications against approved brand guidelines, nutritional facts, registered trademarks, claims, and media assets before publication.

---

## 🚀 Live Deployed Links & Access

| Environment / Service | Live URL | Description & Access |
|---|---|---|
| **Live Public Web App** | **[https://brandproof-demo.loca.lt](https://brandproof-demo.loca.lt)** | **Public Live Deployed Instance** *(Tunnel Password if prompted: `157.49.225.16`)* |
| **Local Web Application** | **[http://localhost:3000](http://localhost:3000)** | Next.js 14 Web Frontend |
| **Backend REST API** | **[http://127.0.0.1:8000](http://127.0.0.1:8000)** | FastAPI Core Verification Service |
| **Interactive API Documentation** | **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)** | OpenAPI / Swagger Interface |
| **System Health Check** | **[http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)** | System & Verifier Status |
| **GitHub Repository** | **[github.com/reshma-kn1805/BrandProof](https://github.com/reshma-kn1805/BrandProof)** | Full Source Code & Architecture |

### 1-Click Free Cloud Deployment
Now that the GitHub repository is populated, you can deploy live with 1 click:
1. **Frontend (Vercel)**: Import `https://github.com/reshma-kn1805/BrandProof`, select **Root Directory**: `frontend`, and click **Deploy**.
2. **Backend (Render / Railway)**: Create a Web Service pointing to `https://github.com/reshma-kn1805/BrandProof`, build command: `pip install -r backend/requirements.txt`, start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.

---

## 1. Visual & Product Identity

BrandProof is designed following an intentional enterprise design system:

### Charcoal & Teal Palette
| Element | Hex Code | Purpose |
|---|---|---|
| **Primary Background** | `#EAF2F3` | Neutral page foundation & highlights |
| **Main Surface** | `#F7FAFA` | Elevated canvas for cards and tables |
| **Sidebar** | `#172E35` | Deep charcoal navigation shell |
| **Primary Teal** | `#328C91` | Primary interactive actions & accents |
| **Deep Teal** | `#205E65` | Secondary brand contrast & headers |
| **Dark Text** | `#172C32` | High-contrast readable typography |
| **Secondary Text** | `#63777C` | Metadata, captions, and labels |
| **Card Background** | `#FFFFFF` | Structured content cards |
| **Borders** | `#DCE7E8` | Subtle, restrained dividers |
| **Success / Valid** | `#1E7E51` | Conforming evidence & approved facts |
| **Warning** | `#B45309` | Tone inconsistencies & human review flags |
| **Critical / Expired** | `#B91C1C` | Prohibited naming, expired facts, ranking claims |

### Custom Geometric Logo & Wordmark
- **Hex-Shield Symbol**: Refined geometry combining a multi-faceted verification shield with a precision checkmark forming a stylized 'B' and 'P' monogram.
- **Wordmark**: Professional typography displaying `BrandProof Gov` with the official tagline *"No citation, no flag."*
- **Favicon**: Rendered in SVG at `frontend/public/favicon.svg`.

---

## 2. Multi-Stage Verification Pipeline Architecture

The core of BrandProof is a 6-stage verification engine:

```
[Stage 1: Content Ingestion]
   ├── Plain Text, DOCX, or PDF document parsing
   └── Document revision tracking & source preservation
         │
         ▼
[Stage 2: Deterministic Rule Engine] (100% Offline Capable)
   ├── Prohibited terminology scanner (e.g. "Millet-Mix" -> Clause 4.1)
   ├── Superlative & ranking claim detector (Clause 3.4)
   ├── Unverified therapeutic/health guarantee detector (Clause 3.6)
   ├── Brand tone sales-urgency detector (Clause 2.1)
   └── Expired fact cross-referencing (Fact F-07 expired Dec 31, 2025)
         │
         ▼
[Stage 3: Evidence Retrieval Layer]
   ├── Scoped strictly to the tenant organization workspace (Row-Level Isolation)
   └── Retrieves active clauses, unexpired facts, and approved alternatives
         │
         ▼
[Stage 4: AI-Assisted Contextual Review]
   ├── Evaluates contextual tone, subtle misleading claims, and author intent
   └── Structured JSON output strictly bound to valid organization clause & fact IDs
         │
         ▼
[Stage 5: Independent Verification Layer]
   ├── Verifies quoted text exists verbatim in submitted draft
   ├── Verifies cited clause exists, belongs to tenant, and is active
   ├── Verifies referenced fact exists and is unexpired (effective <= today <= expiry)
   └── If referenced fact is expired -> Flags as EXPIRED_FACT_DETECTED
         │
         ▼
[Stage 6: Confidence, Abstention & Scoring]
   ├── High Confidence + Valid Evidence -> Displays Verified Finding Card
   ├── Missing Evidence -> Abstains ("No citation, no flag")
   └── Computes overall compliance score (0 - 100%)
```

---

## 3. Fictional Demonstration Workspace: Nila Foods

BrandProof includes a pre-seeded, fictional demonstration workspace called **Nila Foods**, a healthy breakfast brand.

### Configured Brand Guidelines
- **Clause 2.1 (Brand Voice)**: Tone must remain warm, grounded, and authentic. Aggressive urgency (*"Buy now"*, *"Hurry"*) is strictly prohibited.
- **Clause 3.4 (Claims & Advertising)**: Superlative claims (*"#1"*, *"India's best"*) require current, third-party certification.
- **Clause 3.6 (Health & Nutrition)**: Medical promises (*"Guaranteed to cut sugar cravings"*) are prohibited without clinical approval.
- **Clause 4.1 (Terminology)**: The registered trademark is *"Nila Millet Mix"*. Hyphenated variants (*"Millet-Mix"*) are prohibited.
- **Clause 5.2 (Accessibility)**: Media assets and imagery must provide descriptive alternative text for screen readers.

### Approved Facts Ledger
- **Fact F-07**: *"Top 3 in breakfast cereal category (Retail Audit 2024)"* — **EXPIRED on 31 December 2025**. (Invalidated as evidence).
- **Fact F-12**: *"Made with 5 whole millets (Foxtail, Ragi, Bajra, Jowar, Little Millet)"* — **VALID until 31 December 2027**.

### Demonstration Verification Scenario
Submit the test draft via the 1-Click test button:
> *"Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."*

The engine automatically catches:
1. **Clause 4.1 Flag**: Prohibited term `"Millet-Mix"` (Suggests registered mark `"Nila Millet Mix"`).
2. **Clause 3.4 & Fact F-07 Flag**: `"India's #1"` relies on market audit evidence; Fact F-07 expired on 31 Dec 2025. Marked as `EXPIRED FACT DETECTED`.
3. **Clause 3.6 Flag**: `"Guaranteed to cut sugar cravings"` is an unverified health guarantee. Suggests replacement using verified Fact F-12 (`"made with 5 whole millets"`).
4. **Clause 2.1 Flag**: `"Buy now."` violates brand tone urgency rules. Suggests `"Discover our blend."`

Accepting these suggestions safely transforms the draft into:
> *"Nila Millet Mix: a healthy breakfast made with 5 whole millets."*
Which re-runs the engine and achieves a **100% Compliance Score**!

---

## 4. User Roles & Demonstration Accounts

All demonstration accounts use the password: `BrandProof2026!`

| Role | Email | Responsibilities |
|---|---|---|
| **Creator** | `creator@nilafoods.com` | Creates drafts, runs review engine, accepts/edits suggestions. Cannot approve. |
| **Reviewer** | `reviewer@nilafoods.com` | Audits findings, adds notes, requests changes. |
| **Manager** | `manager@nilafoods.com` | Holds final publication sign-off authority. Approves/rejects. |
| **Admin** | `admin@nilafoods.com` | Manages guidelines, approved facts, terminology rules, and team roles. |

---

## 5. Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Backend**: Python 3.14 / 3.11+, FastAPI, Pydantic v2, SQLAlchemy.
- **Database**: SQLite (zero-config local persistence), PostgreSQL / pgvector ready via `DATABASE_URL`.
- **Document Processing**: `python-docx` for Word documents, `pypdf` for PDF documents.
- **Security**: Bcrypt password hashing, PyJWT bearer token authorization.

---

## 6. Quick Start & Execution Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.11+)

### 1. Backend Setup & Startup
```powershell
# Open terminal in project root
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run unit tests to verify the pipeline
python tests/test_engine_unit.py

# Start the FastAPI backend server on port 8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend automatically creates tables, seeds the Nila Foods demonstration workspace, and provides the health endpoint at `http://127.0.0.1:8000/api/health`.

### 2. Frontend Setup & Startup
```powershell
# Open a second terminal in the frontend directory
cd frontend

# Start the Next.js development server
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 7. Testing Verification

Run the verified test suite anytime:
```powershell
.\.venv\Scripts\python tests/test_engine_unit.py
```
Output:
```
--- [1/4] Database Verification ---
Total Guideline Clauses in DB: 5
  -> Guideline clauses 2.1, 3.4, 3.6, 4.1, 5.2 verified.
  -> Fact F-07 (Expired 2025) and Fact F-12 (Valid 2027) verified.

--- [2/4] Deterministic Review Engine Test ---
Deterministic scan found 5 issues:
  1. [4.1] Prohibited Terminology: 'Millet-Mix' -> 'Millet-Mix'
  2. [3.4] Unsupported Ranking Claim & Expired Fact: 'India's #1'
  3. [3.6] Unverified Health Guarantee: 'Guaranteed to cut sugar cravings'
  4. [2.1] Tone Inconsistency: Aggressive Sales Urgency 'Buy now.'

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

---

## 8. License & Integrity Statement

This software was engineered specifically for Round 2 of the hackathon. It complies with all data privacy guidelines: proprietary customer guidelines are never exposed to public LLM training data. Final publication decisions strictly require human authorization.
