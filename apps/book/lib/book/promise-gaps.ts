// What the done gate would refuse for a piece of work. It only reports: nothing is refused until the switch-on.
import { linkedTests, promisesOn } from './promise-evidence';
import { type PromiseState, promiseStatus } from './promise-status';
import type { Ask, Reply } from './inbox-types';
import { YES_TO } from './promise-types';
import { isPerItem } from './governing';
import type { Event, Link, Work } from './types';
import { type Current, entries } from './views';

export type PromiseGap = { promise: string; state: PromiseState; reasons: string[] };
export type PromiseGaps = { gaps: PromiseGap[]; noPromises: boolean };

/** The feature and the features that depend on it. */
function featureAndDependants(now: Current, featureId: string): string[] {
  const out = entries<Link>(now, 'link').filter((l) => l.body.kind === 'depends-on' && l.body.to === featureId && now.get(l.body.from)?.kind === 'feature').map((l) => l.body.from);
  return [featureId, ...new Set(out)];
}

/** A work and every work it replaced, following replaces back, each once. */
function lineage(now: Current, workId: string): string[] {
  const out: string[] = [];
  for (let id: string | null | undefined = workId; id && !out.includes(id); id = now.get(id)?.replaces) out.push(id);
  return out;
}

/** The promises Proven around a feature right now: what a work starting there must not leave worse. */
export function provenAround(now: Current, featureId: string): string[] {
  return featureAndDependants(now, featureId).flatMap((f) => promisesOn(now, f)).filter((p) => promiseStatus(now, p.id).state === 'proven').map((p) => p.id);
}

/** A work's body as it begins: it records what was Proven, once, the first time it moves to now. Nothing else changes. */
export function stampedAtStart(now: Current, old: Record<string, unknown> | undefined, body: Record<string, unknown>): Record<string, unknown> {
  if (body.state !== 'now' || old?.state === 'now' || body.provenAtStart) return body;
  const proven = provenAround(now, String(body.feature));
  return proven.length ? { ...body, provenAtStart: proven } : body;
}

/** The editor accepted this gap at this version, and nothing has failed or broken it since. */
function gapAccepted(now: Current, promiseId: string): boolean {
  const version = now.get(promiseId)?.at;
  const asks = new Set(entries<Ask>(now, 'ask').filter((a) => a.body.about?.act === 'accept-gap' && a.body.about.promise === promiseId && a.body.about.version === version).map((a) => a.id));
  const said = entries<Reply>(now, 'reply').filter((r) => asks.has(r.body.to) && r.by === 'editor' && r.body.choice === YES_TO['accept-gap']).at(-1);
  if (!said) return false;
  const failedSince = linkedTests(now, promiseId).some((t) => t.samples.some((s) => s.result === 'fail' && s.at > said.at));
  const brokenSince = entries<Event>(now, 'event').some((e) => e.firstAt > said.at && e.body.breaks?.some((b) => b.promise === promiseId));
  return !failedSince && !brokenSince;
}

export function promiseGaps(now: Current, workId: string): PromiseGaps {
  const record = now.get(workId);
  if (record?.kind !== 'work') return { gaps: [], noPromises: false };
  const work = record.body as Work;
  if (work.state === 'done') return { gaps: [], noPromises: false }; // work already done stays done
  // Everything this work, and every work it replaced, ever served: the record is append-only, so a promise dropped
  // from a later version, or by withdrawing and writing the work again, still counts.
  const named = [...new Set([...lineage(now, workId).flatMap((id) => now.get(id)?.answeredFor ?? []), ...(work.serves ?? []), ...(work.provenAtStart ?? [])])];
  const gaps = named.flatMap((promise): PromiseGap[] => {
    const s = promiseStatus(now, promise);
    return s.state === 'proven' || gapAccepted(now, promise) ? [] : [{ promise, state: s.state, reasons: s.reasons }];
  });
  return { gaps, noPromises: !isPerItem(now, work.feature) && promisesOn(now, work.feature).length === 0 };
}
