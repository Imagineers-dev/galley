// Each promise works out its own state. One case for each line of "How we'll know it's done" about promises.
import { describe, expect, it } from 'vitest';
import { promiseStatus } from '../lib/book/promise-status';
import type { PromiseState } from '../lib/book/promise-status';
import { type Subject, YES_TO } from '../lib/book/promise-types';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { COMMITTED, P, REAL, SHA, WORK, accept, approve, book, commit, linkTo, newCode, promiseBody, rec, run, testBody } from './helpers/promise-book';

const OLDER = '2026-11-22T12:00:00+05:30';
const NEW = { sha: 'bbbbbbb2', committedAt: '2026-11-23T13:00:00+05:30' };
const event = (subject: Subject = REAL, promise = P) => rec(`event:scene/bug-${crypto.randomUUID()}`, 'event', { feature: 'feature:scene', title: 'Temple scene stopped', on: '2026-11-23', text: 't', breaks: [{ promise, subject }] });
const witness = (r: BookRecord, by = 'agent:gemini') => rec(`witness:${crypto.randomUUID()}`, 'witness', { run: r.id, evidence: 'I read the log' }, by);
const askAbout = (about: object, options?: { option: string }[]) => rec(`ask:${crypto.randomUUID()}`, 'ask', { work: WORK, to: 'editor', needs: options ? 'decision' : 'try', subject: 's', text: 't', about, ...(options ? { options } : {}) });
const reply = (ask: BookRecord, more: object) => rec(`reply:${crypto.randomUUID()}`, 'reply', { to: ask.id, ...more }, 'editor');
const reword = (text = 'New words.', more: object = {}) => rec(P, 'promise', promiseBody(text, more));
const editorTry = (tried: 'works' | 'wrong', about: object = {}) => {
  const ask = askAbout({ act: 'pass', test: 'test:t', promise: P, sha: SHA, committedAt: COMMITTED, surface: 'app', subject: 'synthetic', ...about });
  return [ask, reply(ask, { tried, build: { sha: SHA, readAt: ask.at } })];
};

type Case = [string, PromiseState, () => BookRecord[]];
const cases: Case[] = [
  ['no test has shown it', 'not-proven', () => []],
  ['a trusted pass in the app proves it', 'proven', () => [run()]],
  ['a baseline pass counts for nothing', 'not-proven', () => [run({ stage: 'baseline' })]],
  ['a typed result is only Claimed', 'claimed', () => [run({ by: 'agent:claude' })]],
  ['a witnessed run is trusted', 'proven', () => { const r = run({ by: 'agent:claude' }); return [commit(SHA, COMMITTED), r, witness(r)]; }],
  ['a witness who later turns out to have worked on the feature no longer counts', 'claimed', () => { const r = run({ by: 'agent:claude' }); return [commit(SHA, COMMITTED), r, witness(r), rec('paper:scene/other/spec/editor', 'paper', { work: 'work:scene/other', kind: 'spec', for: 'editor', text: 'One.' }, 'agent:gemini')]; }],
  ['a witnessed run on a commit the book never saw is only Claimed', 'claimed', () => { const r = run({ by: 'agent:claude' }); return [r, witness(r)]; }],
  ['a witnessed run with the right sha but another date is only Claimed', 'claimed', () => { const r = run({ by: 'agent:claude' }); return [commit(SHA, '2026-11-22T12:00:00+05:30'), r, witness(r)]; }],
  ['a forged future date is never Proven', 'claimed', () => { const r = run({ by: 'agent:claude', sha: 'bbbbbbb1', committedAt: '2099-01-01T00:00:00Z' }); return [r, witness(r)]; }],
  ['a forged future date does not outlast a newer commit', 'not-rechecked', () => { const r = run({ by: 'agent:claude', sha: 'bbbbbbb1', committedAt: '2099-01-01T00:00:00Z' }); return [r, witness(r), commit('ccccccc3', '2026-11-23T14:00:00+05:30')]; }],
  ['a commit recorded after the run expires it, even dated earlier', 'not-rechecked', () => [run(), commit('ccccccc3', '2026-11-22T12:00:00+05:30')]],
  ['a editor try proves it', 'proven', () => [commit(SHA, COMMITTED), ...editorTry('works')]],
  ['a try on another promise proves nothing here', 'not-proven', () => [commit(SHA, COMMITTED), ...editorTry('works', { promise: 'promise:scene/other' })]],
  ['a editor saying it is wrong breaks it', 'broken', () => editorTry('wrong')],
  ['a editor-level test alone proves nothing', 'claimed', () => { const t = rec('test:t', 'test', testBody({ level: 'editor' })); const l = linkTo('test:t'); return [t, l, accept(l, t), run({ by: 'agent:claude' })]; }],
  ['a server pass on an app promise is Server only', 'server-only', () => [run({ surface: 'server' })]],
  ['a pass with no commit date cannot be Proven', 'claimed', () => [run({ committedAt: null })]],
  ['a pass with no sha cannot be Proven', 'claimed', () => [run({ sha: null })]],
  ['a failed run breaks it', 'broken', () => [run({ result: 'fail' })]],
  ['an untrusted pass cannot clear a failure', 'broken', () => [run({ result: 'fail' }), run({ by: 'agent:claude', ...NEW })],],
  ['a pass on new code clears a failure', 'proven', () => [run({ result: 'fail' }), run(NEW)]],
  ['one pass on the same code does not clear it', 'broken', () => [run({ result: 'fail' }), run()]],
  ['two passes on the same code do not clear it', 'broken', () => [run({ result: 'fail' }), run(), run()]],
  ['three passes on the same code clear it', 'proven', () => [run({ result: 'fail' }), run(), run(), run()]],
  ['a pass from another subject cannot clear a real-story failure', 'broken', () => [run({ result: 'fail', subject: REAL }), run({ ...NEW, subject: 'synthetic' })]],
  ['a pass on the same real story clears it', 'proven', () => [run({ result: 'fail', subject: REAL }), run({ ...NEW, subject: REAL })]],
  ['an open break holds it Broken', 'broken', () => [run(), event()]],
  ['a pass on a test story leaves the break open', 'broken', () => [event(), run()]],
  ['an untrusted pass on that story leaves it open', 'broken', () => [event(), run({ by: 'agent:claude', subject: REAL })]],
  ['a pass before the bug does not close it', 'broken', () => [run({ subject: REAL }), event()]],
  ['a trusted pass on that story, on newer code, closes it', 'proven', () => { const e = event(); return [e, run({ subject: REAL, ...newCode() })]; }],
  ['a pass on that story on code from before the bug leaves it open', 'broken', () => [event(), run({ subject: REAL })]],
  ['a pass on that story on the wrong surface leaves it open', 'broken', () => { const e = event(); return [e, run({ subject: REAL, surface: 'server', ...newCode() })]; }],
  ['a witnessed pass on a commit the book never saw leaves it open', 'broken', () => { const e = event(); const r = run({ by: 'agent:claude', subject: REAL, ...newCode() }); return [e, r, witness(r)]; }],
  ['a failure does not clear on the wrong surface', 'broken', () => [run({ result: 'fail' }), run({ ...NEW, surface: 'server' })]],
  ['a failure does not clear on older code', 'broken', () => [run({ result: 'fail', ...NEW }), run()]],
  ['three passes on older code do not clear a failure', 'broken', () => [run({ result: 'fail', ...NEW }), run(), run(), run()]],
  ['a witnessed pass on an unknown commit does not clear a failure', 'broken', () => { const f = run({ result: 'fail' }); const r = run({ by: 'agent:claude', ...NEW }); return [f, r, witness(r)]; }],
  ['a forged failure does not cut three passes to one', 'broken', () => [run({ result: 'fail' }), run({ result: 'fail', by: 'agent:claude', sha: '00000001', committedAt: '2000-01-01T00:00:00Z' }), run()]],
  ['a failure naming a real older commit does not cut three passes to one', 'broken', () => [commit('e0e0e0e1', OLDER), run({ result: 'fail' }), run({ result: 'fail', by: 'agent:claude', sha: 'e0e0e0e1', committedAt: OLDER }), run()]],
  ['three passes on the newest failing code still clear it', 'proven', () => [commit('e0e0e0e1', OLDER), run({ result: 'fail' }), run({ result: 'fail', by: 'agent:claude', sha: 'e0e0e0e1', committedAt: OLDER }), run(), run(), run()]],
  ['three passes on the older failing code do not clear it', 'broken', () => [commit('e0e0e0e1', OLDER), run({ result: 'fail' }), run({ result: 'fail', by: 'agent:claude', sha: 'e0e0e0e1', committedAt: OLDER }), run({ sha: 'e0e0e0e1', committedAt: OLDER }), run({ sha: 'e0e0e0e1', committedAt: OLDER }), run({ sha: 'e0e0e0e1', committedAt: OLDER })]],
  ['one pass on code newer than every failure clears it', 'proven', () => [commit('e0e0e0e1', OLDER), run({ result: 'fail' }), run({ result: 'fail', by: 'agent:claude', sha: 'e0e0e0e1', committedAt: OLDER }), run(NEW)]],
  ['a pass cannot anchor to a commit on an unrelated feature', 'claimed', () => { const r = run({ by: 'agent:claude' }); return [commit(SHA, COMMITTED, 'work:far/x'), r, witness(r)]; }],
  ['the editor can retract a failed run', 'proven', () => { const f = run({ result: 'fail', subject: { real: 'typo-story' } }); const a = askAbout({ act: 'retract', run: f.id }, [{ option: YES_TO.retract }, { option: 'No' }]); return [run(), f, a, reply(a, { choice: YES_TO.retract })]; }],
  ['saying no keeps a failed run', 'broken', () => { const f = run({ result: 'fail', subject: { real: 'typo-story' } }); const a = askAbout({ act: 'retract', run: f.id }, [{ option: YES_TO.retract }, { option: 'No' }]); return [run(), f, a, reply(a, { choice: 'No' })]; }],
  ['a editor retraction closes the break', 'proven', () => { const e = event(); const a = askAbout({ act: 'retract', event: e.id }, [{ option: YES_TO.retract }, { option: 'No' }]); return [run(), e, a, reply(a, { choice: YES_TO.retract })]; }],
  ['answering no to a retraction leaves it broken', 'broken', () => { const e = event(); const a = askAbout({ act: 'retract', event: e.id }, [{ option: YES_TO.retract }, { option: 'No' }]); return [run(), e, a, reply(a, { choice: 'No' })]; }],
  ['a retraction closes only its own event', 'broken', () => { const e = event(); const other = event(); const a = askAbout({ act: 'retract', event: e.id }, [{ option: YES_TO.retract }, { option: 'No' }]); return [run(), e, other, a, reply(a, { choice: YES_TO.retract })]; }],
  ['a retract answer is not a pass', 'not-proven', () => { const e = event('synthetic', 'promise:none'); const a = askAbout({ act: 'retract', event: e.id, test: 'test:t' }, [{ option: YES_TO.retract }, { option: 'No' }]); return [e, a, reply(a, { choice: YES_TO.retract, tried: 'works' })]; }],
  ['an accept-gap answer is not a pass', 'not-proven', () => { const a = askAbout({ act: 'accept-gap', promise: P, test: 'test:t' }, [{ option: YES_TO['accept-gap'] }, { option: 'No' }]); return [a, reply(a, { choice: YES_TO['accept-gap'], tried: 'works' })]; }],
  ['a later commit on the feature expires a pass', 'not-rechecked', () => [run(), commit('ccccccc3', '2026-11-23T14:00:00+05:30')]],
  ['a commit at the same instant, written in another offset, expires it', 'not-rechecked', () => [run(), commit('ccccccc3', '2026-11-23T06:30:00Z')]],
  ['an earlier commit whose text sorts later does not expire it', 'proven', () => [commit('ccccccc3', '2026-11-23T06:29:59+00:00'), run()]],
  ['the same sha does not expire it', 'proven', () => [run(), commit(SHA, '2026-11-23T14:00:00+05:30')]],
  ['a commit on another feature does not expire it', 'proven', () => [run(), commit('ccccccc3', '2026-11-23T14:00:00+05:30', 'work:far/x')]],
  ['a commit on what it depends on expires it', 'not-rechecked', () => [rec('link:dep', 'link', { from: 'feature:scene', to: 'feature:dep', kind: 'depends-on' }), run(), commit('ccccccc3', '2026-11-23T14:00:00+05:30', 'work:dep/x')]],
  ['a commit under the feature expires it', 'not-rechecked', () => [run(), commit('ccccccc3', '2026-11-23T14:00:00+05:30', 'work:child/x')]],
  ['a new promise version expires a pass', 'not-rechecked', () => [run(), ...(() => { const p = reword(); return [p, approve(p)]; })()]],
  ['rewording carries a failure forward', 'broken', () => [run({ result: 'fail' }), ...(() => { const p = reword(); return [p, approve(p)]; })()]],
  ['rewording carries an open break forward', 'broken', () => [event(), ...(() => { const p = reword(); return [p, approve(p)]; })()]],
  ['a pass on unapproved new words is not Proven', 'not-rechecked', () => [reword(), run()]],
  ['the approved place holds when a rewording moves it to the server', 'not-rechecked', () => [reword('Same.', { mustHoldIn: 'server', serverReason: 'r' }), run({ surface: 'server' })]],
  ['the new words pass once approved', 'proven', () => { const p = reword(); return [p, approve(p), run()]; }],
];

describe('what state a promise is in', () => {
  it.each(cases)('%s', (_name, state, more) => {
    const { records } = book();
    expect(promiseStatus(current([...records, ...more()]), P).state).toBe(state);
  });

  it('counts nothing before the editor approves', () => {
    const { records, promise } = book();
    const without = records.filter((r) => !(r.kind === 'promise-approval' && r.body.feature));
    expect(without.some((r) => r.id === promise.id)).toBe(true);
    const s = promiseStatus(current([...without, run()]), P);
    expect(s).toMatchObject({ state: 'not-proven', waiting: true });
  });

  it('a changes answer is not an approval', () => {
    const { records, promise } = book();
    const without = records.filter((r) => r.kind !== 'promise-approval');
    expect(promiseStatus(current([...without, approve(promise, 'changes'), run()]), P)).toMatchObject({ state: 'not-proven', waiting: true });
  });

  it('shows the code and day every Proven stands on', () => {
    const { records } = book();
    expect(promiseStatus(current([...records, run()]), P).proof).toEqual({ sha: SHA, committedAt: COMMITTED });
  });

  it('runs before the link was accepted do not count', () => {
    const { records, test } = book();
    const early = run();
    const link = linkTo(test.id);
    const noAccept = records.filter((r) => r.kind !== 'link-accept' && r.kind !== 'link');
    expect(promiseStatus(current([...noAccept, early, link, accept(link, test)]), P).state).toBe('not-proven');
  });

  it('a changed test voids the accepted link, but its failure stays', () => {
    const { records } = book();
    const failed = run({ result: 'fail' });
    const changed = rec('test:t', 'test', testBody({ title: 'Easier now' }));
    expect(promiseStatus(current([...records, changed, run(NEW)]), P).state).toBe('not-proven');
    expect(promiseStatus(current([...records, failed, changed, run(NEW)]), P).state).toBe('broken');
  });

  it("a child's pass never moves its parent", () => {
    const { records } = book();
    const parent = rec('promise:top/22222222-2222-4222-8222-222222222222', 'promise', { feature: 'feature:top', text: 'Ask and you get a draft.', mustHoldIn: 'app' });
    const child = rec(P, 'promise', promiseBody('Child words.', { serves: parent.id }));
    const now = current([...records, parent, approve(parent, 'approved', 'feature:top'), child, approve(child), run()]);
    expect(promiseStatus(now, P).state).toBe('proven');
    expect(promiseStatus(now, parent.id).state).toBe('not-proven');
  });

  describe('a replacement test', () => {
    const replacing = (more: object, link = true) => {
      const { records } = book();
      const failed = run({ result: 'fail', subject: REAL });
      const next = rec('test:new', 'test', testBody(more), 'agent:claude', 'test:t');
      const l = linkTo('test:new');
      return { all: [...records, failed, next, ...(link ? [l, accept(l, next)] : [])] };
    };
    it('clears the old failure by passing on the same subject', () => {
      const { all } = replacing({ level: 'app' });
      expect(promiseStatus(current([...all, run({ of: 'test:new', subject: REAL, ...NEW })]), P).state).toBe('proven');
    });
    it('does not clear it on another subject', () => {
      const { all } = replacing({ level: 'app' });
      expect(promiseStatus(current([...all, run({ of: 'test:new', subject: 'synthetic', ...NEW })]), P).state).toBe('broken');
    });
    it('does not clear it at a lower level', () => {
      const { all } = replacing({ level: 'unit' });
      expect(promiseStatus(current([...all, run({ of: 'test:new', subject: REAL, ...NEW })]), P).state).toBe('broken');
    });
    it('does not clear it unless it names the same promises', () => {
      const { all } = replacing({ level: 'app' }, false);
      expect(promiseStatus(current([...all, run({ of: 'test:new', subject: REAL, ...NEW })]), P).state).toBe('broken');
    });
  });
});
