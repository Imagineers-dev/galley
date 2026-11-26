// The diary as days: what the agents wrote for each day, joined with what the book itself recorded that day
// (approvals, decisions, commits, new work, events), every line linked to its work and showing where that work stands.
import { wordsOf } from './vocabulary';
import { addDays, dayOf, weekdayOf } from './days';
import { breaches } from './pulse';
import { decisions } from './decisions';
import type { Commit, Diary, DiaryItem, History } from './record-types';
import type { Approval, Event, Paper, Work, WorkState } from './types';
import { PAPER_NAMES, paperOwner } from './types';
import { type Current, entries, titleOf } from './views';

export type Line = { text: string; work?: { id: string; title: string; feature: string; state: WorkState | 'replaced' | null } };
export type Recorded = { kind: 'approval' | 'decision' | 'commit' | 'work' | 'event'; text: string; href?: { work?: string; decision?: string; feature?: string } };
export type DayView = {
  day: string;
  headline: string | null;
  done: Line[];
  next: Line[];
  waiting: Line[];
  recorded: Recorded[];
  weight: number; // how much happened, for the year strip
};


function line(now: Current, item: DiaryItem | string): Line {
  const value = typeof item === 'string' ? { text: item } : item;
  const work = value.work ? now.get(value.work) : undefined;
  if (!work || work.kind !== 'work') return { text: value.text };
  const body = work.body as Work;
  return { text: value.text, work: { id: work.id, title: body.title, feature: titleOf(now, body.feature), state: body.state } };
}

export function diaryDays(now: Current): DayView[] {
  const days = new Map<string, DayView>();
  const at = (day: string) => {
    let view = days.get(day);
    if (!view) {
      view = { day, headline: null, done: [], next: [], waiting: [], recorded: [], weight: 0 };
      days.set(day, view);
    }
    return view;
  };
  for (const entry of entries<Diary>(now, 'diary')) {
    const view = at(entry.body.day);
    view.headline = entry.body.headline ?? null;
    view.done = entry.body.done.map((i) => line(now, i));
    view.next = entry.body.next.map((i) => line(now, i));
    view.waiting = entry.body.waiting.map((i) => line(now, i));
  }
  for (const a of entries<Approval>(now, 'approval')) {
    const paper = now.get(a.body.paper);
    if (!paper) continue;
    const body = paper.body as Paper;
    const verb = a.body.verdict === 'approved' ? 'You approved' : 'You asked for changes to';
    at(dayOf(a.at)).recorded.push({ kind: 'approval', text: `${verb} ${PAPER_NAMES[body.kind].name} of ${titleOf(now, paperOwner(body))}`, href: body.work !== undefined ? { work: body.work } : { feature: body.feature } });
  }
  for (const d of decisions(now)) {
    at(dayOf(d.body.madeAt)).recorded.push({ kind: 'decision', text: d.body.chosen, href: { decision: d.id, work: d.body.work } });
  }
  for (const c of entries<Commit>(now, 'commit')) {
    at(dayOf(c.body.committedAt)).recorded.push({ kind: 'commit', text: c.body.subject, href: { work: c.body.work } });
  }
  for (const w of entries<Work>(now, 'work')) {
    at(w.body.on).recorded.push({ kind: 'work', text: `${wordsOf(now).addedOn(w.body.state)}: ${w.body.title}`, href: { work: w.id } });
  }
  for (const e of entries<Event>(now, 'event')) {
    at(e.body.on).recorded.push({ kind: 'event', text: e.body.title, href: { feature: e.body.feature } });
  }
  // A pulse reading over its limit writes itself into its day, as something that went wrong.
  for (const p of breaches(now)) at(dayOf(p.at)).recorded.push({ kind: 'event', text: `${p.body.part}: ${p.body.measure} at ${p.body.value} ${p.body.unit}, over its limit of ${p.body.limit}` });
  for (const view of days.values()) view.weight = view.done.length + view.recorded.length;
  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
}

export type YearCell = { day: string; recorded: number; commits: number; beforeBook: boolean; level: 0 | 1 | 2 | 3 | 4 };

/**
 * The year, a cell per day for 53 weeks ending today: what the book recorded that day, and the commits its
 * repositories' git history shows. Days before the book began are marked, so an empty day there reads as
 * "not recorded", never "no work". Levels are quartiles of the busy days, as GitHub draws them.
 */
export function yearStrip(now: Current, days: DayView[], today: string) {
  const recorded = new Map(days.map((d) => [d.day, d.weight]));
  const commits = new Map<string, number>();
  for (const h of entries<History>(now, 'history')) commits.set(h.body.day, (commits.get(h.body.day) ?? 0) + h.body.commits);
  // The book begins on the earliest day it describes (a decision made, work begun), not the day its records were written.
  const bookStart = days.map((d) => d.day).sort()[0] ?? today;
  // Weeks start on Monday, as the book's weeks do (days.ts).
  const first = addDays(today, -7 * 52 - weekdayOf(today));
  const raw: Omit<YearCell, 'level'>[] = [];
  for (let day = first; day <= today; day = addDays(day, 1)) {
    raw.push({ day, recorded: recorded.get(day) ?? 0, commits: commits.get(day) ?? 0, beforeBook: day < bookStart });
  }
  const busy = raw.map((c) => c.recorded + c.commits).filter((w) => w > 0).sort((a, b) => a - b);
  const q = (p: number) => busy[Math.min(busy.length - 1, Math.floor(p * busy.length))] ?? 1;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const cells: YearCell[] = raw.map((c) => {
    const w = c.recorded + c.commits;
    const level = (w === 0 ? 0 : w <= cuts[0] ? 1 : w <= cuts[1] ? 2 : w <= cuts[2] ? 3 : 4) as YearCell['level'];
    return { ...c, level };
  });
  return {
    cells,
    bookStart,
    recordedDays: raw.filter((c) => c.recorded > 0).length,
    commitDays: raw.filter((c) => c.commits > 0).length,
    commits: raw.reduce((n, c) => n + c.commits, 0),
  };
}
