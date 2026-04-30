export type SkillStatus = "matched" | "weak" | "missing";

export interface RoleSkill {
  name: string;
  weight: number;
  category: "core" | "tooling" | "soft";
}

export interface Role {
  id: string;
  title: string;
  tagline: string;
  avg_salary_inr: string;
  top_companies: string[];
  trending_skills: string[];
  required_skills: RoleSkill[];
  icon: string;
  category: string;
}

export interface ExtractedResume {
  raw_text: string;
  skills: string[];
  projects: string[];
  education: string[];
  experience: string[];
  certifications: string[];
  achievements: string[];
  headline: string;
  years_experience: number;
  confidence: number;
  session_id: string;
}

export interface SkillVerdict {
  name: string;
  status: SkillStatus;
  weight: number;
  evidence: string | null;
  priority: number;
}

export interface GapAnalysis {
  session_id: string;
  role_id: string;
  role_title: string;
  readiness_score: number;
  matched: SkillVerdict[];
  weak: SkillVerdict[];
  missing: SkillVerdict[];
  total_required: number;
  weeks_to_ready: number;
  confidence: number;
}

export interface Resource {
  name: string;
  url: string;
  type: "video" | "course" | "docs" | "article" | "practice";
  duration: string;
}

export interface RoadmapProject {
  title: string;
  description: string;
  github_starter: string;
}

export interface DailyTask {
  day: number;
  task: string;
}

export interface RoadmapWeek {
  week: number;
  focus: string;
  why_it_matters: string;
  daily_commitment: string;
  key_concepts: string[];
  daily_plan: DailyTask[];
  resources: Resource[];
  project: RoadmapProject;
  common_mistakes: string[];
  interview_tips: string[];
  milestone: string;
}

export interface Roadmap {
  session_id: string;
  role_id: string;
  overview: string;
  weeks: RoadmapWeek[];
  hours_per_week: number;
}

export interface DemoProfile {
  session_id: string;
  skills: string[];
  projects: string[];
  confidence: number;
  recommended_role_id: string;
}
