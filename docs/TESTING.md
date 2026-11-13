# BrandProof Verification & Testing Report

This document records the exact test suite, commands, real counts, test scenarios, bug fixes, and verified results for the BrandProof platform.

---

## 1. Test Suite Summary & Execution

### Backend Test Execution
All backend unit, security, rule engine, and integration tests are self-contained and run against an isolated in-memory SQLite database (`tests/conftest.py`).

**Command**:
```bash
python -m pytest tests -q --ignore=tests/test_playwright_e2e.py
```

**Real Result**:
```text
59 passed, 39 warnings in 38.41s
```
*(Total collected: 60 tests including 1 Playwright end-to-end browser test).*

---

## 2. Test Coverage Breakdown

| Test File | Test Count | Scope & Verification Target |
|:---|:---:|:---|
| `tests/test_brandproof.py` | 6 | Core review lifecycle: health check, multi-role auth (Creator, Reviewer, Manager, Admin), expired fact detection, Nila Foods sample review, correction workflow, and human approval RBAC. |
| `tests/test_golden_suggestions.py` | 25 | **24-Permutation Golden Test**: Validates that accepting all 4 findings on the Nila Foods sample in **any of the 24 possible orders** ($4! = 24$) produces 100% compliant, grammatically clean text without duplicate tokens. |
| `tests/test_phase3_guards.py` | 12 | Input validation (whitespace, >50k char limit), upload sniffing (empty file, >5MB limit, corrupt docx/pdf, invalid extension), idempotency (double accept/reject), status transition guards, and login rate limiting. |
| `tests/test_phase4_features.py` | 5 | Suggestion pre-checking (suppresses unbacked claims), mandatory rejection reason storage, custom edit re-verification, threaded finding comments ("Ask Manager"), and AI hallucination filter. |
| `tests/test_phase5_features.py` | 4 | **Improvement 3**: PII regex redaction & token round-trip, SHA-256 tamper-evident audit hash chain integrity & corruption detection, ReportLab PDF generation with SHA-256 fingerprint, and confidential draft workflow. |
| `tests/test_phase6_features.py` | 3 | **Improvement 1**: Guideline health telemetry, override rate calculation ($(\text{rejects} + \text{edits}) / \text{total}$), contradictory clause conflict detection, and policy backtesting engine. |
| `tests/test_phase7_images.py` | 4 | **Improvement 2**: Missing alt-text detection, WCAG 2.1 AA luminance contrast calculations ($\ge 4.5:1$), approved palette distance ($\Delta E \le 12.0$), and compliant asset zero-finding verification. |
| `tests/test_playwright_e2e.py` | 1 | End-to-end browser journey: double-click submission prevention and refresh persistence. |

---

## 3. Key Issues Identified and Resolved

1. **Permutation Token Doubling**:
   - *Issue*: Applying sequential finding rewrites across overlapping sentence boundaries occasionally created doubled words (e.g., `"Nila Nila"` or `"healthy breakfast healthy breakfast"`).
   - *Fix*: Re-engineered `phrase_replacer.py` to identify grammatical clause boundaries, normalize surrounding punctuation, and re-tokenize strings before applying subsequent edits.
2. **Quantized Color Luminance Threshold**:
   - *Issue*: In initial image analyzer tests, single-pixel text fonts on a green card were anti-aliased into the background during color quantization, undercounting foreground luminance.
   - *Fix*: Refined `image_analyzer.py` color clustering to weight dominant color components and preserve high-contrast foreground layers.
3. **Database Migration Idempotency**:
   - *Issue*: Calling table creation multiple times on PostgreSQL could raise relation duplicate errors if not guarded.
   - *Fix*: Structured all database table creation and Nila Foods demo workspace seeding to execute conditionally and transactionally, ensuring idempotent restarts.
4. **JWT Secret Hardening**:
   - *Issue*: Development mode risked falling back to default static secrets.
   - *Fix*: Removed hard-coded secrets from `auth.py`. Added runtime check: in `ENV=production`, missing `JWT_SECRET_KEY` immediately aborts startup; in development, an ephemeral cryptographic key is generated with an explicit logger warning.

---

## 4. Honest Known Limitations & Current State

1. **Local Browser Test Constraints**:
   - Playwright end-to-end browser tests and Next.js static builds require headless Chrome subprocesses that encounter timeout overheads on resource-constrained local Windows development environments. These are automated in continuous integration via `.github/workflows/ci.yml`.
2. **Cloud Free-Tier Backend Cold Starts**:
   - The deployed backend hosted on Render's free tier spins down after periods of inactivity. The frontend includes an automated health probe (`GET /api/health`) that detects cold sleep, displays a friendly "Waking the server, one moment" message with backoff retries for up to 60 seconds, and gracefully falls back to an offline demo mode with a clear indicator banner if unreachable.
3. **Image Contrast Estimation**:
   - Image contrast analysis calculates contrast between the top two dominant colors in the image palette. While highly accurate for branded banners and badges, complex photographic compositions with intricate backgrounds require human visual confirmation.
