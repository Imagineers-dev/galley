// Risks and debts, the weightiest open ones first.
import type { Risk } from './oversight-types';
import { type Current, type Entry, entries } from './views';

const W = { low: 1, medium: 2, high: 3 } as const;
export const weight = (r: Risk) => W[r.likelihood] * W[r.impact];

export function risks(now: Current): Entry<Risk>[] {
  const order = { open: 0, accepted: 1, paid: 2 } as const;
  return entries<Risk>(now, 'risk').sort((a, b) => order[a.body.state] - order[b.body.state] || weight(b.body) - weight(a.body));
}
