// Decisions as a history that lasts: normalised across record versions, gathered per feature, laid out for the map.
import type { Decision, Event, Feature, Option, Work } from './types';
import { type Current, type Entry, entries, entry, featureTree, flatten, replacedBy } from './views';

/** The latest version of every decision, in the current shape. Early versions kept options as bare strings. */
export function decisions(now: Current): Entry<Decision>[] {
  return entries<Decision>(now, 'decision').map((d) => {
    const raw = d.body as Decision & { turnedDown: (Option | string)[] };
    const turnedDown = (raw.turnedDown ?? []).map((o) => (typeof o === 'string' ? { option: o, whyNot: '' } : o));
    return {
      ...d,
      body: {
        ...raw,
        turnedDown,
        question: raw.question ?? '',
        means: raw.means ?? '',
        shapes: raw.shapes ?? 'Other',
        context: raw.context ?? '',
        madeAt: raw.madeAt ?? d.firstAt,
      },
    };
  });
}

/** The features this one includes: itself and everything nested under it. */
export function family(now: Current, featureId: string): Set<string> {
  const ids = new Set<string>([featureId]);
  for (const f of flatten(featureTree(now))) if (f.body.parent && ids.has(f.body.parent)) ids.add(f.id);
  return ids;
}

export type MapPoint =
  | { type: 'decision'; id: string; when: string; lane: string; d: Entry<Decision>; replacedBy?: string; replaces?: string }
  | { type: 'event'; id: string; when: string; e: Entry<Event> };

/** Everything the decision map draws for a feature (and the features inside it), in time order. */
export function decisionMap(now: Current, featureId: string, showReplaced: boolean) {
  const inside = family(now, featureId);
  const replaced = replacedBy(now);
  const works = new Map(entries<Work>(now, 'work').map((w) => [w.id, w]));
  const points: MapPoint[] = [];
  for (const d of decisions(now)) {
    const work = works.get(d.body.work);
    if (!work || !inside.has(work.body.feature)) continue;
    if (replaced.has(d.id) && !showReplaced) continue;
    points.push({ type: 'decision', id: d.id, when: d.body.madeAt, lane: d.body.shapes, d, replacedBy: replaced.get(d.id), replaces: d.replaces ?? undefined });
  }
  for (const e of entries<Event>(now, 'event')) {
    if (inside.has(e.body.feature)) points.push({ type: 'event', id: e.id, when: `${e.body.on}T00:00:00.000Z`, e });
  }
  points.sort((a, b) => a.when.localeCompare(b.when));
  return { points, lanes: laneOrder(now, featureId, points.flatMap((p) => (p.type === 'decision' ? [p.lane] : []))) };
}

/** A decision's whole line: what it replaced, and what replaced it, oldest first. */
export function lineage(now: Current, id: string): Entry<Decision>[] {
  const all = new Map(decisions(now).map((d) => [d.id, d]));
  const replaced = replacedBy(now);
  let first = id;
  while (all.get(first)?.replaces && all.has(String(all.get(first)?.replaces))) first = String(all.get(first)?.replaces);
  const line: Entry<Decision>[] = [];
  for (let at: string | undefined = first; at && all.has(at); at = replaced.get(at)) line.push(all.get(at) as Entry<Decision>);
  return line;
}

export const featureOfWork = (now: Current, workId: string) => {
  const w = now.get(workId);
  const f = w ? now.get(String(w.body.feature)) : undefined;
  return f ? entry<Feature>(f) : undefined;
};

/** Lanes in the order the feature declares, then any others in the order they first appear. */
export function laneOrder(now: Current, featureId: string, used: string[]): string[] {
  const declared = ((now.get(featureId)?.body as Feature | undefined)?.lanes ?? []).filter((l) => used.includes(l));
  for (const lane of used) if (!declared.includes(lane)) declared.push(lane);
  return declared;
}
