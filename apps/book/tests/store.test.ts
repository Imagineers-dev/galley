// The store reads one book at a time, returns the latest version of each id with when it first appeared, and the
// write queue keeps a book's writes in order, so concurrent changes are never lost. Runs on a throwaway database.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { throwawayDatabase } from './helpers/db';

let db: Awaited<ReturnType<typeof throwawayDatabase>>;
let store: typeof import('../lib/store/records');
let writer: typeof import('../lib/write');
let mcp: typeof import('../lib/mcp/add');

const agent = 'agent:claude';
const work = 'work:tasks/goal';
const workBody = { feature: 'feature:tasks', title: 'Goal', slug: 'goal', on: '2026-11-19', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-19' } };

async function startBook(book: string) {
  await writer.write(book, { id: 'project', kind: 'project', by: agent, replaces: null, body: { title: book.toUpperCase(), forWriter: 'x' } });
  await writer.write(book, { id: 'feature:tasks', kind: 'feature', by: agent, replaces: null, body: { title: 'Tasks', slug: 'tasks', forWriter: 'f' } });
  await writer.write(book, { id: work, kind: 'work', by: agent, replaces: null, body: { ...workBody, summary: `s of ${book}` } });
  await writer.write(book, { id: `finding:only-${book}`, kind: 'finding', by: agent, replaces: null, body: { work, text: book } });
}

beforeAll(async () => {
  db = await throwawayDatabase('book_test');
  store = await import('../lib/store/records');
  writer = await import('../lib/write');
  mcp = await import('../lib/mcp/add');
  await startBook('alpha');
  await startBook('beta');
}, 60_000);
afterAll(async () => db?.drop());

describe('the store', () => {
  it('reads only the book it is asked for: its own ids and its own versions, never the other book’s', async () => {
    const alpha = await store.readCurrent('alpha');
    expect(alpha.every((r) => r.book === 'alpha')).toBe(true);
    expect(alpha.map((r) => r.id).sort()).toEqual(['feature:tasks', 'finding:only-alpha', 'project', work]);
    expect(alpha.find((r) => r.id === work)?.body.summary).toBe('s of alpha');
    expect(alpha.find((r) => r.id === 'project')?.body.title).toBe('ALPHA');
    expect((await store.books()).map((b) => b)).toEqual([{ book: 'alpha', title: 'ALPHA' }, { book: 'beta', title: 'BETA' }]);
  });

  it('gives the latest version of each id, when it first appeared, and the book as it stood earlier', async () => {
    const before = (await store.readCurrent('alpha')).find((r) => r.id === work);
    await mcp.revise('alpha', 'work', work, agent, (old) => ({ ...old, summary: 'later' }));
    const after = (await store.readCurrent('alpha')).find((r) => r.id === work);
    expect(after?.body.summary).toBe('later');
    expect(after?.firstAt).toBe(before?.firstAt);
    const asOf = (await store.readCurrent('alpha', { asOf: before?.at })).find((r) => r.id === work);
    expect(asOf?.body.summary).toBe('s of alpha');
    expect((await store.readHistory('alpha', work)).map((r) => r.body.summary)).toEqual(['s of alpha', 'later']);
  });

  it('keeps both of two concurrent changes, and its times always increase', async () => {
    await Promise.all([
      mcp.revise('beta', 'work', work, agent, (old) => ({ ...old, state: 'next' })),
      mcp.revise('beta', 'work', work, agent, (old) => ({ ...old, summary: 'both kept' })),
    ]);
    const history = await store.readHistory('beta', work);
    const latest = history.at(-1)?.body;
    expect(latest?.state).toBe('next');
    expect(latest?.summary).toBe('both kept');
    const times = history.map((r) => r.at);
    expect([...times].sort()).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
  });

  it('starts a book once, inside its write queue, and lets its title change as a new version', async () => {
    const project = { id: 'project', kind: 'project' as const, by: agent, replaces: null, body: { title: 'Again', forWriter: 'x' } };
    const tries = await Promise.allSettled([writer.start('gamma', project), writer.start('gamma', project)]);
    expect(tries.map((t) => t.status).sort()).toEqual(['fulfilled', 'rejected']);
    await expect(writer.start('alpha', project)).rejects.toThrow(/already exists; a book is started once/);
    await mcp.revise('gamma', 'project', 'project', agent, (old) => ({ ...old, title: 'Gamma, renamed' }));
    expect((await store.books()).find((b) => b.book === 'gamma')?.title).toBe('Gamma, renamed');
    expect((await store.readHistory('gamma', 'project')).map((r) => r.body.title)).toEqual(['Again', 'Gamma, renamed']);
  });

  it('adds a record once, and adds a withdrawn one again as a new version', async () => {
    const feature = { id: 'feature:extra', kind: 'feature' as const, by: agent, replaces: null, body: { title: 'Extra', slug: 'extra', forWriter: 'f' } };
    await writer.create('beta', feature, 'book_update_feature');
    await expect(writer.create('beta', feature, 'book_update_feature')).rejects.toThrow(/already in this book. To change it, use book_update_feature/);
    await mcp.revise('beta', 'feature', 'feature:extra', agent, (old) => ({ ...old, withdrawn: { reason: 'Added by mistake.' } }));
    expect((await store.readCurrent('beta')).some((r) => r.id === 'feature:extra')).toBe(true);
    expect((await mcp.load('beta')).get('feature:extra')).toBeUndefined();
    await writer.create('beta', feature, 'book_update_feature');
    expect((await mcp.load('beta')).get('feature:extra')?.body.withdrawn).toBeUndefined();
    expect((await store.readHistory('beta', 'feature:extra')).map((r) => Boolean(r.body.withdrawn))).toEqual([false, true, false]);
  });

  it('a refused write leaves the book writable', async () => {
    await expect(mcp.revise('alpha', 'work', 'work:tasks/missing', agent, (old) => old)).rejects.toThrow(/No work/);
    const written = await mcp.revise('alpha', 'work', work, agent, (old) => ({ ...old, summary: 'after a refusal' }));
    expect(written.body.summary).toBe('after a refusal');
  });
});
