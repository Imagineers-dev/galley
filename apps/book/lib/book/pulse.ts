// The live pulse: each measure's readings over time, against its limit. A reading over its limit is a breach.
import type { Pulse } from './oversight-types';
import { type Current, type Entry, entries } from './views';

export const breached = (p: Pulse) => p.limit !== undefined && (p.higherIsWorse ? p.value > p.limit : p.value < p.limit);

export type MeasureView = { key: string; measure: string; part: string; unit: string; readings: Entry<Pulse>[]; latest: Entry<Pulse>; breach: boolean };

export function measures(now: Current): MeasureView[] {
  const byKey = new Map<string, Entry<Pulse>[]>();
  for (const r of entries<Pulse>(now, 'pulse')) {
    const key = `${r.body.part} · ${r.body.measure}`;
    byKey.set(key, [...(byKey.get(key) ?? []), r]);
  }
  return [...byKey].map(([key, readings]) => {
    const latest = readings[readings.length - 1];
    return { key, measure: latest.body.measure, part: latest.body.part, unit: latest.body.unit, readings, latest, breach: breached(latest.body) };
  }).sort((a, b) => Number(b.breach) - Number(a.breach) || a.key.localeCompare(b.key));
}

/** Every reading that breached its limit: each arrives in the inbox and the diary. */
export const breaches = (now: Current) => entries<Pulse>(now, 'pulse').filter((p) => breached(p.body));
