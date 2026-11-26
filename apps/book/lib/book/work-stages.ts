// Where a piece of work stands on the eight stages of the delivery loop, worked out from the records. Pure.
// A stage is done when its record says so, todo when its record is still to come, and unrecorded when the work has
// moved past it but the book holds nothing for it (older work, or a part with no production watch).
import { effectiveStatus, governingPaper } from './governing';
import type { Release } from './oversight-types';
import { promiseStatus } from './promise-status';
import type { Receipt, Watch } from './record-types';
import { reviewsOf, testsOf } from './testing';
import type { PaperKind, Work } from './types';
import { type Current, type Entry, entries } from './views';

export type StageState = 'done' | 'current' | 'todo' | 'unrecorded';
export type Stage = { name: string; short: string; state: StageState };
export const STAGE_WORDS: Record<StageState, string> = { done: 'done', current: 'under way', todo: 'not yet', unrecorded: 'no record' };

/** What a record says of one stage: done, open (still to come), or nothing at all. */
type Evidence = 'done' | 'open' | 'none';

const STAGES: { name: string; short: string }[] = [
  { name: 'Why', short: 'Why' },
  { name: "What you'll get", short: 'What' },
  { name: 'How', short: 'How' },
  { name: 'Build', short: 'Build' },
  { name: 'Test', short: 'Test' },
  { name: 'Review', short: 'Review' },
  { name: 'Release', short: 'Release' },
  { name: 'Watch', short: 'Watch' },
];

function paper(now: Current, workId: string, kind: PaperKind): Evidence {
  const g = governingPaper(now, workId, kind);
  if (g.source === 'none') return 'none';
  return effectiveStatus(g) === 'approved' ? 'done' : 'open';
}

const hasCommits = (now: Current, workId: string) => [...now.values()].some((r) => r.kind === 'commit' && r.body.work === workId);

/** The promises the work serves, all Proven; or, with none named, every one of its tests run and its latest run passing. */
function tested(now: Current, work: Entry<Work>): Evidence {
  const serves = work.body.serves ?? [];
  if (serves.length) return serves.every((p) => promiseStatus(now, p).state === 'proven') ? 'done' : 'open';
  const last = testsOf(now, work.id).map((t) => t.last);
  if (!last.some((r) => r !== undefined)) return 'none';
  return last.every((r) => r?.body.result === 'pass') ? 'done' : 'open';
}

/** The latest word on review, whichever came last: a repository's receipt or a review recorded through the book. */
function reviewed(now: Current, workId: string): Evidence {
  const said = [
    ...entries<Receipt>(now, 'receipt').filter((r) => r.body.work === workId).map((r) => ({ at: r.at, passed: r.body.verdict === 'pass' })),
    ...reviewsOf(now, workId).map((r) => ({ at: r.at, passed: r.body.verdict !== 'fails' })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).at(-1);
  if (!said) return 'none';
  return said.passed ? 'done' : 'open';
}

export const releasesOf = (now: Current, workId: string) => entries<Release>(now, 'release').filter((r) => r.body.works?.includes(workId));

/** Later in time: by when it went out, then, for the same moment, by when the book recorded it. */
const later = (a: Entry<Release>, b: Entry<Release>) =>
  Date.parse(a.body.deployedAt) - Date.parse(b.body.deployedAt) || Date.parse(a.at) - Date.parse(b.at);

/**
 * What the watch says of the newest release that carried the work, for each part, repository and place it runs: done
 * when every one watched passes, open when any fails. An older or other release's pass never hides a failure; a
 * release with no watch says nothing.
 */
function watched(now: Current, releases: Entry<Release>[]): Evidence {
  const newest = new Map<string, Entry<Release>>();
  for (const r of releases) {
    const key = JSON.stringify([r.body.part, r.body.repo, r.body.where]);
    const held = newest.get(key);
    if (!held || later(r, held) > 0) newest.set(key, r);
  }
  const results = [...newest.values()].map((r) => now.get(`watch:${r.id}`)?.body as Watch | undefined).filter((w) => w !== undefined);
  if (!results.length) return 'none';
  return results.every((w) => w.result === 'pass') ? 'done' : 'open';
}

/** Each of the eight stages for one piece of work. The first stage still to come is current while the work is under way. */
export function workStages(now: Current, work: Entry<Work>): Stage[] {
  const releases = releasesOf(now, work.id);
  const built: Evidence = work.body.state === 'done' ? 'done' : hasCommits(now, work.id) ? 'open' : 'none';
  const evidence: Evidence[] = [
    paper(now, work.id, 'intent'),
    paper(now, work.id, 'spec'),
    paper(now, work.id, 'plan'),
    built,
    tested(now, work),
    reviewed(now, work.id),
    releases.length ? 'done' : 'none',
    releases.length ? watched(now, releases) : 'none',
  ];
  // Built is done once a later stage has a record of its own: reviewed or released work was built.
  if (built === 'open' && evidence.slice(5).some((e) => e === 'done')) evidence[3] = 'done';
  const lastDone = evidence.lastIndexOf('done');
  const finished = work.body.state === 'done';
  const states = evidence.map((e, i): StageState => {
    if (e === 'done') return 'done';
    // Nothing recorded for a stage the work has already moved past: say so rather than call it still to come.
    // A release with no watch is one too: the Studio has no production watch.
    const watchless = i === STAGES.length - 1 && releases.length > 0;
    return e === 'none' && (finished || i < lastDone || watchless) ? 'unrecorded' : 'todo';
  });
  const open = states.indexOf('todo');
  if (work.body.state === 'now' && open >= 0) states[open] = 'current';
  return STAGES.map((s, i) => ({ ...s, state: states[i] }));
}
