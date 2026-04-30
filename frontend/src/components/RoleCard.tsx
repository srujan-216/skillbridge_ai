import { motion } from "framer-motion";
import {
  BarChart3, Brain, Cpu, Layers, Monitor, Server, Workflow,
  Smartphone, Palette, Shield, Cloud, Target, Check, TrendingUp, IndianRupee,
  Activity, Sparkles, Gamepad2, Link, CheckSquare, Briefcase, FileText,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "../types";

const ICONS: Record<string, LucideIcon> = {
  BarChart3, Brain, Cpu, Layers, Monitor, Server, Workflow, Smartphone,
  Palette, Shield, Cloud, Target, Activity, Sparkles, Gamepad2, Link,
  CheckSquare, Briefcase, FileText,
};

interface Props {
  role: Role;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function RoleCard({ role, selected, onSelect }: Props) {
  const Icon = ICONS[role.icon] ?? Target;

  return (
    <motion.button
      layout
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(role.id)}
      className={`relative text-left w-full panel p-5 transition-all group overflow-hidden ${
        selected ? "ring-2 ring-offset-0" : ""
      }`}
      style={
        selected
          ? {
              boxShadow:
                "0 0 0 2px rgba(124,58,237,0.7), 0 20px 40px -12px rgba(124,58,237,0.4)",
              background:
                "linear-gradient(180deg, rgba(124,58,237,0.10), rgba(255,255,255,0.02))",
            }
          : undefined
      }
    >
      {selected && (
        <motion.div
          layoutId="role-check"
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--brand-1), var(--brand-3))",
            boxShadow: "0 6px 16px -2px rgba(124,58,237,0.55)",
          }}
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {/* Top row: icon + category */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, var(--brand-1), var(--brand-3))" }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span
          className="pill !text-[10px] !py-0.5 uppercase tracking-widest"
          style={{ color: "var(--text-dim)" }}
        >
          {role.category}
        </span>
      </div>

      <h3 className="mt-4 font-bold text-[17px]">{role.title}</h3>
      <p className="sub text-xs mt-1 line-clamp-2">{role.tagline}</p>

      <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
        <div className="flex items-center gap-1.5">
          <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium" style={{ color: "var(--text)" }}>{role.avg_salary_inr}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
          <span className="font-medium" style={{ color: "var(--text)" }}>Hiring surge</span>
        </div>
      </div>

      <div className="mt-3.5">
        <p className="eyebrow mb-1.5">Top companies</p>
        <div className="flex flex-wrap gap-1">
          {role.top_companies.slice(0, 4).map((c) => (
            <span key={c} className="pill !text-[10.5px] !px-1.5 !py-0.5">{c}</span>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="eyebrow mb-1.5">Trending</p>
        <div className="flex flex-wrap gap-1">
          {role.trending_skills.map((s) => (
            <span
              key={s}
              className="text-[10.5px] px-2 py-0.5 rounded-md text-white font-semibold"
              style={{ background: "linear-gradient(90deg, var(--brand-1), var(--brand-3))" }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}
