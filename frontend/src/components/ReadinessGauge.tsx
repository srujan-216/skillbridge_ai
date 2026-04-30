import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  value: number; // 0–100
  size?: number;
  label?: string;
}

export function ReadinessGauge({ value, size = 220, label = "Readiness" }: Props) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));

  const mv = useMotionValue(0);
  const dash = useTransform(mv, (v) => c - (c * v) / 100);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const ctrl = animate(mv, pct, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => ctrl.stop();
  }, [pct, mv]);

  const color =
    pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#fb7185";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="rg-brand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6D28D9" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#rg-brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: dash as unknown as number }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-5xl font-extrabold tabular-nums tracking-tight"
          style={{ color }}
        >
          {Math.round(display)}
          <span className="text-xl text-slate-400">%</span>
        </div>
        <div className="sub mt-1 text-xs uppercase tracking-widest">{label}</div>
      </div>
    </div>
  );
}
