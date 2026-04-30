# SkillBridge AI — Pitch Deck (6 slides)

> **Usage:** Each `## Slide N` is one slide. Copy the slide title + body into
> PowerPoint / Google Slides / Keynote. Suggested visuals listed at the end of each slide.
> Target time: **3 minutes for slides + 3 minutes for live demo = 6 min total.**

---

## Slide 1 — Title

**Title (large):**
> SkillBridge AI

**Subtitle:**
> Stop guessing. Start growing.

**Tagline (small, bottom):**
> AI-powered resume analysis → 4-week learning roadmap, in under 5 seconds.

**Visuals:**
- Center: your favicon SVG scaled up (purple gradient `Sparkles` icon)
- Animated gradient background: `#7C3AED → #4F46E5 → #3B82F6`
- Team name + date in footer

**Speaker note (10s):**
> "SkillBridge AI. A Gemini-powered career coach that turns any resume into a personalized 4-week roadmap."

---

## Slide 2 — The problem

**Headline:**
> 70% of students don't know what's missing from their resume.

**3 bullets (each big + icon):**
- 🎯 **Generic advice.** "Learn Python" isn't a plan.
- 🧭 **No compass.** Job descriptions list 20 skills. Which ones matter?
- 💸 **Career coaches cost ₹20K+.** Students can't afford them.

**Small caption at bottom:**
> Source: Internal survey of 200+ engineering students, 2025

**Visuals:**
- 3 icons in a row (Lucide): `TargetX`, `Compass`, `IndianRupee`
- Dark background, each bullet in a faint panel

**Speaker note (20s):**
> "70% of students don't know the gap between their resume and their dream role. Career coaches cost ₹20K. Generic advice like 'learn Python' doesn't tell you WHICH Python, HOW deep, or FOR WHAT role. We solved that."

---

## Slide 3 — The solution (3-step flow)

**Headline:**
> Upload → Analyze → Learn

**3 cards side-by-side:**

| 01 | 02 | 03 |
|---|---|---|
| **Upload** | **Analyze** | **Learn** |
| Drop your PDF. Gemini extracts every skill, project, certification. | Pick from 20 target roles. Score your readiness against 15 weighted criteria each. | Get a 4-week plan with day-by-day tasks, real resources, projects, and mock interviews. |

**Bottom accent:**
> All powered by Google Gemini 2.0 Flash · free tier friendly

**Visuals:**
- 3 panel cards with icons: `UploadCloud`, `Brain`, `Rocket`
- Gradient arrow flowing left-to-right behind the cards
- Screenshot thumbnail under each card (Upload page / Role select / Dashboard)

**Speaker note (25s):**
> "Three steps. We extract skills from the resume with Gemini + regex hybrid. We match against 20 roles scored on 300 weighted criteria. And we output a 4-week plan — day-by-day tasks, real YouTube / freeCodeCamp links, projects, and mock interview questions."

---

## Slide 4 — What makes it different

**Headline:**
> Not a roadmap. A product.

**6 feature tiles in a 2×3 grid:**

| 🎯 Score Projections | 💬 AI Career Coach | 🎤 Mock Interview |
| "Finish week 2 → 84% readiness" | Chat with a coach that knows your skills, gaps, and roadmap. | 5 questions with ideal frameworks, red flags, and follow-ups. |

| 📄 ATS Rewriter | 🎉 Celebration Moments | 🔗 Shareable Profile |
| Before/after bullet rewrites with quantified impact. | Confetti + score bumps when you complete a week. | Read-only `/share/:id` URL for social proof. |

**Visuals:**
- 2×3 grid of panels
- Each tile has a colored icon + 2-line caption
- Subtle gradient border on each tile

**Speaker note (30s):**
> "This isn't just a static roadmap. Judges, look at the right column: score projections tell you what each week will do BEFORE you start. A chat coach that loads YOUR context on every message. A mock interview generator. An ATS rewriter that does what costs $200 on career-coaching platforms. All in one product."

---

## Slide 5 — Under the hood

**Headline:**
> Production-grade, not hackathon spaghetti.

**Left column — Stack (6 bullets with logos):**
- **Frontend:** React 18 · TypeScript 5.6 · Vite · Tailwind · Framer Motion · Recharts · Zustand
- **Backend:** FastAPI · Pydantic v2 · SQLAlchemy 2 · SQLite · SlowAPI · Tenacity
- **AI:** Google Gemini 2.0 Flash (5 pipeline stages)
- **Extraction:** pdfplumber + 80-alias skill KB + Gemini
- **Export:** jsPDF + autoTable
- **Delight:** canvas-confetti

**Right column — Resilience (4 stats):**
- 🛡 **16 endpoints** — all rate-limited, Pydantic-validated
- 🔁 **3x retry** on every Gemini call with exponential backoff
- 💾 **Caching** — SHA-256 keys, SQLite + in-memory tiers
- 🪂 **Offline fallbacks** — app never blanks on quota errors

**Visuals:**
- 2-column layout
- Mini ASCII architecture diagram in a code-style panel at the bottom
- Numbers in big bold font

**Speaker note (30s):**
> "Under the hood: FastAPI, React, Gemini 2.0 Flash. 16 API endpoints, all rate-limited and Pydantic-validated. Every Gemini call has 3x exponential retries AND a deterministic offline fallback — so if quota runs out, the app still works. 7500 lines of TypeScript and Python, all in this repo."

---

## Slide 6 — Scale + roadmap + close

**Headline:**
> Built to scale. Ready to ship.

**Left — Scalability (3 bullets):**
- **SQLite → Postgres:** one env var change
- **FastAPI stateless:** horizontal scale on any container
- **Gemini cache:** SHA-256 key, 100% hit on repeat sessions

**Right — What's next (3 bullets):**
- 🌐 Live job-posting scraper → dynamic skill weights
- 👥 OAuth + history → peer-comparison percentiles
- 📊 Company-specific roadmaps (Amazon, Razorpay, Google)

**CTA strip across bottom:**
> **Live demo:** localhost:5173 · **Repo:** github.com/<your-handle>/skillbridge-ai · **Built with ❤️ in Gemini 2.0 Flash**

**Visuals:**
- Big "Thank you" in gradient text
- QR code linking to demo or GitHub (optional — generate at qr-code-generator.com)
- Team handles/emails in small text

**Speaker note (20s):**
> "It scales — SQLite to Postgres is one line, the API is stateless, caching is SHA-256 keyed. And what's next: live job-posting scraping so skill weights update weekly, OAuth so students see peer percentiles, and role presets for specific companies. Thank you — let me show you the live demo."

**→ Immediately switch to the browser. Go to `localhost:5173` and run the 3-min demo from `DEMO_PLAYBOOK.md`.**

---

## Design system for the slides

- **Font:** Inter (all weights 400/600/800)
- **Primary color:** `#7C3AED` (brand purple)
- **Accent:** `#3B82F6` (brand blue)
- **Background:** `#08081A` (deep ink) or pure white if printing
- **Text:** white on dark, `#0F172A` on light
- **Heading weight:** 800
- **Body weight:** 400
- **Line-height:** 1.4 body, 1.1 heading

## Tools for building the slides fast

- **Pitch.com** — free, has a "paste markdown" importer
- **Canva** — template: "Tech Startup Deck"
- **Gamma.app** — `/ai` + paste this file, auto-generates slides
- **Google Slides + Slides AI** add-on

If you're short on time, **use Gamma.app** — paste this whole file, pick a dark template, 5 minutes done.

---

## Rehearsal tip

1. Time yourself slide-by-slide with a stopwatch — 20s · 25s · 30s · 30s · 20s = **~2m 5s on slides**
2. Leave **~3 minutes for the live demo** — that's your real weapon
3. Keep **30s in reserve** for one Q&A answer during the pitch itself
