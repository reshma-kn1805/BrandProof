# BRANDPROOF ROUND 3: SPECIFICATION (single source of truth)

## 1. Situation
BrandProof is an evidence-first brand-governance platform ("No citation, no flag"). It checks content against approved guidelines and facts, shows the cited evidence for each finding, uses an independent verifier, and leaves approval to humans. It was built in Round 2 and is already in this repository.

This is **Round 3, the final round**. Window: **11:59 PM 10 Nov 2026 to 11:59 PM 13 Nov 2026 (IST), no extension.** The code freeze is **6:00 PM on 13 Nov**. Nothing may be pushed after 11:59 PM on 13 Nov.

A judge will open the live link **alone**, with nobody explaining anything. Judging (100 points): completeness 25, **the three improvements delivered 20**, reliability under normal use 20, usability and real-world fit 20, documentation and roadmap 15.

**Rules for you, the agent**
- Do not change direction. Finish and deepen what exists. Do not invent new product ideas.
- A feature that half-works is worse than one that is declared missing. If something cannot be finished and verified, tell me and mark it clearly in the UI and docs.
- Never fake results. Anything cached, simulated or seeded must be labelled in the UI.
- Make small, focused commits with clear messages as you go (conventional commits). Commit after every working step. Never rewrite history.
- Do not touch anything outside the task of the current phase. Never refactor for style.
- Do not commit secrets. Use environment variables and keep `.env.example` current.
- After every phase run the verification steps listed in the phase, and report **real** outputs. Never claim a pass you did not see.

## 2. Current state (verified by independent testing on 6 to 7 Nov 2026)
- **Repo layout:** `backend/` (FastAPI: `main.py`, `models.py`, `auth.py`, `database.py`, `document_parser.py`, `routers/`, `engine/`), `frontend/` (Next.js 14, `src/components/*View.tsx`, `src/lib/api.ts`, `src/lib/mockData.ts`), `tests/`, `docs/`, `.github/workflows/deploy.yml`.
- **Backend:** FastAPI, SQLAlchemy 2, SQLite file `brandproof.db` created and seeded at first start. 34 endpoints, 14 tables. bcrypt and JWT auth, 4 roles (Creator, Reviewer, Manager, Admin) enforced in the API.
- **Pipeline** (`backend/engine/`): `deterministic_engine.py` (5 offline rules), `evidence_retriever.py` (tenant-scoped SQL), `ai_review_engine.py` (optional Gemini or OpenAI, offline fallback), `verification_layer.py` (quote exists, clause active and in the same organisation, fact exists and expiry), `review_pipeline.py` (scoring: 100 minus 22 critical, 12 warning, 5 notice).
- **Frontend:** single-page Next.js app, static export on GitHub Pages. **Important:** `src/lib/api.ts` forces an in-browser **demo mode** (`isGitHubPages()` and `handleMockRequest`) on any production host, so the live link does **not** use the real backend, and data is lost on refresh. This is the biggest weakness.
- **Fixed on 7 Nov (commit 478d30a):** demo dashboard crash, demo version-comparison crash, and the `StaleDataError` on accepting a finding (a `db.flush()` before the bulk delete).
- **Seed workspace "Nila Foods" (fictional):** demo users `creator@nilafoods.com`, `reviewer@nilafoods.com`, `manager@nilafoods.com`, `admin@nilafoods.com`, password `BrandProof2026!`. 5 clauses (2.1, 3.4, 3.6, 4.1, 5.2), facts F-07 (expired), F-12, F-15.
- **Known problems to fix:**
  1. Live link runs the demo simulation, not the real engine.
  2. Accepted suggestions are naive text swaps and can read badly, for example "Nila Nila Millet Mix is a healthy breakfast healthy breakfast! made with 5 whole millets."
  3. Suggestions are not re-checked against the rules before they are shown.
  4. The AI path (Gemini `gemini-1.5-flash`, OpenAI `gpt-4o-mini`) was never exercised, and the model name may be retired.
  5. A default JWT secret is committed in `auth.py`.
  6. The engine test needs the backend started once before it can run (the database must exist).
  7. The "Audit Integrity: Signed" badge on the audit page must be made real or removed.
  8. Confidential mode, PDF report, image checks, clause-health scoring are not built.

## 3. The three improvements committed to in Round 2 (graded against this)
> If the participant's Round 2 wording differs from this, they will tell you and this section is updated first.

**Improvement 1: Guideline-health intelligence.** Learn from real review decisions: record rejected and edited suggestions with a reason, calculate an override rate per clause, flag frequently overridden clauses, detect two clauses that trigger on the same text across several drafts, show both clauses with example quotations, on a Guideline Health page. A manager can publish a reworded clause as a new guideline version.
*Done when:* a manager can open the page, see at least one unclear clause and one conflicting pair produced from review data, and publish a revised clause.
**Our deepening (still inside the commitment):** before publishing, the manager can **backtest** the reworded clause: the system replays past reviews against it and shows which findings would be added, removed or unchanged.

**Improvement 2: Image and accessibility checks.** Reviews cover uploaded images. Alt text is required. The WCAG colour-contrast ratio is calculated. An image's dominant colours are compared with the approved palette. Each issue is a finding that cites a clause and passes the same verifier as text findings, with a suggested fix such as the nearest approved colour.
*Done when:* an image with missing alt text, low contrast and an off-palette colour produces three cited findings, and a compliant image produces none.

**Improvement 3: Confidential mode and audit report.** A per-draft confidential mode redacts sensitive text (email addresses, phone numbers, amounts, text marked as confidential) before anything is sent to an AI service, shows a preview of exactly what would be sent, and restores the original text in the results. Each review can be exported as a PDF audit report with findings and citations, decisions and who made them, comments, revision history, and a disclosure of the AI services used.
*Done when:* a draft containing an email address and a phone number is reviewed with confidential mode on, the preview shows both redacted, and the exported PDF contains the full review record.
**Our deepening:** the audit log becomes **tamper-evident** (each entry hash-chained), the "Audit Integrity" badge reflects a real verification, and each exported report carries a fingerprint that can be checked on a verify page.

## 4. Reliability checklist (judge will do all of these)
Empty input, whitespace-only input, a 1 MB paste, an unsupported or empty or oversized file, double-clicking any button, the same action twice, refreshing on any page, opening a deep link while signed out, an expired session, the backend sleeping or unreachable, an AI provider error or timeout, switching roles mid-review, approving something twice. **Nothing may crash, hang or show a raw error.** Use friendly messages and a clear next action.

## 5. Usability checklist
A stranger must complete the main journey with no walkthrough: open the link, understand what it is within 10 seconds, enter as a demo role, submit the sample, understand each finding, accept or reject, submit for review, switch role and approve, see the audit log, open the report. Provide a first-run guide, empty states with a call to action, consistent labels, plain-language explanations of verification statuses, keyboard access, visible focus, text contrast at least 4.5:1, responsive layout down to tablet width.

## 6. Documentation and tests to deliver
`README.md` that lets a stranger clone and run in under 10 minutes (with and without Docker); `docs/ARCHITECTURE.md`; `docs/API.md`; `docs/DEPLOYMENT.md`; `docs/TESTING.md` (real results only); `docs/ROADMAP.md`; `docs/ROUND3_CHANGELOG.md` (what changed after Round 2, with commit hashes); `.env.example`. Tests: pytest for backend modules, Playwright end-to-end for the main journeys, GitHub Actions workflow running them.

## 7. Report format after every phase
PHASE n REPORT
Changed files: ...
What now works (with evidence): ...
Commands run and REAL output (tests, build, e2e): ...
What I could not finish or verify: ...
Commits: hash + message

## 8. Kickoff message
Read docs/ROUND3_SPEC.md fully. This is the final round of a hackathon and judges open the live link alone. Do not change direction; finish and deepen what exists. Work strictly one phase at a time: I will paste each phase prompt. After each phase run the verification steps, commit small and often, and give me the report in the format of section 7. Never claim a result you did not see. Confirm you have read the spec by listing the three improvements and the eight known problems in your own words, then wait for Phase 1.

