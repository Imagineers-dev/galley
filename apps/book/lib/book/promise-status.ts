// What state a promise is in, worked out from the records and never set by hand. Pure, and the one place this is decided.
import { counted, openBreaks, openFailures } from './promise-clearing';
import { anchored, codeMoved, commitsReaching } from './promise-code';
import { type Sample, approvalOf, linkedTests } from './promise-evidence';
import type { BookPromise } from './promise-types';
import { type Current, entry } from './views';

export type PromiseState = 'broken' | 'proven' | 'claimed' | 'server-only' | 'not-rechecked' | 'not-proven';
export type PromiseTestRow = { id: string; title: string; accepted: boolean; last?: { result: Sample['result']; at: string; trusted: boolean } };
export type PromiseStatus = {
  state: PromiseState;
  waiting: boolean; // the current words have not been approved
  reasons: string[];
  tests: PromiseTestRow[];
  proof?: { sha: string; committedAt: string };
};

export function promiseStatus(now: Current, promiseId: string): PromiseStatus {
  const record = now.get(promiseId);
  if (record?.kind !== 'promise') return { state: 'not-proven', waiting: false, reasons: ['There is no such promise.'], tests: [] };
  const promise = entry<BookPromise>(record);
  const approval = approvalOf(now, promiseId);
  const linked = linkedTests(now, promiseId);
  const tests = linked.map((t): PromiseTestRow => {
    const last = t.samples.at(-1);
    return { id: t.test.id, title: t.test.body.title, accepted: !!t.acceptedAt, ...(last ? { last: { result: last.result, at: last.at, trusted: last.trusted } } : {}) };
  });
  const waiting = !approval.current;
  if (!approval.snapshot) return { state: 'not-proven', waiting, reasons: ['You have not approved this promise yet, so nothing counts toward it.'], tests };

  const reaching = commitsReaching(now, promise.body.feature);
  const clearing = { reaching, mustHoldIn: approval.snapshot.mustHoldIn };
  const failures = openFailures(now, linked, clearing);
  const breaks = openBreaks(now, promiseId, linked, clearing);
  if (failures.length || breaks.length) {
    return { state: 'broken', waiting, tests, reasons: [
      ...failures.map((f) => `A test failed on ${f.subject === 'synthetic' ? 'test data' : 'a real story'} and has not passed since.`),
      ...breaks.map((e) => `A bug broke it: ${e.body.title}.`),
    ] };
  }

  const passes = linked.flatMap((t) => {
    const { fails, passes: all } = counted(t);
    return all.filter((p) => !fails.some((f) => f.subject === p.subject && f.at > p.at));
  });
  if (!passes.length) return { state: 'not-proven', waiting, reasons: ['No accepted test has passed.'], tests };
  if (waiting) return { state: 'not-rechecked', waiting, reasons: ['Its new words wait for your approval.'], tests };

  const onThisVersion = (p: Sample) => p.at > promise.at && (!p.version || p.version === promise.at);
  const fresh = (p: Sample) => anchored(reaching, p) && !codeMoved(reaching, p);
  const stale = (p: Sample) => !!p.sha && !!p.committedAt && codeMoved(reaching, p);
  const proving = passes.filter((p) => p.trusted && onThisVersion(p) && fresh(p));
  const best = proving.filter((p) => p.surface === approval.snapshot!.mustHoldIn).at(-1);
  if (best) return { state: 'proven', waiting, tests, reasons: [`Passed on commit ${best.sha!.slice(0, 9)}.`], proof: { sha: best.sha!, committedAt: best.committedAt! } };
  if (approval.snapshot.mustHoldIn === 'app' && proving.some((p) => p.surface === 'server')) return { state: 'server-only', waiting, tests, reasons: ['It passed on the server and has not been shown in the app.'] };
  if (passes.some((p) => onThisVersion(p) && !stale(p))) return { state: 'claimed', waiting, tests, reasons: ['It is reported as passing, and nothing has checked that yet.'] };
  return { state: 'not-rechecked', waiting, tests, reasons: ['It passed once, but the code or its words have changed since.'] };
}
