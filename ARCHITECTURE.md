# SkillBridge AI — Technical Architecture

> This document is the "serious engineering" side of the project — suitable for a
> written-submission round, an architecture review, or a judge who asks "show me
> the code."

---

## 1. Executive summary

SkillBridge AI is a **full-stack web application** that transforms a student's
resume into a personalized 4-week learning roadmap, powered by Google Gemini at
**five distinct pipeline stages**.

- **Frontend:** React 18 + TypeScript (Vite) SPA with 5 pages, 25+ components,
  persistent Zustand store, Framer Motion transitions.
- **Backend:** FastAPI + Pydantic v2 service layer with 16 REST endpoints,
  SQLAlchemy 2.0 ORM, SQLite persistence, SlowAPI rate limiting.
- **AI:** Google Gemini 2.0 Flash via `google-generativeai` — JSON-mode
  responses, tenacity retries, SHA-256-keyed SQLite caching.

**Total surface:** ~7,500 lines across 37 Python + 25 TypeScript files.

---

## 2. System architecture diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                BROWSER (SPA)                                 │
│                                                                              │
│   Landing ──▶ Upload ──▶ RoleSelect ──▶ Dashboard ──▶ Share                  │
│      │           │           │              │           │                    │
│      └───────────┴───────────┴──────────────┴───── CoachWidget (global) ─────┤
│                                                                              │
│   state: Zustand + persist(localStorage)   client cache: skill explanations │
└─────────────────────────────┬────────────────────────────────────────────────┘
                              │   axios  /api/* (Vite proxy)
                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI (uvicorn, :8000)                              │
│                                                                              │
│  ┌────────────── routes.py (16 endpoints) ──────────────┐                   │
│  │ /health /ping /roles /roles/{id} /upload-resume      │                   │
│  │ /manual-resume /analyze-gap /generate-roadmap        │                   │
│  │ /explain-skill /progress /share /demo /sample-resume │                   │
│  │ /coach /mock-interview /resume-feedback              │                   │
│  └──────────────────────┬───────────────────────────────┘                   │
│                         │                                                    │
│  ┌────── services ──────┴──────────────────────────────────┐                │
│  │ pdf_service         pdfplumber → raw text + sections    │                │
│  │ resume_ai           Gemini extraction + canonical merge │                │
│  │ skills_kb           80+ canonical skills × alias map    │                │
│  │ gap_analyzer        difflib fuzz + AI verdict refine    │                │
│  │ roadmap_generator   Gemini roadmap + curated fallback   │                │
│  │ coach_service       chat · mock interview · ATS rewrite │                │
│  │ gemini_service      LLM client + retries + cache        │                │
│  └─────────────────────────────────────────────────────────┘                │
│                         │              │                                     │
│                         ▼              ▼                                     │
│  ┌──────── SQLAlchemy ORM ─────┐  ┌── google-generativeai ──┐                │
│  │ sessions                    │  │ gemini-2.0-flash        │                │
│  │ analyses                    │  │ JSON mode, 3x retry     │                │
│  │ roadmap_cache               │  │ exponential backoff     │                │
│  │ progress                    │  └─────────────────────────┘                │
│  └─────────────────────────────┘                                             │
│                 │                                                            │
│                 ▼                                                            │
│         ┌───────────────┐                                                    │
│         │   SQLite      │   (→ Postgres via DATABASE_URL)                   │
│         └───────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory layout

```
skillbridge-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                   FastAPI factory, lifespan, middleware
│   │   ├── config.py                 pydantic-settings env loader
│   │   ├── logging_setup.py          structured stdout logger
│   │   ├── rate_limit.py             shared SlowAPI limiter
│   │   ├── api/routes.py             all HTTP endpoints
│   │   ├── models/schemas.py         Pydantic v2 request/response models
│   │   ├── db/database.py            SQLAlchemy engine + 4 tables
│   │   ├── services/
│   │   │   ├── gemini_service.py     LLM wrapper
│   │   │   ├── pdf_service.py        pdfplumber + section detection
│   │   │   ├── skills_kb.py          canonical skill + alias dictionary
│   │   │   ├── resume_ai.py          AI extraction + merge logic
│   │   │   ├── gap_analyzer.py       fuzzy match + AI refine
│   │   │   ├── roadmap_generator.py  Gemini roadmap + offline fallback
│   │   │   └── coach_service.py      chat · interview · ATS rewrite
│   │   └── data/job_roles.json       20 roles × 15 weighted skills
│   ├── samples/sample_resume.{txt,pdf}
│   ├── .env.example
│   ├── requirements.txt
│   ├── generate_sample_pdf.py
│   ├── test_gemini.py
│   └── README.md
└── frontend/
    ├── src/
    │   ├── App.tsx                   Router + transitions + error boundary
    │   ├── main.tsx
    │   ├── index.css                 Design system ("Studio Neo")
    │   ├── types.ts                  Mirror of Pydantic models
    │   ├── lib/
    │   │   ├── api.ts                typed axios client
    │   │   ├── exportPdf.ts          jsPDF branded export
    │   │   ├── projections.ts        score-per-week math
    │   │   └── celebrate.ts          canvas-confetti wrapper
    │   ├── store/useStore.ts         Zustand + persist
    │   ├── pages/{Landing,Upload,RoleSelect,Dashboard,Share}.tsx
    │   └── components/
    │       Nav · Stepper · ErrorBoundary · ScrollToTop
    │       LoadingRotator · SkillPillEditor · EmptyIllustration
    │       ParticleField · Typewriter · HeroMockup
    │       RoleCard · ReadinessGauge · SkillRadarChart · SkillChecklist
    │       RoadmapTimeline · ResourceCard · ProjectCard · ProgressChart
    │       CoachWidget · MockInterviewPanel · ResumeFeedbackPanel
    ├── public/favicon.svg
    ├── index.html
    ├── tailwind.config.js
    └── package.json
```

---

## 4. The 5 Gemini pipeline stages

Every stage has **strict JSON prompts + tenacity retries + offline fallbacks**.

### Stage 1 — Resume extraction (`resume_ai.py`)
**Input:** raw PDF text (truncated at 10K chars)
**Prompt:** aggressive extraction with examples, 10 output fields
**Output:** skills, inferred_skills, projects, experience, education,
certifications, achievements, headline, years_experience, confidence
**Fusion:** merged with regex-canonical extraction for recall + precision.
**Caching key:** `resume_ai_v2:<sha256(text)>`

### Stage 2 — Gap verdict refinement (`gap_analyzer.py::ai_refine_verdicts`)
**Input:** rule-based verdicts + projects + user skills
**Prompt:** "Upgrade weak→matched when projects clearly demonstrate the skill"
**Output:** map `{skill: (status, evidence)}`
**Caching key:** `refine:<sha256(prompt)>`
**Fallback:** rule-based result unchanged.

### Stage 3 — Roadmap generator (`roadmap_generator.py`)
**Input:** role, missing_skills[], weak_skills[], hours_per_week
**Prompt:** 4-week plan with key_concepts, daily_plan[7], resources[5-6],
project, common_mistakes, interview_tips, milestone.
**Output:** typed `Roadmap` with strict Pydantic coercion.
**Caching key:** `{role_id}:{hours}:{sorted(missing)}` — SQLite table
**Fallback:** `_FALLBACK_RESOURCES` hand-curated knowledge base.

### Stage 4 — Skill explanation (`roadmap_generator.py::explain_skill`)
**Input:** skill name, role title
**Prompt:** one vivid sentence, max 30 words
**Output:** plain text
**Caching key:** `explain:{role}:{skill}`
**Cached client-side** too — no repeat calls for the same tooltip.

### Stage 5 — Coach / Interview / ATS (`coach_service.py`)
Three sub-services sharing the same LLM client:
- **Chat:** system prompt primed with role + gap context + 8-msg rolling history
- **Mock interview:** 5 questions tailored to weak spots (2 tech, 1 behavioural, 1 scenario, 1 design)
- **ATS rewriter:** score 0-100 + missing keywords + strengths/weaknesses + bullet rewrites

---

## 5. Data model (SQLAlchemy)

```python
Session          id, created_at, resume_text, skills[JSON], projects[JSON], confidence
Analysis         id, session_id, role_id, readiness_score, payload[JSON], created_at
RoadmapCache     key (PK), payload[JSON], created_at
Progress         id, session_id, week, item_id, completed, updated_at
```

**Why SQLite for a hackathon:** zero-config, file-based, survives restarts,
`DATABASE_URL=postgresql://…` swap is literally one env-var change for prod.

---

## 6. Frontend architecture

### State layer — Zustand with `persist`

```ts
// useStore.ts — persisted slice
{
  theme, resume, selectedRoleId, hoursPerWeek,
  gap, roadmap, progress, isDemo
}
```

- `persist` middleware → `localStorage` → user can close the tab and resume.
- Shallow selectors avoid re-render cascades.
- Derived state (e.g. `projectScores`) is computed with `useMemo`, not stored.

### Routing & page transitions

- `react-router-dom` v6 + `BrowserRouter`
- `AnimatePresence mode="wait"` wraps `<Routes location key={pathname}>`
- `ScrollToTop` sentinel resets scroll on every navigation
- `ErrorBoundary` component wraps every page

### Design system — "Studio Neo" (`index.css`)

- CSS custom properties for colors, text, borders (`--bg-0`, `--brand-1`, etc.)
- Dark + light mode via `html.light` class, persisted in Zustand
- `@layer components` defines `.panel`, `.btn-primary`, `.pill`, `.tab`, `.input`, `.stepper`
- Focus-visible, reduced-motion, and mobile (<640px) media queries
- Legacy shim classes for backwards-compat (`.glass-card`, `.skill-pill`)

### Performance

- **Vite** dev server with HMR
- **Code splitting:** not explicitly wired, but pages lazy-load by default via Vite
- **Tree-shakable icons:** `lucide-react` imports per-icon
- **Recharts:** only the components used are imported
- **canvas-confetti** loaded once, triggered on-demand
- **Debounced inputs:** role search uses React state; under 20 roles it's instant

---

## 7. Resilience & production readiness

| Concern | Mitigation |
|---|---|
| Gemini outage / quota | Deterministic offline fallbacks in every stage (extraction, roadmap, interview, ATS, coach) |
| Network errors | axios interceptor → toast-on-error + tenacity 3x exponential retry server-side |
| Rate abuse | SlowAPI per-endpoint (10 RPM expensive, 120 RPM light) |
| Malicious PDFs | 5MB cap · `application/pdf` content check · pdfplumber text-only extraction |
| Invalid payloads | Pydantic v2 validation on every endpoint |
| UI crashes | React `ErrorBoundary` with retry button |
| Stale state | `persist` rehydrate → re-validate on dashboard mount, redirect if incomplete |
| LLM hallucination | Strict JSON schema, skill normalization against canonical KB, user can edit pills |
| Prompt injection | User input only appears in parameterized template slots, not as system instructions |

---

## 8. Scalability roadmap

### Today (hackathon scale)
- Single FastAPI instance
- SQLite file on disk
- In-memory + SQLite Gemini cache
- Free-tier Gemini (1500 RPD)

### Next stop (1K DAU)
- Deploy FastAPI on Render / Railway / Fly.io (any Docker host)
- `DATABASE_URL=postgresql://…` — no code changes
- Move Gemini cache from in-memory to Redis
- Add CDN in front of the Vite build (Vercel/Netlify)

### Production (10K+ DAU)
- **Horizontal:** FastAPI is stateless — put behind ALB, autoscale
- **Async queue:** move roadmap generation to Celery/RQ — return job ID, poll
- **Gemini pool:** round-robin API keys across projects
- **Embeddings upgrade:** if canonical alias KB becomes a bottleneck, switch to
  `text-embedding-005` for skill matching — indices precomputed once
- **Observability:** OpenTelemetry → Grafana / Honeycomb

---

## 9. Security posture

- **No authentication** — session IDs are short-lived UUIDs tied to in-session state. Not a substitute for real auth in prod.
- **Input validation** at every boundary (Pydantic).
- **CORS** restricted to allowed origins (env-configured).
- **Rate limiting** per IP via SlowAPI.
- **Secrets** only in `.env` (not committed — `.env.example` is the template).
- **SQL injection:** impossible — SQLAlchemy 2.0 parameterized ORM only.
- **XSS:** React auto-escapes; no `dangerouslySetInnerHTML` anywhere.
- **LLM-injection:** user input is never placed inside system instructions; only inside quoted template slots.
- **PII:** resume text is stored in session SQLite row. In prod: add TTL + encrypted-at-rest storage.

---

## 10. Testing strategy (what a production version would add)

We didn't ship full test suites due to hackathon scope, but the seams are
test-friendly:

- **Services are pure functions** → unit-test with fixtures (`pdf_service.parse_resume(bytes)`, `gap_analyzer.analyze(...)`)
- **Gemini is a single wrapper** → mock at `gemini_service._call`
- **Fallbacks are deterministic** → golden-file test each one
- **Frontend:** React Testing Library for the key flows (upload → role → dashboard)
- **E2E:** Playwright for the 3-min demo flow

---

## 11. Metrics & observability (prod-ready hooks)

- Structured logger (`logging_setup.py`) — swap formatter to JSON for ELK
- Every Gemini call logs duration + cache hit/miss at DEBUG
- Every endpoint gets FastAPI's default access log
- Drop-in **OpenTelemetry** instrumentation in `main.py` — trace spans per request
- Dashboards to add: Gemini call latency p50/p95, cache hit rate, error rate per endpoint, % sessions completing the full flow

---

## 12. Key technical decisions & trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| Gemini 2.0 Flash (not 2.5) | 1500 RPD free vs 20 | Slightly less reasoning depth |
| SequenceMatcher (not rapidfuzz) | Python 3.14 compatibility | Marginally slower (~1ms per match) |
| SQLite (not Postgres) | Zero-config for demo | Single-writer bottleneck — swappable |
| Zustand (not Redux) | 3× less boilerplate | Smaller ecosystem, but sufficient |
| React Router v6 (not Remix) | Keeps it a pure SPA | No SSR — fine for a tool |
| Custom CSS layer (not shadcn) | Full control over brand | More CSS to maintain |
| In-memory Gemini cache (not Redis) | No extra infra for demo | Lost on restart — SQLite cache covers persistence |
| Prompt caching via SHA256 key | Dead simple, zero deps | Can't invalidate on schema changes — would need a version prefix in prod |

---

## 13. Why this matters

**For students:** removes the "what do I learn next?" decision paralysis.
A 17-year-old CS freshman in Tier-3 India gets the same quality plan as someone
with a paid ₹20K career coach.

**For the industry:** demonstrates how Gemini's free tier + thoughtful prompt
engineering can replace multi-thousand-dollar SaaS tools in well-scoped domains.

**For this hackathon:** proves that "hackathon project" and "production quality"
are not mutually exclusive. Every path is handled — failures, offline modes,
rate limits, mobile, accessibility, dark mode.

---

## 14. Appendix — API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Gemini + model probe |
| GET | `/api/ping` | Liveness |
| GET | `/api/roles` | All 20 roles |
| GET | `/api/roles/{id}` | One role detail |
| POST | `/api/upload-resume` | PDF → skills + projects + certs |
| POST | `/api/manual-resume` | Skills-only fallback input |
| POST | `/api/analyze-gap` | Matched/weak/missing + readiness score |
| POST | `/api/generate-roadmap` | 4-week Gemini roadmap (cached) |
| POST | `/api/explain-skill` | One-sentence "why this matters" |
| POST | `/api/progress` | Toggle weekly checklist item |
| GET | `/api/progress/{session_id}` | All progress rows for a session |
| GET | `/api/share/{session_id}` | Read-only snapshot |
| GET | `/api/demo` | Pre-seeded demo session |
| GET | `/api/sample-resume` | Sample resume text |
| POST | `/api/coach` | AI career coach chat |
| POST | `/api/mock-interview` | 5 tailored interview questions |
| POST | `/api/resume-feedback` | ATS score + bullet rewrites |

Full interactive docs: `http://localhost:8000/docs`
