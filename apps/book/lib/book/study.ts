// A study book's steps, in the book's stated order, and what marking one done changes. Pure: records in, changes out.
import { stepsOf } from './grid';
import type { Pointer, PointerInput, Tick } from './study-types';
import { STUDY, tickId } from './study-types';
import type { Work, WorkState } from './types';
import { slugify } from './types';
import { type Current, type Entry, entries, featureTree, flatten, replacedBy } from './views';

export const isStudy = (now: Current) => now.get('project')?.body.kind === STUDY;
/** A product book reports repositories, papers, production and agents. A study book has none of them. */
export const deliversProduct = (now: Current) => !isStudy(now);

/**
 * Gives each pointer its key: the one sent, else that of the old pointer with the same link (a retitled video keeps its
 * tick), else one made from the title. A made key never takes one an old pointer with another link holds, so a new
 * video never inherits a tick, nor does a made key reuse one a removed pointer was ticked under (`ticks`). A retitled
 * pointer with no link keeps its tick only if its key is sent.
 */
export function keyed(list: PointerInput[], old: Pointer[] = [], ticks: string[] = []): Pointer[] {
  const used = new Set(list.flatMap((p) => (p.key?.trim() ? [p.key.trim()] : [])));
  const fresh = (p: PointerInput) => {
    const base = slugify(p.title);
    const held = (key: string) => old.find((o) => o.key === key);
    const free = (key: string) => !used.has(key) && (held(key) ? !held(key)?.link || held(key)?.link === p.link : !ticks.includes(key));
    let key = base;
    for (let n = 2; base && !free(key); n++) key = `${base.slice(0, 56).replace(/-$/, '')}-${n}`;
    return key;
  };
  return list.map(({ key, ...p }) => {
    const chosen = key?.trim() || old.find((o) => p.link && o.link === p.link && !used.has(o.key))?.key || fresh(p);
    used.add(chosen);
    return { ...p, key: chosen };
  });
}

/** Every step of the book, feature by feature, each feature's steps in the order said for them. */
export function stepsInBook(now: Current): Entry<Work>[] {
  const works = entries<Work>(now, 'work');
  const replaced = replacedBy(now);
  return flatten(featureTree(now)).flatMap((f) => stepsOf(now, f.id, works, replaced));
}

/** Every key the editor has ever ticked on a step, whether or not the step still holds that pointer. */
export const tickKeysOf = (now: Current, workId: string) => entries<Tick>(now, 'tick').filter((t) => t.body.work === workId).map((t) => t.body.pointer);

/** The ticks that stand: marked done, on a pointer its step still holds. */
export const liveTicks = (now: Current) =>
  entries<Tick>(now, 'tick').filter((t) => t.body.done && ((now.get(t.body.work)?.body.pointers ?? []) as Pointer[]).some((p) => p.key === t.body.pointer));

/** The keys of a step's pointers the editor has ticked. */
export const tickedKeys = (now: Current, workId: string) => new Set(liveTicks(now).filter((t) => t.body.work === workId).map((t) => t.body.pointer));

/** "2 of 5 done", or null for a step with no pointers. */
export function stepProgress(now: Current, workId: string, pointers: Pointer[] = []): string | null {
  return pointers.length ? `${tickedKeys(now, workId).size} of ${pointers.length} done` : null;
}

/** `startedBy`: a step id to record, null to clear it, absent to leave it. */
export type StepChange = { id: string; state: WorkState; startedBy?: string | null };

/**
 * What "I have it" changes: the step is done (and no longer counts as started by another), and the next step still to start comes under way unless one already is.
 * Taking it back returns the step to under way, and returns the step this press started to next if it has no ticks yet.
 * A step started by a later press stays under way.
 */
export function stepChanges(now: Current, id: string, have: boolean): StepChange[] {
  const steps = stepsInBook(now);
  const at = steps.findIndex((s) => s.id === id);
  if (at < 0) return [];
  if (have) {
    if (steps[at].body.state === 'done') return [];
    const busy = steps.some((s) => s.id !== id && s.body.state === 'now');
    const next = busy ? undefined : steps.slice(at + 1).find((s) => s.body.state === 'next');
    return [{ id, state: 'done', startedBy: null }, ...(next ? [{ id: next.id, state: 'now' as const, startedBy: id }] : [])];
  }
  if (steps[at].body.state !== 'done') return [];
  const started = steps.find((s) => s.body.startedBy === id && s.body.state === 'now');
  const untouched = started && tickedKeys(now, started.id).size === 0;
  return [{ id, state: 'now' }, ...(started && untouched ? [{ id: started.id, state: 'next' as const, startedBy: null }] : [])];
}
