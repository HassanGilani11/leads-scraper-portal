# LeadPulse • Australian Lead Scraper & Apollo Enrichment SaaS Portal

A full-stack, enterprise-grade Local Business Lead Generation, Deep Firmographics Enrichment, and Website Audit Platform built for the Australian market (NSW, VIC, QLD, WA, SA, TAS, ACT).

---

## Key Capabilities

- **Ultra-Fast Google Maps Crawler**: Multi-suburb scraper powered by Playwright Chromium with zero per-place roundtrips.
- **Dual-Layer Enrichment Engine**:
  - **Deep Website Crawler**: Extracts verified business emails, mobile/landline numbers, Australian ABN (`ABN 9268 4585 546`), contractor license numbers (`Lic: 460999C`), social profiles (LinkedIn, Facebook, Instagram), and CMS tech stack.
  - **Apollo.io REST API**: Live decision-maker lookups (`Owner`, `Director`), founding year, employee headcount, and 47+ corporate keywords.
- **Safe Hourly Rate Limiter & Domain Cache**: Automated token bucket budget (180 calls/hr) + SQLite domain caching to preserve Apollo API credits without hitting HTTP 429 lockouts.
- **Website Technical Audit & PDF Pitch Generator**: Audits payment gateways (Stripe, Afterpay, ZipPay, PayPal), shipping carriers (AusPost, Sendle, DHL), and marketing pixels (GA4, Meta Pixel), generating a client-facing vector PDF audit dossier and personalized cold email draft.
- **Live Terminal & WebSocket Log Streaming**: Real-time progress monitoring directly in the Next.js 14 dashboard.
- **18-Field Leads Explorer Vault**: Advanced filtering, search, modal dossier view, and CSV export.

---

## Tech Stack

- **Backend**: FastAPI (Python 3.11+), Playwright, SQLAlchemy, SQLite, BeautifulSoup4, ReportLab, WebSockets.
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons.
- **Deployment**: Docker & Railway / Vercel.

---

## Project Structure

```
LeadsScraperPortal/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/    # REST endpoints (scrapes, leads, settings, audit, ws)
│   │   ├── core/             # Database & Config settings
│   │   ├── models/           # SQLAlchemy models (Job, Lead, ApolloCache, AuditReport)
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Scraper, enrichment, audit & PDF services
│   ├── Dockerfile            # Production Docker configuration (Playwright + Python)
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js 14 App Router (Dashboard, Leads Vault, Settings)
│   │   ├── components/       # LeadModal, LogViewer, StatsCard
│   │   ├── lib/              # API client, WebSocket & utility helpers
│   │   └── types/            # TypeScript interfaces
│   └── package.json
└── README.md
```

---

## Local Development Setup

### 1. Backend

```bash
cd backend

# Create virtual environment (optional)
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies & Playwright browser
pip install -r requirements.txt
playwright install chromium

# Setup environment variables
cp .env.example .env
# Edit .env and paste your Apollo API Key

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be live at `http://localhost:8000` (API Docs: `http://localhost:8000/docs`).

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Start Next.js dev server
npm run dev
```

Frontend will be live at `http://localhost:3000`.

---

## Deploying to Railway.com

### Step 1: Deploy Backend on Railway

1. Go to [Railway.com](https://railway.com) and click **"New Project"** -> **"Deploy from GitHub repo"**.
2. Select `HassanGilani11/leads-scraper-portal`.
3. Set the **Root Directory** for the service to `backend`.
4. Railway will automatically detect `backend/Dockerfile` with Playwright Chromium.
5. In **Variables**, add:
   - `APOLLO_API_KEY`: `your_apollo_api_key`
6. Click **Generate Domain** under **Settings -> Networking** (e.g., `https://leads-scraper-backend.up.railway.app`).

### Step 2: Deploy Frontend on Railway (or Vercel)

1. In Railway, click **"+ New Service"** -> **"GitHub Repo"** -> Select same repository.
2. Set the **Root Directory** to `frontend`.
3. In **Variables**, add:
   - `NEXT_PUBLIC_API_BASE`: `https://your-backend-railway-url.up.railway.app/api`
4. Deploy the frontend service and generate a public domain.

---

## License

MIT License. Designed for B2B Lead Generation & Agency Cold Outreach in Australia.
