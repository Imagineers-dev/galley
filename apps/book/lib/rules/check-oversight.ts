// Write rules for the oversight records, and the rule that done needs proof.
import type { Proof } from '../book/oversight-types';
import { linkTarget } from '../book/links';
import type { Current } from '../book/views';

const exists = (now: Current, id: unknown, kind: string, what: string) => {
  const found = now.get(String(id));
  return !found || found.kind !== kind ? [`${what} "${String(id)}" is not a ${kind} in this book.`] : [];
};

export function oversightRefusals(now: Current, kind: string, id: string, body: Record<string, unknown>): string[] {
  switch (kind) {
    case 'proof': {
      const outside = body.kind !== 'link' || linkTarget(String(body.evidence))?.inside === false;
      return [...exists(now, body.work, 'work', 'Work'), ...(outside ? [] : ['A link proof is an http(s) address.'])];
    }
    case 'slip':
      return [...exists(now, body.lesson, 'lesson', 'Lesson'), ...(body.work ? exists(now, body.work, 'work', 'Work') : [])];
    case 'risk':
      return body.work ? exists(now, body.work, 'work', 'Work') : [];
    case 'result':
      return [...exists(now, body.goal, 'goal', 'Goal'), ...(body.work ? exists(now, body.work, 'work', 'Work') : [])];
    case 'eval':
      return Number(body.passed) > Number(body.cases) ? ['passed cannot exceed cases.'] : [];
    case 'band': {
      if (id !== `band:${slug(String(body.action))}`) return [`A band's id is band:${slug(String(body.action))}.`];
      const was = now.get(id);
      return was && was.body.band !== body.band ? ['Moving an action to another band is the editor\'s decision: ask with book_ask.'] : [];
    }
    case 'release':
      return [...(id.startsWith('release:') ? [] : ['A release id starts with release:']), ...((body.works as string[] | undefined) ?? []).flatMap((w) => exists(now, w, 'work', 'Work'))];
    default:
      return [];
  }
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Work moves to done only with proof attached (work done before this rule keeps its state). */
export function doneNeedsProof(now: Current, workId: string): string[] {
  if (now.get(workId)?.body.state === 'done') return [];
  const proofs = [...now.values()].filter((r) => r.kind === 'proof' && (r.body as Proof).work === workId);
  return proofs.length ? [] : ['Work is done only with proof attached: record test output, a screenshot, an eval run or a link with book_prove first.'];
}
