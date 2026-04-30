# SkillBridge AI — Backend

FastAPI service powering resume parsing, skill-gap analysis, Gemini-generated learning roadmaps, mock interviews, and ATS resume feedback.

## Quick start

```bash
cd backend

python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env      # Windows: copy .env.example .env
# Set GEMINI_API_KEY in .env

python test_gemini.py     # smoke-test Gemini connectivity
uvicorn app.main:app --reload --port 8000
```

Swagger UI → http://localhost:8000/docs

## Structure

```
backend/app
├── main.py                  FastAPI factory, lifespan, CORS, rate-limit
├── config.py                pydantic-settings env loader
├── logging_setup.py         structured stdout logger
├── rate_limit.py            shared SlowAPI limiter instance
├── api/routes.py            all 16 HTTP endpoints
├── models/schemas.py        Pydantic v2 request/response models
├── db/database.py           SQLAlchemy ORM — 4 tables (sessions, analyses, roadmap_cache, progress)
├── services/
│   ├── gemini_service.py    LLM client + 3× retry + SHA-256 cache
│   ├── pdf_service.py       pdfplumber resume parser + section detection
│   ├── skills_kb.py         80+ canonical skills × alias map
│   ├── resume_ai.py         Gemini extraction merged with regex-canonical pass
│   ├── gap_analyzer.py      fuzzy match + AI verdict refinement
│   ├── roadmap_generator.py Gemini 4-week roadmap + offline fallback
│   └── coach_service.py     chat · mock interview · ATS rewrite
└── data/job_roles.json      20 roles × 15 weighted skills
```

## Environment variables

See `.env.example` for the full reference. Required: `GEMINI_API_KEY`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Gemini + model probe |
| GET | `/api/ping` | Liveness |
| GET | `/api/roles` | All 20 roles |
| GET | `/api/roles/{id}` | Single role |
| POST | `/api/upload-resume` | PDF → skills + projects |
| POST | `/api/manual-resume` | Skills-only input |
| POST | `/api/analyze-gap` | Readiness score + verdicts |
| POST | `/api/generate-roadmap` | Gemini 4-week roadmap |
| POST | `/api/explain-skill` | One-sentence skill explanation |
| POST | `/api/progress` | Toggle checklist item |
| GET | `/api/progress/{session_id}` | All progress rows |
| GET | `/api/share/{session_id}` | Read-only snapshot |
| GET | `/api/demo` | Pre-seeded demo session |
| GET | `/api/sample-resume` | Sample resume text |
| POST | `/api/coach` | AI career coach chat |
| POST | `/api/mock-interview` | 5 tailored interview questions |
| POST | `/api/resume-feedback` | ATS score + bullet rewrites |
