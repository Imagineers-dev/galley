// Who wrote what around a promise, across every version, so that nobody vouches for their own work. Pure.
import { featureOfWork, featuresReaching } from './promise-code';
import type { BookPromise, Witness } from './promise-types';
import type { Guard, Run, Test } from './record-types';
import type { Link, Paper, Work } from './types';
import { paperOwner } from './types';
import type { Current, Latest } from './views';

export const writersOf = (r: Latest) => r.writers ?? [r.by];

/** Everyone who opened or changed a piece of work `inScope` chooses, or wrote a paper, a test or a run on it. */
function authorsOn(now: Current, inScope: (workId: string) => boolean): Set<string> {
  const out = new Set<string>();
  const add = (r: Latest) => writersOf(r).forEach((w) => out.add(w));
  const checks = new Set<string>();
  for (const r of now.values()) {
    if (r.kind === 'work' && inScope(r.id)) add(r);
    if (r.kind === 'paper' && inScope(paperOwner(r.body as Paper))) add(r);
    if ((r.kind === 'test' || r.kind === 'guard') && inScope((r.body as Test | Guard).work)) {
      checks.add(r.id);
      if (r.kind === 'test') add(r);
    }
  }
  for (const r of now.values()) if (r.kind === 'run' && checks.has((r.body as Run).of)) add(r);
  return out;
}

/** The authors of all work around a promise: on the features whose commits reach it, serving it, or testing it. */
export function authorsOfPromise(now: Current, promiseId: string): Set<string> {
  const promise = now.get(promiseId);
  if (promise?.kind !== 'promise') return new Set();
  const features = featuresReaching(now, (promise.body as BookPromise).feature);
  const works = new Set<string>();
  for (const r of now.values()) {
    if (r.kind === 'work' && (r.body as Work).serves?.includes(promiseId)) works.add(r.id);
    if (r.kind === 'link' && (r.body as Link).kind === 'proves-promise' && (r.body as Link).to === promiseId) {
      const test = now.get((r.body as Link).from);
      if (test?.kind === 'test') works.add((test.body as Test).work);
    }
  }
  return authorsOn(now, (id) => (id.startsWith('work:') && features.has(featureOfWork(id))) || works.has(id));
}

export const authorsOfWork = (now: Current, workId: string) => authorsOn(now, (id) => id === workId);

/** The promises a test is linked to. */
export const promisesOfTest = (now: Current, testId: string) => [...now.values()]
  .filter((r) => r.kind === 'link' && (r.body as Link).kind === 'proves-promise' && (r.body as Link).from === testId)
  .map((r) => (r.body as Link).to);

/** Whether this agent could vouch for a run of this test: it wrote nothing on the test's work or around any of its promises. */
export function mayVouch(now: Current, by: string, testId: string): boolean {
  const test = now.get(testId);
  if (test?.kind !== 'test' || authorsOfWork(now, (test.body as Test).work).has(by)) return false;
  return !promisesOfTest(now, testId).some((p) => authorsOfPromise(now, p).has(by));
}

/** The runs vouched for by someone still free to vouch, read now and not only when the witness was written. */
export function witnessedRuns(now: Current, testId: string): Set<string> {
  const out = new Set<string>();
  for (const r of now.values()) {
    if (r.kind !== 'witness') continue;
    const run = now.get((r.body as Witness).run);
    if (run?.kind === 'run' && (run.body as Run).of === testId && mayVouch(now, r.by, testId)) out.add(run.id);
  }
  return out;
}
