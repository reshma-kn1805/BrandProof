# BrandProof

> **"No citation, no flag. No verified evidence, no automatic approval."**

BrandProof is an enterprise-grade brand governance and content compliance verification platform. It enables marketing teams, compliance officers, and brand managers to verify marketing copy, packaging, and digital assets against approved guidelines, factual claim ledgers, and visual standards prior to publication.

---

## 🌐 Live Application & Access

- **Live URL**: [https://reshma-kn1805.github.io/BrandProof/](https://reshma-kn1805.github.io/BrandProof/)
- **Source Code**: [https://github.com/reshma-kn1805/BrandProof](https://github.com/reshma-kn1805/BrandProof)
- **API Documentation**: [docs/API.md](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/docs/API.md) | [docs/openapi.json](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/docs/openapi.json)

> [!NOTE]
> **Live Link Behavior**: When the backend server is reachable, the live web application connects to the real REST API and persists data to PostgreSQL/SQLite. If the backend is waking from cold sleep, the interface displays a *"Waking the server, one moment"* status and retries with backoff for up to 60 seconds. If the backend cannot be reached, the application gracefully degrades to a clearly labeled **Demo Mode** with sample data in the browser so judges can evaluate every view, workflow, and improvement without disruption.

---

## ⏱️ 3-Minute Judge Evaluation Guide

To experience the complete verification lifecycle in 3 minutes:

1. **Sign In**:
   - Open [https://reshma-kn1805.github.io/BrandProof/](https://reshma-kn1805.github.io/BrandProof/).
   - Click the **1-Click Demo** button for **Creator (Arjun Mehta)**.
2. **Submit Copy & Catch Violations**:
   - Navigate to **New Review** in the sidebar.
   - Click **"Load Violation Sample"** to load the golden sample copy:
     > *"Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now."*
   - Toggle **Confidential Mode (PII Redaction)** on to preview redaction tokens.
   - Click **"Run Brand Verification"**. The engine catches all 4 violations with verified clause citations:
     - **Clause 4.1**: Prohibited hyphenation (`Millet-Mix` $\rightarrow$ `Millet Mix`).
     - **Clause 3.4 & Fact F-07**: Unbacked ranking claim (`India's #1` expired March 2024).
     - **Clause 3.6**: Prohibited medical guarantee (`Guaranteed to cut sugar cravings`).
     - **Clause 2.1**: High-pressure urgency phrase (`Buy now.`).
3. **Accept Corrections & Pre-Check**:
   - Click **"Accept"** on each finding card in any order.
   - Notice that suggestions are pre-checked to prevent introducing new violations and text merges seamlessly without token doubling.
   - The compliance health score recalculates live to **100%**.
4. **Custom Edit & Rejection Reasons**:
   - On any finding, test **"Edit"** to type a custom correction (it re-verifies against the rule engine before accepting).
   - Test **"Reject"** and select a mandatory business reason (e.g., `brand_voice_exception` or `legal_preapproved`).
5. **Manager Sign-Off & Public Certificate**:
   - Switch role to **Manager (Vikram Patel)** via the top navigation switcher.
   - Click **"Approve & Sign Off"**.
   - Download the tamper-evident **PDF Compliance Report** stamped with its SHA-256 fingerprint.
6. **Verify Audit Trail & Guideline Health**:
   - Open **Audit Log** in the sidebar: verify the green **SHA-256 Hash Chain Integrity** badge.
   - Open **Guideline Health**: view clause override rates, detected conflicting clauses, and the backtesting simulator.
   - Open **Verify Report**: input the report fingerprint to verify its cryptographic proof against the live ledger.

---

## 🌟 Key Features & Round 3 Improvements

### Improvement 1: Guideline Health, Telemetry & Policy Backtesting
- **Override Telemetry**: Tracks every creator rejection and custom edit per clause. Clauses with override rates $>40\%$ are automatically flagged as ambiguous or outdated.
- **Clause Conflict Detector**: Identifies contradictory rules across guidelines (e.g., formal naming rules vs. headline length restrictions).
- **Policy Backtesting Simulator**: Evaluates proposed rule changes against historical reviews before pushing updates live.

### Improvement 2: Visual Asset Accessibility & Contrast Engine
- **WCAG 2.1 AA Contrast**: Calculates relative luminance ratios ($\ge 4.5:1$) on uploaded graphic assets using Pillow color quantization.
- **Palette Verification**: Measures CIE76 Euclidean color distance ($\Delta E \le 12.0$) against approved brand colors.
- **Alt-Text Governance**: Enforces screen-reader accessibility on marketing visuals.

### Improvement 3: Privacy-Preserving AI & Tamper-Evident Audit
- **Zero-Trust PII Redaction**: Replaces emails, phone numbers, currencies, 8+ digit numbers, and confidential terms with tokens (`[REDACTED_*]`) before calling external AI providers. Original tokens are restored in the response.
- **Cryptographic Audit Hash Chain**: Every audit row is mathematically linked via SHA-256:
  $$\text{entry\_hash} = \text{SHA-256}(\text{canonical\_json}(\text{entry}) + \text{prev\_hash})$$
  Detects any unauthorized database modifications or retroactive row deletions.
- **Verifiable PDF Certificates**: Generates tamper-evident compliance certificates verifiable on the public `/verify-report` portal.

---

## 💻 Local Development Setup

BrandProof can be run locally using Docker or directly on Python 3.11+ and Node.js 18+.

### Option A: Running with Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/reshma-kn1805/BrandProof.git
   cd BrandProof
   ```
2. Build and run the containers:
   ```bash
   docker build -t brandproof-backend .
   docker run -p 8000:8000 brandproof-backend
   ```
3. Open `http://localhost:8000/docs` to inspect the API.

---

### Option B: Running without Docker

#### 1. Backend Setup
```bash
# From the repository root
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server (seeds Nila Foods workspace automatically)
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend initializes the SQLite database (`brandproof.db`) and seeds the demo workspace automatically.

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` to customize settings:

| Variable | Default Value | Description |
|:---|:---|:---|
| `ENV` | `development` | Application mode (`development`, `test`, `production`). In production, missing `JWT_SECRET_KEY` halts startup. |
| `DATABASE_URL` | `sqlite:///./brandproof.db` | SQLAlchemy connection string (supports SQLite and PostgreSQL). |
| `JWT_SECRET_KEY` | *(Generated in dev)* | Secret key for JWT signing. Must be set in production (`openssl rand -hex 32`). |
| `CORS_ORIGINS` | `https://reshma-kn1805.github.io` | Comma-separated list of allowed origins. |
| `GEMINI_API_KEY` | *(Optional)* | Google Gemini API key for external LLM suggestion generation. |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model name. |
| `OPENAI_API_KEY` | *(Optional)* | OpenAI API key fallback. |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model name. |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Backend API URL for frontend builds. |

---

## 🧪 Running Tests

All 59 backend tests are self-contained and run against an isolated in-memory test database:

```bash
# Run full backend test suite
python -m pytest tests -q --ignore=tests/test_playwright_e2e.py
```

Expected result:
```text
59 passed, 39 warnings in 38.41s
```

Continuous integration runs automatically on every push via `.github/workflows/ci.yml`.

---

## 🚀 Deployment Architecture

- **Backend**: Hosted on Render as a containerized web service with PostgreSQL on Neon. Includes a scheduled GitHub Action keep-warm ping (`.github/workflows/keep-warm.yml`).
- **Frontend**: Exported as static HTML/CSS/JS (`NEXT_EXPORT=true`) and deployed to GitHub Pages via `.github/workflows/deploy.yml`.
- See [docs/DEPLOYMENT.md](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/docs/DEPLOYMENT.md) for step-by-step instructions.

---

## ⚠️ Known Limitations & Trade-offs

1. **Free-Tier Cold Starts**: Cloud services on free tiers sleep when idle. The frontend includes automatic polling and an instant offline demo fallback.
2. **Local Browser Test Execution**: Playwright end-to-end browser tests run in CI rather than low-spec local development machines to avoid browser launch timeouts.
3. **Complex Photographic Contrast**: Dominant color quantization is tuned for branded digital assets and text graphics; photographic scenes with intricate backgrounds require human review.

---

## 📚 Technical Documentation

- **[System Architecture](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/docs/ARCHITECTURE.md)**: Diagrams, pipeline flow, and hardest problems solved.
- **[REST API Reference](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/docs/API.md)**: Endpoint listings, request bodies, error codes, and OpenAPI schema.
- **[Verification & Testing](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/docs/TESTING.md)**: Real test counts, golden permutation results, and resolved bugs.
- **[Product Roadmap](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/docs/ROADMAP.md)**: Post-Round 3 capabilities, target audience, and effort estimations.
- **[Round 3 Changelog](file:///c:/Users/reshm/OneDrive/Desktop/BrandProof/docs/ROUND3_CHANGELOG.md)**: Comprehensive record of commits since `round2-final`.
