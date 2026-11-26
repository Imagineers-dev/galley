// What went wrong in a feature, newest first: each event on the feature, or on a piece of work in it, with the promises
// it broke (or that no promise covered it) and the work it led to. Pure: the one view of a feature's events.
import type { BookPromise } from './promise-types';
import type { Event, Link, Work } from './types';
import { type Current, type Entry, entries, replacedBy, titleOf } from './views';

export type Named = { id: string; title: string };
export type WentWrong = { id: string; on: string; title: string; text: string; broke: { id: string; text: string }[]; noPromiseYet: boolean; ledTo: Named[] };

/** The works an event led to: named by a `leads-to` from it or a `came-from` to it, or begun from it. */
function ledTo(now: Current, eventId: string, works: Entry<Work>[], links: Entry<Link>[]): string[] {
  const linked = links.flatMap((l) => {
    if (l.body.kind === 'leads-to' && l.body.from === eventId) return [l.body.to];
    if (l.body.kind === 'came-from' && l.body.to === eventId) return [l.body.from];
    return [];
  });
  const begun = works.filter((w) => 'event' in w.body.origin && w.body.origin.event === eventId).map((w) => w.id);
  return [...new Set([...linked, ...begun])].filter((id) => now.get(id)?.kind === 'work');
}

const promiseText = (now: Current, id: string) => String((now.get(id)?.body as BookPromise | undefined)?.text ?? 'A promise no longer in the book');

/** Every event on the feature or on one of its works, newest first. */
export function wentWrong(now: Current, featureId: string): WentWrong[] {
  const replaced = replacedBy(now);
  const works = entries<Work>(now, 'work');
  const links = entries<Link>(now, 'link');
  const ours = new Set(works.filter((w) => w.body.feature === featureId).map((w) => w.id));
  return entries<Event>(now, 'event')
    .filter((e) => !replaced.has(e.id))
    .map((e) => ({ e, led: ledTo(now, e.id, works, links) }))
    .filter(({ e, led }) => e.body.feature === featureId || led.some((id) => ours.has(id)))
    .sort((a, b) => b.e.body.on.localeCompare(a.e.body.on) || b.e.firstAt.localeCompare(a.e.firstAt))
    .map(({ e, led }) => ({
      id: e.id,
      on: e.body.on,
      title: e.body.title,
      text: e.body.text,
      broke: [...new Set((e.body.breaks ?? []).map((b) => b.promise))].map((id) => ({ id, text: promiseText(now, id) })),
      noPromiseYet: e.body.noPromiseYet === true,
      ledTo: led.map((id) => ({ id, title: titleOf(now, id) })),
    }));
}
