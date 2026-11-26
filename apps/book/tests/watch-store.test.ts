// The production watch's result, through the real route and store, on a throwaway database.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { throwawayDatabase } from './helpers/db';

let db: Awaited<ReturnType<typeof throwawayDatabase>>;
let store: typeof import('../lib/store/records');
let writer: typeof import('../lib/write');
let route: typeof import('../app/api/watches/route');
let key = '';
let otherKey = '';
const by = 'agent:claude';
const release = (id: string, part: string, deployedAt: string, repo = 'example-app', where = 'production') =>
  writer.write('w', { id, kind: 'release', by, replaces: null, body: { part, where, sha: 'abcdef1', repo, by, undo: 'x', deployedAt, confirmed: true } });
const send = (body: object, bearer = key) => route.POST(new Request('http://127.0.0.1:3300/api/watches', { method: 'POST', headers: { host: '127.0.0.1:3300', 'content-type': 'application/json', authorization: `Bearer ${bearer}` }, body: JSON.stringify({ book: 'w', where: 'production', ...body }) }));
const watchOf = async (release: string) => (await store.readCurrent('w')).find((r) => r.id === `watch:${release}`);

beforeAll(async () => {
  db = await throwawayDatabase('book_watches');
  store = await import('../lib/store/records');
  writer = await import('../lib/write');
  route = await import('../app/api/watches/route');
  const keys = await import('../lib/server/keys');
  key = await keys.issueKey('repo:example-app', ['w'], false);
  otherKey = await keys.issueKey('repo:example-tools', ['w'], false);
  await writer.write('w', { id: 'project', kind: 'project', by, replaces: null, body: { title: 'W', forWriter: 'x' } });
  await release('release:old', 'Worker (API)', '2026-11-20T10:00:00Z');
  await release('release:new', 'Worker (API)', '2026-11-24T10:00:00+05:30');
  await release('release:staging', 'Worker (API)', '2026-11-25T10:00:00Z', 'example-app', 'staging');
}, 60_000);
afterAll(async () => db?.drop());

describe('the production watch reports to the book', () => {
  it("attaches the result to the part's latest release", async () => {
    expect((await send({ part: 'Worker (API)', result: 'pass' })).status).toBe(200);
    expect((await watchOf('release:new'))?.body).toEqual({ release: 'release:new', result: 'pass' });
    expect(await watchOf('release:old')).toBeUndefined();
    expect(await watchOf('release:staging')).toBeUndefined();
  });

  it('writes nothing new while the result is unchanged, and the latest result when it changes', async () => {
    const before = (await watchOf('release:new'))?.at;
    expect(await (await send({ part: 'Worker (API)', result: 'pass' })).json()).toEqual({ recorded: null });
    expect((await watchOf('release:new'))?.at).toBe(before);
    await send({ part: 'Worker (API)', result: 'fail' });
    expect((await watchOf('release:new'))?.body.result).toBe('fail');
  });

  it("refuses a part with no release from this repository, and another repository's release", async () => {
    expect((await send({ part: 'Website', result: 'pass' })).status).toBe(422);
    expect((await send({ part: 'Worker (API)', result: 'pass' }, otherKey)).status).toBe(422);
  });

  it('refuses a result that is not pass or fail', async () => {
    expect((await send({ part: 'Worker (API)', result: 'slow' })).status).toBe(400);
  });
});
