# SkillBridge AI

> **Stop guessing. Start growing.**
> AI-powered resume analysis and personalized 4-week learning roadmaps, built on Google Gemini.

SkillBridge AI reads your resume, maps it against 20 real-world job roles, scores your readiness across 300 weighted skill criteria, and generates a Gemini-crafted 4-week plan with curated YouTube / freeCodeCamp / MDN / Kaggle / GitHub resource links — all in under 5 seconds.

---

## Features

- **Resume parsing** — `pdfplumber` + Gemini extraction fused for maximum recall; confidence score surfaced to the user
- **20 role cards** — Data Analyst to Technical Writer, each with INR salary bands, top hiring companies, and trending-skill badges
- **Fuzzy gap analysis** — alias-aware matching (`React.js` = `ReactJS`), weighted scoring, matched / weak / missing verdicts, demand × learnability priority ranking
- **5-stage Gemini pipeline** — extraction → gap refinement → 4-week roadmap → skill explanations → coach / interview / ATS rewrite
- **Animated dashboard** — readiness gauge, Recharts skill radar, expandable 4-week timeline with live progress bars, PDF export, shareable read-only link
- **AI career coach** — floating chat widget with full gap context, rolling 8-message history
- **Mock interview generator** — 5 tailored questions (technical, behavioural, scenario, design) with ideal-answer frameworks
- **ATS resume feedback** — score 0–100, missing keywords, bullet-point rewrites, headline suggestion
- **Demo mode** — one-click pre-loaded session; judges see the full dashboard in under 5 seconds
- **Production polish** — dark / light mode, Framer Motion transitions, skeleton loaders, mobile responsive from 375 px, `prefers-reduced-motion`, focus rings, Error Boundary with retry

---

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript 5.6, Vite 5, Tailwind CSS 3.4, Framer Motion 11, Recharts 2.13, Zustand 5, jsPDF, canvas-confetti |
| Backend | FastAPI 0.115, Pydantic v2, SQLAlchemy 2.0, SQLite, SlowAPI, Tenacity, pdfplumber |
| AI | Google Gemini 2.0 Flash — JSON-mode, 3× retry with exponential backoff, SHA-256-keyed SQLite cache, deterministic offline fallbacks |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              Browser (SPA)                                 │
│   Landing → Upload → RoleSelect → Dashboard → Share                        │
│                                                                            │
│   State: Zustand + persist(localStorage)                                   │
│   Client: axios → baseURL = VITE_API_BASE_URL ?? "/api"                    │
└────────────────────────────────────────┬───────────────────────────────────┘
                                         │  /api/*
                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          FastAPI (uvicorn)  — 16 endpoints                 │
│                                                                            │
│   pdf_service  →  resume_ai  →  gap_analyzer  →  roadmap_generator        │
│   coach_service (chat · mock-interview · ATS)                              │
│   gemini_service (LLM client + retries + cache)                            │
│                                                                            │
│   SQLAlchemy ORM  ──→  SQLite (swap to Postgres via one env var)           │
└────────────────────────────────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full deep-dive: data model, all 5 Gemini pipeline stages, frontend state layer, resilience table, and scalability roadmap.

---

## Local setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Google AI Studio](https://aistudio.google.com/apikey) API key

### 1. Backend

```bash
cd backend

python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env        # Windows: copy .env.example .env
# Open .env and set GEMINI_API_KEY

python test_gemini.py       # smoke-test the Gemini connection
uvicorn app.main:app --reload --port 8000
# Swagger UI → http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Vite proxies `/api` → `http://localhost:8000` in development, so no CORS setup is needed locally.

---

## Deployment (Render — free tier)

This repo ships a `render.yaml` Blueprint that deploys the backend and frontend in one shot.

1. Push this repo to GitHub.
2. Go to [Render](https://render.com) → **New → Blueprint** → connect the repo.
3. After the first deploy, set two environment variables in the Render dashboard:

| Service | Variable | Value |
|---|---|---|
| `skillbridge-backend` | `GEMINI_API_KEY` | your Google AI Studio key |
| `skillbridge-backend` | `CORS_ORIGINS` | `https://<your-frontend>.onrender.com` |
| `skillbridge-frontend` | `VITE_API_BASE_URL` | `https://<your-backend>.onrender.com/api` |

4. Trigger a redeploy on both services — done.

**Other platforms:**
- **Vercel** (frontend): set `VITE_API_BASE_URL` in project settings, deploy root as `frontend/`.
- **Railway** (backend): add the env vars, set start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- **Postgres upgrade:** change `DATABASE_URL` to a Postgres connection string — no code changes required.

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Gemini + model probe |
| GET | `/api/ping` | Liveness check |
| GET | `/api/roles` | All 20 roles |
| GET | `/api/roles/{id}` | Single role detail |
| POST | `/api/upload-resume` | PDF → skills + projects + certs |
| POST | `/api/manual-resume` | Skills-only input (no PDF) |
| POST | `/api/analyze-gap` | Readiness score + matched/weak/missing |
| POST | `/api/generate-roadmap` | Gemini 4-week roadmap (SQLite-cached) |
| POST | `/api/explain-skill` | One-sentence "why this skill matters" |
| POST | `/api/progress` | Toggle weekly checklist item |
| GET | `/api/progress/{session_id}` | All progress for a session |
| GET | `/api/share/{session_id}` | Read-only shareable snapshot |
| GET | `/api/demo` | Pre-seeded demo session |
| GET | `/api/sample-resume` | Sample resume text |
| POST | `/api/coach` | AI career coach chat |
| POST | `/api/mock-interview` | 5 tailored interview questions |
| POST | `/api/resume-feedback` | ATS score + bullet rewrites |

Full interactive docs available at `http://localhost:8000/docs` when running locally.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(required)* | Google AI Studio key |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Model ID — free tier, 1500 req/day |
| `APP_ENV` | `dev` | Set to `production` when deployed |
| `LOG_LEVEL` | `INFO` | |
| `DATABASE_URL` | `sqlite:///./skillbridge.db` | SQLAlchemy URL — swap for Postgres |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed origins |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | *(unset — uses `/api` proxy)* | Full backend URL for production builds |

---

## Project structure

```
skillbridge-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                   FastAPI factory, lifespan, middleware
│   │   ├── config.py                 pydantic-settings env loader
│   │   ├── api/routes.py             all 16 HTTP endpoints
│   │   ├── models/schemas.py         Pydantic v2 request/response models
│   │   ├── db/database.py            SQLAlchemy ORM — 4 tables
│   │   └── services/
│   │       ├── gemini_service.py     LLM client + retries + cache
│   │       ├── pdf_service.py        pdfplumber + section detection
│   │       ├── skills_kb.py          80+ canonical skills × alias map
│   │       ├── resume_ai.py          Gemini extraction + merge
│   │       ├── gap_analyzer.py       fuzzy match + AI verdict refinement
│   │       ├── roadmap_generator.py  Gemini roadmap + offline fallback
│   │       └── coach_service.py      chat · mock interview · ATS rewrite
│   ├── samples/sample_resume.txt
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx                   router + page transitions
    │   ├── types.ts                  TypeScript mirror of Pydantic models
    │   ├── lib/api.ts                typed axios client
    │   ├── store/useStore.ts         Zustand + localStorage persist
    │   ├── pages/                    Landing · Upload · RoleSelect · Dashboard · Share
    │   └── components/               25 components including gauge, radar, timeline, coach
    ├── public/favicon.svg
    └── vite.config.ts
```

---

## Numbers

| Metric | Value |
|---|---|
| Target roles | 20 across 7 categories |
| Weighted skill criteria | 300 (20 roles × 15 skills) |
| Canonical skill aliases | 80+ |
| Gemini pipeline stages | 5 |
| API endpoints | 16 |
| React components | 25+ |
| Codebase size | ~7,500 lines |

---

## Built with

FastAPI · React · Tailwind CSS · Framer Motion · Recharts · Zustand · jsPDF · pdfplumber · Google Gemini 2.0 Flash
