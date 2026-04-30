import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const MSGS = [
  "Reading your resume…",
  "Extracting skills…",
  "Analyzing projects…",
  "Almost there…",
];

export function LoadingRotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % MSGS.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center justify-center gap-3">
      <motion.div
        className="w-4 h-4 rounded-full bg-gradient-brand"
        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <div className="h-5 min-w-[220px] text-left">
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="block text-slate-200 font-medium"
          >
            {MSGS[i]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
