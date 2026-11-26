// "I have it" through the real write queue and store: one write, both records or neither. Runs on a throwaway database.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { throwawayDatabase } from './helpers/db';
import { P, step } from './helpers/study-book';

let db: Awaited<ReturnType<typeof throwawayDatabase>>;
let store: typeof import('../lib/store/records');
let writer: typeof import('../lib/write');
let marks: typeof import('../lib/server/study');
let mcp: typeof import('../lib/mcp/add');
const agent = 'agent:a';
const add = (book: string, id: string, kind: 'project' | 'feature' | 'work', body: object, replaces: string | null = null) =>
  writer.write(book, { id, kind, by: agent, replaces, body: body as Record<string, unknown> });
const body = async (book: string, id: string) => (await store.readCurrent(book)).find((r) => r.id === id);

async function start(book: string, kind: object) {
  await add(book, 'project', 'project', { title: 'T', forWriter: 'x', ...kind });
  await add(book, 'feature:l', 'feature', { title: 'L', slug: 'l', forWriter: 'x' });
}

beforeAll(async () => {
  db = await throwawayDatabase('book_study');
  store = await import('../lib/store/records');
  writer = await import('../lib/write');
  marks = await import('../lib/server/study');
  mcp = await import('../lib/mcp/add');
});
afterAll(() => db.drop());

describe('I have it, through the queue', () => {
  it('writes both steps at once, records who started what, keeps replaces, and takes it all back', async () => {
    await start('marks', { kind: 'study' });
    await add('marks', 'work:l/s0', 'work', step('s0', 'now', { pointers: [P] }));
    await add('marks', 'work:l/old', 'work', step('old', 'next'));
    await add('marks', 'work:l/s1', 'work', step('s1', 'next'), 'work:l/old');
    const written = await marks.markStep('marks', 'work:l/s0', true);
    expect(written.map((r) => [r.id, r.body.state, r.by])).toEqual([['work:l/s0', 'done', 'editor'], ['work:l/s1', 'now', 'editor']]);
    expect(await body('marks', 'work:l/s1')).toMatchObject({ replaces: 'work:l/old', body: { state: 'now', startedBy: 'work:l/s0' } });
    await marks.markStep('marks', 'work:l/s0', false);
    expect((await body('marks', 'work:l/s0'))?.body.state).toBe('now');
    const back = await body('marks', 'work:l/s1');
    expect(back).toMatchObject({ replaces: 'work:l/old', body: { state: 'next' } });
    expect(back?.body.startedBy).toBeUndefined();
  });

  it('a second press changes nothing and is not news', async () => {
    await start('twice', { kind: 'study' });
    await add('twice', 'work:l/s0', 'work', step('s0', 'now'));
    await marks.markStep('twice', 'work:l/s0', true);
    const before = await store.latestAt('twice');
    await expect(marks.markStep('twice', 'work:l/s0', true)).resolves.toEqual([]);
    expect(await store.latestAt('twice')).toBe(before);
  });

  it('a step replaced since the page was drawn takes no tick and no mark', async () => {
    await start('stale', { kind: 'study' });
    await add('stale', 'work:l/s0', 'work', step('s0', 'now', { pointers: [P] }));
    await add('stale', 'work:l/s1', 'work', step('s1', 'next'), 'work:l/s0');
    await expect(marks.tickPointer('stale', 'work:l/s0', P.key, true)).rejects.toBeInstanceOf(marks.StepChanged);
    await expect(marks.markStep('stale', 'work:l/s0', true)).rejects.toBeInstanceOf(marks.StepChanged);
  });

  it('a refused record in a batch writes none of them', async () => {
    await start('batch', { kind: 'study' });
    const good = { id: 'work:l/a', kind: 'work' as const, by: agent, replaces: null, body: step('a', 'next') };
    const bad = { id: 'work:l/b', kind: 'work' as const, by: agent, replaces: null, body: { title: 'no shape' } };
    await expect(writer.writeAll('batch', () => [good, bad])).rejects.toBeInstanceOf(writer.Refused);
    expect(await body('batch', 'work:l/a')).toBeUndefined();
  });
});

describe('a new version of a replacing piece of work', () => {
  it('still replaces what it replaced, in a product book too', async () => {
    await start('product', {});
    await add('product', 'work:l/old', 'work', step('old', 'next'));
    await add('product', 'work:l/new', 'work', step('new', 'next'), 'work:l/old');
    await mcp.revise('product', 'work', 'work:l/new', agent, (old) => ({ ...old, summary: 'said better' }));
    expect(await body('product', 'work:l/new')).toMatchObject({ replaces: 'work:l/old', body: { summary: 'said better' } });
  });
});
