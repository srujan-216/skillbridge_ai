import { useLocation } from "react-router-dom";
import { Check } from "lucide-react";

const STEPS = [
  { path: "/upload", label: "Upload" },
  { path: "/role", label: "Role" },
  { path: "/dashboard", label: "Dashboard" },
];

export function Stepper() {
  const { pathname } = useLocation();
  const activeIdx = STEPS.findIndex((s) => pathname.startsWith(s.path));
  if (activeIdx === -1) return null;

  return (
    <nav className="stepper" aria-label="Progress">
      {STEPS.map((s, i) => {
        const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
        return (
          <div key={s.path} className="flex items-center gap-2">
            <div className={`stepper-item ${state === "done" ? "done" : state === "active" ? "active" : ""}`}>
              <span className="stepper-bullet">
                {state === "done" ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className="w-6 sm:w-8 h-px"
                style={{
                  background:
                    i < activeIdx
                      ? "linear-gradient(90deg,#10b981,#10b981)"
                      : "rgba(255,255,255,0.10)",
                }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
