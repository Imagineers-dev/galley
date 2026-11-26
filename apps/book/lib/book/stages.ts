// Where one story stands in its chapter's stages: which stage it is in, how many steps are done, and every step by name.
// Pure: it reads the chapter's grid (lib/book/grid.ts), so a stage's steps are exactly the grid's columns under it.
import type { Current } from './views';
import type { WorkState } from './types';
import { type Grid, type GridRow, gridOf } from './grid';
import { NOT_PLANNED, STEP_WORDS, dayLong, raise } from './format';

/** `unfinished` is a stage before the current one that still has steps not done. */
export type StageLook = 'finished' | 'here' | 'unfinished' | 'ahead';
/** A step as the editor reads it; `work` is null for a step no piece of work has been planned for yet. */
export type StageStep = { step: number; title: string; proof: string | null; state: WorkState | null; when: string; work: string | null };
export type Stage = { title: string; done: number; total: number; look: StageLook; steps: StageStep[] };
export type StoryStages = { story: string; feature: string; headline: string; count: string; stages: Stage[] };

const LONG = 100;
/** How they know a step is done: its summary, or its first sentence when the summary runs long (a sentence ends where
    the next one starts with a capital, so "e.g. the hero" is not cut), or its first words when it has no full stop. */
export function proofOf(summary: string): string {
  if (summary.length <= LONG) return summary;
  const sentence = summary.match(/^.*?[.!?](?=\s+[A-Z"“‘']|$)/s)?.[0];
  if (sentence && sentence.length <= LONG * 2) return sentence;
  return `${summary.slice(0, LONG).replace(/\s+\S*$/, '')}…`;
}

/** One story's stages, from the grid of the chapter it sits in. */
export function stagesIn(now: Current, grid: Grid, row: GridRow): StoryStages {
  let at = 0;
  const stages = grid.groups.map((g) => {
    const steps = row.cells.slice(at, at + g.span).map((cell, i): StageStep => {
      const step = grid.columns[at + i].step;
      if (!cell) return { step, title: `Step ${step}`, proof: null, state: null, when: NOT_PLANNED, work: null };
      const record = now.get(cell.work);
      // The day it was done is read from its latest version, so a later edit to a done step moves the date.
      const when = cell.state === 'done' && record ? `${raise(STEP_WORDS.done)} ${dayLong(record.at)}` : raise(STEP_WORDS[cell.state]);
      return { step, title: cell.title, proof: proofOf(String(record?.body.summary ?? '')) || null, state: cell.state, when, work: cell.work };
    });
    at += g.span;
    const done = steps.filter((s) => s.state === 'done').length;
    // A chapter with no stages has one, "Steps"; steps beyond the planned stages are "More steps".
    return { title: g.title || (grid.groups.length === 1 ? 'Steps' : 'More steps'), done, total: steps.length, steps };
  });
  // The stage they are in holds the step under way; with none under way, it is the first stage not yet finished.
  const here = stages.findIndex((s) => s.steps.some((x) => x.state === 'now'));
  const current = here >= 0 ? here : stages.findIndex((s) => s.done < s.total);
  const done = stages.reduce((n, s) => n + s.done, 0);
  const headline = current < 0 ? `${row.title} is finished`
    : here < 0 && done === 0 ? `${row.title} has not started` : `${row.title} is in ${stages[current].title}`;
  const look = (s: Omit<Stage, 'look'>, i: number): StageLook =>
    s.done === s.total ? 'finished' : i === current ? 'here' : i < current ? 'unfinished' : 'ahead';
  return { story: row.title, feature: row.feature, headline, count: `${done} of ${grid.columns.length} steps done`, stages: stages.map((s, i) => ({ ...s, look: look(s, i) })) };
}

/** A story's stages, when it sits in a chapter that shows its stories as a grid; otherwise null. */
export function stagesOf(now: Current, storyId: string): StoryStages | null {
  const parent = now.get(storyId)?.body.parent;
  const grid = typeof parent === 'string' ? gridOf(now, parent) : null;
  const row = grid?.rows.find((r) => r.feature === storyId);
  return grid && row ? stagesIn(now, grid, row) : null;
}

/** The stories in a chapter's grid that have a step under way. */
export const underWay = (grid: Grid) => grid.rows.filter((r) => r.cells.some((c) => c?.state === 'now'));
