// Who may do what: every action in its band. The latest record per action wins.
import type { Band } from './oversight-types';
import { type Current, type Entry, entries } from './views';

export function bands(now: Current): Record<Band['band'], Entry<Band>[]> {
  const all = entries<Band>(now, 'band');
  return { alone: all.filter((b) => b.body.band === 'alone'), reviewed: all.filter((b) => b.body.band === 'reviewed'), editor: all.filter((b) => b.body.band === 'editor') };
}

/** The band of an action, by the closest recorded action words; undefined when nothing matches. */
export function bandOf(now: Current, action: string): Entry<Band> | undefined {
  const STOP = new Set(['the', 'a', 'an', 'to', 'on', 'in', 'of', 'for', 'and', 'or', 'with', 'from', 'into', 'by', 'it', 'its']);
  const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)));
  const want = words(action);
  let best: { b: Entry<Band>; score: number } | undefined;
  for (const b of entries<Band>(now, 'band')) {
    const have = words(b.body.action);
    const score = [...want].filter((w) => have.has(w)).length / Math.max(1, Math.min(want.size, have.size));
    if (score >= 0.5 && score > (best?.score ?? 0)) best = { b, score };
  }
  return best?.b;
}
