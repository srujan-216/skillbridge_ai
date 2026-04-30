import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ExtractedResume,
  GapAnalysis,
  Roadmap,
  Role,
} from "../types";

export type ProgressKey = string; // `${week}:${itemId}`

interface State {
  theme: "dark" | "light";
  toggleTheme: () => void;

  resume: ExtractedResume | null;
  setResume: (r: ExtractedResume | null) => void;
  updateSkills: (skills: string[]) => void;

  roles: Role[];
  setRoles: (r: Role[]) => void;

  selectedRoleId: string | null;
  setSelectedRoleId: (id: string | null) => void;

  hoursPerWeek: number;
  setHoursPerWeek: (n: number) => void;

  gap: GapAnalysis | null;
  setGap: (g: GapAnalysis | null) => void;

  roadmap: Roadmap | null;
  setRoadmap: (r: Roadmap | null) => void;

  progress: Record<ProgressKey, boolean>;
  toggleProgress: (key: ProgressKey, val?: boolean) => void;
  setProgressBulk: (p: Record<ProgressKey, boolean>) => void;

  isDemo: boolean;
  setIsDemo: (b: boolean) => void;

  reset: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === "dark" ? "light" : "dark";
          const html = document.documentElement;
          html.classList.toggle("dark", next === "dark");
          html.classList.toggle("light", next === "light");
          return { theme: next };
        }),

      resume: null,
      setResume: (r) => set({ resume: r }),
      updateSkills: (skills) =>
        set((s) => (s.resume ? { resume: { ...s.resume, skills } } : {})),

      roles: [],
      setRoles: (r) => set({ roles: r }),

      selectedRoleId: null,
      setSelectedRoleId: (id) => set({ selectedRoleId: id }),

      hoursPerWeek: 10,
      setHoursPerWeek: (n) => set({ hoursPerWeek: n }),

      gap: null,
      setGap: (g) => set({ gap: g }),

      roadmap: null,
      setRoadmap: (r) => set({ roadmap: r }),

      progress: {},
      toggleProgress: (key, val) =>
        set((s) => ({
          progress: {
            ...s.progress,
            [key]: val ?? !s.progress[key],
          },
        })),
      setProgressBulk: (p) => set({ progress: p }),

      isDemo: false,
      setIsDemo: (b) => set({ isDemo: b }),

      reset: () =>
        set({
          resume: null,
          selectedRoleId: null,
          gap: null,
          roadmap: null,
          progress: {},
          isDemo: false,
        }),
    }),
    {
      name: "skillbridge-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        resume: s.resume,
        selectedRoleId: s.selectedRoleId,
        hoursPerWeek: s.hoursPerWeek,
        gap: s.gap,
        roadmap: s.roadmap,
        progress: s.progress,
        isDemo: s.isDemo,
      }),
    }
  )
);
