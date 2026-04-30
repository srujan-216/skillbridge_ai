import confetti from "canvas-confetti";

const BRAND = ["#6D28D9", "#4F46E5", "#6366F1", "#a78bfa", "#10b981", "#f59e0b"];

export function celebrate(intensity: "light" | "full" = "full") {
  const base = { colors: BRAND, disableForReducedMotion: true };
  if (intensity === "light") {
    confetti({ ...base, particleCount: 40, spread: 55, origin: { y: 0.6 } });
    return;
  }
  const end = Date.now() + 900;
  const frame = () => {
    confetti({ ...base, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
    confetti({ ...base, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
