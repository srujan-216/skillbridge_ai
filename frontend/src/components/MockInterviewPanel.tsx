import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, ChevronDown, Loader2, Mic, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { api, type MockQuestion } from "../lib/api";

interface Props { sessionId: string; roleId: string; roleTitle: string }

const TYPE_TINT: Record<string, string> = {
  technical: "bg-brand-500/10 text-brand-200 border-brand-400/30",
  behavioural: "bg-emerald-500/10 text-emerald-200 border-emerald-400/30",
  scenario: "bg-amber-500/10 text-amber-200 border-amber-400/30",
  design: "bg-rose-500/10 text-rose-200 border-rose-400/30",
};

const DIFF_DOT: Record<string, string> = {
  easy: "bg-emerald-400",
  medium: "bg-amber-400",
  hard: "bg-rose-400",
};

export function MockInterviewPanel({ sessionId, roleId, roleTitle }: Props) {
  const [questions, setQuestions] = useState<MockQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    try {
      const r = await api.mockInterview({ session_id: sessionId, role_id: roleId });
      setQuestions(r.questions);
      setOpenId(r.questions[0]?.id ?? null);
      toast.success("Mock interview generated!");
    } catch {
      toast.error("Couldn't generate — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Mic className="w-4 h-4 text-brand-300" />
            Mock interview — {roleTitle}
          </h3>
          <p className="sub text-xs">5 realistic questions targeting your weak spots. Tap any to see the ideal answer framework.</p>
        </div>
        <button
          onClick={generate}
          className="btn-primary !py-2"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
          ) : questions ? (
            <><RefreshCw className="w-4 h-4" /> Regenerate</>
          ) : (
            <><Brain className="w-4 h-4" /> Generate questions</>
          )}
        </button>
      </div>

      {!questions && !loading && (
        <div className="text-center py-6 sub text-sm">
          Click <span className="text-slate-200 font-medium">Generate questions</span> to kick off an AI-powered interview drill.
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      )}

      {questions && (
        <div className="space-y-2.5">
          {questions.map((q) => {
            const open = openId === q.id;
            return (
              <motion.div
                key={q.id}
                layout
                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
              >
                <button
                  onClick={() => setOpenId(open ? -1 : q.id)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-brand text-white text-xs font-bold flex items-center justify-center">
                    Q{q.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 text-sm leading-relaxed">
                      {q.question}
                    </p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md border ${TYPE_TINT[q.type] ?? ""}`}>
                        {q.type}
                      </span>
                      <span className="text-xs sub inline-flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${DIFF_DOT[q.difficulty] ?? "bg-slate-400"}`} />
                        {q.difficulty}
                      </span>
                      {q.tests_skill && (
                        <span className="text-xs sub">· tests: {q.tests_skill}</span>
                      )}
                    </div>
                  </div>
                  <motion.div animate={{ rotate: open ? 180 : 0 }}>
                    <ChevronDown className="w-4 h-4 text-slate-400 mt-1" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-emerald-300 mb-1">Ideal answer framework</p>
                          <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{q.ideal_answer_framework}</p>
                        </div>
                        {q.red_flags && (
                          <div>
                            <p className="text-[11px] uppercase tracking-widest text-rose-300 mb-1">Red flags</p>
                            <p className="text-slate-300 leading-relaxed">{q.red_flags}</p>
                          </div>
                        )}
                        {q.follow_up && (
                          <div>
                            <p className="text-[11px] uppercase tracking-widest text-amber-300 mb-1">Likely follow-up</p>
                            <p className="text-slate-300 leading-relaxed italic">"{q.follow_up}"</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
