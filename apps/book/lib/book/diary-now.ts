// Where work stands now: each piece of work's eight stages (lib/book/work-stages.ts), the work in motion (for the pickup), whether the editor
// is needed (the diary's one line), and a day's done lines grouped by work.
import type { DayView, Line } from './diary';
import { STATE_WORDS } from './format';
import { isStudy, stepProgress } from './study';
import type { Work } from './types';
import { type Current, entries, titleOf } from './views';
import { type Stage, workStages } from './work-stages';

export type Motion = {
  id: string;
  feature: string;
  title: string;
  state: Work['state'];
  steps: Stage[];
  /** A study step's progress ("2 of 5 done") in place of a product's eight stages. */
  progress: string | null;
  next: string[];
};

/** Work in motion: everything under way, then what the latest day names as next. Each work once. */
export function workInMotion(now: Current, latest: DayView | undefined): Motion[] {
  const study = isStudy(now);
  const works = entries<Work>(now, 'work');
  const nextIds = new Set((latest?.next ?? []).map((l) => l.work?.id).filter(Boolean) as string[]);
  const chosen = [...works.filter((w) => w.body.state === 'now'), ...works.filter((w) => w.body.state === 'next' && nextIds.has(w.id))];
  return chosen.map((w) => ({
    id: w.id,
    feature: titleOf(now, w.body.feature),
    title: w.body.title,
    state: w.body.state,
    steps: study ? [] : workStages(now, w),
    progress: study ? (stepProgress(now, w.id, w.body.pointers) ?? STATE_WORDS[w.body.state]) : null,
    next: (latest?.next ?? []).filter((l) => l.work?.id === w.id).map((l) => l.text),
  }));
}

/** Whether the editor is needed, in words, from the attention view's count (lib/book/attention.ts), so the diary
 * says the same number as everywhere else. */
export function needed(count: number): string {
  const words = ['Nothing', 'One thing', 'Two things', 'Three things'];
  return count === 0 ? 'Nothing waits on you.' : `${words[count] ?? `${count} things`} ${count === 1 ? 'waits' : 'wait'} on you.`;
}

/** Group a day's done lines by the work they belong to, short-named by feature. */
export function byWork(lines: Line[]) {
  const groups: { id: string; name: string; state: Work['state'] | 'replaced' | null; lines: string[]; title?: string }[] = [];
  for (const l of lines) {
    const id = l.work?.id ?? 'other';
    const found = groups.find((g) => g.id === id);
    if (found) found.lines.push(l.text);
    else groups.push({ id, name: l.work?.feature ?? '', state: l.work?.state ?? null, lines: [l.text], title: l.work?.title });
  }
  // Short names are the feature's; where a day touches two works of one feature, name the work too.
  const shared = new Set(groups.map((g) => g.name).filter((name, i, all) => all.indexOf(name) !== i));
  for (const g of groups) if (g.title && shared.has(g.name)) g.name = `${g.name} · ${g.title}`;
  return groups.map(({ title, ...g }) => g);
}

