import { motion } from "framer-motion";
import { Check, TrendingUp, Zap } from "lucide-react";

/** Realistic miniature of the dashboard — used on the landing hero. */
export function HeroMockup() {
  const skills = [
    { name: "Python", s: "matched" },
    { name: "SQL", s: "matched" },
    { name: "Pandas", s: "matched" },
    { name: "LLMs", s: "missing" },
    { name: "Docker", s: "weak" },
    { name: "AWS", s: "missing" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, rotate: -1.5 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="panel p-5 md:p-6 relative overflow-hidden"
      style={{ transform: "perspective(1100px) rotateY(-6deg) rotateX(2deg)" }}
    >
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl"
           style={{ background: "radial-gradient(circle, var(--brand-1), transparent)" }} />

      <div className="flex items-center justify-between text-[11px] sub">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="uppercase tracking-widest">skillbridge / dashboard</span>
      </div>

      <div className="mt-5 flex items-center gap-5">
        {/* Gauge */}
        <div className="relative w-[132px] h-[132px] shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
            <motion.circle
              cx="50" cy="50" r="44"
              stroke="url(#gradBrand)" strokeWidth="8" strokeLinecap="round" fill="none"
              strokeDasharray={276}
              initial={{ strokeDashoffset: 276 }}
              animate={{ strokeDashoffset: 276 * (1 - 0.67) }}
              transition={{ duration: 1.3, delay: 0.6, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="gradBrand" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7C3AED" />
                <stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-3xl font-extrabold tabular-nums"
            >
              67<span className="text-base text-slate-400">%</span>
            </motion.div>
            <div className="sub text-[10px] uppercase tracking-widest">Ready</div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sub text-[11px] uppercase tracking-widest">
            <TrendingUp className="w-3 h-3 text-emerald-300" /> Projected
          </div>
          <div className="mt-1 space-y-2">
            {[
              { label: "Finish W1", v: 73 },
              { label: "Finish W2", v: 84 },
              { label: "Finish W4", v: 96 },
            ].map((b, i) => (
              <div key={b.label} className="flex items-center gap-2.5">
                <span className="sub text-[11px] w-20">{b.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.v}%` }}
                    transition={{ delay: 0.9 + i * 0.12, duration: 0.7, ease: "easeOut" }}
                    className="h-full"
                    style={{ background: "linear-gradient(90deg, var(--brand-1), var(--brand-3))" }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums">{b.v}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 sub text-[11px] uppercase tracking-widest mb-2">
          <Zap className="w-3 h-3 text-brand-300" /> Skill gap
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((sk, i) => (
            <motion.span
              key={sk.name}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1 + i * 0.05 }}
              className={`pill ${
                sk.s === "matched" ? "pill-matched" : sk.s === "weak" ? "pill-weak" : "pill-missing"
              }`}
            >
              {sk.s === "matched" && <Check className="w-3 h-3" />}
              {sk.name}
            </motion.span>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="mt-4 rounded-xl p-3 border"
        style={{ background: "rgba(124,58,237,0.08)", borderColor: "rgba(124,58,237,0.25)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="sub text-[10px] uppercase tracking-widest">Week 1</p>
            <p className="font-semibold text-sm truncate">Master LLM fundamentals + prompt engineering</p>
          </div>
          <span className="pill pill-matched shrink-0">+8% readiness</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
