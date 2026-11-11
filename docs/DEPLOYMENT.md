# BrandProof Cloud Deployment Guide

This guide provides the exact, production-ready steps to connect BrandProof to a persistent cloud PostgreSQL database (Neon), deploy the FastAPI backend service (Render), and configure the Next.js frontend (GitHub Pages).

---

## 📋 Actionable Setup Checklist (Manual Steps for You)

Follow these 5 numbered steps in order:

1. **Step 1: Create a Free Neon PostgreSQL Database**
   - Navigate to [https://neon.tech](https://neon.tech) and sign up or sign in.
   - Click **Create Project**. Name the project `brandproof-db` and select the region nearest to you or your Render service (e.g., `US East` or `US West`).
   - On the Neon Dashboard, locate the **Connection Details** card.
   - Select **Connection string** (`Pooled` or direct) and ensure the dialect is `psql` or `Connection string`.
   - Copy the full URI (it will look like: `postgresql://neondb_owner:PASSWORD@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`).
   - Save this URL for Step 2.

2. **Step 2: Deploy Backend Web Service on Render**
   - Navigate to [https://render.com](https://render.com) and sign in with your GitHub account (`reshma-kn1805`).
   - Click the **New +** button in the top bar and select **Blueprint** (or **Web Service**).
   - If using **Blueprint**: Select the `reshma-kn1805/BrandProof` repository. Render will automatically parse `render.yaml`.
   - If deploying as a standard **Web Service**:
     - Connect your `BrandProof` repo.
     - Runtime: **Docker** (Render uses the root `Dockerfile`).
     - Instance Type: **Free**.
     - Health Check Path: `/api/health`.
   - Configure Environment Variables in the Render dashboard:
     - `ENV`: `production`
     - `DATABASE_URL`: *Paste the Neon PostgreSQL connection string copied in Step 1*.
     - `JWT_SECRET_KEY`: *Enter a secure random 64-character secret or let Render generate it*.
     - `CORS_ORIGINS`: `https://reshma-kn1805.github.io`
     - `GEMINI_API_KEY`: *(Optional) Your Google Gemini API Key for LLM review enhancement*.
     - `OPENAI_API_KEY`: *(Optional) Your OpenAI API Key*.
     - `GEMINI_MODEL`: `gemini-1.5-flash`
     - `OPENAI_MODEL`: `gpt-4o-mini`
   - Click **Create Web Service** (or **Apply Blueprint**).
   - Wait 2–3 minutes for the Docker container build to finish.
   - Once deployed, copy your service's public Render URL (e.g., `https://brandproof-api.onrender.com`).

3. **Step 3: Verify the Backend Health Check**
   - Open your browser or run curl to test the live health endpoint:
     ```bash
     curl https://<your-render-subdomain>.onrender.com/api/health
     ```
   - Confirm it returns HTTP 200 with JSON:
     ```json
     {
       "status": "healthy",
       "service": "BrandProof API",
       "version": "1.0.0",
       "tagline": "No citation, no flag.",
       "database": "connected",
       "ai_configured": true
     }
     ```

4. **Step 4: Configure GitHub Repository Variable for Frontend**
   - Open your GitHub repository in your browser: [https://github.com/reshma-kn1805/BrandProof](https://github.com/reshma-kn1805/BrandProof)
   - Click on **Settings** (top tabs).
   - In the left sidebar, click **Secrets and variables** -> **Actions**.
   - Select the **Variables** tab (Repository variables).
   - Click **New repository variable**.
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://<your-render-subdomain>.onrender.com` *(Do NOT include a trailing slash)*.
   - Click **Add variable**.

5. **Step 5: Trigger GitHub Pages Build & Test Live Application**
   - In your GitHub repository, click on the **Actions** tab.
   - Under Workflows on the left, select **Deploy BrandProof to GitHub Pages**.
   - Click **Run workflow** -> select branch `main` -> click **Run workflow** button (or push a commit to `main`).
   - When the workflow completes (green checkmark), open your live site:
     [https://reshma-kn1805.github.io/BrandProof/](https://reshma-kn1805.github.io/BrandProof/)
   - Authenticate with demo credentials (`creator@nilafoods.com` / `BrandProof2026!`).
   - Notice that data persists directly into your Neon PostgreSQL database!

---

## 🏗️ Architecture & Component Flow

```mermaid
flowchart LR
    A["GitHub Pages (Static Next.js 14)"] -->|"REST Calls (CORS)"| B["Render Web Service (FastAPI / Docker)"]
    B -->|"SQLAlchemy 2.0"| C["Neon Serverless PostgreSQL"]
    B -->|"Optional LLM Fallback"| D["Google Gemini / OpenAI"]
    E["GitHub Actions Keep-Warm Cron"] -->|"GET /api/health (Every 10 min)"| B
```

### 1. Database Layer (Neon Serverless PostgreSQL)
- **Engine**: PostgreSQL 16 (Serverless, auto-scaling).
- **Driver**: `psycopg2-binary` via SQLAlchemy 2.0.
- **Connection String**: Handles `postgres://` or `postgresql://` automatically, adding `pool_pre_ping=True` to seamlessly tolerate database sleeping states.
- **Auto-Seeding**: Idempotent startup logic in `backend/seed.py` creates tables and seeds the Nila Foods brand governance workspace without duplicating records.

### 2. Backend Container (Render Free Tier)
- **Runtime**: Docker image based on `python:3.11-slim`.
- **Health Check**: Configured to `/api/health`.
- **Port Dynamic Binding**: Uvicorn binds to `${PORT:-8000}`.
- **CORS Allow-List**: Validates incoming `Origin` against `https://reshma-kn1805.github.io` and origins specified in `CORS_ORIGINS`.

### 3. Frontend Static Export (GitHub Pages)
- **Build Engine**: Next.js 14 Static Export (`NEXT_EXPORT=true`).
- **Dynamic API Target**: Compiles `NEXT_PUBLIC_API_URL` at build time from the GitHub repository variable.
- **Server Waking & Fallback Protection**:
  - At startup, the frontend tests `${API_BASE}/api/health` with a 6-second timeout.
  - If the Render instance is spinning up from cold storage, displays a friendly *"Waking the server, one moment"* loader and retries with backoff for up to 60 seconds.
  - If unreachable after 60 seconds, gracefully falls back to browser-isolated demo mode with an explanatory notification banner. Real and demo data are strictly never mixed.

### 4. Keep-Warm Measure (GitHub Actions)
- Scheduled workflow `.github/workflows/keep-warm.yml` runs every 10 minutes.
- Sends an HTTP GET request to `${vars.NEXT_PUBLIC_API_URL}/api/health`.
- Keeps the free-tier Render container active, virtually eliminating cold-start latency for prospective evaluators.
