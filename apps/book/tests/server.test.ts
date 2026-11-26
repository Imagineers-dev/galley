// The server layer's guards, with Next's cookies and redirects and the store stood in: a sign-in that was ended or
// has expired is no sign-in; the inbox writes nothing while the book is read as of an earlier day; an answer to a
// paper that changed is turned back with the new words; the gate refuses another site's GET and a non-repository key.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Latest } from '../lib/book/views';

class Redirect extends Error {
  constructor(readonly to: string) {
    super(to);
  }
}
const jar = new Map<string, string>();
const sent = new Map<string, string>();
const session = { current: null as null | { hash: string; expires: string; revoked: boolean } };
const writes: unknown[] = [];
let book = new Map<string, Latest>();

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => sent.get(name) ?? null }),
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined), set: (n: string, v: string) => jar.set(n, v), delete: (n: string) => jar.delete(n) }),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Redirect(to); } }));
vi.mock('../lib/store/sessions', () => ({ sessionOf: async () => session.current, appendSession: async () => undefined }));
vi.mock('../lib/server/keys', () => ({ callerOf: async () => ({ who: 'agent:claude', books: ['b'], mayStart: false }), mayWrite: () => true }));
vi.mock('../lib/store/records', () => ({ readCurrent: async () => [] }));
vi.mock('../lib/write', async (original) => ({
  ...(await original<typeof import('../lib/write')>()),
  writeFrom: async (_book: string, build: (now: Map<string, Latest>) => unknown) => writes.push(build(book)),
  write: async (_book: string, record: unknown) => writes.push(record),
  writeAll: async (_book: string, build: (now: Map<string, Latest>) => unknown[]) => writes.push(...build(book)),
}));

const { isEditor } = await import('../lib/server/session');
const { approve } = await import('../app/[book]/inbox/actions');
const { answer, setTheme } = await import('../app/actions');
const { gate } = await import('../lib/server/local-route');
const { tick, haveIt } = await import('../app/study-actions');

const paperId = 'paper:conflict/find/intent/editor';
const paper = { id: paperId, kind: 'paper', by: 'agent:claude', replaces: null, at: '2026-11-19T10:00:00.000Z', firstAt: '2026-11-19T10:00:00.000Z', body: { for: 'editor' } } as unknown as Latest;
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const redirected = async (run: () => Promise<unknown>) => run().then(() => null, (e) => (e instanceof Redirect ? e.to : Promise.reject(e)));

beforeEach(() => {
  jar.clear();
  sent.clear();
  jar.set('book_editor', 'token');
  session.current = { hash: 'h', expires: new Date(Date.now() + 60_000).toISOString(), revoked: false };
  writes.length = 0;
  book = new Map([[paperId, paper]]);
});

describe('the editor’s sign-in', () => {
  it('is no sign-in once ended or expired', async () => {
    expect(await isEditor()).toBe(true);
    session.current = { hash: 'h', expires: new Date(Date.now() + 60_000).toISOString(), revoked: true };
    expect(await isEditor()).toBe(false);
    session.current = { hash: 'h', expires: new Date(Date.now() - 1).toISOString(), revoked: false };
    expect(await isEditor()).toBe(false);
  });
});

describe('answers', () => {
  it('the inbox approves nothing while the book is read as of an earlier day', async () => {
    jar.set('book_asof', '2026-11-01');
    const to = await redirected(() => approve(form({ key: `b~${paperId}`, here: '', verdict: 'approved', paperAt: paper.at })));
    expect(to).toBe('/b/inbox?m=paper%3Aconflict%2Ffind%2Fintent%2Feditor');
    expect(writes).toEqual([]);
  });
  it('an answer to a paper that changed is turned back to it, with the new words, and nothing is written', async () => {
    const here = '/b/f/conflict/find/why';
    const to = await redirected(() => answer(form({ book: 'b', paper: paperId, here, verdict: 'approved', paperAt: '2026-11-18T00:00:00.000Z' })));
    expect(to).toBe(`${here}?changed=1`);
    expect(writes).toEqual([]);
  });
  it('an answer to the version on screen is recorded, naming that version', async () => {
    await redirected(() => answer(form({ book: 'b', paper: paperId, here: '/b/f/conflict/find/why', verdict: 'approved', paperAt: paper.at })));
    expect(writes).toMatchObject([{ kind: 'approval', by: 'editor', body: { paper: paperId, verdict: 'approved', paperAt: paper.at } }]);
  });
});

describe('the gate', () => {
  const req = (headers: Record<string, string>) => new Request('http://127.0.0.1:3300/api/pickup?book=b', { headers: { host: '127.0.0.1:3300', ...headers } });
  it("refuses another site's GET", async () => {
    const answer = await gate(req({ origin: 'http://evil.example' }));
    expect(answer instanceof Response && answer.status).toBe(403);
  });
  it('refuses a key that is not a repository’s', async () => {
    const answer = await gate(req({ authorization: 'Bearer agent-key' }));
    expect(answer instanceof Response && answer.status).toBe(403);
  });
});

describe('returning to the page a form was sent from', () => {
  const from = async (referer: string | undefined) => {
    sent.set('host', '127.0.0.1:3300');
    if (referer) sent.set('referer', referer);
    return redirected(() => setTheme(form({ theme: 'dark' })));
  };
  it('goes back to the same page on this site, query kept', async () => {
    expect(await from('http://127.0.0.1:3300/b/inbox?m=ask:1')).toBe('/b/inbox?m=ask:1');
    expect(jar.get('book_theme')).toBe('dark');
  });
  it('never to another site, and home when it cannot tell', async () => {
    expect(await from('https://evil.example/b/inbox')).toBe('/');
    expect(await from('http://127.0.0.1:3300//evil.example')).toBe('/');
    expect(await from(undefined)).toBe('/');
  });
});


describe('the editor\u2019s marks on a study book', () => {
  const work = 'work:l/s0';
  const here = '/b/f/l/s0';
  const step = (state: string) => ({ id: work, kind: 'work', by: 'agent:a', replaces: null, at: paper.at, firstAt: paper.at, body: { feature: 'feature:l', title: 'S', state, pointers: [{ key: 'one', act: 'do', title: 'One' }] } }) as unknown as Latest;
  const fields = { book: 'b', here, work, pointer: 'one', done: 'yes', have: 'yes' };
  const study = () => {
    book = new Map([
      ['project', { id: 'project', kind: 'project', body: { title: 'T', kind: 'study' } } as unknown as Latest],
      ['feature:l', { id: 'feature:l', kind: 'feature', firstAt: paper.at, body: { title: 'L', slug: 'l' } } as unknown as Latest],
      [work, step('now')],
    ]);
  };
  beforeEach(study);

  it.each([['tick', tick], ['I have it', haveIt]])('%s: not signed in goes to sign-in and back, writing nothing', async (_name, act) => {
    jar.delete('book_editor');
    expect(await redirected(() => act(form(fields)))).toBe(`/signin?back=${encodeURIComponent(here)}`);
    expect(writes).toEqual([]);
  });
  it.each([['tick', tick], ['I have it', haveIt]])('%s: reading an earlier day writes nothing', async (_name, act) => {
    jar.set('book_asof', '2026-11-01');
    expect(await redirected(() => act(form(fields)))).toBe(here);
    expect(writes).toEqual([]);
  });
  it.each([['tick', tick], ['I have it', haveIt]])('%s: a bad book name goes home, writing nothing', async (_name, act) => {
    expect(await redirected(() => act(form({ ...fields, book: '../x' })))).toBe('/');
    expect(writes).toEqual([]);
  });
  it('a redirect never leaves this site', async () => {
    jar.delete('book_editor');
    expect(await redirected(() => tick(form({ ...fields, here: 'https://evil.example/' })))).toBe('/signin?back=%2Fb');
  });
  it('a product-only page sends a study book home, and leaves a product book alone', async () => {
    const { productOnly } = await import('../lib/server/product-only');
    expect(await redirected(async () => productOnly(book, 'b'))).toBe('/b');
    expect(await redirected(async () => productOnly(new Map([['project', { body: {} } as unknown as Latest]]), 'b'))).toBeNull();
  });
  it('signed in, a tick is written by the editor', async () => {
    expect(await redirected(() => tick(form(fields)))).toBe(`${here}#one`);
    expect(writes).toMatchObject([{ id: 'tick:l/s0/one', by: 'editor', body: { work, pointer: 'one', done: true } }]);
  });
  it('a pointer removed since the page was drawn writes nothing and says so', async () => {
    expect(await redirected(() => tick(form({ ...fields, pointer: 'gone' })))).toBe(`${here}?changed=1`);
    expect(writes).toEqual([]);
  });
});
