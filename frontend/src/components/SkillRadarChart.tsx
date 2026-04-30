import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import type { GapAnalysis, Role } from "../types";

interface Props {
  gap: GapAnalysis;
  role: Role;
}

const STATUS_VAL: Record<string, number> = { matched: 1, weak: 0.55, missing: 0.1 };

export function SkillRadarChart({ gap, role }: Props) {
  // Build a compact set — top 9 core skills by weight for legibility.
  const core = [...role.required_skills]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 9);

  const verdictOf = (name: string) => {
    if (gap.matched.find((v) => v.name === name)) return "matched";
    if (gap.weak.find((v) => v.name === name)) return "weak";
    return "missing";
  };

  const data = core.map((s) => ({
    skill: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
    fullName: s.name,
    you: STATUS_VAL[verdictOf(s.name)],
    required: 1,
  }));

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="rgba(255,255,255,0.15)" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "rgb(203,213,225)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 1]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Required"
            dataKey="required"
            stroke="#a78bfa"
            fill="#a78bfa"
            fillOpacity={0.12}
            strokeDasharray="4 4"
          />
          <Radar
            name="You"
            dataKey="you"
            stroke="#6D28D9"
            fill="#6D28D9"
            fillOpacity={0.45}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(17,17,40,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            formatter={(v: number, _name: string, item) => {
              const lvl = v >= 0.9 ? "Matched" : v >= 0.5 ? "Weak" : "Missing";
              return [lvl, item?.payload?.fullName];
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
