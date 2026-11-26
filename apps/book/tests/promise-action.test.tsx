// The editor's answer to promises from the page: only signed in, never into the past, and changes need words.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeaturePromise } from '../lib/book/promises';

class Redirect extends Error {
  constructor(readonly to: string) { super(to); }
}
const state = { editor: true, asOf: null as string | null };
const answered: unknown[] = [];
vi.mock('next/headers', () => ({ headers: async () => ({ get: () => null }), cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }) }));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Redirect(to); } }));
vi.mock('../lib/server/session', () => ({ isEditor: async () => state.editor, signIn: async () => 'in', signOut: async () => undefined }));
vi.mock('../lib/load', () => ({ AS_OF_COOKIE: 'as-of', asOf: async () => state.asOf }));
vi.mock('../lib/store/records', () => ({ readCurrent: async () => [] }));
vi.mock('../lib/server/answers', async (original) => ({
  ...(await original<typeof import('../lib/server/answers')>()),
  answerPromises: async (_book: string, answer: unknown) => { answered.push(answer); },
}));
const { answerPromisesForm } = await import('../app/actions');
const { PromiseAnswer } = await import('../app/ui/promises/promise-answer');

const P = 'promise:scene/11111111-1111-4111-8111-111111111111';
const form = (fields: Record<string, string>, items = [`${P}|2026-11-23T10:00:00.000Z`]) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ book: 'b', feature: 'feature:scene', here: '/b/promises/scene', ...fields })) f.set(k, v);
  for (const i of items) f.append('item', i);
  return f;
};
const sent = (f: FormData) => answerPromisesForm(f).then(() => '', (e: Redirect) => e.to);

beforeEach(() => { state.editor = true; state.asOf = null; answered.length = 0; });

describe('answering promises', () => {
  it('sends someone not signed in to sign in, and writes nothing', async () => {
    state.editor = false;
    expect(await sent(form({ verdict: 'approved' }))).toContain('/signin');
    expect(answered).toEqual([]);
  });
  it('writes nothing while the book is read as of an earlier day', async () => {
    state.asOf = '2026-11-01';
    await sent(form({ verdict: 'approved' }));
    expect(answered).toEqual([]);
  });
  it('asks for words before asking for changes', async () => {
    expect(await sent(form({ verdict: 'changes' }))).toContain('need=words');
    expect(answered).toEqual([]);
  });
  it('names each promise at the version on screen', async () => {
    await sent(form({ verdict: 'approved', all: '1' }));
    expect(answered).toEqual([{ feature: 'feature:scene', items: [{ promise: P, at: '2026-11-23T10:00:00.000Z' }], verdict: 'approved', words: '', all: true }]);
  });
});

describe('what they see before approving', () => {
  const where = { book: 'b', feature: 'feature:scene', here: '/b/promises/scene' };
  const base = { id: P, at: '2026-11-23T10:00:00.000Z', text: 'New words.', mustHoldIn: 'server', serverReason: 'No screen shows it.', status: { state: 'not-proven', waiting: true, reasons: [], tests: [] }, reworded: false } as FeaturePromise;
  it('shows where a new promise must hold and why', () => {
    expect(renderToStaticMarkup(<PromiseAnswer where={where} waiting={[base]} reworded={[]} />)).toContain('Must hold on the server: No screen shows it.');
  });
  it('shows a rewording its old and new words and places, outside Approve all', () => {
    const html = renderToStaticMarkup(<PromiseAnswer where={where} waiting={[]} reworded={[{ ...base, reworded: true, was: { text: 'Old words.', mustHoldIn: 'app' } }]} />);
    expect(html).toContain('Old words.');
    expect(html).toContain('New words.');
    expect(html).toContain('Must hold in the app.');
    expect(html).not.toContain('Approve all');
  });
});
