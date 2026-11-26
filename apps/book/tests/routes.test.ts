// Every address lives under one book, built in lib/routes.ts; every earlier address still reaches its page; and the
// addresses repositories, scripts and agents call keep answering as before. The live checks run only when GALLEY_LIVE
// names a real work in your running Galley as <book>/<feature>/<work>, with the book's repository key in
// ~/.config/galley/<book>.token and a read-only agent key in ~/.config/galley/agents/contract-test.token.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { galleyHome } from '../bin/galley-config.mjs';
import { href } from '../lib/routes';

const BASE = process.env.BOOK_URL ?? 'http://127.0.0.1:3300';
const [BOOK = 'b', FEATURE = 'f', WORK = 'w'] = (process.env.GALLEY_LIVE ?? '').split('/');
const up = Boolean(process.env.GALLEY_LIVE) && (await fetch(`${BASE}/`, { redirect: 'manual' }).then(() => true).catch(() => false));
/** The book's repository key, as its scripts send it (pnpm key issue repo:<book>). */
const keyFile = join(galleyHome(), `${BOOK}.token`);
const KEY: Record<string, string> = existsSync(keyFile) ? { Authorization: `Bearer ${readFileSync(keyFile, 'utf8').trim()}` } : {};

describe('addresses', () => {
  it('builds every address under its book, features under /f/', () => {
    expect(href.inbox('b')).toBe('/b/inbox');
    expect(href.inMotion('b')).toBe('/b/in-motion');
    expect(href.message('b', 'paper:x/y/intent/editor')).toBe('/b/inbox?m=paper%3Ax%2Fy%2Fintent%2Feditor');
    expect(href.work('b', 'work:x/y')).toBe('/b/f/x/y');
    expect(href.paper('b', 'work:x/y', 'spec')).toBe('/b/f/x/y/what-you-get');
    expect(href.production('b', 'risks')).toBe('/b/production#risks');
    expect(href.agents('b')).toBe('/b/agents');
    expect(href.agents('b', 'lessons')).toBe('/b/agents/lessons');
    expect(href.decision('b', 'decision:abc')).toBe('/b/decision/abc');
    expect(href.featurePaper('b', 'feature:x', 'intent')).toBe('/b/paper/x/why');
    expect(href.paperOf('b', { feature: 'feature:x', kind: 'spec' })).toBe('/b/paper/x/what-you-get');
    expect(href.paperOf('b', { work: 'work:x/y', kind: 'plan' })).toBe('/b/f/x/y/how-it-gets-built');
  });
});

describe.skipIf(!up)('earlier addresses still reach their page', () => {
  const moved = async (from: string) => {
    const res = await fetch(`${BASE}${from}`, { redirect: 'manual' });
    return { status: res.status, to: (res.headers.get('location') ?? '').replace(BASE, '') };
  };
  it.each([
    [`/inbox?m=${BOOK}~ask:1`, `/${BOOK}/inbox?m=ask%3A1`],
    [`/inbox?b=${BOOK}`, `/${BOOK}/inbox`],
    ['/inbox', '/'],
    ['/inbox?b=..%2Fevil', '/'],
    [`/${BOOK}/pickup`, `/${BOOK}#where-we-stand`],
    [`/${BOOK}/live`, `/${BOOK}/production#live`],
    [`/${BOOK}/risks`, `/${BOOK}/production#risks`],
    [`/${BOOK}/pulse`, `/${BOOK}/production#pulse`],
    [`/${BOOK}/proof`, `/${BOOK}/agents/proof`],
    [`/${BOOK}/lessons`, `/${BOOK}/agents/lessons`],
    [`/${BOOK}/may`, `/${BOOK}/agents/permissions`],
    [`/${BOOK}/goals`, `/${BOOK}/agents/goals`],
    [`/${BOOK}/explain?f=conflict`, `/${BOOK}/agents/explain?f=conflict`],
    [`/${BOOK}/${FEATURE}`, `/${BOOK}/f/${FEATURE}`],
    [`/${BOOK}/${FEATURE}/${WORK}/why`, `/${BOOK}/f/${FEATURE}/${WORK}/why`],
  ])('%s → %s', async (from, to) => {
    const r = await moved(from);
    expect(r.status).toBe(308);
    expect(r.to).toBe(to);
  });

  it('an encoded feature address is passed on as it is, never encoded twice', async () => {
    const r = await moved(`/${BOOK}/${FEATURE}/${WORK}/x%3Fy`);
    expect(r).toEqual({ status: 308, to: `/${BOOK}/f/${FEATURE}/${WORK}/x%3Fy` });
  });

  it('the explicit first tab of the agents goes to the agents', async () => {
    expect(await moved(`/${BOOK}/agents/quality`)).toEqual({ status: 308, to: `/${BOOK}/agents` });
  });

  it.each([
    '/no-such-book', '/no-such-book/inbox', '/no-such-book/live', `/${BOOK}/no-such-feature`, `/${BOOK}/inbox/x`, `/${BOOK}/diary/x`,
    `/${BOOK}/f`, `/${BOOK}/agents/nope`, `/${BOOK}/agents/lessons/x`, `/${BOOK}/inbox?m=no-such-message`, '/%2F%2Fevil.com/x',
  ])('%s is not found, and goes nowhere else', async (path) => {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    expect(res.status).toBe(404);
  });

  it.each([`/${BOOK}`, `/${BOOK}/inbox`, `/${BOOK}/diary`, `/${BOOK}/production`, `/${BOOK}/agents`, `/${BOOK}/f/${FEATURE}/${WORK}`, `/${BOOK}/f/${FEATURE}/${WORK}/why`])(
    '%s opens', async (path) => {
      expect((await fetch(`${BASE}${path}`)).status).toBe(200);
    },
  );
});

// Needs the running book and the keys its callers hold; skipped, not failed, on a machine without them.
describe.skipIf(!up || !('Authorization' in KEY))('the addresses repositories, scripts and agents call keep their contract', () => {
  it('/api/works/<book>/<id> tells where a work stands, with paper texts on ?text=1', async () => {
    const res = await fetch(`${BASE}/api/works/${BOOK}/${encodeURIComponent(`work:${FEATURE}/${WORK}`)}?text=1`, { headers: KEY });
    const body = await res.json();
    expect(body).toMatchObject({ exists: true, papers: { intent: expect.any(String), spec: expect.any(String), plan: expect.any(String) } });
    expect(typeof body.texts.intent).toBe('string');
    expect((await fetch(`${BASE}/api/works/${BOOK}/work%3Anone%2Fnone`, { headers: KEY })).status).toBe(404);
    expect((await fetch(`${BASE}/api/works/${BOOK}/work%3Anone%2Fnone`)).status).toBe(401);
  });

  it('/api/pickup answers the pick-up for a book', async () => {
    const body = await (await fetch(`${BASE}/api/pickup?book=${BOOK}`, { headers: KEY })).json();
    expect(body).toMatchObject({ first: expect.any(String), disagreements: expect.any(Array), waitingOnYou: expect.any(Number) });
  });

  it.each(['commits', 'checkouts', 'history'])('/api/%s still takes a POST and refuses a bad one without writing', async (route) => {
    const res = await fetch(`${BASE}/api/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...KEY }, body: JSON.stringify({ book: 'no-such-book' }) });
    expect([400, 401, 403, 422]).toContain(res.status);
  });

  it('/api/mcp still offers every tool agents use', async () => {
    // A read-only agent key kept for this test (pnpm key issue agent:contract-test --read-only, written to this file).
    const token = readFileSync(join(galleyHome(), 'agents', 'contract-test.token'), 'utf8').trim();
    const res = await fetch(`${BASE}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    const text = await res.text();
    const json = JSON.parse(text.includes('data:') ? text.slice(text.indexOf('data:') + 5) : text);
    const names: string[] = json.result.tools.map((t: { name: string }) => t.name);
    for (const tool of ['book_guide', 'book_contents', 'book_neighbourhood', 'book_read', 'book_pickup', 'book_ask', 'book_answers', 'book_add_work', 'book_update_work', 'book_write_paper', 'book_decide', 'book_note', 'book_write_diary', 'book_release', 'book_prove', 'book_live', 'book_brief']) {
      expect(names, tool).toContain(tool);
    }
  });
});
