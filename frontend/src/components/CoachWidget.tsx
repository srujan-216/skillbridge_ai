import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../store/useStore";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "What should I focus on this week?",
  "How do I talk about my projects in interviews?",
  "Which missing skill should I learn first?",
  "Is my resume strong enough for this role?",
];

export function CoachWidget() {
  const { resume, selectedRoleId, gap } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting =
        gap
          ? `Hey — I'm your SkillBridge coach. I can see you're **${gap.readiness_score}% ready** for ${gap.role_title}. Ask me anything about your gaps, projects, or interview prep.`
          : "Hey — I'm your SkillBridge coach. Upload your resume and pick a role, then ask me anything.";
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open, gap, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setBusy(true);
    try {
      const { reply } = await api.coach({
        message: clean,
        history: next.slice(0, -1),
        session_id: resume?.session_id ?? null,
        role_id: selectedRoleId ?? null,
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I hit a snag — try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed z-50 bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-brand shadow-glow flex items-center justify-center"
        aria-label="Open AI coach"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-ink-900 animate-pulse" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="fixed z-50 bottom-24 right-6 w-[calc(100vw-2rem)] max-w-sm md:max-w-md h-[560px] max-h-[78vh] flex flex-col panel"
            style={{ background: "rgba(14,14,34,0.96)", backdropFilter: "blur(28px)" }}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">SkillBridge Coach</p>
                <p className="sub text-[11px]">Powered by Gemini · knows your context</p>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost !px-2 !py-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[86%] text-sm leading-relaxed px-3 py-2 rounded-2xl whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-gradient-brand text-white rounded-br-sm"
                        : "bg-white/5 text-slate-100 border border-white/10 rounded-bl-sm"
                    }`}
                  >
                    {formatInline(m.content)}
                  </div>
                </motion.div>
              ))}
              {busy && <TypingDots />}
              {!busy && messages.length <= 1 && (
                <div className="pt-2">
                  <p className="sub text-[11px] uppercase tracking-wider mb-2">Try asking</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-xs px-2.5 py-1.5 rounded-full border border-brand-400/30 bg-brand-500/10 text-brand-200 hover:bg-brand-500/20"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="border-t border-white/10 p-3 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything…"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400"
                disabled={busy}
              />
              <button
                type="submit"
                className="btn-primary !px-3 !py-2 disabled:opacity-50"
                disabled={busy || !input.trim()}
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-brand-300"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// Very small **bold** → <strong>, keeps the rest as text.
function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
