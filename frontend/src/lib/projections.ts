import type { GapAnalysis, Roadmap } from "../types";

/**
 * Estimate the readiness score after completing the first N weeks of the roadmap.
 * Heuristic: each week's `focus` skill (plus close matches) gets promoted:
 *   - missing → matched  (gain: +1.0 × weight)
 *   - weak    → matched  (gain: +0.5 × weight)
 */
export function projectScores(gap: GapAnalysis, roadmap: Roadmap): number[] {
  const skillWeight = new Map<string, number>();
  [...gap.matched, ...gap.weak, ...gap.missing].forEach((v) =>
    skillWeight.set(v.name.toLowerCase(), v.weight)
  );

  const weakSet = new Set(gap.weak.map((v) => v.name.toLowerCase()));
  const missingSet = new Set(gap.missing.map((v) => v.name.toLowerCase()));

  const totalWeight =
    [...gap.matched, ...gap.weak, ...gap.missing].reduce(
      (a, b) => a + b.weight, 0
    ) || 1;

  // Score starts at the current readiness and climbs as each focus skill is "unlocked".
  const promoted = new Set<string>();
  const out: number[] = [];
  let achieved = (gap.readiness_score / 100) * totalWeight;

  for (const week of roadmap.weeks) {
    const candidates = [week.focus.toLowerCase()];
    // Also treat any substring-matched missing/weak skill as promoted by this week.
    for (const name of [...missingSet, ...weakSet]) {
      if (!candidates.includes(name) &&
          (name.includes(week.focus.toLowerCase()) ||
           week.focus.toLowerCase().includes(name))) {
        candidates.push(name);
      }
    }

    for (const name of candidates) {
      if (promoted.has(name)) continue;
      const w = skillWeight.get(name) ?? 1.0;
      if (missingSet.has(name)) {
        achieved += w * 1.0;
        promoted.add(name);
      } else if (weakSet.has(name)) {
        achieved += w * 0.5;
        promoted.add(name);
      }
    }
    out.push(Math.round(Math.max(0, Math.min(100, (achieved / totalWeight) * 100))));
  }
  return out;
}
