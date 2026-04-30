import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Sparkles, Sun, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { Stepper } from "./Stepper";

export function Nav() {
  const { theme, toggleTheme } = useStore();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const isHome = loc.pathname === "/";

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        borderColor: "var(--border)",
        background: "rgba(8,8,26,0.72)",
        backdropFilter: "blur(20px) saturate(160%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 md:h-[72px] flex items-center justify-between gap-6">
        <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: 14, scale: 1.06 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--brand-1), var(--brand-3))",
              boxShadow: "0 8px 24px -6px rgba(124,58,237,0.55)",
            }}
          >
            <Sparkles className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </motion.div>
          <span className="font-bold text-[17px] tracking-tight">
            SkillBridge <span className="gradient-text">AI</span>
          </span>
        </Link>

        <div className="hidden md:flex flex-1 justify-center">
          {!isHome && <Stepper />}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="btn-ghost !p-2"
            aria-label="Toggle theme"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {isHome && (
            <Link to="/upload" className="btn-primary btn-sm hidden sm:inline-flex">
              Get started
            </Link>
          )}
          <button
            className="btn-ghost !p-2 md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isHome && (
        <div className="md:hidden border-t border-white/5 px-5 py-2.5 flex justify-center">
          <Stepper />
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="md:hidden border-t"
            style={{ borderColor: "var(--border)", background: "rgba(8,8,26,0.95)" }}
          >
            <nav className="px-5 py-3 flex flex-col gap-1">
              {[
                { to: "/upload", label: "Upload" },
                { to: "/role", label: "Role" },
                { to: "/dashboard", label: "Dashboard" },
              ].map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-white/5"
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
