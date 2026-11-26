// The order of one list (the book's top features, the features under a feature, a feature's work), as an order record
// says it. Pure. The named come first in the order given; the rest follow as they came. A work that replaced a named
// one takes its place. Anything named that is no longer in the list (moved, withdrawn) is simply not there.
import type { Current } from './views';
import { slugOf } from './types';

/** The kinds of list an order can say: features, or a feature's work. */
export const ORDER_LISTS = ['features', 'work'] as const;
export type OrderOf = (typeof ORDER_LISTS)[number];

/** The id of a list's order: order:features for the book's top features, order:<of>:<feature slug> under a feature. */
export const orderId = (of: OrderOf, feature?: string) => (feature ? `order:${of}:${slugOf(feature)}` : `order:${of}`);

/** The members of one list in the order said for it; as given when no order is said. */
export function inOrder<T extends { id: string }>(now: Current, listId: string, members: T[]): T[] {
  const order = now.get(listId);
  if (order?.kind !== 'order') return members;
  const rank = new Map((order.body.items as string[]).map((id, i) => [id, i] as const));
  const rankOf = (id: string) => {
    const seen = new Set<string>();
    for (let at: string | null = id; at && !seen.has(at); at = now.get(at)?.replaces ?? null) {
      seen.add(at);
      if (rank.has(at)) return rank.get(at);
    }
    return undefined;
  };
  const ranked = members.map((m, i) => ({ m, i, r: rankOf(m.id) }));
  const named = ranked.filter((x) => x.r !== undefined).sort((a, b) => (a.r as number) - (b.r as number) || a.i - b.i);
  return [...named, ...ranked.filter((x) => x.r === undefined)].map((x) => x.m);
}
