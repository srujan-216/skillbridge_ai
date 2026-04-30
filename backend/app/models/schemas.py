from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


# ---------- Resume ----------
class ExtractedResume(BaseModel):
    raw_text: str
    skills: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    headline: str = ""
    years_experience: int = 0
    confidence: float = Field(ge=0, le=1, default=0.0)
    session_id: str


class ManualResumeInput(BaseModel):
    skills: list[str]
    projects: list[str] = Field(default_factory=list)


# ---------- Roles ----------
class RoleSkill(BaseModel):
    name: str
    weight: float = 1.0
    category: Literal["core", "tooling", "soft"] = "core"


class Role(BaseModel):
    id: str
    title: str
    tagline: str
    avg_salary_inr: str
    top_companies: list[str]
    trending_skills: list[str]
    required_skills: list[RoleSkill]
    icon: str
    category: str = "Engineering"


# ---------- Gap ----------
SkillStatus = Literal["matched", "weak", "missing"]


class SkillVerdict(BaseModel):
    name: str
    status: SkillStatus
    weight: float = 1.0
    evidence: Optional[str] = None
    priority: float = 0.0


class GapAnalysis(BaseModel):
    session_id: str
    role_id: str
    role_title: str
    readiness_score: float
    matched: list[SkillVerdict]
    weak: list[SkillVerdict]
    missing: list[SkillVerdict]
    total_required: int
    weeks_to_ready: int
    confidence: float


class GapRequest(BaseModel):
    session_id: str
    role_id: str
    skills: list[str]
    projects: list[str] = Field(default_factory=list)


# ---------- Roadmap ----------
class Resource(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str
    url: str
    type: Literal["video", "course", "docs", "article", "practice"] = "course"
    duration: str = ""


class RoadmapProject(BaseModel):
    title: str
    description: str
    github_starter: str = ""


class DailyTask(BaseModel):
    day: int
    task: str


class RoadmapWeek(BaseModel):
    week: int
    focus: str
    why_it_matters: str
    daily_commitment: str
    key_concepts: list[str] = Field(default_factory=list)
    daily_plan: list[DailyTask] = Field(default_factory=list)
    resources: list[Resource]
    project: RoadmapProject
    common_mistakes: list[str] = Field(default_factory=list)
    interview_tips: list[str] = Field(default_factory=list)
    milestone: str


class Roadmap(BaseModel):
    session_id: str
    role_id: str
    overview: str
    weeks: list[RoadmapWeek]
    hours_per_week: int = 10


class RoadmapRequest(BaseModel):
    session_id: str
    role_id: str
    missing_skills: list[str]
    weak_skills: list[str] = Field(default_factory=list)
    hours_per_week: int = 10


# ---------- Misc ----------
class SkillExplain(BaseModel):
    skill: str
    role: str
    reason: str


class ProgressUpdate(BaseModel):
    session_id: str
    week: int
    item_id: str
    completed: bool


class HealthResponse(BaseModel):
    status: str
    gemini_ok: bool
    model: str
