// The security rules of slice 4, each on its own: the gate, the write rules, approvals, links, days and errors.
import { describe, expect, it } from 'vitest';
import { addDays, dayOf, endOfDay } from '../lib/book/days';
import { linkTarget, safeBack } from '../lib/book/links';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current, paperState } from '../lib/book/views';
import { as, starting } from '../lib/mcp/run';
import { isBookName } from '../lib/routes';
import { refusals } from '../lib/rules/check';
import { reasonsOf } from '../lib/server/errors';
import { gate } from '../lib/server/local-route';
import { clearAttempts, noteWrong, restingFor } from '../lib/server/passcode-limit';
import { Refused, write } from '../lib/write';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 19, 12, 0, tick++)).toISOString();
const rec = (r: Omit<BookRecord, 'book' | 'at' | 'replaces'>): BookRecord => ({ book: 'b', at: at(), replaces: null, ...r });
const agent = 'agent:claude';
const work = ids.work('conflict', 'find');
const intent = ids.paper(work, 'intent', 'editor');
const base = [
  rec({ id: 'project', kind: 'project', by: agent, body: { title: 'P', forWriter: 'x' } }),
  rec({ id: 'feature:conflict', kind: 'feature', by: agent, body: { title: 'Conflict', slug: 'conflict', forWriter: 'x' } }),
  rec({ id: work, kind: 'work', by: agent, body: { feature: 'feature:conflict', title: 'Find', slug: 'find', on: '2026-11-18', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-18' } } }),
  rec({ id: intent, kind: 'paper', by: agent, body: { work, kind: 'intent', for: 'editor', text: 'why' } }),
];
const propose = (kind: BookRecord['kind'], id: string, body: object, by = agent, replaces: string | null = null) => ({ id, kind, by, replaces, body: body as Record<string, unknown> });
const req = (headers: Record<string, string>, method = 'GET') => new Request('http://127.0.0.1:3300/api/commits', { method, headers });

describe('the gate for repository routes', () => {
  it('refuses a forged Host header', async () => {
    const answer = await gate(req({ host: 'evil.example' }));
    expect(answer instanceof Response && answer.status).toBe(403);
  });
  it('refuses a cross-origin text/plain POST, and any call another site makes from a browser', async () => {
    const plain = await gate(req({ host: '127.0.0.1:3300', origin: 'http://evil.example', 'content-type': 'text/plain' }, 'POST'));
    expect(plain instanceof Response && plain.status).toBe(403);
    const site = await gate(req({ host: '127.0.0.1:3300', 'sec-fetch-site': 'cross-site' }));
    expect(site instanceof Response && site.status).toBe(403);
  });
  it('refuses a write that is not JSON', async () => {
    const answer = await gate(req({ host: '127.0.0.1:3300', 'content-type': 'text/plain' }, 'POST'));
    expect(answer instanceof Response && answer.status).toBe(415);
  });
  it('refuses a call that brings no key', async () => {
    const answer = await gate(req({ host: '127.0.0.1:3300' }));
    expect(answer instanceof Response && answer.status).toBe(401);
  });
});

describe('the write rules', () => {
  it('refuses an id of the wrong kind', () => {
    expect(refusals(current(base), propose('finding', 'decision:1', { work, text: 't' })).join()).toMatch(/A finding's id is "finding:…"/);
    expect(refusals(current(base), propose('finding', 'finding:1', { work, text: 't' }))).toEqual([]);
  });
  it('allows same-kind replacement, and a question closed by a finding or turned into an ask; nothing else', () => {
    const q = rec({ id: 'question:1', kind: 'question', by: agent, body: { work, text: 'open?' } });
    const now = current([...base, q]);
    expect(refusals(now, propose('finding', 'finding:3', { work, text: 't' }, agent, work)).join()).toMatch(/A finding cannot replace a work/);
    expect(refusals(now, propose('finding', 'finding:2', { work, text: 't' }, agent, 'question:1'))).toEqual([]);
    expect(refusals(now, propose('question', 'question:2', { work, text: 't' }, agent, 'question:1'))).toEqual([]);
  });
  it("keeps a book's own record in its own shape; starting a book twice is refused by the write queue (store.test.ts)", () => {
    expect(refusals(current(base), propose('project', 'project', { title: 'New name', forWriter: 'x' }))).toEqual([]);
    expect(refusals(current(base), propose('project', 'project', { title: 'New name', forWriter: 'x', owner: 'me' }))).not.toEqual([]);
    expect(refusals(current([]), propose('project', 'project', { title: 'New', forWriter: 'x' }))).toEqual([]);
  });
  it('refuses a bad book name, and the names of pages', async () => {
    for (const name of ['Bad', '../x', 'a b', 'inbox', 'api', 'signin', 'f', '-x']) expect(isBookName(name)).toBe(false);
    expect(isBookName('example-app')).toBe(true);
    await expect(write('Bad Name', propose('project', 'project', { title: 'x', forWriter: 'y' }))).rejects.toBeInstanceOf(Refused);
  });
  it('refuses an agent link that is not a book path or an http(s) address', () => {
    const ask = (href: string) => propose('ask', 'ask:1', { work, to: 'editor', needs: 'fyi', subject: 's', text: 't', links: [{ label: 'l', href }] });
    expect(refusals(current(base), ask('javascript:alert(1)')).join()).toMatch(/a link is a path in the book/);
    expect(refusals(current(base), ask('https://example.com/x'))).toEqual([]);
    expect(refusals(current(base), propose('proof', 'proof:1', { work, title: 't', kind: 'link', evidence: '/b/inbox' })).join()).toMatch(/http\(s\) address/);
  });
});

describe('an answer names the version read', () => {
  const paper = base[3];
  const answer = (paperAt?: string) => propose('approval', 'approval:x', { paper: intent, verdict: 'approved', ...(paperAt ? { paperAt } : {}) }, 'editor');
  it('refuses a stale approval and one that names no version', () => {
    expect(refusals(current(base), answer('2026-01-01T00:00:00.000Z')).join()).toMatch(/changed after you opened it/);
    expect(refusals(current(base), answer()).join()).toMatch(/names the version/);
    expect(refusals(current(base), answer(paper.at))).toEqual([]);
  });
  it('counts an answer for the version it read, and an old answer by the rule it was given under', () => {
    const named = rec({ id: 'approval:1', kind: 'approval', by: 'editor', body: { paper: intent, verdict: 'approved', paperAt: paper.at } });
    expect(paperState(current([...base, named]), intent).status).toBe('approved');
    const legacy = rec({ id: 'approval:2', kind: 'approval', by: 'editor', body: { paper: intent, verdict: 'approved' } });
    expect(paperState(current([...base, legacy]), intent).status).toBe('approved');
    const revised = rec({ id: intent, kind: 'paper', by: agent, body: { work, kind: 'intent', for: 'editor', text: 'new words' } });
    expect(paperState(current([...base, named, revised]), intent).status).toBe('waiting');
  });
});

describe('agent keys', () => {
  const extra = (books: string[], mayStart = false) => ({ authInfo: { clientId: 'claude', extra: { books, mayStart } } });
  it("refuses a write outside the key's books", () => {
    expect(as(extra(['a']), 'a')).toBe('agent:claude');
    expect(() => as(extra(['a']), 'b')).toThrow(/not for the "b" book/);
  });
  it('lets only a key allowed to start books start one, under a valid name', () => {
    expect(() => starting(extra(['a']), 'new-book')).toThrow(/may not start a book/);
    expect(() => starting(extra(['a'], true), 'inbox')).toThrow(/not a book name/);
    expect(starting(extra(['a'], true), 'new-book')).toBe('agent:claude');
  });
});

describe('links and redirects', () => {
  it('safeBack keeps paths on this site and nothing else', () => {
    for (const bad of ['/\\evil.example', '//evil.example', 'https://evil.example', 'javascript:x', '/x\ny', '']) expect(safeBack(bad, '/home')).toBe('/home');
    expect(safeBack('/example-app/inbox?m=ask:1')).toBe('/example-app/inbox?m=ask:1');
  });
  it('an outside link carries its domain; credentials in a link make it no link', () => {
    expect(linkTarget('https://vercel.com/x')).toEqual({ inside: false, to: 'https://vercel.com/x', domain: 'vercel.com' });
    expect(linkTarget('https://user:pw@evil.example')).toBeNull();
  });
});

describe('sign-in and errors', () => {
  it('rests after five wrong passcodes', () => {
    clearAttempts();
    for (let i = 0; i < 4; i++) noteWrong();
    expect(restingFor()).toBe(0);
    noteWrong();
    expect(restingFor()).toBeGreaterThan(0);
    clearAttempts();
  });
  it('tells a caller only a refusal or an error id, never the internals', () => {
    expect(reasonsOf(new Refused(['No.']))).toEqual(['No.']);
    const quiet = reasonsOf(new Error('Code: 60. DB::Exception: SELECT * FROM records'));
    expect(quiet.join()).not.toMatch(/SELECT|DB::/);
    expect(quiet.join()).toMatch(/error [0-9a-f]{8}/);
  });
});

describe("the book's days are the editor's days", () => {
  it('turns over at midnight in the time zone of the settings (Asia/Kolkata in the tests)', () => {
    expect(dayOf('2026-11-19T18:29:59.999Z')).toBe('2026-11-19');
    expect(dayOf('2026-11-19T18:30:00.000Z')).toBe('2026-11-20');
    expect(endOfDay('2026-11-19')).toBe('2026-11-19T18:29:59.999Z');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
