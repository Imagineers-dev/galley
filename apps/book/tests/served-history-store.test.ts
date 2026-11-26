// The store remembers every promise a piece of work ever served, across all its versions, as the in-memory view does.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { throwawayDatabase } from './helpers/db';

let db: Awaited<ReturnType<typeof throwawayDatabase>>;
let store: typeof import('../lib/store/records');
let writer: typeof import('../lib/write');
let views: typeof import('../lib/book/views');
const by = 'agent:claude';
const WORK = 'work:scene/draft';
const body = (more: object) => ({ feature: 'feature:scene', title: 'Draft', slug: 'draft', on: '2026-11-25', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-25' }, ...more });
const write = (id: string, kind: string, b: object) => writer.write('h', { id, kind: kind as never, by, replaces: null, body: b as Record<string, unknown> });

beforeAll(async () => {
  db = await throwawayDatabase('book_served');
  store = await import('../lib/store/records');
  writer = await import('../lib/write');
  views = await import('../lib/book/views');
  await write('project', 'project', { title: 'H', forWriter: 'x' });
  await write('feature:scene', 'feature', { title: 'Scene', slug: 'scene', forWriter: 'x' });
  await write('promise:scene/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'promise', { feature: 'feature:scene', text: 'A.', mustHoldIn: 'app' });
  await write('promise:scene/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'promise', { feature: 'feature:scene', text: 'B.', mustHoldIn: 'app' });
  await write(WORK, 'work', body({ serves: ['promise:scene/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'] }));
  await write(WORK, 'work', body({ serves: ['promise:scene/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'] }));
  await write(WORK, 'work', body({ state: 'next', serves: [] }));
  await write('work:scene/started', 'work', body({ slug: 'started', provenAtStart: ['promise:scene/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'] }));
  await write('work:scene/started', 'work', body({ slug: 'started', state: 'next' }));
}, 60_000);
afterAll(async () => db?.drop());

describe('the promises a work ever served', () => {
  it('the store reads them from every version, and agrees with the in-memory view', async () => {
    const latest = await store.readCurrent('h');
    const work = latest.find((r) => r.id === WORK)!;
    expect([...(work.answeredFor ?? [])].sort()).toEqual(['promise:scene/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'promise:scene/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']);
    expect((work.body as { serves: string[] }).serves).toEqual([]);
    expect(latest.find((r) => r.id === 'feature:scene')?.answeredFor).toBeUndefined();
    expect(latest.find((r) => r.id === 'work:scene/started')?.answeredFor).toEqual(['promise:scene/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);
    const history = await store.readHistory('h', WORK);
    expect([...(views.current(history).get(WORK)?.answeredFor ?? [])].sort()).toEqual(['promise:scene/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'promise:scene/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']);
  });
});
