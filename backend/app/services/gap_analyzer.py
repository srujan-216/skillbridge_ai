"""Fuzzy skill matching + weighted readiness score (pure-stdlib, no rapidfuzz)."""
from __future__ import annotations
import hashlib
import json
import logging
from difflib import SequenceMatcher
from pathlib import Path

from ..models.schemas import GapAnalysis, Role, SkillVerdict
from . import gemini_service

logger = logging.getLogger("skillbridge.gap")

_ROLES_PATH = Path(__file__).resolve().parent.parent / "data" / "job_roles.json"
_MATCH_THRESHOLD = 86
_WEAK_THRESHOLD = 72


def _ratio(a: str, b: str) -> float:
    """Case-insensitive similarity in 0–100 (SequenceMatcher-based)."""
    if not a or not b:
        return 0.0
    a_l, b_l = a.lower().strip(), b.lower().strip()
    if a_l == b_l:
        return 100.0
    # exact substring → high score
    if a_l in b_l or b_l in a_l:
        return 92.0
    return SequenceMatcher(None, a_l, b_l).ratio() * 100.0


def _partial_ratio(needle: str, haystack: str) -> float:
    """Best sliding-window ratio of needle inside haystack."""
    if not needle or not haystack:
        return 0.0
    n, h = needle.lower().strip(), haystack.lower().strip()
    if n in h:
        return 100.0
    if len(n) > len(h):
        n, h = h, n
    step = max(1, len(n) // 3)
    best = 0.0
    for i in range(0, max(1, len(h) - len(n) + 1), step):
        window = h[i : i + len(n)]
        r = SequenceMatcher(None, n, window).ratio() * 100.0
        if r > best:
            best = r
            if best >= 99:
                break
    return best

# Heuristic: how learnable each skill is (0-1). Used to prioritize missing skills.
_LEARNABILITY: dict[str, float] = {
    "Python": 0.9, "SQL": 0.95, "HTML": 0.98, "CSS": 0.95, "Git": 0.95,
    "React": 0.8, "TypeScript": 0.8, "Pandas": 0.9, "NumPy": 0.9,
    "Docker": 0.7, "Kubernetes": 0.45, "AWS": 0.55, "Azure": 0.55, "GCP": 0.55,
    "TensorFlow": 0.55, "PyTorch": 0.6, "scikit-learn": 0.85,
    "Statistics": 0.7, "Prompt Engineering": 0.95, "LangChain": 0.75,
    "LLMs": 0.8, "MLOps": 0.55, "Figma": 0.9, "Tailwind CSS": 0.95,
}

_DEMAND: dict[str, float] = {
    "Python": 1.0, "SQL": 1.0, "AWS": 0.95, "React": 0.95, "TypeScript": 0.9,
    "Docker": 0.9, "Kubernetes": 0.8, "LLMs": 0.95, "Prompt Engineering": 0.85,
    "LangChain": 0.7, "Pandas": 0.85, "TensorFlow": 0.8, "PyTorch": 0.8,
}


def load_roles() -> list[Role]:
    data = json.loads(_ROLES_PATH.read_text(encoding="utf-8"))
    return [Role(**r) for r in data]


def find_role(role_id: str) -> Role | None:
    for r in load_roles():
        if r.id == role_id:
            return r
    return None


def _best_match(target: str, candidates: list[str]) -> tuple[str | None, float]:
    if not candidates:
        return None, 0.0
    best_name: str | None = None
    best_score = 0.0
    for c in candidates:
        s = _ratio(target, c)
        if s > best_score:
            best_score, best_name = s, c
    return best_name, best_score


def _has_project_evidence(skill: str, projects: list[str]) -> str | None:
    if not projects:
        return None
    s = skill.lower()
    for p in projects:
        if s in p.lower():
            return p[:180]
    # fuzzy fallback — partial ratio across projects
    best_text: str | None = None
    best_score = 0.0
    for p in projects:
        r = _partial_ratio(s, p)
        if r > best_score:
            best_score, best_text = r, p
    if best_text and best_score >= 78:
        return best_text[:180]
    return None


def _priority(skill_name: str, weight: float) -> float:
    d = _DEMAND.get(skill_name, 0.7)
    learn = _LEARNABILITY.get(skill_name, 0.65)
    # Weighted blend — demand dominates; learnability breaks ties.
    return round(weight * (0.7 * d + 0.3 * learn), 3)


def analyze(
    session_id: str,
    role: Role,
    user_skills: list[str],
    projects: list[str],
    resume_confidence: float,
) -> GapAnalysis:
    matched: list[SkillVerdict] = []
    weak: list[SkillVerdict] = []
    missing: list[SkillVerdict] = []

    total_weight = sum(s.weight for s in role.required_skills) or 1.0
    achieved = 0.0

    for req in role.required_skills:
        name, score = _best_match(req.name, user_skills)
        evidence = _has_project_evidence(req.name, projects)
        verdict = SkillVerdict(
            name=req.name, status="missing", weight=req.weight, evidence=evidence,
            priority=_priority(req.name, req.weight),
        )
        if score >= _MATCH_THRESHOLD:
            verdict.status = "matched"
            matched.append(verdict)
            achieved += req.weight * 1.0
        elif score >= _WEAK_THRESHOLD or (evidence and score >= 60):
            verdict.status = "weak"
            weak.append(verdict)
            achieved += req.weight * 0.5
        else:
            missing.append(verdict)

    # Demote matched -> weak if no project evidence for a core skill.
    upgraded: list[SkillVerdict] = []
    for v in list(matched):
        req = next((r for r in role.required_skills if r.name == v.name), None)
        if req and req.category == "core" and not v.evidence:
            v.status = "weak"
            weak.append(v)
            achieved -= req.weight * 0.5  # downgrade from 1.0 → 0.5
        else:
            upgraded.append(v)
    matched = upgraded

    # --- AI refinement pass -------------------------------------------------
    # Let Gemini review verdicts with project context; upgrade/downgrade where warranted.
    all_verdicts = matched + weak + missing
    refinements = ai_refine_verdicts(role, all_verdicts, user_skills, projects)
    if refinements:
        name_to_req = {r.name: r for r in role.required_skills}
        # Rebuild buckets using AI status
        matched, weak, missing = [], [], []
        achieved = 0.0
        for v in all_verdicts:
            new_status, new_ev = refinements.get(v.name, (v.status, v.evidence))
            v.status = new_status  # type: ignore[assignment]
            if new_ev and not v.evidence:
                v.evidence = new_ev
            w = name_to_req[v.name].weight if v.name in name_to_req else v.weight
            if new_status == "matched":
                matched.append(v)
                achieved += w * 1.0
            elif new_status == "weak":
                weak.append(v)
                achieved += w * 0.5
            else:
                missing.append(v)

    score = max(0.0, min(100.0, round((achieved / total_weight) * 100.0, 1)))
    weeks = _estimate_weeks(missing, weak)

    # Sort priorities
    missing.sort(key=lambda x: x.priority, reverse=True)
    weak.sort(key=lambda x: x.priority, reverse=True)
    matched.sort(key=lambda x: x.weight, reverse=True)

    return GapAnalysis(
        session_id=session_id,
        role_id=role.id,
        role_title=role.title,
        readiness_score=score,
        matched=matched,
        weak=weak,
        missing=missing,
        total_required=len(role.required_skills),
        weeks_to_ready=weeks,
        confidence=resume_confidence,
    )


_REFINE_PROMPT = """You are an expert technical recruiter grading a candidate.

TARGET ROLE: {role}

CANDIDATE SKILLS (self-reported):
{skills}

CANDIDATE PROJECTS / EXPERIENCE:
{projects}

CURRENT RULE-BASED VERDICT (skill → status):
{verdicts}

For each skill, return the FINAL status based on both the self-reported skills AND the project
evidence. Upgrade a "weak" to "matched" if a project convincingly demonstrates the skill.
Downgrade "matched" to "weak" if the skill is listed but no supporting evidence exists and it's a
core competency. Leave "missing" alone unless a project clearly demonstrates it.

Return STRICT JSON:
{{
  "verdicts": [
    {{"name": "<skill>", "status": "matched|weak|missing", "evidence": "<one line why>"}}
  ]
}}
Only include skills from the input. No markdown."""


def ai_refine_verdicts(
    role: Role,
    verdicts: list[SkillVerdict],
    user_skills: list[str],
    projects: list[str],
) -> dict[str, tuple[str, str | None]]:
    """Ask Gemini to review rule-based verdicts. Returns map name→(status, evidence).

    Silently returns {} if Gemini is unavailable — caller keeps rule-based result.
    """
    if not verdicts or not projects:
        return {}

    verdict_lines = "\n".join(f"- {v.name}: {v.status}" for v in verdicts)
    skills_text = ", ".join(user_skills) or "(none)"
    projects_text = "\n".join(f"- {p}" for p in projects[:8]) or "(none)"

    prompt = _REFINE_PROMPT.format(
        role=role.title,
        skills=skills_text,
        projects=projects_text,
        verdicts=verdict_lines,
    )
    cache_key = "refine:" + hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:20]

    try:
        data = gemini_service.ask_json(prompt, cache_key=cache_key, temperature=0.1)
    except Exception as e:  # noqa: BLE001
        logger.info("ai_refine fallback (%s)", e)
        return {}

    result: dict[str, tuple[str, str | None]] = {}
    for v in (data or {}).get("verdicts", []) or []:
        name = str(v.get("name", "")).strip()
        status = str(v.get("status", "")).strip().lower()
        ev = v.get("evidence")
        if not name or status not in {"matched", "weak", "missing"}:
            continue
        result[name] = (status, (str(ev)[:200] if ev else None))
    return result


def _estimate_weeks(missing: list[SkillVerdict], weak: list[SkillVerdict]) -> int:
    gap = len(missing) + 0.5 * len(weak)
    if gap <= 1:
        return 2
    if gap <= 3:
        return 4
    if gap <= 6:
        return 8
    return 12
