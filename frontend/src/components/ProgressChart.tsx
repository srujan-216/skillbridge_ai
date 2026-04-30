import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid,
} from "recharts";

interface Props {
  data: { week: number; pct: number; done: number; total: number; focus: string }[];
}

export function ProgressChart({ data }: Props) {
  if (!data.length) return null;
  const allZero = data.every((d) => d.pct === 0);
  const chartData = data.map((d) => ({
    ...d,
    label: `W${d.week}`,
    track: 100 - d.pct,
  }));
  return (
    <div className="relative w-full h-[220px]">
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" stroke="rgb(148,163,184)" fontSize={11} tickLine={false} />
          <YAxis domain={[0, 100]} stroke="rgb(148,163,184)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(109,40,217,0.08)" }}
            contentStyle={{
              background: "rgba(17,17,40,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            formatter={(v: number, name: string, item) => {
              if (name === "track") return [null, null] as unknown as [string, string];
              return [`${v}% (${item?.payload?.done}/${item?.payload?.total})`, item?.payload?.focus];
            }}
          />
          <Bar dataKey="pct" stackId="a" radius={[0, 0, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.pct === 100 ? "#10b981" : d.pct >= 50 ? "#8b5cf6" : "#6366f1"} />
            ))}
          </Bar>
          <Bar dataKey="track" stackId="a" fill="rgba(255,255,255,0.06)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {allZero && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-slate-400 bg-[rgba(17,17,40,0.7)] px-3 py-1.5 rounded-lg border border-white/10">
            Tick resources on the Roadmap tab to fill this chart.
          </p>
        </div>
      )}
    </div>
  );
}
