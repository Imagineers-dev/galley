// How good the agents are: each skill's eval runs over time, and drift when the latest falls below its usual level.
import type { EvalRun } from './oversight-types';
import { type Current, type Entry, entries } from './views';

export type SkillView = { skill: string; runs: Entry<EvalRun>[]; latest: Entry<EvalRun>; usual: number | null; drift: boolean };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Drift: the latest score is more than half a point under the median of the five runs before it. */
export function skills(now: Current): SkillView[] {
  const bySkill = new Map<string, Entry<EvalRun>[]>();
  for (const r of entries<EvalRun>(now, 'eval')) bySkill.set(r.body.skill, [...(bySkill.get(r.body.skill) ?? []), r]);
  return [...bySkill].map(([skill, runs]) => {
    const latest = runs[runs.length - 1];
    const before = runs.slice(-6, -1).map((r) => r.body.score);
    const usual = before.length ? median(before) : null;
    return { skill, runs, latest, usual, drift: usual !== null && latest.body.score < usual - 0.5 };
  }).sort((a, b) => Number(b.drift) - Number(a.drift) || a.skill.localeCompare(b.skill));
}
