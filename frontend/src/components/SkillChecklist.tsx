import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, HelpCircle, Info, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import type { GapAnalysis, SkillVerdict } from "../types";

interface Props {
  gap: GapAnalysis;
}

export function SkillChecklist({ gap }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [explain, setExplain] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function loadExplain(skill: string) {
    if (explain[skill]) return;
    setLoading(skill);
    try {
      const r = await api.explainSkill(skill, gap.role_id);
      setExplain((m) => ({ ...m, [skill]: r.reason }));
    } catch {
      toast.error("Couldn't load explanation");
    } finally {
      setLoading(null);
    }
  }

  const Section = ({
    title, list, badgeClass, empty, iconColor,
  }: {
    title: string; list: SkillVerdict[]; badgeClass: string;
    empty: string; iconColor: string;
  }) => (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${iconColor}`} />
          <h4 className="font-semibold">{title}</h4>
          <span className="sub">({list.length})</span>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="sub text-sm">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {list.map((v) => (
              <motion.div
                key={v.name}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="relative"
                onMouseEnter={() => {
                  if (v.status !== "matched") { setHoverId(v.name); loadExplain(v.name); }
                }}
                onMouseLeave={() => setHoverId(null)}
              >
                <span className={`skill-pill ${badgeClass} cursor-help`}>
                  {v.status === "matched" && <Check className="w-3.5 h-3.5" />}
                  {v.status === "weak" && <Info className="w-3.5 h-3.5" />}
                  {v.status === "missing" && <X className="w-3.5 h-3.5" />}
                  {v.name}
                  {v.status !== "matched" && <HelpCircle className="w-3.5 h-3.5 opacity-60" />}
                </span>
                <AnimatePresence>
                  {hoverId === v.name && v.status !== "matched" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute z-30 bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 glass-card p-3 text-xs"
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-brand-300">
                        <Sparkles className="w-3 h-3" />
                        <span className="font-semibold">Why this matters</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">
                        {explain[v.name] || (loading === v.name
                          ? "Thinking…"
                          : "Hover to load insight.")}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Section
        title="Matched"
        list={gap.matched}
        badgeClass="skill-pill-matched"
        empty="No matches yet — edit your skills and re-analyze."
        iconColor="bg-emerald-400"
      />
      <Section
        title="Weak"
        list={gap.weak}
        badgeClass="skill-pill-weak"
        empty="No weak spots — strong profile!"
        iconColor="bg-amber-400"
      />
      <Section
        title="Missing"
        list={gap.missing}
        badgeClass="skill-pill-missing"
        empty="Nothing critical missing — you're interview-ready."
        iconColor="bg-rose-400"
      />
    </div>
  );
}
