// Who may write what about a promise. Agents propose; only the editor approves; nobody vouches for their own work.
import { describe, expect, it } from 'vitest';
import { YES_TO } from '../lib/book/promise-types';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { type Proposed, refusals } from '../lib/rules/check';
import { P, WORK, approve, book, linkTo, promiseBody, rec, run, testBody } from './helpers/promise-book';

const ID = 'promise:scene/33333333-3333-4333-8333-333333333333';
const uuid = () => crypto.randomUUID();
const refused = (records: BookRecord[], r: BookRecord) => refusals(current(records), r as Proposed);

describe('a promise', () => {
  const { records } = book();
  const bad: [string, () => BookRecord][] = [
    ['needs its id on its feature', () => rec('promise:other/33333333-3333-4333-8333-333333333333', 'promise', promiseBody())],
    ['needs a real feature', () => rec('promise:nope/33333333-3333-4333-8333-333333333333', 'promise', promiseBody('x', { feature: 'feature:nope' }))],
    ['on the server says why', () => rec(ID, 'promise', promiseBody('x', { mustHoldIn: 'server' }))],
    ['serves only a promise above it', () => rec(ID, 'promise', promiseBody('x', { serves: P }))],
    ['serves only a promise', () => rec(ID, 'promise', promiseBody('x', { serves: 'feature:top' }))],
    ['is not rewritten with the same words', () => rec(P, 'promise', promiseBody())],
    ['stays on its feature', () => rec(P, 'promise', promiseBody('New', { feature: 'feature:top' }))],
  ];
  it.each(bad)('%s', (_n, make) => expect(refused(records, make()).length).toBeGreaterThan(0));

  it('is refused on a list', () => {
    const list = rec('feature:bugs', 'feature', { title: 'Bugs', slug: 'bugs', forWriter: 'x', view: { kind: 'grid' } });
    const p = rec('promise:bugs/33333333-3333-4333-8333-333333333333', 'promise', promiseBody('x', { feature: 'feature:bugs' }));
    expect(refused([...records, list], p).join()).toContain('is a list');
  });
  it('may be proposed and reworded by an agent', () => {
    expect(refused(records, rec(ID, 'promise', promiseBody('Another')))).toEqual([]);
    expect(refused(records, rec(P, 'promise', promiseBody('Reworded')))).toEqual([]);
  });
});

describe('approving promises', () => {
  const { records, promise } = book();
  it.each(['agent:claude', 'agent:codex', 'repo'])('%s cannot approve', (by) => {
    expect(refused(records, { ...approve(promise), by }).length).toBeGreaterThan(0);
  });
  it('the editor can', () => expect(refused(records, approve(promise))).toEqual([]));
  it('covers only the version on screen', () => {
    const old = approve(promise);
    const newer = rec(P, 'promise', promiseBody('New words'));
    expect(refused([...records, newer], old).join()).toContain('changed after you opened it');
  });
  it('must carry the words of that version', () => {
    const a = approve(promise);
    const items = [{ ...(a.body.items as object[])[0], snapshot: { text: 'Kinder words', mustHoldIn: 'app' } }];
    expect(refused(records, { ...a, body: { ...a.body, items } }).join()).toContain('must be the words');
  });
});

describe('linking a test to a promise', () => {
  const { records, test, link } = book();
  const accepting = (body: object, by = 'agent:codex') => rec(`link-accept:${uuid()}`, 'link-accept', { link: link.id, testAt: test.at, argv: ['pnpm', 'test'], ...body }, by);
  it('needs a test and a promise', () => {
    expect(refused(records, linkTo('feature:scene')).join()).toContain('is not a test');
    expect(refused(records, linkTo('test:t', 'feature:scene')).join()).toContain('is not a promise');
  });
  it('says when the test fails', () => {
    expect(refused(records, rec(`link:${uuid()}`, 'link', { from: 'test:t', to: P, kind: 'proves-promise' })).length).toBeGreaterThan(0);
  });
  it('is not accepted by the test author', () => expect(refused(records, accepting({}, 'agent:claude')).join()).toContain('wrote a test'));
  it('is accepted for this version only', () => expect(refused(records, accepting({ testAt: '2026-01-01T00:00:00.000Z' })).join()).toContain('changed'));
  it('is accepted for this command only', () => expect(refused(records, accepting({ argv: ['node', 'x.js'] })).join()).toContain('command'));
  it('is accepted by another agent', () => expect(refused(records, accepting({}))).toEqual([]));
});

describe('what the runner may record', () => {
  const { records } = book();
  it('accepts a full run of a test with a command', () => expect(refused(records, run())).toEqual([]));
  it('refuses a commit dated in the future, from anyone', () => {
    expect(refused(records, run({ committedAt: '2099-01-01T00:00:00Z' })).join()).toContain('future');
    expect(refused(records, run({ by: 'agent:claude', committedAt: '2099-01-01T00:00:00Z' })).join()).toContain('future');
  });
  it('needs the commit', () => expect(refused(records, run({ sha: null })).length).toBeGreaterThan(0));
  it('needs the surface its command names', () => expect(refused(records, run({ surface: 'server' })).length).toBeGreaterThan(0));
  it('needs the subject its command names', () => expect(refused(records, run({ subject: { real: 's' } })).length).toBeGreaterThan(0));
  it('still takes an agent run with no proof fields, as today', () => {
    expect(refused(records, rec(`run:${uuid()}`, 'run', { of: 'test:t', result: 'pass', stage: 'check', evidence: 'e' }))).toEqual([]);
  });
  it.each([['sh'], ['bash'], ['/bin/sh'], ['npx']])('a test command cannot run %s', (program) => {
    const t = rec('test:bad', 'test', testBody({ command: { repo: 'example-tools', argv: [program, '-c', 'x'], surface: 'app', subject: 'synthetic' } }));
    expect(refused(records, t).join()).toContain('pnpm or node');
  });
  it.each([
    [['node', '-e', 'x']], [['node', '--eval', 'x']], [['node', '-p', 'x']], [['node', '--import', 'x', 'y.js']], [['node', '/tmp/x.js']], [['node', '../x.js']],
    [['pnpm', 'dlx', 'x']], [['pnpm', 'exec', 'sh', '-c', 'x']], [['pnpm', '--filter', 'a', 'exec', 'sh']], [['pnpm', 'create', 'x']], [['pnpm', 'run', '--script-shell=/bin/sh', 'x']], [['pnpm', 'test', '--script-shell=/bin/sh']],
  ])('a test command cannot be %j', (argv) => {
    const t = rec('test:bad', 'test', testBody({ command: { repo: 'example-tools', argv, surface: 'app', subject: 'synthetic' } }));
    expect(refused(records, t).join()).toContain('cannot run this');
  });
  it.each([[['pnpm', 'test']], [['pnpm', '--filter', '@galley/book', 'test', 'x.test.ts']], [['pnpm', 'run', 'check']], [['node', 'scripts/check.mjs', '--flag']], [['node', '--test', 'tests/a.mjs']]])('a test command can be %j', (argv) => {
    expect(refused(records, rec('test:ok', 'test', testBody({ command: { repo: 'example-tools', argv, surface: 'app', subject: 'synthetic' } }))).filter((r) => r.includes('command'))).toEqual([]);
  });
  it('a test command names a known repository', () => {
    const t = rec('test:bad', 'test', testBody({ command: { repo: 'elsewhere', argv: ['pnpm', 'test'], surface: 'app', subject: 'synthetic' } }));
    expect(refused(records, t).length).toBeGreaterThan(0);
  });
});

describe('bugs and asks about promises', () => {
  const { records } = book();
  const ev = (more: object) => rec(`event:scene/${uuid()}`, 'event', { feature: 'feature:scene', title: 'T', on: '2026-11-23', text: 't', ...more });
  const ask = (about: object, options?: object[]) => rec(`ask:${uuid()}`, 'ask', { work: WORK, to: 'editor', needs: options ? 'decision' : 'try', subject: 's', text: 't', about, ...(options ? { options } : {}) });
  it('an event with neither field is as it was', () => expect(refused(records, ev({}))).toEqual([]));
  it('a bug names a real promise', () => expect(refused(records, ev({ breaks: [{ promise: 'promise:none', subject: 'synthetic' }] })).length).toBe(1));
  it('a bug cannot both name a promise and say none covered it', () => {
    expect(refused(records, ev({ breaks: [{ promise: P, subject: 'synthetic' }], noPromiseYet: true })).length).toBe(1);
  });
  it('a retraction must offer the yes', () => {
    const e = ev({ breaks: [{ promise: P, subject: 'synthetic' }] });
    expect(refused([...records, e], ask({ act: 'retract', event: e.id }, [{ option: 'A' }, { option: 'B' }])).join()).toContain(YES_TO.retract);
  });
  it('a "did it pass" ask carries only what the book filled in', () => {
    const good = ask({ act: 'pass', test: 'test:t', promise: P, version: records.find((r) => r.id === P)!.at, surface: 'app', subject: 'synthetic' });
    expect(refused(records, good)).toEqual([]);
    const forged = ask({ ...(good.body.about as object), sha: 'abcdef12', committedAt: '2026-11-23T01:00:00Z' });
    expect(refused(records, forged).join()).toContain('fills in the proof');
    const realStory = ask({ ...(good.body.about as object), subject: { real: 'temple' } });
    expect(refused(records, realStory).join()).toContain('fills in the proof');
  });
  it('a "did it pass" ask names a linked test and asks them to try it', () => {
    const other = rec('test:u', 'test', testBody());
    const about = { act: 'pass', test: 'test:u', promise: P, version: records.find((r) => r.id === P)!.at, surface: 'app', subject: 'synthetic' };
    expect(refused([...records, other], ask(about)).join()).toContain('not linked');
    expect(refused(records, ask({ ...about, test: 'test:t' }, [{ option: 'A' }, { option: 'B' }])).join()).toContain('needs: try');
  });
  it('a retraction names a failed run, or an event, not neither', () => {
    const yes = [{ option: YES_TO.retract }, { option: 'No' }];
    const passed = run();
    expect(refused([...records, passed], ask({ act: 'retract', run: passed.id }, yes)).join()).toContain('not a failed run');
    expect(refused(records, ask({ act: 'retract' }, yes)).join()).toContain('one event or one failed run');
    const failed = run({ result: 'fail' });
    expect(refused([...records, failed], ask({ act: 'retract', run: failed.id }, yes))).toEqual([]);
  });
  it('an accepted gap names the current version', () => {
    expect(refused(records, ask({ act: 'accept-gap', promise: P, version: '2020-01-01T00:00:00.000Z' }, [{ option: YES_TO['accept-gap'] }, { option: 'No' }])).join()).toContain('current version');
  });
  it('what an ask is about never changes', () => {
    const a = ask({ act: 'pass', test: 'test:t' });
    const swapped = { ...a, body: { ...a.body, about: { act: 'pass', test: 'test:other' } } };
    expect(refused([...records, a], swapped).join()).toContain('never changes');
  });
  it('a work serves only real promises', () => {
    const w = records.find((r) => r.id === WORK)!;
    expect(refused(records, { ...w, body: { ...w.body, serves: ['promise:none'] } }).length).toBe(1);
    expect(refused(records, { ...w, body: { ...w.body, serves: [P] } })).toEqual([]);
  });
});
