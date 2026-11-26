// A repository's review receipt and a reviewer's "goes beyond", through the real routes and store.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { throwawayDatabase } from './helpers/db';

let db: Awaited<ReturnType<typeof throwawayDatabase>>;
let store: typeof import('../lib/store/records');
let receipts: typeof import('../app/api/receipts/route');
let beyond: typeof import('../app/api/beyond/route');
let list: typeof import('../app/api/works/[book]/route');
let key = '';
const WORK = 'work:scene/draft';
const SHA = 'abcdef1';
const post = (route: { POST: (r: Request) => Promise<Response> }, path: string, body: object) =>
  route.POST(new Request(`http://127.0.0.1:3300/api/${path}`, { method: 'POST', headers: { host: '127.0.0.1:3300', 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ book: 'g', ...body }) }));
const records = async (kind: string) => (await store.readCurrent('g')).filter((r) => r.kind === kind);

beforeAll(async () => {
  db = await throwawayDatabase('book_gates');
  store = await import('../lib/store/records');
  const writer = await import('../lib/write');
  receipts = await import('../app/api/receipts/route');
  beyond = await import('../app/api/beyond/route');
  list = await import('../app/api/works/[book]/route');
  key = await (await import('../lib/server/keys')).issueKey('repo:example-app', ['g'], false);
  const by = 'agent:claude';
  await writer.write('g', { id: 'project', kind: 'project', by, replaces: null, body: { title: 'G', forWriter: 'x' } });
  await writer.write('g', { id: 'feature:scene', kind: 'feature', by, replaces: null, body: { title: 'Scene', slug: 'scene', forWriter: 'x' } });
  await writer.write('g', { id: WORK, kind: 'work', by, replaces: null, body: { feature: 'feature:scene', title: 'Draft', slug: 'draft', on: '2026-11-25', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-25' } } });
  await writer.write('g', { id: `commit:example-app:${SHA}`, kind: 'commit', by: 'repo', replaces: null, body: { work: WORK, repo: 'example-app', sha: SHA, subject: 's', committedAt: '2026-11-25T10:00:00Z' } });
}, 60_000);
afterAll(async () => db?.drop());

const receipt = (more: object = {}) => ({
  work: WORK, range: { base: '1234567', head: SHA }, verdict: 'pass',
  commits: [{ sha: SHA, subject: 's', patchId: 'p', work: WORK }],
  papers: [{ work: `g:${WORK}`, title: 'Draft', spec: 'approved', plan: 'approved', effective: { spec: { status: 'approved', source: 'own', version: '2026-11-25T09:00:00.000Z' }, plan: { status: 'waiting', source: 'feature', version: null } } }],
  ...more,
});

describe('receipts and beyond from a repository', () => {
  it('records a receipt under the repository its key names, with what the rule decided then', async () => {
    const answer = await (await post(receipts, 'receipts', { ...receipt(), repo: 'someone-else' })).json();
    expect(answer.recorded).toMatch(new RegExp(`^receipt:example-app:scene/draft:${SHA}:`));
    const [r] = await records('receipt');
    expect(r.body.repo).toBe('example-app');
    expect((r.body.papers as { effective: object }[])[0].effective).toMatchObject({ plan: { source: 'feature' } });
  });

  it('refuses a receipt covering a commit not recorded on that work', async () => {
    const res = await post(receipts, 'receipts', receipt({ commits: [{ sha: 'fedcba9', subject: 's', patchId: 'p', work: WORK }] }));
    expect(res.status).toBe(422);
  });

  it("records a reviewer's beyond as the repository's", async () => {
    expect((await post(beyond, 'beyond', { work: WORK, text: 'It changes how a scene is chosen.' })).status).toBe(200);
    const [b] = await records('beyond');
    expect(b).toMatchObject({ by: 'repo', body: { work: WORK, raisedBy: 'reviewer' } });
  });

  it('refuses a receipt that covers no commit of this repository on the work, or none of its papers', async () => {
    expect((await post(receipts, 'receipts', receipt({ commits: [] }))).status).toBe(422);
    expect((await post(receipts, 'receipts', receipt({ papers: [] }))).status).toBe(422);
  });

  it("refuses a beyond from a repository with no commit on that work", async () => {
    const other = await (await import('../lib/server/keys')).issueKey('repo:example-tools', ['g'], false);
    const res = await beyond.POST(new Request('http://127.0.0.1:3300/api/beyond', { method: 'POST', headers: { host: '127.0.0.1:3300', 'content-type': 'application/json', authorization: `Bearer ${other}` }, body: JSON.stringify({ book: 'g', work: WORK, text: 'x' }) }));
    expect(res.status).toBe(422);
  });

  it("refuses a commit recorded under another repository's name", async () => {
    const commits = await import('../app/api/commits/route');
    const res = await commits.POST(new Request('http://127.0.0.1:3300/api/commits', { method: 'POST', headers: { host: '127.0.0.1:3300', 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ book: 'g', work: WORK, repo: 'example-tools', sha: 'feedfac', subject: 's', committedAt: '2026-11-25T10:00:00Z' }) }));
    expect(res.status).toBe(403);
  });

  it("refuses history or a checkout written under another repository's name", async () => {
    const send = (route: { POST: (r: Request) => Promise<Response> }, path: string, body: object) =>
      route.POST(new Request(`http://127.0.0.1:3300/api/${path}`, { method: 'POST', headers: { host: '127.0.0.1:3300', 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ book: 'g', ...body }) }));
    const history = await import('../app/api/history/route');
    const checkouts = await import('../app/api/checkouts/route');
    expect((await send(history, 'history', { repo: 'example-tools', days: [{ day: '2026-11-25', commits: 1 }] })).status).toBe(403);
    expect((await send(checkouts, 'checkouts', { repo: 'example-tools', checkedAt: '2026-11-25T10:00:00Z', branch: 'main', head: { sha: 'abcdef1', subject: 's' }, unpushed: [], uncommitted: [], live: [] })).status).toBe(403);
    expect((await records('history')).length + (await records('checkout')).length).toBe(0);
  });

  it('refuses a beyond on work that does not exist', async () => {
    expect((await post(beyond, 'beyond', { work: 'work:scene/none', text: 'x' })).status).toBe(422);
  });
});

describe('every piece of work, as the gates see it', () => {
  it('lists each work with its old states, the new decision and the done gaps', async () => {
    const res = await list.GET(new Request('http://127.0.0.1:3300/api/works/g', { headers: { host: '127.0.0.1:3300', authorization: `Bearer ${key}` } }), { params: Promise.resolve({ book: 'g' }) });
    const { works } = await res.json();
    expect(works).toHaveLength(1);
    expect(works[0]).toMatchObject({ id: WORK, papers: { spec: 'missing' }, effective: { spec: { source: 'none' } }, done: { gaps: [], noPromises: true } });
  });
});
