import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { ReadinessGauge } from "../components/ReadinessGauge";

interface Shared {
  session_id: string;
  skills: string[];
  confidence: number;
  analysis: {
    role_title: string;
    readiness_score: number;
    matched: { name: string }[];
    weak: { name: string }[];
    missing: { name: string }[];
    weeks_to_ready: number;
  } | null;
  progress: { completed: number; total: number };
}

export default function Share() {
  const { id } = useParams();
  const [data, setData] = useState<Shared | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.share(id).then(setData).catch(() => setErr("Share link expired or invalid."));
  }, [id]);

  if (err) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <h1 className="section-title">Link unavailable</h1>
        <p className="sub mt-2">{err}</p>
        <Link to="/" className="btn-primary mt-6 mx-auto"><ArrowRight className="w-4 h-4" /> Start your own</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 space-y-4">
        <div className="h-10 w-1/2 skeleton rounded-xl mx-auto" />
        <div className="glass-card h-64 skeleton" />
      </div>
    );
  }

  const a = data.analysis;
  return (
    <div className="max-w-4xl mx-auto px-5 py-10 space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
          <Trophy className="w-3 h-3 text-amber-300" /> Shared readiness profile
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          {a ? (
            <>
              <span className="gradient-text">{a.readiness_score}%</span> ready for {a.role_title}
            </>
          ) : (
            "Readiness snapshot"
          )}
        </h1>
      </motion.header>

      {a && (
        <div className="glass-card p-6 flex items-center gap-6 flex-wrap justify-center">
          <ReadinessGauge value={a.readiness_score} size={180} />
          <div className="space-y-2">
            <Stat label="Skills matched" value={`${a.matched.length}`} />
            <Stat label="Weak" value={`${a.weak.length}`} />
            <Stat label="Missing" value={`${a.missing.length}`} />
            <Stat label="Weeks to ready" value={`${a.weeks_to_ready}`} />
          </div>
        </div>
      )}

      <div className="text-center">
        <Link to="/" className="btn-primary mx-auto">
          <ArrowRight className="w-4 h-4" /> Build your own roadmap
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="sub text-xs uppercase tracking-widest w-32">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
    </div>
  );
}
