import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, type ResumeFeedback } from "../lib/api";

interface Props { sessionId: string; roleId: string; roleTitle: string }

export function ResumeFeedbackPanel({ sessionId, roleId, roleTitle }: Props) {
  const [fb, setFb] = useState<ResumeFeedback | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await api.resumeFeedback({ session_id: sessionId, role_id: roleId });
      setFb(r);
      toast.success(`ATS score: ${r.ats_score}/100`);
    } catch {
      toast.error("Couldn't analyze — try again.");
    } finally {
      setLoading(false);
    }
  }

  const atsColor =
    !fb ? "text-slate-200"
      : fb.ats_score >= 75 ? "text-emerald-300"
      : fb.ats_score >= 50 ? "text-amber-300"
      : "text-rose-300";

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-brand-300" />
            Resume rewriter — ATS for {roleTitle}
          </h3>
          <p className="sub text-xs">
            Gemini scores your resume for ATS, then rewrites weak bullets with metrics + impact.
          </p>
        </div>
        <button onClick={run} className="btn-primary !py-2" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
            : fb ? <><RefreshCw className="w-4 h-4" /> Re-run</>
            : <><Sparkles className="w-4 h-4" /> Run ATS review</>}
        </button>
      </div>

      {!fb && !loading && (
        <div className="text-center py-6 sub text-sm">
          Tap <span className="text-slate-200 font-medium">Run ATS review</span> for a tailored rewrite of your resume.
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          <div className="h-24 skeleton rounded-xl" />
          <div className="h-40 skeleton rounded-xl" />
        </div>
      )}

      {fb && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-center">
              <div className={`text-5xl font-extrabold tabular-nums ${atsColor}`}>{fb.ats_score}</div>
              <p className="sub text-[11px] uppercase tracking-widest">ATS score</p>
            </div>
            <div className="flex-1 min-w-[240px] text-sm text-slate-200">
              {fb.ats_reasoning}
              {fb.one_line_headline_suggestion && (
                <div className="mt-3 rounded-xl p-3 bg-white/5 border border-white/10 text-sm">
                  <p className="text-[11px] uppercase tracking-widest sub mb-1">Suggested headline</p>
                  <p className="italic text-brand-200">"{fb.one_line_headline_suggestion}"</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/5 p-3">
              <p className="text-[11px] uppercase tracking-widest text-emerald-300 mb-1.5">Strengths</p>
              <ul className="space-y-1 text-sm text-slate-200">
                {fb.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-emerald-300">✓</span>{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/5 p-3">
              <p className="text-[11px] uppercase tracking-widest text-rose-300 mb-1.5">Weaknesses</p>
              <ul className="space-y-1 text-sm text-slate-200">
                {fb.weaknesses.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-rose-300">!</span>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          {fb.missing_keywords?.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-widest sub mb-2 flex items-center gap-1.5">
                <ClipboardCheck className="w-3 h-3" /> Missing ATS keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fb.missing_keywords.map((k, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {fb.bullet_rewrites?.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-widest sub mb-2">Bullet rewrites</p>
              <div className="space-y-3">
                {fb.bullet_rewrites.map((b, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="flex gap-3 flex-col md:flex-row">
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-rose-300 mb-1">Before</p>
                        <p className="text-slate-300 italic line-through decoration-rose-400/40">"{b.original}"</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-emerald-300 mb-1">After</p>
                        <p className="text-slate-100 font-medium">"{b.improved}"</p>
                      </div>
                    </div>
                    <p className="sub text-xs mt-2 pt-2 border-t border-white/10">💡 {b.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </section>
  );
}
