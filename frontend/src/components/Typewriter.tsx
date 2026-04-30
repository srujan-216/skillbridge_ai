import { useEffect, useState } from "react";

interface Props {
  phrases: string[];
  typeMs?: number;
  holdMs?: number;
  className?: string;
}

export function Typewriter({ phrases, typeMs = 55, holdMs = 1600, className }: Props) {
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState("");
  const [dir, setDir] = useState<"type" | "hold" | "erase">("type");

  useEffect(() => {
    const current = phrases[idx % phrases.length];
    let t: number;
    if (dir === "type") {
      if (sub.length < current.length) {
        t = window.setTimeout(() => setSub(current.slice(0, sub.length + 1)), typeMs);
      } else {
        t = window.setTimeout(() => setDir("hold"), holdMs);
      }
    } else if (dir === "hold") {
      t = window.setTimeout(() => setDir("erase"), 400);
    } else {
      if (sub.length > 0) {
        t = window.setTimeout(() => setSub(current.slice(0, sub.length - 1)), typeMs / 2);
      } else {
        t = window.setTimeout(() => {
          setIdx((i) => i + 1);
          setDir("type");
        }, 200);
      }
    }
    return () => window.clearTimeout(t);
  }, [sub, dir, idx, phrases, typeMs, holdMs]);

  return (
    <span className={className}>
      {sub}
      <span className="inline-block w-0.5 h-[0.9em] bg-brand-300 align-middle ml-0.5 animate-pulse" />
    </span>
  );
}
