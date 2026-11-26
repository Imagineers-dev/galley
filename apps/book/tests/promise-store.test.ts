// Promises through the real store, write queue, MCP tools and runner route, on a throwaway database.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { throwawayDatabase } from './helpers/db';

let db: Awaited<ReturnType<typeof throwawayDatabase>>;
let store: typeof import('../lib/store/records');
let writer: typeof import('../lib/write');
let answers: typeof import('../lib/server/answers');
let views: typeof import('../lib/book/views');
let status: typeof import('../lib/book/promise-status');
let attention: typeof import('../lib/book/attention');
let route: typeof import('../app/api/runs/route');
let keys: typeof import('../lib/server/keys');
type Handler = (args: Record<string, unknown>, extra: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>;
const tools = new Map<string, Handler>();
const fake = { registerTool: (name: string, _: unknown, fn: Handler) => tools.set(name, fn) };
const as = (who: string) => ({ authInfo: { clientId: who, extra: { books: ['p'] } } });
const call = async (name: string, args: object, who = 'claude') => {
  const out = await tools.get(name)!({ book: 'p', ...args }, as(who));
  if (out.isError) throw new Error(out.content[0].text);
  return JSON.parse(out.content[0].text);
};
const now = async () => views.currentOf(await store.readCurrent('p'));
const stateOf = async (id: string) => status.promiseStatus(await now(), id).state;
const WORK = 'work:scene/draft';
const SHA = 'abcdef12';
const AT = '2026-11-23T12:00:00+05:30';
let key = '';
const send = (body: object) => route.POST(new Request('http://127.0.0.1:3300/api/runs', { method: 'POST', headers: { host: '127.0.0.1:3300', 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body) }));
const post = async (body: { test: string; [field: string]: unknown }) => {
  const held = (await now()).get(body.test)!;
  return send({ testAt: held.at, argv: (held.body.command as { argv: string[] }).argv, ...body });
};

beforeAll(async () => {
  db = await throwawayDatabase('book_promises');
  store = await import('../lib/store/records');
  writer = await import('../lib/write');
  answers = await import('../lib/server/answers');
  views = await import('../lib/book/views');
  status = await import('../lib/book/promise-status');
  attention = await import('../lib/book/attention');
  route = await import('../app/api/runs/route');
  keys = await import('../lib/server/keys');
  const { registerPromiseTools } = await import('../lib/mcp/promise-tools');
  const { registerWriteTools } = await import('../lib/mcp/write-tools');
  const { registerTestTools } = await import('../lib/mcp/test-tools');
  const { registerInboxTools } = await import('../lib/mcp/inbox-tools');
  for (const register of [registerPromiseTools, registerWriteTools, registerTestTools, registerInboxTools]) register(fake as never);
  key = await keys.issueKey('repo:example-tools', ['p'], false);
  const by = 'agent:claude';
  await writer.write('p', { id: 'project', kind: 'project', by, replaces: null, body: { title: 'P', forWriter: 'x' } });
  await writer.write('p', { id: 'feature:scene', kind: 'feature', by, replaces: null, body: { title: 'Scene', slug: 'scene', forWriter: 'x' } });
  await writer.write('p', { id: WORK, kind: 'work', by, replaces: null, body: { feature: 'feature:scene', title: 'Draft', slug: 'draft', on: '2026-11-23', state: 'next', summary: 's', origin: { words: 'w', saidOn: '2026-11-23' } } });
  await writer.write('p', { id: `beyond:${crypto.randomUUID()}`, kind: 'beyond', by, replaces: null, body: { work: WORK, raisedBy: 'author', text: 'It has its own What.' } });
  await writer.write('p', { id: 'paper:scene/draft/spec/editor', kind: 'paper', by, replaces: null, body: { work: WORK, kind: 'spec', for: 'editor', text: 'The line.' } });
}, 60_000);
afterAll(async () => db?.drop());

describe('a promise, from proposal to proof', () => {
  let promise = '';
  let test = '';

  it('reaches the editor as one message per feature', async () => {
    promise = (await call('book_propose_promise', { feature: 'feature:scene', text: 'Only your choice stops a draft.' })).id;
    await call('book_propose_promise', { feature: 'feature:scene', text: 'A draft keeps what you said.' });
    const waiting = attention.attentionOf('p', await now(), 'editor', '2026-11-23').messages.filter((m) => m.subject.includes('promises for'));
    expect(waiting).toHaveLength(1);
    expect(waiting[0].subject).toContain('2 promises');
    expect(waiting[0].answerOn?.href).toBe('/p/promises/scene');
  });

  it('an agent has no tool that approves', () => {
    expect([...tools.keys()].filter((t) => /approve/.test(t))).toEqual([]);
  });

  it('Approve all refuses a version no longer on screen and writes nothing', async () => {
    const seen = (await now()).get(promise)!.at;
    await call('book_propose_promise', { feature: 'feature:scene', promise, text: 'Only a choice of yours stops a draft.' });
    await expect(answers.answerPromises('p', { feature: 'feature:scene', items: [{ promise, at: seen }], verdict: 'approved', all: true })).rejects.toBeInstanceOf(answers.PromisesChanged);
    expect(await stateOf(promise)).toBe('not-proven');
  });

  it('shows the words a never-answered rewording had before', async () => {
    const { withEarlierWords } = await import('../lib/server/promise-history');
    const { promisesOf } = await import('../lib/book/promises');
    const [shown] = await withEarlierWords('p', promisesOf(await now(), 'feature:scene')!.reworded);
    expect(shown.was?.text).toBe('Only your choice stops a draft.');
  });

  it('Approve all takes the versions on screen', async () => {
    const list = [...(await now()).values()].filter((r) => r.kind === 'promise').map((r) => ({ promise: r.id, at: r.at }));
    await expect(answers.answerPromises('p', { feature: 'feature:scene', items: list, verdict: 'approved', all: true })).rejects.toThrow(/reworded/);
    await answers.answerPromises('p', { feature: 'feature:scene', items: list.filter((i) => i.promise !== promise), verdict: 'approved', all: true });
    await answers.answerPromises('p', { feature: 'feature:scene', items: list.filter((i) => i.promise === promise), verdict: 'approved' });
    expect(status.promiseStatus(await now(), promise).waiting).toBe(false);
  });

  it('Approve all does not cover a rewording, but its own answer does', async () => {
    await call('book_propose_promise', { feature: 'feature:scene', promise, text: 'Only your own choice stops a draft.' });
    const at = (await now()).get(promise)!.at;
    await expect(answers.answerPromises('p', { feature: 'feature:scene', items: [{ promise, at }], verdict: 'approved', all: true })).rejects.toThrow(/reworded/);
    await answers.answerPromises('p', { feature: 'feature:scene', items: [{ promise, at }], verdict: 'approved' });
    expect(status.promiseStatus(await now(), promise).waiting).toBe(false);
  });

  it('remembers everyone who wrote a version', async () => {
    await call('book_propose_promise', { feature: 'feature:scene', promise, text: 'Only your choice stops it.' }, 'codex');
    expect((await now()).get(promise)!.writers?.sort()).toEqual(['agent:claude', 'agent:codex']);
    const at = (await now()).get(promise)!.at;
    await answers.answerPromises('p', { feature: 'feature:scene', items: [{ promise, at }], verdict: 'approved' });
  });

  it('a test proves it only once a second agent accepts the link', async () => {
    test = (await call('book_add_test', { work: WORK, title: 'It holds', proves: ['spec¶1'], level: 'app', runs: 'pnpm test', command: { repo: 'example-tools', argv: ['pnpm', 'test'], surface: 'app', subject: { real: 'temple' } } })).id;
    const link = (await call('book_link', { from: test, to: promise, kind: 'proves-promise', failsWhen: 'a draft stops by itself' })).id;
    expect((await post({ book: 'p', test, result: 'pass', sha: SHA, committedAt: AT, evidence: 'e' })).status).toBe(200);
    expect(await stateOf(promise)).toBe('not-proven');
    await expect(call('book_accept_link', { link })).rejects.toThrow(/wrote a test/);
    await call('book_accept_link', { link }, 'codex');
  });

  it('the runner\'s pass proves it', async () => {
    await post({ book: 'p', test, result: 'pass', sha: SHA, committedAt: AT, evidence: 'e' });
    expect(await stateOf(promise)).toBe('proven');
  });

  it('a bug makes it Broken; a pass on another story leaves it; a pass on that story clears it', async () => {
    const event = await call('book_add_event', { feature: 'feature:scene', title: 'Draft stopped', on: '2026-11-23', text: 't', breaks: [{ promise, subject: { real: 'temple' } }] });
    expect(event.id).toMatch(/^event:scene\/draft-stopped-[0-9a-f-]{36}$/);
    expect(await stateOf(promise)).toBe('broken');
    const other = await call('book_record_run', { of: test, result: 'pass', stage: 'check', evidence: 'e', sha: SHA, committedAt: AT, surface: 'app', subject: { real: 'another-story' } }, 'gemini');
    await call('book_witness', { run: other.id, evidence: 'I read its log' }, 'codex');
    expect(await stateOf(promise)).toBe('broken');
    await new Promise((done) => setTimeout(done, 5));
    await post({ book: 'p', test, result: 'pass', sha: 'fedcba98', committedAt: new Date().toISOString(), evidence: 'e' }); // the command's own subject: the temple story
    expect(await stateOf(promise)).toBe('proven');
  });

  it('an ask for their try shows the test and promise, with the proof the book filled in', async () => {
    const ask = await call('book_ask', { work: WORK, needs: 'try', subject: 'Is the colour ok?', text: 'Have a look.', about: { act: 'pass', test, promise } });
    expect(ask.body.about).toMatchObject({ surface: 'app', subject: { real: 'temple' }, version: (await now()).get(promise)!.at });
    const message = attention.attentionOf('p', await now(), 'editor', '2026-11-23').messages.find((m) => m.id === ask.id)!;
    expect(message.text).toContain('Only your choice stops it.');
    expect(message.text).toContain('It holds');
  });

  it('the runner route refuses a result for another version of the test or another command', async () => {
    const before = (await now()).get(test)!.at;
    expect((await post({ book: 'p', test, testAt: '2026-01-01T00:00:00.000Z', result: 'pass', sha: SHA, committedAt: AT, evidence: 'e' })).status).toBe(422);
    expect((await post({ book: 'p', test, argv: ['node', 'other.mjs'], result: 'pass', sha: SHA, committedAt: AT, evidence: 'e' })).status).toBe(422);
    expect((await now()).get(test)!.at).toBe(before);
  });

  it('the runner route refuses a key from another repository', async () => {
    const mine = key;
    key = await keys.issueKey('repo:example-app', ['p'], false);
    const res = await post({ book: 'p', test, result: 'pass', sha: SHA, committedAt: AT, evidence: 'e' });
    key = mine;
    expect(res.status).toBe(422);
  });

  it('every event gets its own id, even one with no promise fields and a title seen before', async () => {
    const first = await call('book_add_event', { feature: 'feature:scene', title: 'A plain event', on: '2026-11-23', text: 't' });
    const again = await call('book_add_event', { feature: 'feature:scene', title: 'A plain event', on: '2026-11-24', text: 't' });
    expect(first.id).toMatch(/^event:scene\/a-plain-event-[0-9a-f-]{36}$/);
    expect(again.id).not.toBe(first.id);
  });

  it('a work moving to now records what is Proven around it', async () => {
    await call('book_update_work', { work: WORK, state: 'now' });
    expect((await now()).get(WORK)!.body.provenAtStart).toEqual([promise]);
  });
});
