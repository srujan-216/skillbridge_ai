import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import type {
  ExtractedResume,
  GapAnalysis,
  Roadmap,
  Role,
  DemoProfile,
} from "../types";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 60_000,
});

client.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ detail?: string; error?: string }>) => {
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.message ||
      "Request failed";
    if (!axios.isCancel(err)) toast.error(String(msg));
    return Promise.reject(err);
  }
);

export const api = {
  health: () => client.get("/health").then((r) => r.data),
  ping: () => client.get("/ping").then((r) => r.data),

  listRoles: () => client.get<Role[]>("/roles").then((r) => r.data),
  getRole: (id: string) => client.get<Role>(`/roles/${id}`).then((r) => r.data),

  uploadResume: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return client
      .post<ExtractedResume>("/upload-resume", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  manualResume: (skills: string[], projects: string[] = []) =>
    client
      .post<ExtractedResume>("/manual-resume", { skills, projects })
      .then((r) => r.data),

  analyzeGap: (body: {
    session_id: string;
    role_id: string;
    skills: string[];
    projects?: string[];
  }) => client.post<GapAnalysis>("/analyze-gap", body).then((r) => r.data),

  generateRoadmap: (body: {
    session_id: string;
    role_id: string;
    missing_skills: string[];
    weak_skills?: string[];
    hours_per_week?: number;
  }) => client.post<Roadmap>("/generate-roadmap", body).then((r) => r.data),

  explainSkill: (skill: string, role_id: string) =>
    client
      .post<{ skill: string; role: string; reason: string }>(
        "/explain-skill",
        { skill, role_id }
      )
      .then((r) => r.data),

  setProgress: (body: {
    session_id: string;
    week: number;
    item_id: string;
    completed: boolean;
  }) => client.post("/progress", body).then((r) => r.data),

  getProgress: (sid: string) =>
    client.get(`/progress/${sid}`).then((r) => r.data),

  share: (sid: string) => client.get(`/share/${sid}`).then((r) => r.data),

  demo: () => client.get<DemoProfile>("/demo").then((r) => r.data),

  coach: (body: {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    session_id?: string | null;
    role_id?: string | null;
  }) => client.post<{ reply: string }>("/coach", body).then((r) => r.data),

  mockInterview: (body: { session_id: string; role_id: string }) =>
    client.post<{ questions: MockQuestion[] }>("/mock-interview", body).then((r) => r.data),

  resumeFeedback: (body: { session_id: string; role_id: string }) =>
    client.post<ResumeFeedback>("/resume-feedback", body).then((r) => r.data),
};

export interface MockQuestion {
  id: number;
  question: string;
  type: "technical" | "behavioural" | "scenario" | "design";
  difficulty: "easy" | "medium" | "hard";
  tests_skill: string;
  ideal_answer_framework: string;
  red_flags: string;
  follow_up: string;
}

export interface BulletRewrite {
  original: string;
  improved: string;
  why: string;
}

export interface ResumeFeedback {
  ats_score: number;
  ats_reasoning: string;
  missing_keywords: string[];
  strengths: string[];
  weaknesses: string[];
  bullet_rewrites: BulletRewrite[];
  one_line_headline_suggestion: string;
}
