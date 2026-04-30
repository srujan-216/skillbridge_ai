import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Loader2, Search, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../store/useStore";
import { RoleCard } from "../components/RoleCard";

export default function RoleSelect() {
  const nav = useNavigate();
  const {
    roles, setRoles, resume,
    selectedRoleId, setSelectedRoleId,
    hoursPerWeek, setHoursPerWeek,
    setGap, setRoadmap,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<string>("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!resume) {
      toast("Upload your resume first.", { icon: "👋" });
      nav("/upload");
      return;
    }
    if (roles.length) return;
    setLoading(true);
    api.listRoles().then(setRoles).finally(() => setLoading(false));
  }, [roles.length, resume, nav, setRoles]);

  const selected = roles.find((r) => r.id === selectedRoleId) || null;

  const categories = useMemo(() => {
    const s = new Set<string>();
    roles.forEach((r) => s.add(r.category || "Other"));
    return ["All", ...Array.from(s).sort()];
  }, [roles]);

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((r) => {
      if (filter !== "All" && (r.category || "Other") !== filter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.tagline.toLowerCase().includes(q) ||
        r.top_companies.some((c) => c.toLowerCase().includes(q)) ||
        r.required_skills.some((s) => s.name.toLowerCase().includes(q))
      );
    });
  }, [roles, filter, query]);

  async function analyze() {
    if (!resume || !selected) return;
    setAnalyzing(true);
    try {
      const gap = await api.analyzeGap({
        session_id: resume.session_id,
        role_id: selected.id,
        skills: resume.skills,
        projects: resume.projects,
      });
      setGap(gap);
      setRoadmap(null);
      toast.success(`Score: ${gap.readiness_score}% — let's close the gap!`);
      nav("/dashboard");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14 space-y-8">
      <header className="text-center space-y-3">
        <div className="eyebrow justify-center inline-flex" style={{ color: "var(--brand-1)" }}>
          <Sparkles className="w-3 h-3" /> Step 2 of 3
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Pick your <span className="gradient-text">target role</span>.
        </h1>
        <p className="sub max-w-2xl mx-auto">
          20 roles across 7 categories — each scored against real 2025 job postings.
        </p>
      </header>

      {!loading && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filter === c ? "text-white" : ""
                }`}
                style={
                  filter === c
                    ? {
                        background: "linear-gradient(135deg, var(--brand-1), var(--brand-3))",
                        borderColor: "transparent",
                        boxShadow: "0 6px 16px -2px rgba(124,58,237,0.4)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        borderColor: "var(--border)",
                        color: "var(--text-dim)",
                      }
                }
              >
                {c}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search role, skill, company…"
              className="input !pl-9"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="panel p-5 h-52 skel" />
          ))}
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="sub">No roles match "{query}" in {filter}.</p>
        </div>
      ) : (
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((r) => (
            <RoleCard
              key={r.id}
              role={r}
              selected={selectedRoleId === r.id}
              onSelect={setSelectedRoleId}
            />
          ))}
        </motion.div>
      )}

      <motion.div
        initial={false}
        animate={{ opacity: selected ? 1 : 0.55, y: selected ? 0 : 8 }}
        className="sticky bottom-4 z-20"
      >
        <div className="panel-accent p-4 md:p-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <p className="eyebrow">Selected role</p>
            <p className="font-bold text-lg truncate">
              {selected ? selected.title : "— pick a card above —"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 shrink-0" style={{ color: "#a78bfa" }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs">
                <span className="sub">Weekly commitment</span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                  {hoursPerWeek} hrs/wk
                </span>
              </div>
              <input
                type="range" min={3} max={30} step={1}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="w-full mt-1.5"
                style={{ accentColor: "#7C3AED" }}
                aria-label="Weekly learning hours"
              />
            </div>
          </div>

          <button
            onClick={analyze}
            disabled={!selected || analyzing}
            className="btn-primary btn-lg w-full md:w-auto justify-center"
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
            ) : (
              <>Analyze my gap <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
