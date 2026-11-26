// What still holds a promise Broken. Only a trusted pass, where the promise must hold, on real and newer code clears it. Pure.
import { anchored, when } from './promise-code';
import { type LinkedTest, type Sample, levelRank, linkedTests, replacementOf, retractions } from './promise-evidence';
import type { PromiseBreak, Surface } from './promise-types';
import { subjectKey } from './promise-types';
import type { Commit } from './record-types';
import type { Event, Link } from './types';
import { type Current, type Entry, entries } from './views';

export type Clearing = { reaching: Entry<Commit>[]; mustHoldIn: Surface };

export const counted = (t: LinkedTest) => ({
  fails: t.firstAcceptedAt ? t.samples.filter((s) => s.result === 'fail' && s.at > t.firstAcceptedAt!) : [],
  passes: t.acceptedAt ? t.samples.filter((s) => s.result === 'pass' && s.at > t.acceptedAt!) : [],
});

const canClear = (c: Clearing, p: Sample) => p.trusted && p.surface === c.mustHoldIn && anchored(c.reaching, p);

/** The newest code the book had seen when something failed. */
const codeAt = (c: Clearing, at: string) => Math.max(-Infinity, ...c.reaching.filter((x) => x.firstAt <= at).map((x) => when(x.body.committedAt)));

/**
 * One pass on code newer than every failure clears them; on the newest code that failed it takes three. A failure with
 * no real commit counts from when it happened and the code the book had then, so naming an older commit cannot lower the bar.
 */
function clears(c: Clearing, failures: Sample[], passes: Sample[]): boolean {
  const valid = passes.filter((p) => canClear(c, p));
  const newer = Math.max(...failures.map((f) => (anchored(c.reaching, f) ? when(f.committedAt) : when(f.at))));
  const same = Math.max(...failures.map((f) => (anchored(c.reaching, f) ? when(f.committedAt) : codeAt(c, f.at))));
  return valid.some((p) => when(p.committedAt) > newer) || valid.filter((p) => when(p.committedAt) >= same).length >= 3;
}

/** A replacement stands in only if it names the same promises, at the same level or higher, with an accepted link. */
function replacementFor(now: Current, t: LinkedTest, promises: string[]): LinkedTest | undefined {
  const id = replacementOf(now, t.test.id);
  if (!id) return undefined;
  const on = promises.map((p) => linkedTests(now, p).find((l) => l.test.id === id));
  if (on.some((l) => !l?.acceptedAt)) return undefined;
  const found = on[0] as LinkedTest;
  return levelRank(found.test.body.level) >= levelRank(t.test.body.level) ? found : undefined;
}

export function openFailures(now: Current, linked: LinkedTest[], c: Clearing): Sample[] {
  const open: Sample[] = [];
  for (const t of linked) {
    const { fails, passes } = counted(t);
    for (const subject of new Set(fails.map((f) => f.subject))) {
      const onSubject = fails.filter((f) => f.subject === subject);
      const failure = onSubject.at(-1) as Sample;
      if (clears(c, onSubject, passes.filter((p) => p.subject === subject && p.at > failure.at))) continue;
      const promises = entries<Link>(now, 'link').filter((l) => l.body.kind === 'proves-promise' && l.body.from === t.test.id).map((l) => l.body.to);
      const stand = replacementFor(now, t, promises);
      const theirs = stand ? counted(stand).passes.filter((p) => p.subject === subject && p.at > failure.at) : [];
      if (!stand || !clears(c, onSubject, theirs)) open.push(failure);
    }
  }
  return open;
}

/** The bugs still holding this promise broken: no editor retraction, and no clearing pass on that subject, on code from after the bug. */
export function openBreaks(now: Current, promiseId: string, linked: LinkedTest[], c: Clearing): Entry<Event>[] {
  const retracted = new Set(retractions(now).filter((a) => a.event && (!a.promise || a.promise === promiseId)).map((a) => a.event));
  const passes = linked.flatMap((t) => counted(t).passes.filter((p) => canClear(c, p)));
  return entries<Event>(now, 'event').filter((e) => !retracted.has(e.id) && (e.body.breaks ?? []).some((b: PromiseBreak) =>
    b.promise === promiseId && !passes.some((p) => p.subject === subjectKey(b.subject) && p.at > e.firstAt && when(p.committedAt) > when(e.firstAt))));
}
