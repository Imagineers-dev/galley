// Goals and results: each goal's measure over time, the work that serves it, and done work that changed nothing yet.
import type { Goal, Result } from './oversight-types';
import type { Link, Work } from './types';
import { type Current, type Entry, entries } from './views';

export type GoalView = {
  goal: Entry<Goal>; results: Entry<Result>[]; latest?: Entry<Result>; met: boolean;
  serving: { work: Entry<Work>; quiet: boolean }[];
};

export function goals(now: Current): GoalView[] {
  const results = entries<Result>(now, 'result');
  const works = entries<Work>(now, 'work');
  const links = entries<Link>(now, 'link').filter((l) => l.body.kind === 'serves');
  return entries<Goal>(now, 'goal').map((goal) => {
    const own = results.filter((r) => r.body.goal === goal.id).sort((a, b) => a.body.measuredOn.localeCompare(b.body.measuredOn));
    const latest = own.at(-1);
    const met = !!latest && (goal.body.higherIsBetter ? latest.body.value >= goal.body.target : latest.body.value <= goal.body.target);
    const serving = links
      .filter((l) => l.body.to === goal.id)
      .map((l) => works.find((w) => w.id === l.body.from))
      .filter((w): w is Entry<Work> => !!w)
      .map((work) => ({ work, quiet: work.body.state === 'done' && !own.some((r) => r.at > work.at) }));
    return { goal, results: own, latest, met, serving };
  });
}
