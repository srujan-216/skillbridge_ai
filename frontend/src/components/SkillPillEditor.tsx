import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";

interface Props {
  skills: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
}

export function SkillPillEditor({ skills, onChange, placeholder = "Add a skill and press Enter" }: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const clean = draft.trim();
    if (!clean) return;
    if (skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...skills, clean]);
    setDraft("");
  };

  const remove = (name: string) =>
    onChange(skills.filter((s) => s !== name));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && skills.length) {
      remove(skills[skills.length - 1]);
    }
  };

  return (
    <div className="glass-card p-4">
      <div className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {skills.map((s) => (
            <motion.span
              key={s}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
              className="skill-pill group"
            >
              {s}
              <button
                onClick={() => remove(s)}
                className="opacity-60 group-hover:opacity-100 hover:text-rose-300 transition"
                aria-label={`Remove ${s}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <div className="flex items-center gap-1 ml-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            className="bg-transparent outline-none text-sm placeholder:text-slate-500 min-w-[200px]"
          />
          <button
            type="button"
            onClick={add}
            className="btn-ghost !py-1 !px-2 text-xs"
            disabled={!draft.trim()}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="sub mt-3">
        Tip: press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Enter</kbd> or comma to add ·
        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/10 text-xs">Backspace</kbd> on empty to undo
      </p>
    </div>
  );
}
