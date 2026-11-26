// The rules for shaping a book: the order of a list, and withdrawing a feature or a piece of work. A withdrawn
// record is read as if it were not there (currentOf), so these rules see the book as its readers do.
import type { Order } from '../book/types';
import { orderId } from '../book/order';
import { liveTicks } from '../book/study';
import { type Current, replacedBy } from '../book/views';
import type { Proposed } from './check';

/** An order names only what is in its own list, each once, under an id that says which list it is. */
export function orderRefusals(now: Current, id: string, body: Order): string[] {
  if (body.of === 'work' && !body.feature) return ['An order of work names the feature whose work it orders.'];
  if (body.feature && now.get(body.feature)?.kind !== 'feature') return [`"${body.feature}" is not a feature in this book.`];
  const out: string[] = [];
  const expected = orderId(body.of, body.feature);
  if (id !== expected) out.push(`This order's id is ${expected}.`);
  const kind = body.of === 'features' ? 'feature' : 'work';
  const seen = new Set<string>();
  for (const item of body.items) {
    const found = now.get(item);
    if (seen.has(item)) out.push(`"${item}" is named twice.`);
    else if (!found) out.push(`"${item}" is not in this book.`);
    else if (found.kind !== kind) out.push(`"${item}" is a ${found.kind}, not a ${kind}.`);
    else if (kind === 'feature' && found.body.parent !== body.feature) out.push(body.feature ? `"${item}" is not under "${body.feature}".` : `"${item}" is not one of the book's top features.`);
    else if (kind === 'work' && found.body.feature !== body.feature) out.push(`"${item}" is not work in "${body.feature}".`);
    seen.add(item);
  }
  return out;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** The same fields with the same values, whatever order the keys were written in. */
export const same = (a: unknown, b: unknown): boolean =>
  a !== null && b !== null && typeof a === 'object' && typeof b === 'object'
    ? Object.keys({ ...a, ...b }).every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
    : a === b;
/** A note withdrawn or moved (replaced) no longer stands on its work, so it never keeps the work in the book. */
function standing(now: Current) {
  const replaced = replacedBy(now);
  const live = new Set(liveTicks(now).map((t) => t.id));
  return [...now.values()].filter((r) => !((r.kind === 'finding' || r.kind === 'question') && (r.body.withdrawn || replaced.has(r.id))) && (r.kind !== 'tick' || live.has(r.id)));
}

function underFeature(now: Current, id: string): string[] {
  const records = standing(now);
  const count = (kind: string, field: string) => records.filter((r) => r.kind === kind && r.body[field] === id).length;
  const parts = [
    [count('feature', 'parent'), 'feature', 'features'],
    [count('work', 'feature'), 'piece of work', 'pieces of work'],
    [count('event', 'feature'), 'event', 'events'],
    [count('paper', 'feature'), 'paper', 'papers'],
    [count('promise', 'feature'), 'promise', 'promises'],
  ] as const;
  const named = records.filter((r) => (r.kind === 'guard' && r.body.feature === id) || (r.kind === 'link' && (r.body.from === id || r.body.to === id))).map((r) => r.id);
  const what = [...parts.filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many)), ...named];
  return what.length ? [`"${id}" still has ${what.join(', ')} under it or naming it. Move or withdraw them first.`] : [];
}

function onWork(now: Current, id: string, old: Record<string, unknown>, replaces: string | null): string[] {
  if (old.state === 'done') return [`"${id}" is done. Work that was really done is replaced, not withdrawn: add what took its place with book_add_work with replaces: "${id}".`];
  if (replaces) return [`"${id}" replaces "${replaces}"; withdrawing it would bring that work back. Withdraw is for work added by mistake.`];
  // A diary line that names the work is not counted: the diary tells what happened that day, and keeps its words.
  const refers = (r: { id: string; replaces: string | null; body: Record<string, unknown> }) => {
    const b = r.body as { work?: unknown; from?: unknown; to?: unknown; origin?: { work?: unknown } };
    return r.id !== id && (r.replaces === id || b.work === id || b.from === id || b.to === id || b.origin?.work === id || (b.from as { work?: unknown } | undefined)?.work === id);
  };
  const on = standing(now).filter(refers).map((r) => r.id);
  return on.length ? [`"${id}" has ${on.length === 1 ? 'this' : 'these'} recorded on it, so it stays: ${on.join(', ')}. If it was really done, add what took its place with book_add_work with replaces: "${id}".`] : [];
}

/**
 * A feature or a piece of work is withdrawn as it stands, with a one-line reason, and only when nothing stands on it:
 * a feature with nothing under it, a piece of work not done and with nothing recorded on it.
 */
export function withdrawRefusals(now: Current, record: Proposed): string[] {
  if (!record.body.withdrawn) return [];
  const old = now.get(record.id);
  if (!old) return ['Only a feature or work already in the book can be withdrawn.'];
  const { withdrawn: _reason, ...rest } = record.body;
  if (!same(rest, old.body) || record.replaces !== old.replaces) return ['Withdrawing keeps everything else the record said, and what it replaced.'];
  return record.kind === 'feature' ? underFeature(now, record.id) : onWork(now, record.id, old.body, old.replaces);
}
