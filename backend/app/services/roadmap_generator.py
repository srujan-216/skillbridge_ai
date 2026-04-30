"""Build 4-week roadmaps via Gemini with deterministic offline fallback."""
from __future__ import annotations
import logging
from typing import Any

from ..models.schemas import DailyTask, Roadmap, RoadmapWeek, Resource, RoadmapProject
from . import gemini_service

logger = logging.getLogger("skillbridge.roadmap")


PROMPT_TEMPLATE = """You are a top-tier career coach + senior engineer. Build a DETAILED 4-week
learning roadmap for a student targeting a {role} role.

CONTEXT:
- Missing skills (highest priority): {missing}
- Weak (needs reinforcement): {weak}
- Weekly commitment: {hours} hours

For EACH of the 4 weeks, include:
- focus: the single headline skill for that week
- why_it_matters: 1 concrete sentence tying it to the target role
- daily_commitment: e.g. "2 hours"
- key_concepts: 4-6 bullet topics that MUST be understood
- daily_plan: 5-7 day-by-day tasks (day 1..N), each concrete and actionable
- resources: 5-6 real, WORKING links from YouTube, freeCodeCamp, MDN, official docs, Kaggle,
  GitHub, Coursera, edX, or LeetCode. Each with name, url, type (video|course|docs|article|practice), duration
- project: title + detailed description (what they build, features, tech, deliverable) +
  github_starter url if applicable
- common_mistakes: 2-3 pitfalls to avoid
- interview_tips: 2-3 concrete interview prep items
- milestone: the visible proof-of-learning outcome

Return STRICT JSON only (no markdown):
{{
  "overview": "one-sentence motivation",
  "weeks": [
    {{
      "week": 1,
      "focus": "<skill>",
      "why_it_matters": "<sentence>",
      "daily_commitment": "2 hours",
      "key_concepts": ["...", "..."],
      "daily_plan": [{{"day": 1, "task": "..."}}, ...],
      "resources": [
        {{"name": "...", "url": "https://...", "type": "video", "duration": "2h"}}
      ],
      "project": {{"title": "...", "description": "...", "github_starter": "https://..."}},
      "common_mistakes": ["...", "..."],
      "interview_tips": ["...", "..."],
      "milestone": "..."
    }}
  ]
}}

HARD RULES:
- Exactly 4 weeks.
- Every URL must be real and reachable (use popular, well-known sources).
- daily_plan day count should roughly fit the weekly_hours/daily_commitment ratio.
- Be specific, concrete, and practical — NO generic platitudes.
"""


_FALLBACK_RESOURCES: dict[str, list[dict[str, str]]] = {
    "Python": [
        {"name": "Python for Everybody — freeCodeCamp", "url": "https://www.freecodecamp.org/learn/scientific-computing-with-python/", "type": "course", "duration": "10h"},
        {"name": "Corey Schafer Python Tutorials", "url": "https://www.youtube.com/playlist?list=PL-osiE80TeTt2d9bfVyTiXJA-UTHn6WwU", "type": "video", "duration": "8h"},
        {"name": "Official Python Docs — Tutorial", "url": "https://docs.python.org/3/tutorial/", "type": "docs", "duration": "4h"},
    ],
    "SQL": [
        {"name": "SQLBolt Interactive Lessons", "url": "https://sqlbolt.com/", "type": "practice", "duration": "6h"},
        {"name": "Mode SQL Tutorial", "url": "https://mode.com/sql-tutorial/", "type": "course", "duration": "6h"},
        {"name": "LeetCode SQL 50", "url": "https://leetcode.com/studyplan/top-sql-50/", "type": "practice", "duration": "10h"},
    ],
    "React": [
        {"name": "React Official Tutorial", "url": "https://react.dev/learn", "type": "docs", "duration": "6h"},
        {"name": "freeCodeCamp React Course", "url": "https://www.youtube.com/watch?v=bMknfKXIFA8", "type": "video", "duration": "12h"},
    ],
    "Docker": [
        {"name": "Docker Official Getting Started", "url": "https://docs.docker.com/get-started/", "type": "docs", "duration": "4h"},
        {"name": "Docker Full Course — freeCodeCamp", "url": "https://www.youtube.com/watch?v=fqMOX6JJhGo", "type": "video", "duration": "3h"},
    ],
    "AWS": [
        {"name": "AWS Cloud Practitioner Essentials", "url": "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/", "type": "course", "duration": "6h"},
        {"name": "AWS in 60 Days — freeCodeCamp", "url": "https://www.youtube.com/watch?v=FbL7vz4aLZQ", "type": "video", "duration": "11h"},
    ],
    "Pandas": [
        {"name": "Kaggle Pandas Micro-Course", "url": "https://www.kaggle.com/learn/pandas", "type": "course", "duration": "5h"},
        {"name": "Pandas Official User Guide", "url": "https://pandas.pydata.org/docs/user_guide/index.html", "type": "docs", "duration": "5h"},
    ],
    "scikit-learn": [
        {"name": "scikit-learn User Guide", "url": "https://scikit-learn.org/stable/user_guide.html", "type": "docs", "duration": "8h"},
        {"name": "Kaggle Intro to Machine Learning", "url": "https://www.kaggle.com/learn/intro-to-machine-learning", "type": "course", "duration": "4h"},
    ],
    "Statistics": [
        {"name": "Khan Academy Statistics & Probability", "url": "https://www.khanacademy.org/math/statistics-probability", "type": "course", "duration": "15h"},
        {"name": "StatQuest — Josh Starmer", "url": "https://www.youtube.com/user/joshstarmer", "type": "video", "duration": "10h"},
    ],
    "Tailwind CSS": [
        {"name": "Tailwind Docs — Installation", "url": "https://tailwindcss.com/docs/installation", "type": "docs", "duration": "2h"},
        {"name": "Tailwind in 100 Seconds + Deep Dive", "url": "https://www.youtube.com/watch?v=mr15Xzb1Ook", "type": "video", "duration": "1h"},
    ],
    "TypeScript": [
        {"name": "TypeScript Handbook", "url": "https://www.typescriptlang.org/docs/handbook/intro.html", "type": "docs", "duration": "6h"},
        {"name": "Matt Pocock — TS Essentials", "url": "https://www.totaltypescript.com/tutorials", "type": "course", "duration": "8h"},
    ],
    "LLMs": [
        {"name": "DeepLearning.AI — LLM Short Courses", "url": "https://learn.deeplearning.ai/", "type": "course", "duration": "6h"},
        {"name": "Google Gemini API Quickstart", "url": "https://ai.google.dev/gemini-api/docs/quickstart", "type": "docs", "duration": "2h"},
    ],
    "Prompt Engineering": [
        {"name": "Prompt Engineering Guide", "url": "https://www.promptingguide.ai/", "type": "docs", "duration": "3h"},
        {"name": "ChatGPT Prompt Engineering — DeepLearning.AI", "url": "https://learn.deeplearning.ai/chatgpt-prompt-eng", "type": "course", "duration": "2h"},
    ],
    "Kubernetes": [
        {"name": "Kubernetes Basics — Official", "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/", "type": "docs", "duration": "4h"},
        {"name": "TechWorld with Nana — K8s Full Course", "url": "https://www.youtube.com/watch?v=X48VuDVv0do", "type": "video", "duration": "4h"},
    ],
    "Figma": [
        {"name": "Figma Learn", "url": "https://help.figma.com/hc/en-us/categories/360002051613-Get-started", "type": "docs", "duration": "4h"},
        {"name": "Figma UI Design Tutorial — AJ&Smart", "url": "https://www.youtube.com/watch?v=jwCmIBJ8Jtc", "type": "video", "duration": "2h"},
    ],
}

_GENERIC_RESOURCES = [
    {"name": "freeCodeCamp YouTube Channel", "url": "https://www.youtube.com/@freecodecamp", "type": "video", "duration": "varies"},
    {"name": "MDN Web Docs", "url": "https://developer.mozilla.org/", "type": "docs", "duration": "varies"},
    {"name": "Kaggle Learn", "url": "https://www.kaggle.com/learn", "type": "course", "duration": "varies"},
]


def _fallback_week(idx: int, skill: str, hours: int) -> RoadmapWeek:
    daily = max(1, round(hours / 6))
    res_raw = _FALLBACK_RESOURCES.get(skill, _GENERIC_RESOURCES)
    resources = [Resource(**r) for r in res_raw[:5]]
    project = RoadmapProject(
        title=f"Ship a {skill} portfolio project",
        description=(
            f"Build a production-grade mini-project using {skill}. Set up the environment, "
            f"implement 3 core features, write tests, and publish to GitHub with a clear README "
            f"and a short demo GIF."
        ),
        github_starter="https://github.com/freeCodeCamp/freeCodeCamp",
    )
    return RoadmapWeek(
        week=idx,
        focus=skill,
        why_it_matters=f"{skill} is a high-signal skill for your target role — recruiters filter for it first.",
        daily_commitment=f"{daily} hours",
        key_concepts=[
            f"{skill} fundamentals",
            f"Core {skill} patterns and idioms",
            f"Debugging and tooling for {skill}",
            f"Real-world {skill} deployment",
        ],
        daily_plan=[
            DailyTask(day=1, task=f"Read {skill} official getting-started guide"),
            DailyTask(day=2, task=f"Complete a hands-on {skill} tutorial end-to-end"),
            DailyTask(day=3, task=f"Build a small {skill} proof-of-concept"),
            DailyTask(day=4, task=f"Extend the POC — add testing and edge-case handling"),
            DailyTask(day=5, task=f"Polish README, record demo, push to GitHub"),
        ],
        resources=resources,
        project=project,
        common_mistakes=[
            f"Copy-pasting without understanding the underlying {skill} concept",
            "Skipping tests — always wire at least one smoke test",
        ],
        interview_tips=[
            f"Be ready to whiteboard a simple {skill} feature without docs",
            f"Know the 'why' — when NOT to reach for {skill}",
        ],
        milestone=f"Publish a GitHub repo + README demonstrating practical {skill}.",
    )


def fallback_roadmap(role: str, missing: list[str], hours: int) -> dict:
    picks = (missing or ["Python", "SQL", "Git", "Projects"])[:4]
    while len(picks) < 4:
        picks.append(picks[-1])
    weeks = [_fallback_week(i + 1, s, hours).model_dump() for i, s in enumerate(picks)]
    return {
        "overview": f"A focused 4-week sprint to get you interview-ready for {role} — ship projects, not just notes.",
        "weeks": weeks,
    }


def _coerce_week(w: dict, idx: int) -> RoadmapWeek:
    resources_raw = w.get("resources") or []
    resources: list[Resource] = []
    for r in resources_raw:
        try:
            resources.append(Resource(
                name=str(r.get("name", "Resource"))[:200],
                url=str(r.get("url", "")),
                type=str(r.get("type", "course")).lower() if r.get("type") in {"video", "course", "docs", "article", "practice"} else "course",
                duration=str(r.get("duration", "")),
            ))
        except Exception:  # noqa: BLE001
            continue
    proj = w.get("project") or {}
    project = RoadmapProject(
        title=str(proj.get("title", f"Week {idx} Project"))[:160],
        description=str(proj.get("description", "")),
        github_starter=str(proj.get("github_starter", "") or ""),
    )

    daily_plan_raw = w.get("daily_plan") or []
    daily_plan: list[DailyTask] = []
    for d in daily_plan_raw:
        try:
            daily_plan.append(DailyTask(
                day=int(d.get("day", len(daily_plan) + 1)),
                task=str(d.get("task", ""))[:320],
            ))
        except Exception:  # noqa: BLE001
            continue

    def _str_list(key: str, cap: int = 6) -> list[str]:
        xs = w.get(key) or []
        if not isinstance(xs, list):
            return []
        return [str(x).strip()[:240] for x in xs if str(x).strip()][:cap]

    return RoadmapWeek(
        week=int(w.get("week", idx)),
        focus=str(w.get("focus", "")),
        why_it_matters=str(w.get("why_it_matters", "")),
        daily_commitment=str(w.get("daily_commitment", "2 hours")),
        key_concepts=_str_list("key_concepts", 8),
        daily_plan=daily_plan[:7],
        resources=resources or [Resource(**_GENERIC_RESOURCES[0])],
        project=project,
        common_mistakes=_str_list("common_mistakes", 4),
        interview_tips=_str_list("interview_tips", 4),
        milestone=str(w.get("milestone", "")),
    )


def build_roadmap(
    session_id: str,
    role_id: str,
    role_title: str,
    missing: list[str],
    weak: list[str],
    hours: int,
) -> Roadmap:
    prompt = PROMPT_TEMPLATE.format(
        missing=", ".join(missing) or "foundations",
        weak=", ".join(weak) or "none",
        role=role_title,
        hours=hours,
    )
    cache_key = f"roadmap:{role_id}:{hours}:{','.join(sorted(missing))}"

    data: dict[str, Any]
    try:
        data = gemini_service.ask_json(prompt, cache_key=cache_key, temperature=0.5)
        assert isinstance(data, dict) and "weeks" in data
    except Exception as e:  # noqa: BLE001
        logger.info("roadmap fallback (%s)", e)
        data = fallback_roadmap(role_title, missing, hours)

    weeks_in = data.get("weeks") or []
    weeks = [_coerce_week(w, i + 1) for i, w in enumerate(weeks_in[:4])]
    # pad to 4 weeks if Gemini returned fewer
    while len(weeks) < 4:
        weeks.append(_coerce_week(
            {"week": len(weeks) + 1, "focus": (missing[len(weeks):] or ["Portfolio polish"])[0]},
            len(weeks) + 1,
        ))

    overview = str(data.get("overview", f"A 4-week sprint to become {role_title}-ready."))
    return Roadmap(
        session_id=session_id,
        role_id=role_id,
        overview=overview,
        weeks=weeks,
        hours_per_week=hours,
    )


def explain_skill(skill: str, role_title: str) -> str:
    prompt = (
        f"In one vivid sentence (max 30 words), explain why '{skill}' matters for a {role_title} role in 2025. "
        "Be concrete and specific. Return plain text only."
    )
    try:
        text = gemini_service.ask_text(prompt, cache_key=f"explain:{role_title}:{skill}", temperature=0.3)
        return text.strip().strip('"').split("\n")[0][:220]
    except Exception:  # noqa: BLE001
        return f"{skill} is a frequently-requested skill in {role_title} job postings — mastering it widens your interview funnel."
