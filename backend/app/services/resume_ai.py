"""LLM-backed resume enrichment — aggressive extraction, canonical normalization."""
from __future__ import annotations
import hashlib
import logging
import re
from typing import Any

from . import gemini_service
from .skills_kb import SKILL_ALIASES

logger = logging.getLogger("skillbridge.resume_ai")


# Build a reverse lookup: every alias (and the canonical itself) → canonical name.
_ALIAS_TO_CANONICAL: dict[str, str] = {}
for canonical, aliases in SKILL_ALIASES.items():
    _ALIAS_TO_CANONICAL[canonical.lower()] = canonical
    for a in aliases:
        _ALIAS_TO_CANONICAL[a.lower()] = canonical


EXTRACT_PROMPT = """You are an expert technical recruiter and resume parser. Extract EVERY
skill, technology, framework, tool, soft skill, and domain keyword from the resume.
Be AGGRESSIVE — over-extract rather than miss anything. Then return structured JSON.

EXAMPLES of what to extract:
  "Led backend team using Python and FastAPI, deployed on AWS with Docker"
    → ["Python", "FastAPI", "AWS", "Docker", "Leadership", "Backend Development"]
  "Built React dashboards with Redux + TypeScript and Chart.js"
    → ["React", "Redux", "TypeScript", "Chart.js", "Dashboards", "Frontend Development"]
  "Certified AWS Solutions Architect, TOEFL 112"
    → certifications: ["AWS Solutions Architect", "TOEFL"]

RETURN STRICT JSON (no markdown):
{{
  "skills": ["string", ...],                // all technical + domain skills found
  "inferred_skills": ["string", ...],       // skills strongly implied by projects
  "projects": ["one-line summary", ...],    // 10-180 chars each, the thing they built
  "experience": ["one-line role summary", ...],
  "education": ["degree + institution + year", ...],
  "certifications": ["string", ...],
  "achievements": ["notable wins, awards, metrics", ...],
  "headline": "one-sentence who this candidate is",
  "years_experience": 0,                     // integer, 0 if fresher
  "confidence": 0.0                          // 0-1, your confidence in this extraction
}}

RULES:
- Use the skill's most common display name (e.g. "Node.js" not "node", "PostgreSQL" not "psql").
- Include BOTH core (Python, React) AND domain skills (A/B Testing, ETL, Penetration Testing).
- Include relevant soft skills when evidenced (Leadership if they led a team, Communication if public speaking).
- inferred_skills: things STRONGLY suggested by projects even if not explicitly listed.
  "Built an e-commerce checkout" → infers "Payment Integration", "REST APIs".
- If the resume is almost empty, return confidence 0.2-0.4 and empty arrays.
- If resume is detailed with clear skills + projects, confidence 0.85-0.98.
- NEVER invent skills unsupported by the text.

RESUME TEXT:
\"\"\"
{text}
\"\"\"

Return ONLY the JSON object."""


def ai_extract(resume_text: str) -> dict[str, Any]:
    """AI-extract skills, projects, certifications, and more from resume text."""
    if not resume_text or len(resume_text.strip()) < 30:
        return {}

    trimmed = resume_text.strip()[:10_000]
    key = "resume_ai_v2:" + hashlib.sha256(trimmed.encode("utf-8")).hexdigest()[:20]
    prompt = EXTRACT_PROMPT.format(text=trimmed)

    try:
        data = gemini_service.ask_json(prompt, cache_key=key, temperature=0.15)
    except Exception as e:  # noqa: BLE001
        logger.warning("resume_ai failed: %s", e)
        return {}

    if not isinstance(data, dict):
        return {}

    return {
        "skills": _norm_list(data.get("skills", []))[:50],
        "inferred_skills": _norm_list(data.get("inferred_skills", []))[:20],
        "projects": _norm_list(data.get("projects", []))[:10],
        "experience": _norm_list(data.get("experience", []))[:8],
        "education": _norm_list(data.get("education", []))[:5],
        "certifications": _norm_list(data.get("certifications", []))[:10],
        "achievements": _norm_list(data.get("achievements", []))[:10],
        "headline": str(data.get("headline", ""))[:240],
        "years_experience": _clamp_int(data.get("years_experience", 0), 0, 45),
        "confidence": _clamp_float(data.get("confidence", 0.7), 0.0, 1.0),
    }


def normalize_skill(name: str) -> str:
    """Map aliases to canonical names; preserve unknown skills as-is (Title Case)."""
    raw = name.strip()
    if not raw:
        return raw
    low = raw.lower()
    if low in _ALIAS_TO_CANONICAL:
        return _ALIAS_TO_CANONICAL[low]
    # Try removing trailing punctuation / parenthetical
    cleaned = re.sub(r"\s*\([^)]*\)\s*$", "", raw).strip().rstrip(".,;:")
    if cleaned.lower() in _ALIAS_TO_CANONICAL:
        return _ALIAS_TO_CANONICAL[cleaned.lower()]
    # Title-case short lowercase words; preserve acronyms / mixed-case
    if raw.islower() and len(raw) > 2:
        return raw.title()
    return raw


def merge_extractions(regex_result: dict, ai_result: dict) -> dict:
    """AI adds recall, regex anchors precision. Both normalized to canonical forms."""
    def norm_set(xs):
        out = []
        seen: set[str] = set()
        for x in xs or []:
            c = normalize_skill(x)
            k = c.lower()
            if k and k not in seen:
                seen.add(k)
                out.append(c)
        return out

    regex_skills = norm_set(regex_result.get("skills", []))
    ai_skills = norm_set((ai_result or {}).get("skills", []))
    inferred = norm_set((ai_result or {}).get("inferred_skills", []))

    merged: list[str] = []
    seen: set[str] = set()
    for s in regex_skills + ai_skills + inferred:
        k = s.lower()
        if k not in seen:
            seen.add(k)
            merged.append(s)

    projects = list(dict.fromkeys(
        [p for p in regex_result.get("projects", []) if p.strip()]
        + [p for p in (ai_result or {}).get("projects", []) if p.strip()]
    ))[:10]

    # Confidence blend — trust AI more once we have any AI result
    if ai_result:
        regex_conf = float(regex_result.get("confidence", 0.5))
        ai_conf = float(ai_result.get("confidence", 0.7))
        confidence = round(0.35 * regex_conf + 0.65 * ai_conf, 2)
    else:
        confidence = float(regex_result.get("confidence", 0.5))

    return {
        **regex_result,
        "skills": merged,
        "projects": projects,
        "confidence": confidence,
        "headline": (ai_result or {}).get("headline", ""),
        "years_experience": (ai_result or {}).get("years_experience", 0),
        "certifications": (ai_result or {}).get("certifications", []),
        "achievements": (ai_result or {}).get("achievements", []),
        "experience": (ai_result or {}).get("experience", regex_result.get("experience", [])),
        "education": (ai_result or {}).get("education", regex_result.get("education", [])),
    }


def _norm_list(xs: Any) -> list[str]:
    if not isinstance(xs, list):
        return []
    return [x.strip() for x in xs if isinstance(x, str) and x.strip()]


def _clamp_float(x: Any, lo: float, hi: float) -> float:
    try:
        return max(lo, min(hi, float(x)))
    except (TypeError, ValueError):
        return lo


def _clamp_int(x: Any, lo: int, hi: int) -> int:
    try:
        return max(lo, min(hi, int(x)))
    except (TypeError, ValueError):
        return lo
