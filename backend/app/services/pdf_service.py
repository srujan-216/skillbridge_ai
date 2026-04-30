"""Resume text extraction with pdfplumber + heuristic skill mining."""
from __future__ import annotations
import io
import logging
import re
from dataclasses import dataclass

import pdfplumber

from .skills_kb import SKILL_ALIASES

logger = logging.getLogger("skillbridge.pdf")


@dataclass
class ParsedResume:
    raw_text: str
    skills: list[str]
    projects: list[str]
    education: list[str]
    experience: list[str]
    confidence: float


_SECTION_HINTS = {
    "skills": ["skills", "technical skills", "tech stack"],
    "projects": ["projects", "personal projects", "academic projects"],
    "education": ["education", "academics"],
    "experience": ["experience", "work experience", "internship"],
}


def _extract_text(pdf_bytes: bytes) -> str:
    pages: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for p in pdf.pages:
            try:
                pages.append(p.extract_text() or "")
            except Exception as e:  # noqa: BLE001
                logger.warning("pdfplumber page fail: %s", e)
    return "\n".join(pages)


def _find_sections(text: str) -> dict[str, str]:
    lines = [ln.rstrip() for ln in text.splitlines()]
    sections: dict[str, list[str]] = {k: [] for k in _SECTION_HINTS}
    current: str | None = None
    for ln in lines:
        low = ln.strip().lower()
        found = None
        for key, hints in _SECTION_HINTS.items():
            if any(low == h or low.startswith(h + ":") or low.startswith(h + " ") for h in hints):
                found = key
                break
        if found:
            current = found
            continue
        if current and ln.strip():
            sections[current].append(ln.strip())
    return {k: "\n".join(v) for k, v in sections.items()}


def _mine_skills(text: str) -> list[str]:
    low = text.lower()
    found: set[str] = set()
    for canonical, aliases in SKILL_ALIASES.items():
        for alias in aliases:
            pattern = rf"(?<![A-Za-z0-9+#\.]){re.escape(alias)}(?![A-Za-z0-9+#\.])"
            if re.search(pattern, low):
                found.add(canonical)
                break
    return sorted(found)


def _mine_projects(section_text: str) -> list[str]:
    if not section_text:
        return []
    chunks = re.split(r"\n(?=[A-Z0-9])|\n\s*[-•]\s*", section_text)
    out = [c.strip(" -•\t") for c in chunks if len(c.strip()) > 15]
    return out[:8]


def _split_lines(section_text: str) -> list[str]:
    if not section_text:
        return []
    return [ln.strip(" -•\t") for ln in section_text.splitlines() if ln.strip()][:6]


def parse_resume(pdf_bytes: bytes) -> ParsedResume:
    text = _extract_text(pdf_bytes)
    sections = _find_sections(text)

    skills = _mine_skills(text)
    projects = _mine_projects(sections.get("projects", ""))
    education = _split_lines(sections.get("education", ""))
    experience = _split_lines(sections.get("experience", ""))

    # Confidence heuristic: more text + more detected skills + section hits = higher.
    text_score = min(len(text) / 2500.0, 1.0)
    skill_score = min(len(skills) / 12.0, 1.0)
    section_score = sum(1 for v in sections.values() if v) / 4.0
    confidence = round(0.4 * text_score + 0.4 * skill_score + 0.2 * section_score, 2)

    return ParsedResume(
        raw_text=text,
        skills=skills,
        projects=projects,
        education=education,
        experience=experience,
        confidence=confidence,
    )
