// Proof for every done: the evidence attached to each piece of work, and done work that has none.
import type { Proof } from './oversight-types';
import { isStudy } from './study';
import type { Work } from './types';
import { type Current, type Entry, entries } from './views';

export const proofsOf = (now: Current, workId: string) => entries<Proof>(now, 'proof').filter((p) => p.body.work === workId);

export function doneWork(now: Current): { work: Entry<Work>; proofs: Entry<Proof>[] }[] {
  return entries<Work>(now, 'work')
    .filter((w) => w.body.state === 'done')
    .map((work) => ({ work, proofs: proofsOf(now, work.id) }))
    // A step of study is done when the editor says so, so only one an agent proved belongs on this list.
    .filter((d) => !isStudy(now) || d.proofs.length > 0)
    .sort((a, b) => b.work.at.localeCompare(a.work.at));
}
