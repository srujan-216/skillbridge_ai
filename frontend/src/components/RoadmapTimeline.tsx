import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BookMarked, Calendar, ChevronDown, ListChecks, MessageCircle, Trophy, TrendingUp } from "lucide-react";
import { ResourceCard } from "./ResourceCard";
import { ProjectCard } from "./ProjectCard";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import type { GapAnalysis, Roadmap } from "../types";
import { projectScores } from "../lib/projections";
import { celebrate } from "../lib/celebrate";
import toast from "react-hot-toast";

interface Props { roadmap: Roadmap; gap: GapAnalysis }

export function RoadmapTimeline({ roadmap, gap }: Props) {
  const { progress, toggleProgress } = useStore();
  const [openWeek, setOpenWeek] = useState<number>(1);
  const projections = useMemo(() => projectScores(gap, roadmap), [gap, roadmap]);

  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-brand-500/60 via-indigo2-500/40 to-transparent md:left-6" />
      <div className="space-y-4">
        {roadmap.weeks.map((w) => {
          const itemKeys = [
            ...w.resources.map((_, i) => `${w.week}:res-${i}`),
            `${w.week}:project`,
          ];
          const doneCount = itemKeys.filter((k) => progress[k]).length;
          const total = itemKeys.length;
          const weekPct = total ? Math.round((doneCount / total) * 100) : 0;
          const weekDone = weekPct === 100;
          const open = openWeek === w.week;

          const persist = (key: string, val: boolean) => {
            const wasDone = weekPct === 100;
            toggleProgress(key, val);
            api.setProgress({
              session_id: roadmap.session_id,
              week: w.week,
              item_id: key.split(":").slice(1).join(":"),
              completed: val,
            }).catch(() => { /* toast handled globally */ });
            // Detect if THIS toggle completes the week
            if (val && !wasDone) {
              const completedAfter = itemKeys.filter((k) =>
                k === key ? true : progress[k]
              ).length;
              if (completedAfter === total) {
                setTimeout(() => {
                  celebrate("full");
                  toast.success(`Week ${w.week} complete — +${projections[w.week - 1] - (projections[w.week - 2] ?? gap.readiness_score)}% readiness!`);
                }, 120);
              }
            }
          };

          return (
            <motion.div
              key={w.week}
              layout
              className={`relative pl-10 md:pl-14`}
            >
              <div
                className={`absolute left-0 top-3 w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xs md:text-sm font-bold
                  ${weekDone
                    ? "bg-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.5)]"
                    : "bg-gradient-brand text-white shadow-glow"}`}
              >
                {weekDone ? <Trophy className="w-4 h-4 md:w-5 md:h-5" /> : `W${w.week}`}
              </div>

              <motion.div
                layout
                className={`glass-card p-5 transition-colors ${weekDone ? "!bg-emerald-500/10 !border-emerald-400/25" : ""}`}
              >
                <button
                  onClick={() => setOpenWeek(open ? -1 : w.week)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs sub">
                      <Calendar className="w-3.5 h-3.5" />
                      Week {w.week} · {w.daily_commitment}
                    </div>
                    <h3 className="mt-0.5 text-lg md:text-xl font-semibold break-words">
                      {w.focus}
                    </h3>
                    <p className="sub text-sm mt-1 leading-relaxed">{w.why_it_matters}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-400/25 text-emerald-300">
                      <TrendingUp className="w-3 h-3" />
                      <span>Finish this week → <strong className="tabular-nums">{projections[w.week - 1]}%</strong> readiness</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs sub">{doneCount}/{total}</div>
                      <div className="text-sm font-semibold text-slate-200 tabular-nums">{weekPct}%</div>
                    </div>
                    <motion.div animate={{ rotate: open ? 180 : 0 }}>
                      <ChevronDown className="w-5 h-5 text-slate-300" />
                    </motion.div>
                  </div>
                </button>

                <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className={`h-full ${weekDone ? "bg-emerald-400" : "bg-gradient-brand"}`}
                    animate={{ width: `${weekPct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-5 space-y-5">
                        {w.key_concepts?.length > 0 && (
                          <div>
                            <p className="text-xs uppercase tracking-widest sub mb-2 flex items-center gap-1.5">
                              <BookMarked className="w-3 h-3" /> Key concepts to master
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {w.key_concepts.map((k, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 rounded-md text-xs bg-brand-500/10 border border-brand-400/25 text-brand-200"
                                >
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {w.daily_plan?.length > 0 && (
                          <div>
                            <p className="text-xs uppercase tracking-widest sub mb-2 flex items-center gap-1.5">
                              <ListChecks className="w-3 h-3" /> Day-by-day plan
                            </p>
                            <ol className="space-y-1.5">
                              {w.daily_plan.map((d) => (
                                <li key={d.day} className="flex items-start gap-3 text-sm">
                                  <span className="shrink-0 w-7 h-7 rounded-lg bg-gradient-brand text-white text-xs font-bold flex items-center justify-center">
                                    D{d.day}
                                  </span>
                                  <span className="text-slate-200 leading-relaxed pt-0.5">{d.task}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        <div>
                          <p className="text-xs uppercase tracking-widest sub mb-2">Resources ({w.resources.length})</p>
                          <div className="grid md:grid-cols-2 gap-2.5">
                            {w.resources.map((r, i) => {
                              const key = `${w.week}:res-${i}`;
                              return (
                                <ResourceCard
                                  key={key}
                                  resource={r}
                                  checked={!!progress[key]}
                                  onToggle={() => persist(key, !progress[key])}
                                />
                              );
                            })}
                          </div>
                        </div>

                        <ProjectCard
                          project={w.project}
                          focus={w.focus}
                          checked={!!progress[`${w.week}:project`]}
                          onToggle={() =>
                            persist(`${w.week}:project`, !progress[`${w.week}:project`])
                          }
                        />

                        {w.common_mistakes?.length > 0 && (
                          <div className="rounded-xl p-3 border border-rose-400/25 bg-rose-500/5">
                            <p className="text-xs uppercase tracking-widest mb-1.5 flex items-center gap-1.5 text-rose-300">
                              <AlertTriangle className="w-3 h-3" /> Common mistakes to avoid
                            </p>
                            <ul className="space-y-1 text-sm text-slate-300">
                              {w.common_mistakes.map((m, i) => (
                                <li key={i} className="flex gap-2"><span className="text-rose-300">•</span>{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {w.interview_tips?.length > 0 && (
                          <div className="rounded-xl p-3 border border-amber-400/25 bg-amber-500/5">
                            <p className="text-xs uppercase tracking-widest mb-1.5 flex items-center gap-1.5 text-amber-300">
                              <MessageCircle className="w-3 h-3" /> Interview prep tips
                            </p>
                            <ul className="space-y-1 text-sm text-slate-300">
                              {w.interview_tips.map((t, i) => (
                                <li key={i} className="flex gap-2"><span className="text-amber-300">•</span>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {w.milestone && (
                          <div className="flex items-start gap-2 text-sm text-slate-300 rounded-xl p-3 border border-emerald-400/25 bg-emerald-500/5">
                            <Trophy className="w-4 h-4 text-emerald-300 mt-0.5" />
                            <span><span className="font-semibold text-emerald-200">Milestone:</span> {w.milestone}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function useWeekProgressStats(roadmap: Roadmap | null) {
  const { progress } = useStore();
  return useMemo(() => {
    if (!roadmap) return { total: 0, done: 0, pct: 0, perWeek: [] as { week: number; pct: number; done: number; total: number; focus: string }[] };
    const perWeek = roadmap.weeks.map((w) => {
      const keys = [
        ...w.resources.map((_, i) => `${w.week}:res-${i}`),
        `${w.week}:project`,
      ];
      const done = keys.filter((k) => progress[k]).length;
      return { week: w.week, pct: keys.length ? Math.round((done / keys.length) * 100) : 0, done, total: keys.length, focus: w.focus };
    });
    const total = perWeek.reduce((a, b) => a + b.total, 0);
    const done = perWeek.reduce((a, b) => a + b.done, 0);
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, perWeek };
  }, [roadmap, progress]);
}
