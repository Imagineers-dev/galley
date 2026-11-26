// The rules a study book adds: a step's pointers, the editor's ticks, and the one change they may make to a step.
import { isStudy } from '../book/study';
import type { Pointer, Tick } from '../book/study-types';
import { tickId } from '../book/study-types';
import type { Current } from '../book/views';
import type { Proposed } from './check';
import { same } from './check-shape';

/** Records that say a book is building a product: such a book cannot become a study book. */
const PRODUCT_KINDS = new Set(['paper', 'approval', 'decision', 'finding', 'question', 'ask', 'reply', 'event', 'test', 'guard', 'run', 'review', 'proof', 'commit', 'history', 'checkout', 'release', 'beyond', 'receipt', 'watch', 'promise', 'promise-approval', 'link-accept', 'witness']);

/** A book says it is a study book while it holds no product work, and stays one. */
export function kindRefusals(now: Current, body: Record<string, unknown>): string[] {
  const old = now.get('project');
  if (!old || old.body.kind === body.kind) return [];
  if (old.body.kind === 'study') return ['A study book stays a study book.'];
  return [...now.values()].some((r) => PRODUCT_KINDS.has(r.kind)) ? ['This book holds product work (papers, decisions, proof, commits), so it cannot become a study book.'] : [];
}

/** A step of study needs no verdict or proof when the editor says they have it, or when it is already done. */
export const doneNeedsNoProof = (now: Current, record: Proposed) =>
  isStudy(now) && (record.by === 'editor' || now.get(record.id)?.body.state === 'done');

export function pointerRefusals(now: Current, body: { pointers?: Pointer[]; haveItWhen?: string }): string[] {
  if (!isStudy(now) && (body.pointers || body.haveItWhen)) return ['Only a step in a study book holds pointers.'];
  const pointers = body.pointers ?? [];
  const seen = new Set<string>();
  const twice = new Set(pointers.filter((p) => seen.has(p.key) || !seen.add(p.key)).map((p) => p.key));
  return [...twice].map((key) => `Two pointers in this step have the key "${key}". Give each its own key.`);
}

/** Only the editor ticks, in a study book, a pointer the step holds now. */
export function tickRefusals(now: Current, record: Proposed): string[] {
  const body = record.body as Tick;
  if (record.by !== 'editor') return ['Only the editor ticks a pointer, signed in on the website.'];
  if (!isStudy(now)) return ['Only a study book has pointers to tick.'];
  const work = now.get(body.work);
  if (work?.kind !== 'work') return [`Work "${body.work}" is not a work in this book.`];
  if (!((work.body.pointers ?? []) as Pointer[]).some((p) => p.key === body.pointer)) return [`This step has no pointer "${body.pointer}".`];
  return record.id === tickId(body.work, body.pointer) ? [] : [`This tick's id is ${tickId(body.work, body.pointer)}.`];
}

/** In a study book the editor may change one thing about a step: its state. Everything else is the agents'. */
export function editorStepRefusals(now: Current, record: Proposed): string[] {
  if (!isStudy(now)) return ['The editor answers papers and messages; agents write the book.'];
  const old = now.get(record.id);
  if (old?.kind !== 'work') return ['The editor marks a step that is already in the book.'];
  const { state: _new, startedBy: _newLink, ...rest } = record.body;
  const { state: _old, startedBy: _oldLink, ...was } = old.body;
  return same(rest, was) && record.replaces === old.replaces ? [] : ['The editor changes only whether a step is done.'];
}
