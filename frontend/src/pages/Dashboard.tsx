import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  BarChart2, Brain, CalendarClock, Check, Download, FileText,
  LayoutGrid, Mic, RefreshCw, Share2, Sparkles, Target, TrendingUp, Wand2,
} from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../store/useStore";
import { ReadinessGauge } from "../components/ReadinessGauge";
import { SkillRadarChart } from "../components/SkillRadarChart";
import { SkillChecklist } from "../components/SkillChecklist";
import { RoadmapTimeline, useWeekProgressStats } from "../components/RoadmapTimeline";
import { ProgressChart } from "../components/ProgressChart";
import { MockInterviewPanel } from "../components/MockInterviewPanel";
import { ResumeFeedbackPanel } from "../components/ResumeFeedbackPanel";
import { exportRoadmapPdf } from "../lib/exportPdf";
import type { Role } from "../types";

type TabKey = "overview" | "roadmap" | "interview" | "ats";

const TABS: { key: TabKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "roadmap", label: "Roadmap", icon: CalendarClock },
  { key: "interview", label: "Mock Interview", icon: Mic },
  { key: "ats", label: "Resume Rewriter", icon: Wand2 },
];

export default function Dashboard() {
  const nav = useNavigate();
  const {
    resume, selectedRoleId, roles, setRoles,
    gap, setGap, roadmap, setRoadmap, hoursPerWeek,
  } = useStore();

  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    if (!resume || !selectedRoleId || !gap) {
      toast("Start from the top — upload, pick a role, then come back.", { icon: "↩️" });
      nav(resume ? "/role" : "/upload");
    }
  }, [resume, selectedRoleId, gap, nav]);

  useEffect(() => {
    if (!roles.length) api.listRoles().then(setRoles).catch(() => {});
  }, [roles.length, setRoles]);

  const role: Role | null = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  useEffect(() => {
    if (!gap || roadmap || loadingRoadmap) return;
    setLoadingRoadmap(true);
    api.generateRoadmap({
      session_id: gap.session_id,
      role_id: gap.role_id,
      missing_skills: gap.missing.map((s) => s.name),
      weak_skills: gap.weak.map((s) => s.name),
      hours_per_week: hoursPerWeek,
    })
      .then(setRoadmap)
      .catch(() => toast.error("Couldn't fetch roadmap — try regenerate."))
      .finally(() => setLoadingRoadmap(false));
  }, [gap, roadmap, loadingRoadmap, hoursPerWeek, setRoadmap]);

  const stats = useWeekProgressStats(roadmap);

  const adjustedScore = useMemo(() => {
    if (!gap) return 0;
    const base = gap.readiness_score;
    const bump = Math.round(stats.pct * 0.1);
    return Math.min(100, base + bump);
  }, [gap, stats.pct]);

  async function regenerate() {
    if (!gap) return;
    setRegenBusy(true);
    try {
      const r = await api.generateRoadmap({
        session_id: gap.session_id,
        role_id: gap.role_id,
        missing_skills: gap.missing.map((s) => s.name),
        weak_skills: gap.weak.map((s) => s.name),
        hours_per_week: hoursPerWeek,
      });
      setRoadmap(r);
      toast.success("Fresh roadmap loaded!");
    } finally {
      setRegenBusy(false);
    }
  }

  async function copyShareLink() {
    if (!gap) return;
    const url = `${window.location.origin}/share/${gap.session_id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
    } catch {
      toast.error("Clipboard blocked.");
    }
  }

  function downloadPdf() {
    if (!gap || !roadmap || !role) return;
    exportRoadmapPdf({ gap, roadmap, role, hoursPerWeek });
    toast.success("PDF downloaded!");
  }

  if (!gap || !role) return <DashboardSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10">
      {/* ===== Title block + actions ===== */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow" style={{ color: "var(--brand-1)" }}>
            <Sparkles className="w-3 h-3" /> Your SkillBridge report
          </div>
          <h1 className="mt-2 text-4xl md:text-[44px] font-extrabold tracking-tight leading-none">
            You're <span className="gradient-text tabular-nums">{adjustedScore}%</span> ready
          </h1>
          <p className="mt-2 text-lg" style={{ color: "var(--text-dim)" }}>
            for <span style={{ color: "var(--text)" }} className="font-semibold">{role.title}</span>
            {" · "}committed to {hoursPerWeek} hrs/week
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-ghost" onClick={copyShareLink}>
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button
            className="btn-ghost"
            onClick={regenerate}
            disabled={regenBusy || !roadmap}
          >
            <RefreshCw className={`w-4 h-4 ${regenBusy ? "animate-spin" : ""}`} /> Regenerate
          </button>
          <button className="btn-primary" onClick={downloadPdf} disabled={!roadmap}>
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </header>

      {/* ===== Tab nav ===== */}
      <div className="panel p-1.5 mb-8 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={active ? "tab-active" : "tab"}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          {tab === "overview" && (
            <>
              <section className="grid md:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="panel-accent p-6 flex flex-col sm:flex-row items-center gap-5"
                >
                  <ReadinessGauge value={adjustedScore} size={170} label="Readiness" />
                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
                    <div>
                      <p className="eyebrow">Base score</p>
                      <p className="text-xl font-bold tabular-nums">{gap.readiness_score}%</p>
                    </div>
                    <div>
                      <p className="eyebrow">With roadmap progress</p>
                      <p className="text-xl font-bold tabular-nums text-emerald-300">
                        +{Math.round(stats.pct * 0.1)}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <StatCard
                  icon={<Check className="w-5 h-5" />}
                  label="Skills matched"
                  value={`${gap.matched.length}/${gap.total_required}`}
                  sub={`${gap.weak.length} weak · ${gap.missing.length} missing`}
                />

                <StatCard
                  icon={<CalendarClock className="w-5 h-5" />}
                  label="Weeks to job-ready"
                  value={`${gap.weeks_to_ready}`}
                  sub={`${hoursPerWeek} hrs/wk commitment`}
                />
              </section>

              <section className="grid lg:grid-cols-2 gap-5">
                <div className="panel p-6">
                  <div className="section-head !mb-4">
                    <div>
                      <p className="eyebrow">Skill coverage</p>
                      <h2 className="!text-xl">You vs {role.title}</h2>
                    </div>
                    <Target className="w-4 h-4" style={{ color: "#a78bfa" }} />
                  </div>
                  <SkillRadarChart gap={gap} role={role} />
                </div>

                <div className="panel p-6">
                  <div className="section-head !mb-4">
                    <div>
                      <p className="eyebrow">Your verdicts</p>
                      <h2 className="!text-xl">Matched · Weak · Missing</h2>
                    </div>
                    <span className="sub text-xs">Hover for AI explanation</span>
                  </div>
                  <SkillChecklist gap={gap} />
                </div>
              </section>

              {roadmap && (
                <section className="panel p-6">
                  <div className="section-head !mb-4">
                    <div>
                      <p className="eyebrow">Your 4-week plan</p>
                      <h2 className="!text-xl">{roadmap.overview}</h2>
                    </div>
                    <button
                      className="btn-ghost text-xs"
                      onClick={() => setTab("roadmap")}
                    >
                      Open full roadmap →
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {roadmap.weeks.map((w) => (
                      <button
                        key={w.week}
                        onClick={() => setTab("roadmap")}
                        className="text-left rounded-xl p-4 border border-white/10 bg-white/5 hover:border-brand-400/40 hover:bg-white/[0.07] transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] uppercase tracking-widest text-brand-300 font-semibold">
                            Week {w.week}
                          </span>
                          <span className="text-[11px] sub">{w.daily_commitment}</span>
                        </div>
                        <h4 className="font-semibold text-slate-100 leading-snug mb-2 break-words">
                          {w.focus}
                        </h4>
                        <p className="sub text-xs leading-relaxed line-clamp-3 mb-3">
                          {w.why_it_matters}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] sub border-t border-white/5 pt-2">
                          <span>{w.daily_plan.length} tasks</span>
                          <span>·</span>
                          <span>{w.resources.length} resources</span>
                          <span>·</span>
                          <span>1 project</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {roadmap && (
                <section className="panel p-6">
                  <div className="section-head !mb-4">
                    <div>
                      <p className="eyebrow">Roadmap progress</p>
                      <h2 className="!text-xl">Weekly completion</h2>
                    </div>
                    <TrendingUp className="w-4 h-4" style={{ color: "#a78bfa" }} />
                  </div>
                  <ProgressChart data={stats.perWeek} />
                </section>
              )}
            </>
          )}

          {tab === "roadmap" && (
            <>
              <div className="section-head">
                <div>
                  <p className="eyebrow"><BarChart2 className="w-3 h-3" /> Your 4-week plan</p>
                  <h2>
                    {roadmap?.overview ?? "Crafting your personalized plan…"}
                  </h2>
                </div>
                {roadmap && (
                  <div className="text-right">
                    <p className="eyebrow">Progress</p>
                    <p className="text-xl font-bold tabular-nums">
                      {stats.done}/{stats.total} <span style={{ color: "var(--text-dim)" }}>items</span>
                      <span className="ml-2 text-emerald-300">{stats.pct}%</span>
                    </p>
                  </div>
                )}
              </div>

              {loadingRoadmap || !roadmap ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="panel p-5 h-32 skel" />
                  ))}
                </div>
              ) : (
                <RoadmapTimeline roadmap={roadmap} gap={gap} />
              )}
            </>
          )}

          {tab === "interview" && (
            <>
              <div className="section-head">
                <div>
                  <p className="eyebrow"><Brain className="w-3 h-3" /> AI Mock Interview</p>
                  <h2>Drill the questions recruiters will actually ask.</h2>
                </div>
              </div>
              <MockInterviewPanel
                sessionId={gap.session_id}
                roleId={gap.role_id}
                roleTitle={role.title}
              />
            </>
          )}

          {tab === "ats" && (
            <>
              <div className="section-head">
                <div>
                  <p className="eyebrow"><FileText className="w-3 h-3" /> ATS Resume Rewriter</p>
                  <h2>Pass the bots. Impress the humans.</h2>
                </div>
              </div>
              <ResumeFeedbackPanel
                sessionId={gap.session_id}
                roleId={gap.role_id}
                roleTitle={role.title}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  icon, label, value, sub,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel p-6 flex items-start gap-4"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: "rgba(124,58,237,0.12)",
          border: "1px solid rgba(124,58,237,0.28)",
          color: "#a78bfa",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow">{label}</p>
        <p className="text-3xl font-extrabold tabular-nums mt-0.5">{value}</p>
        {sub && <p className="sub text-xs mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 space-y-6">
      <div className="h-10 w-1/2 skel rounded-xl" />
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="panel h-40 skel" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="panel h-80 skel" />
        <div className="panel h-80 skel" />
      </div>
    </div>
  );
}
