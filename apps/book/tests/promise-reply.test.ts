// Their answer from the inbox is stamped with the build the app last reported. The form cannot supply it.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { type Current, current } from '../lib/book/views';
import { P, WORK, book, commit, reading, rec } from './helpers/promise-book';

class Redirect extends Error {
  constructor(readonly to: string) { super(to); }
}
const state = { now: new Map() as Current };
const written: { body: Record<string, unknown> }[] = [];
vi.mock('next/headers', () => ({ headers: async () => ({ get: () => null }), cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }) }));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Redirect(to); } }));
vi.mock('../lib/server/session', () => ({ isEditor: async () => true }));
vi.mock('../lib/load', () => ({ AS_OF_COOKIE: 'as-of', asOf: async () => null }));
vi.mock('../lib/write', async (original) => ({
  ...(await original<typeof import('../lib/write')>()),
  write: async (_book: string, record: { body: Record<string, unknown> }) => { written.push(record); },
  writeFrom: async (_book: string, build: (now: Current) => { body: Record<string, unknown> }) => { written.push(build(state.now)); },
}));
const { reply } = await import('../app/[book]/inbox/actions');

const A = 'aaaaaaa1a1a1';
const askOf = (act: string) => rec(`ask:${crypto.randomUUID()}`, 'ask', { work: WORK, to: 'editor', needs: 'try', subject: 's', text: 't', ...(act ? { about: { act, test: 'test:t', promise: P } } : {}) });
const form = (id: string, more: Record<string, string> = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ key: `b~${id}`, here: '', tried: 'works', ...more })) f.set(k, v);
  return f;
};
const send = async (records: BookRecord[], f: FormData) => {
  state.now = current(records);
  await reply(f).catch((e) => { if (!(e instanceof Redirect)) throw e; });
  return written.at(-1)!.body;
};

beforeEach(() => { written.length = 0; });

describe('their reply from the inbox', () => {
  it('carries the build the app last reported, on a try', async () => {
    const r = reading(A);
    const a = askOf('pass');
    expect((await send([...book().records, commit(A, '2026-11-23T01:00:00Z'), r, a], form(a.id))).build).toEqual({ sha: A, readAt: r.at });
  });
  it('carries none when no reading is held', async () => {
    const a = askOf('pass');
    expect((await send([...book().records, a], form(a.id))).build).toBeUndefined();
  });
  it('carries none on an ordinary ask', async () => {
    const a = askOf('');
    expect((await send([...book().records, reading(A), a], form(a.id))).build).toBeUndefined();
  });
  it('ignores a build sent by the form', async () => {
    const a = askOf('pass');
    expect((await send([...book().records, a], form(a.id, { build: 'bbbbbbb2', sha: 'bbbbbbb2' }))).build).toBeUndefined();
  });
});
