// What a feature promises, in the order a person reads it: what is wrong first, what nobody has checked last.
import { approvalOf, isReworded, lastAnswered, promisesOn } from './promise-evidence';
import type { BookPromise, PromiseSnapshot } from './promise-types';
import { type PromiseState, type PromiseStatus, promiseStatus } from './promise-status';
import type { Feature, Link } from './types';
import { type Current, type Entry, entries, featureTree, flatten, replacedBy, titleOf } from './views';

export const PROMISE_GROUPS: { state: PromiseState; title: string }[] = [
  { state: 'broken', title: 'Broken' },
  { state: 'proven', title: 'Proven' },
  { state: 'claimed', title: 'Claimed' },
  { state: 'server-only', title: 'Server only' },
  { state: 'not-rechecked', title: 'Not rechecked' },
  { state: 'not-proven', title: 'Not proven' },
];

export type FeaturePromise = { id: string; at: string; text: string; mustHoldIn: BookPromise['mustHoldIn']; serverReason?: string; status: PromiseStatus; reworded: boolean; was?: PromiseSnapshot };
export type PromiseCounts = Record<PromiseState, number>;
export type FeatureRef = { id: string; title: string };
export type Promises = {
  feature: FeatureRef;
  groups: { state: PromiseState; title: string; promises: FeaturePromise[] }[];
  waiting: FeaturePromise[]; // first-time promises the editor can approve together
  reworded: FeaturePromise[]; // each shows its old and new words and is answered on its own
  counts: PromiseCounts;
  total: number;
  dependsOn: FeatureRef[];
  usedBy: FeatureRef[];
};

/** The features on the far side of this feature's standing `depends-on` links, in one direction. */
function linked(now: Current, featureId: string, from: 'from' | 'to'): FeatureRef[] {
  const to = from === 'from' ? 'to' : 'from';
  const replaced = replacedBy(now);
  const found = entries<Link>(now, 'link')
    .filter((l) => !replaced.has(l.id) && l.body.kind === 'depends-on' && l.body[from] === featureId)
    .map((l) => l.body[to]);
  return [...new Set(found)].filter((id) => now.get(id)?.kind === 'feature').map((id) => ({ id, title: titleOf(now, id) }));
}

const asPromise = (now: Current, p: Entry<BookPromise>): FeaturePromise => {
  const { current } = approvalOf(now, p.id);
  const was = current ? undefined : lastAnswered(now, p.id);
  return { id: p.id, at: p.at, text: p.body.text, mustHoldIn: p.body.mustHoldIn, serverReason: p.body.serverReason, status: promiseStatus(now, p.id), reworded: isReworded(now, p.id), ...(was ? { was } : {}) };
};

/** A feature's promises in their groups, or null when the book has no such feature. */
export function promisesOf(now: Current, featureId: string): Promises | null {
  const record = now.get(featureId);
  if (record?.kind !== 'feature') return null;
  const all = promisesOn(now, featureId).map((p) => asPromise(now, p));
  const groups = PROMISE_GROUPS.map((g) => ({ ...g, promises: all.filter((p) => p.status.state === g.state) }));
  return {
    feature: { id: featureId, title: (record.body as Feature).title },
    groups,
    waiting: all.filter((p) => p.status.waiting && !p.reworded),
    reworded: all.filter((p) => p.status.waiting && p.reworded),
    counts: Object.fromEntries(groups.map((g) => [g.state, g.promises.length])) as PromiseCounts,
    total: all.length,
    dependsOn: linked(now, featureId, 'from'),
    usedBy: linked(now, featureId, 'to'),
  };
}

/** A feature's promises, then those of each feature under it in book order; a feature with none is left out. */
export function promisesNested(now: Current, featureId: string): Promises[] {
  const node = flatten(featureTree(now)).find((f) => f.id === featureId);
  return (node ? flatten([node]) : []).map((f) => promisesOf(now, f.id)).filter((p): p is Promises => p !== null && p.total > 0);
}

/** How many promises stand in each state across several features. */
export const countsAcross = (list: Promises[]): PromiseCounts =>
  Object.fromEntries(PROMISE_GROUPS.map((g) => [g.state, list.reduce((n, p) => n + p.counts[g.state], 0)])) as PromiseCounts;
