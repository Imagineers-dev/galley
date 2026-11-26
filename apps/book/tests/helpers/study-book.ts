// A small study book for tests: a project, one layer, and steps in the states asked for; the first step holds a pointer.
import type { Pointer } from '../../lib/book/study-types';
import type { BookRecord } from '../../lib/book/types';

let n = 0;
export const rec = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:a', replaces: string | null = null): BookRecord =>
  ({ book: 'b', id, kind, by, replaces, at: new Date(Date.UTC(2026, 10, 23, 0, 0, n++)).toISOString(), body: body as Record<string, unknown> });
export const P: Pointer = { key: 'one', act: 'watch', title: 'One', minutes: 8 };
export const step = (slug: string, state: string, extra: object = {}) =>
  ({ feature: 'feature:l', title: slug, slug, on: '2026-11-23', state, summary: 's', origin: { words: 'w', saidOn: '2026-11-23' }, ...extra });
export const book = (states: string[], kind: object = { kind: 'study' }) => [
  rec('project', 'project', { title: 'T', forWriter: 'x', ...kind }),
  rec('feature:l', 'feature', { title: 'Layer', slug: 'l', forWriter: 'x' }),
  ...states.map((s, i) => rec(`work:l/s${i}`, 'work', step(`s${i}`, s, i === 0 && 'kind' in kind ? { pointers: [P] } : {}))),
];
export const propose = (kind: BookRecord['kind'], id: string, body: object, by = 'agent:a') => ({ id, kind, by, replaces: null, body: body as Record<string, unknown> });
