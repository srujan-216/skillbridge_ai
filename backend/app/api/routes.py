"""All HTTP endpoints for SkillBridge AI."""
from __future__ import annotations
import logging
import uuid
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session as OrmSession

from ..config import get_settings
from ..db.database import Analysis, Progress, RoadmapCache, Session, get_db
from ..rate_limit import limiter
from ..models.schemas import (
    ExtractedResume,
    GapAnalysis,
    GapRequest,
    HealthResponse,
    ManualResumeInput,
    ProgressUpdate,
    Roadmap,
    RoadmapRequest,
    Role,
    SkillExplain,
)
from ..services import coach_service, gap_analyzer, gemini_service, pdf_service, resume_ai, roadmap_generator

logger = logging.getLogger("skillbridge.api")
router = APIRouter(prefix="/api", tags=["core"])


# ---------------------------------------------------------------- health
@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    s = get_settings()
    ok = gemini_service.health_check()
    return HealthResponse(status="ok" if ok else "degraded", gemini_ok=ok, model=s.gemini_model)


@router.get("/ping")
def ping() -> dict:
    return {"ok": True}


# ---------------------------------------------------------------- roles
@router.get("/roles", response_model=list[Role])
def list_roles() -> list[Role]:
    return gap_analyzer.load_roles()


@router.get("/roles/{role_id}", response_model=Role)
def get_role(role_id: str) -> Role:
    role = gap_analyzer.find_role(role_id)
    if not role:
        raise HTTPException(404, "role_not_found")
    return role


# ---------------------------------------------------------------- resume upload
def _persist_session(db: OrmSession, session_id: str, parsed_text: str,
                     skills: list[str], projects: list[str], confidence: float) -> None:
    row = db.get(Session, session_id)
    if row is None:
        row = Session(id=session_id)
        db.add(row)
    row.resume_text = parsed_text
    row.skills = skills
    row.projects = projects
    row.confidence = confidence
    db.commit()


@router.post("/upload-resume", response_model=ExtractedResume)
@limiter.limit("20/minute")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    db: OrmSession = Depends(get_db),
) -> ExtractedResume:
    if file.content_type not in {"application/pdf", "application/octet-stream"} and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "only_pdf_supported")

    blob = await file.read()
    if not blob:
        raise HTTPException(400, "empty_file")
    if len(blob) > 5 * 1024 * 1024:
        raise HTTPException(413, "file_too_large_5mb_max")

    try:
        parsed = pdf_service.parse_resume(blob)
    except Exception as e:  # noqa: BLE001
        logger.exception("pdf_parse_failed")
        raise HTTPException(422, f"pdf_parse_failed: {e}") from e

    # Layer Gemini extraction on top of regex for much better recall.
    regex_result = {
        "skills": parsed.skills,
        "projects": parsed.projects,
        "confidence": parsed.confidence,
    }
    ai_result = resume_ai.ai_extract(parsed.raw_text)
    merged = resume_ai.merge_extractions(regex_result, ai_result)

    session_id = uuid.uuid4().hex[:16]
    _persist_session(
        db, session_id, parsed.raw_text,
        merged["skills"], merged["projects"], merged["confidence"],
    )

    return ExtractedResume(
        raw_text=parsed.raw_text,
        skills=merged["skills"],
        projects=merged["projects"],
        education=merged.get("education") or parsed.education,
        experience=merged.get("experience") or parsed.experience,
        certifications=merged.get("certifications", []),
        achievements=merged.get("achievements", []),
        headline=merged.get("headline", ""),
        years_experience=merged.get("years_experience", 0),
        confidence=merged["confidence"],
        session_id=session_id,
    )


@router.post("/manual-resume", response_model=ExtractedResume)
@limiter.limit("20/minute")
def manual_resume(
    request: Request,
    payload: ManualResumeInput,
    db: OrmSession = Depends(get_db),
) -> ExtractedResume:
    skills = [s.strip() for s in payload.skills if s.strip()]
    projects = [p.strip() for p in payload.projects if p.strip()]
    if not skills:
        raise HTTPException(400, "no_skills_provided")

    session_id = uuid.uuid4().hex[:16]
    _persist_session(db, session_id, "manual-entry", skills, projects, 1.0)

    return ExtractedResume(
        raw_text="", skills=skills, projects=projects, education=[], experience=[],
        confidence=1.0, session_id=session_id,
    )


# ---------------------------------------------------------------- gap
@router.post("/analyze-gap", response_model=GapAnalysis)
@limiter.limit("30/minute")
def analyze_gap(
    request: Request,
    payload: GapRequest,
    db: OrmSession = Depends(get_db),
) -> GapAnalysis:
    role = gap_analyzer.find_role(payload.role_id)
    if not role:
        raise HTTPException(404, "role_not_found")

    session = db.get(Session, payload.session_id)
    confidence = session.confidence if session else 0.9
    projects = payload.projects or (session.projects if session else [])

    result = gap_analyzer.analyze(
        session_id=payload.session_id,
        role=role,
        user_skills=payload.skills,
        projects=projects,
        resume_confidence=float(confidence),
    )

    db.add(Analysis(
        session_id=payload.session_id, role_id=role.id,
        readiness_score=result.readiness_score, payload=result.model_dump(),
    ))
    db.commit()
    return result


# ---------------------------------------------------------------- roadmap
@router.post("/generate-roadmap", response_model=Roadmap)
@limiter.limit("10/minute")
def generate_roadmap(
    request: Request,
    payload: RoadmapRequest,
    db: OrmSession = Depends(get_db),
) -> Roadmap:
    role = gap_analyzer.find_role(payload.role_id)
    if not role:
        raise HTTPException(404, "role_not_found")

    hours = max(3, min(40, payload.hours_per_week))
    cache_key = f"{role.id}:{hours}:{','.join(sorted(payload.missing_skills))}"

    cached = db.get(RoadmapCache, cache_key)
    if cached:
        data = cached.payload
        data["session_id"] = payload.session_id
        return Roadmap(**data)

    roadmap = roadmap_generator.build_roadmap(
        session_id=payload.session_id,
        role_id=role.id,
        role_title=role.title,
        missing=payload.missing_skills,
        weak=payload.weak_skills,
        hours=hours,
    )
    db.merge(RoadmapCache(key=cache_key, payload=roadmap.model_dump()))
    db.commit()
    return roadmap


# ---------------------------------------------------------------- skill explain
class ExplainRequest(BaseModel):
    skill: str
    role_id: str


@router.post("/explain-skill", response_model=SkillExplain)
@limiter.limit("60/minute")
def explain_skill(request: Request, payload: ExplainRequest) -> SkillExplain:
    role = gap_analyzer.find_role(payload.role_id)
    if not role:
        raise HTTPException(404, "role_not_found")
    reason = roadmap_generator.explain_skill(payload.skill, role.title)
    return SkillExplain(skill=payload.skill, role=role.title, reason=reason)


# ---------------------------------------------------------------- progress
@router.post("/progress")
@limiter.limit("120/minute")
def update_progress(
    request: Request,
    payload: ProgressUpdate,
    db: OrmSession = Depends(get_db),
) -> dict:
    # one row per (session, week, item)
    existing = (
        db.query(Progress)
        .filter_by(session_id=payload.session_id, week=payload.week, item_id=payload.item_id)
        .one_or_none()
    )
    if existing:
        existing.completed = payload.completed
    else:
        db.add(Progress(
            session_id=payload.session_id, week=payload.week,
            item_id=payload.item_id, completed=payload.completed,
        ))
    db.commit()
    return {"ok": True}


@router.get("/progress/{session_id}")
def get_progress(session_id: str, db: OrmSession = Depends(get_db)) -> dict[str, Any]:
    rows = db.query(Progress).filter_by(session_id=session_id).all()
    items = [
        {"week": r.week, "item_id": r.item_id, "completed": bool(r.completed)} for r in rows
    ]
    completed = sum(1 for r in rows if r.completed)
    return {"session_id": session_id, "items": items, "completed_count": completed, "total": len(rows)}


# ---------------------------------------------------------------- share
@router.get("/share/{session_id}")
def share_profile(session_id: str, db: OrmSession = Depends(get_db)) -> dict[str, Any]:
    """Shareable read-only snapshot — most recent analysis + overall progress."""
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(404, "session_not_found")

    latest = (
        db.query(Analysis)
        .filter_by(session_id=session_id)
        .order_by(Analysis.created_at.desc())
        .first()
    )
    progress_rows = db.query(Progress).filter_by(session_id=session_id).all()
    return {
        "session_id": session_id,
        "skills": session.skills,
        "confidence": session.confidence,
        "analysis": latest.payload if latest else None,
        "progress": {
            "completed": sum(1 for p in progress_rows if p.completed),
            "total": len(progress_rows),
        },
    }


# ---------------------------------------------------------------- demo
_SAMPLE_SKILLS = [
    "Python", "SQL", "Pandas", "NumPy", "Data Visualization",
    "Excel", "Git", "Statistics", "HTML", "CSS",
]
_SAMPLE_PROJECTS = [
    "Sales dashboard built in Power BI analyzing 2 years of regional sales data",
    "Customer churn EDA in Python using Pandas and Matplotlib",
    "SQL analytics project on the Chinook music store dataset",
]


@router.get("/demo")
def demo_profile(db: OrmSession = Depends(get_db)) -> dict[str, Any]:
    """Seed a demo session judges can jump straight into."""
    session_id = f"demo-{uuid.uuid4().hex[:8]}"
    _persist_session(db, session_id, "demo-resume", _SAMPLE_SKILLS, _SAMPLE_PROJECTS, 0.94)
    return {
        "session_id": session_id,
        "skills": _SAMPLE_SKILLS,
        "projects": _SAMPLE_PROJECTS,
        "confidence": 0.94,
        "recommended_role_id": "data_analyst",
    }


# ---------------------------------------------------------------- coach / interview / ats
class CoachMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class CoachRequest(BaseModel):
    message: str
    history: list[CoachMessage] = []
    session_id: str | None = None
    role_id: str | None = None


@router.post("/coach")
@limiter.limit("40/minute")
def ai_coach(
    request: Request,
    payload: CoachRequest,
    db: OrmSession = Depends(get_db),
) -> dict[str, str]:
    role_title = "their target role"
    have: list[str] = []
    missing: list[str] = []
    weak: list[str] = []
    readiness = 0.0

    if payload.role_id:
        role = gap_analyzer.find_role(payload.role_id)
        if role:
            role_title = role.title

    if payload.session_id:
        latest = (
            db.query(Analysis)
            .filter_by(session_id=payload.session_id)
            .order_by(Analysis.created_at.desc())
            .first()
        )
        if latest:
            p = latest.payload or {}
            readiness = float(p.get("readiness_score", 0))
            have = [v["name"] for v in p.get("matched", [])]
            missing = [v["name"] for v in p.get("missing", [])]
            weak = [v["name"] for v in p.get("weak", [])]
            if not payload.role_id and p.get("role_title"):
                role_title = p["role_title"]

    reply = coach_service.chat(
        payload.message,
        [m.model_dump() for m in payload.history],
        role_title,
        readiness,
        have,
        missing,
        weak,
    )
    return {"reply": reply}


class MockInterviewRequest(BaseModel):
    session_id: str
    role_id: str


@router.post("/mock-interview")
@limiter.limit("10/minute")
def mock_interview(
    request: Request,
    payload: MockInterviewRequest,
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    role = gap_analyzer.find_role(payload.role_id)
    if not role:
        raise HTTPException(404, "role_not_found")
    latest = (
        db.query(Analysis)
        .filter_by(session_id=payload.session_id)
        .order_by(Analysis.created_at.desc())
        .first()
    )
    matched = weak = missing = []
    if latest:
        p = latest.payload or {}
        matched = [v["name"] for v in p.get("matched", [])]
        weak = [v["name"] for v in p.get("weak", [])]
        missing = [v["name"] for v in p.get("missing", [])]
    return coach_service.mock_interview(role.title, matched, weak, missing)


class ResumeFeedbackRequest(BaseModel):
    session_id: str
    role_id: str


@router.post("/resume-feedback")
@limiter.limit("10/minute")
def resume_feedback(
    request: Request,
    payload: ResumeFeedbackRequest,
    db: OrmSession = Depends(get_db),
) -> dict[str, Any]:
    role = gap_analyzer.find_role(payload.role_id)
    if not role:
        raise HTTPException(404, "role_not_found")
    session = db.get(Session, payload.session_id)
    if not session:
        raise HTTPException(404, "session_not_found")
    return coach_service.resume_feedback(
        role.title,
        session.resume_text or "",
        list(session.skills or []),
        list(session.projects or []),
    )


# ---------------------------------------------------------------- fallback sample file
@router.get("/sample-resume")
def sample_resume_file() -> JSONResponse:
    path = Path(__file__).resolve().parent.parent.parent / "samples" / "sample_resume.txt"
    if not path.exists():
        raise HTTPException(404, "sample_missing")
    return JSONResponse({"text": path.read_text(encoding="utf-8")})
