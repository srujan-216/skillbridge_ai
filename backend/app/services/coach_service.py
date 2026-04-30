"""AI career coach, mock interview, and resume feedback services."""
from __future__ import annotations
import hashlib
import logging
from typing import Any

from . import gemini_service

logger = logging.getLogger("skillbridge.coach")


# ==============================================================================
# AI chat coach
# ==============================================================================

COACH_SYSTEM = """You are SkillBridge AI — a warm, witty, no-BS career coach for students and
early-career engineers. Be specific, actionable, and concise. Use plain language.
When the student asks about skills, always tie advice back to their TARGET ROLE
and tell them WHICH week of their roadmap to focus on.

You have full context about this student below — use it to personalize every reply.

STUDENT CONTEXT:
- Target role: {role}
- Readiness score: {score}%
- Skills they have: {have}
- Skills they're missing: {missing}
- Weak skills (needs reinforcement): {weak}

RULES:
- 2–5 sentences per reply unless they ask for a list.
- No disclaimers, no "I'm just an AI". Be a mentor.
- If the question is outside scope (politics, medical, etc.), gently redirect to career."""


def chat(
    user_message: str,
    history: list[dict[str, str]],
    role_title: str,
    readiness: float,
    have: list[str],
    missing: list[str],
    weak: list[str],
) -> str:
    """Return the coach's next reply. `history` is [{role:'user'|'assistant', content:'...'}]."""
    sys = COACH_SYSTEM.format(
        role=role_title or "not yet chosen",
        score=int(readiness),
        have=", ".join(have[:25]) or "(nothing extracted yet)",
        missing=", ".join(missing[:15]) or "(none)",
        weak=", ".join(weak[:10]) or "(none)",
    )

    # Flatten conversation into a single prompt — gemini-2.0-flash handles this well.
    convo = []
    for h in history[-8:]:
        who = "Student" if h.get("role") == "user" else "Coach"
        convo.append(f"{who}: {h.get('content','')}")
    convo.append(f"Student: {user_message}")
    convo.append("Coach:")

    prompt = sys + "\n\n" + "\n".join(convo)

    try:
        return gemini_service.ask_text(prompt, temperature=0.7).strip()[:1200]
    except Exception as e:  # noqa: BLE001
        logger.info("coach fallback (%s)", e)
        return (
            "I'm temporarily offline — try again in a moment. In the meantime, "
            f"focus on Week 1 of your roadmap: the highest-leverage skill for a "
            f"{role_title or 'target'} role is usually the one listed first."
        )


# ==============================================================================
# Mock interview
# ==============================================================================

MOCK_INTERVIEW_PROMPT = """Generate 5 realistic interview questions for a {role} role.
Target the candidate's weak areas: {weak_skills}.
Missing skills (so go easier on these): {missing_skills}.
Already strong: {matched_skills}.

Mix question types: 2 technical, 1 behavioural, 1 scenario, 1 system-design/problem-solving.

Return STRICT JSON:
{{
  "questions": [
    {{
      "id": 1,
      "question": "...",
      "type": "technical|behavioural|scenario|design",
      "difficulty": "easy|medium|hard",
      "tests_skill": "<skill name>",
      "ideal_answer_framework": "<3-5 bullets of what a great answer covers>",
      "red_flags": "<what a weak answer looks like>",
      "follow_up": "<one harder follow-up question>"
    }}
  ]
}}
No markdown. Be specific and useful."""


def mock_interview(role: str, matched: list[str], weak: list[str], missing: list[str]) -> dict[str, Any]:
    prompt = MOCK_INTERVIEW_PROMPT.format(
        role=role,
        matched_skills=", ".join(matched[:10]) or "(none)",
        weak_skills=", ".join(weak[:10]) or "(none)",
        missing_skills=", ".join(missing[:10]) or "(none)",
    )
    key = "mock:" + hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:20]
    try:
        data = gemini_service.ask_json(prompt, cache_key=key, temperature=0.4)
        if not isinstance(data, dict) or not data.get("questions"):
            raise ValueError("empty")
        return data
    except Exception as e:  # noqa: BLE001
        logger.info("mock_interview fallback (%s)", e)
        return _mock_interview_fallback(role)


def _mock_interview_fallback(role: str) -> dict[str, Any]:
    return {"questions": [
        {
            "id": 1,
            "question": f"Walk me through a recent project where you applied the core skills of a {role}. What was the trickiest trade-off?",
            "type": "behavioural",
            "difficulty": "medium",
            "tests_skill": "project ownership",
            "ideal_answer_framework": "• Context (what/why/who) • What YOU did specifically • The trade-off and reasoning • The measurable outcome • What you'd change next time",
            "red_flags": "Uses 'we' throughout, skips measurable outcomes, no reflection.",
            "follow_up": "What would you do differently if the team doubled in size?",
        },
        {
            "id": 2,
            "question": "Design the data model for a feature that tracks user-skill progress over time. What indexes would you add and why?",
            "type": "design",
            "difficulty": "medium",
            "tests_skill": "system design",
            "ideal_answer_framework": "• Tables + keys • Query patterns • Indexes for each pattern • Scaling concerns (hot keys, partitioning) • Trade-offs (consistency vs latency)",
            "red_flags": "Jumps to code, no discussion of access patterns.",
            "follow_up": "How would the design change if we needed audit-grade history?",
        },
        {
            "id": 3,
            "question": "You're on-call and see a 10x latency spike on the main API. What's your first 5 minutes?",
            "type": "scenario",
            "difficulty": "hard",
            "tests_skill": "debugging under pressure",
            "ideal_answer_framework": "• Confirm scope (region? endpoint?) • Check recent deploys/config • Look at dependencies (DB, cache, downstream) • Mitigate before fixing (flag, rollback) • Communicate with stakeholders",
            "red_flags": "Starts tweaking code, doesn't triage first.",
            "follow_up": "Walk me through the blameless postmortem.",
        },
        {
            "id": 4,
            "question": f"What's your mental model for the most important technical skill for this {role} role, in one minute?",
            "type": "technical",
            "difficulty": "easy",
            "tests_skill": "fundamentals",
            "ideal_answer_framework": "• Core concept in plain words • Why it exists • Common misuse • When to avoid it",
            "red_flags": "Recites definitions, no intuition.",
            "follow_up": "Give an example where it bit you personally.",
        },
        {
            "id": 5,
            "question": "Tell me about a time you disagreed with a teammate on a technical decision. How did it resolve?",
            "type": "behavioural",
            "difficulty": "medium",
            "tests_skill": "collaboration",
            "ideal_answer_framework": "• STAR: Situation, Task, Action, Result • How you separated person from problem • What data/criteria broke the tie • What you learned",
            "red_flags": "Paints teammate as wrong, no self-awareness.",
            "follow_up": "What if they had outranked you?",
        },
    ]}


# ==============================================================================
# Resume feedback / ATS
# ==============================================================================

RESUME_FEEDBACK_PROMPT = """You are an expert ATS + resume reviewer.
A student is targeting a {role} role. Review their resume and return concrete, actionable feedback.

RESUME TEXT:
\"\"\"
{text}
\"\"\"

Known skills: {skills}
Known projects: {projects}

Return STRICT JSON:
{{
  "ats_score": 0,                        // 0-100, how likely an ATS shortlists this for {role}
  "ats_reasoning": "one sentence why",
  "missing_keywords": ["<jd keyword>", ...],    // 6-10 ATS-relevant missing phrases
  "strengths": ["...", "..."],            // 2-4 things that are working
  "weaknesses": ["...", "..."],           // 2-4 things hurting the resume
  "bullet_rewrites": [
    {{
      "original": "<likely weak bullet or section they have>",
      "improved": "<metrics + action + impact rewrite>",
      "why": "<one sentence>"
    }}
  ],                                       // 3-5 concrete rewrites
  "one_line_headline_suggestion": "<a punchy 120-char headline>"
}}
No markdown. Be specific to the {role} role."""


def resume_feedback(role: str, resume_text: str, skills: list[str], projects: list[str]) -> dict[str, Any]:
    text = (resume_text or "").strip()[:8000] or "(no resume text available)"
    prompt = RESUME_FEEDBACK_PROMPT.format(
        role=role,
        text=text,
        skills=", ".join(skills[:30]) or "(none)",
        projects="; ".join(projects[:6]) or "(none)",
    )
    key = "ats:" + hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:20]
    try:
        data = gemini_service.ask_json(prompt, cache_key=key, temperature=0.3)
        if not isinstance(data, dict):
            raise ValueError("bad")
        return data
    except Exception as e:  # noqa: BLE001
        logger.info("resume_feedback fallback (%s)", e)
        return {
            "ats_score": 55,
            "ats_reasoning": "Heuristic fallback — enable Gemini for a full review.",
            "missing_keywords": skills[:6] if skills else ["Python", "SQL", "Git"],
            "strengths": ["Includes projects section", "Readable structure"],
            "weaknesses": ["Bullets lack quantified impact", "Missing role-specific keywords"],
            "bullet_rewrites": [
                {
                    "original": "Worked on data analysis project.",
                    "improved": "Built a Pandas pipeline that cut weekly reporting time by 40% across 3 regional teams.",
                    "why": "Quantifies impact and names the tool — passes both ATS and human eyes.",
                },
            ],
            "one_line_headline_suggestion": f"{role} intern-ready — turns messy data into shipped, measurable wins.",
        }
