// A chapter whose children are shown side by side: one row per child feature, one column per piece of work, in order.
// Pure: records in, the grid out. A cell's place is its work's position among the child's works that nothing replaced;
// a work that replaced another takes the place of the one it replaced.
import type { Current, Entry } from './views';
import type { Feature, FeatureView, Work, WorkState } from './types';
import { STEP_WORDS, raise } from './format';
import { entries, replacedBy, standingNotes } from './views';
import { inOrder, orderId } from './order';

export type GridCell = { work: string; step: number; title: string; state: WorkState; label: string };
export type GridRow = { feature: string; title: string; cells: (GridCell | null)[] };
export type Grid = {
  noun: string;
  columns: { step: number }[];
  groups: { title: string; span: number }[];
  rows: GridRow[];
  summary: string;
  empty: string | null;
  latestFinding: { story: string; feature: string; text: string } | null;
};

const STEP = /^step\s+(\d+)\s*[:.–—-]?\s*/i;

/** A child's works in order: as said for its work, else each in the place of the first work in its chain of replacements. */
export function stepsOf(now: Current, featureId: string, works: Entry<Work>[], replaced: Map<string, string>): Entry<Work>[] {
  const place = (w: Entry<Work>) => {
    let at = w.firstAt;
    const seen = new Set<string>();
    for (let r = w.replaces; r && !seen.has(r); r = now.get(r)?.replaces ?? null) {
      seen.add(r);
      const old = now.get(r);
      if (old && old.firstAt < at) at = old.firstAt;
    }
    return at;
  };
  const steps = works
    .filter((w) => w.body.feature === featureId && !replaced.has(w.id))
    .map((w) => ({ w, at: place(w) }))
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(({ w }) => w);
  return inOrder(now, orderId('work', featureId), steps);
}

export function gridOf(now: Current, featureId: string): Grid | null {
  const view = now.get(featureId)?.body.view as FeatureView | undefined;
  if (view?.kind !== 'grid') return null;
  const noun = view.noun ?? 'parts';
  const replaced = replacedBy(now);
  const works = entries<Work>(now, 'work');
  const children = inOrder(now, orderId('features', featureId), entries<Feature>(now, 'feature').filter((f) => f.body.parent === featureId));
  const groups = view.groups ?? [];
  const planned = groups.reduce((n, g) => n + g.size, 0);

  const steps = children.map((c) => ({ child: c, steps: stepsOf(now, c.id, works, replaced) }));
  const width = Math.max(planned, ...steps.map((s) => s.steps.length), 0);
  const numberAt = (i: number) => {
    for (const { steps: list } of steps) {
      const n = list[i]?.body.title.match(STEP)?.[1];
      if (n) return Number(n);
    }
    return i + 1;
  };
  const columns = Array.from({ length: width }, (_, i) => ({ step: numberAt(i) }));

  const rows: GridRow[] = steps.map(({ child, steps: list }) => ({
    feature: child.id,
    title: child.body.title,
    cells: columns.map((col, i) => {
      const w = list[i];
      if (!w) return null;
      const title = raise(w.body.title.replace(STEP, '')) || w.body.title;
      return { work: w.id, step: col.step, title, state: w.body.state, label: `${child.body.title}, step ${col.step}, ${title}: ${STEP_WORDS[w.body.state]}` };
    }),
  }));

  const cellsOf = (r: GridRow) => r.cells.filter((c): c is GridCell => c !== null);
  const begun = rows.filter((r) => cellsOf(r).some((c) => c.state !== 'next'));
  // Finished: every planned step is there and done, so a story with only its first steps written is not finished.
  const finished = rows.filter((r) => r.cells.every((c) => c?.state === 'done'));
  const count = view.target ? `${begun.length} of ${view.target} ${noun} begun` : `${begun.length} ${noun} begun`;

  const lastSteps = new Map(finished.map((r) => [cellsOf(r).at(-1)?.work, r] as const));
  const finding = standingNotes(now, 'finding').filter((f) => lastSteps.has(f.body.work)).sort((a, b) => a.at.localeCompare(b.at)).at(-1);
  const taughtBy = finding ? lastSteps.get(finding.body.work) : undefined;

  let left = width;
  const heads = groups.map((g) => { const span = Math.min(g.size, left); left -= span; return { title: g.title, span }; }).filter((g) => g.span > 0);

  return {
    noun,
    columns,
    groups: left > 0 ? [...heads, { title: '', span: left }] : heads,
    rows,
    summary: `${count} · ${finished.length} finished`,
    empty: rows.length === 0 ? `No ${noun} yet.` : null,
    latestFinding: finding && taughtBy ? { story: taughtBy.title, feature: taughtBy.feature, text: finding.body.text } : null,
  };
}
