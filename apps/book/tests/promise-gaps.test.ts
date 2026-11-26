// What the done gate would refuse. It reports only: the work can still be written as done.
import { describe, expect, it } from 'vitest';
import { promiseGaps, stampedAtStart } from '../lib/book/promise-gaps';
import { YES_TO } from '../lib/book/promise-types';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { refusals, type Proposed } from '../lib/rules/check';
import { P, WORK, book, promiseBody, rec, run, workBody } from './helpers/promise-book';

const serving = (more: object = {}) => rec(WORK, 'work', workBody({ serves: [P], ...more }));
const gapAsk = (version: string) => rec(`ask:${crypto.randomUUID()}`, 'ask', { work: WORK, to: 'editor', needs: 'decision', subject: 's', text: 't', options: [{ option: YES_TO['accept-gap'] }, { option: 'No' }], about: { act: 'accept-gap', promise: P, version } });
const said = (ask: BookRecord, choice: string) => rec(`reply:${crypto.randomUUID()}`, 'reply', { to: ask.id, choice }, 'editor');

describe('what the done gate would refuse', () => {
  it('names an unproven promise the work serves', () => {
    const { records } = book();
    expect(promiseGaps(current([...records, serving()]), WORK).gaps).toMatchObject([{ promise: P, state: 'not-proven' }]);
  });
  it('is clear once it is Proven', () => {
    const { records } = book();
    expect(promiseGaps(current([...records, serving(), run()]), WORK).gaps).toEqual([]);
  });
  it('names one that was Proven at the start and is not now', () => {
    const { records } = book();
    const w = rec(WORK, 'work', workBody({ provenAtStart: [P] }));
    expect(promiseGaps(current([...records, w, run({ result: 'fail' })]), WORK).gaps).toMatchObject([{ promise: P, state: 'broken' }]);
  });
  it('leaves done work alone', () => {
    const { records } = book();
    expect(promiseGaps(current([...records, serving({ state: 'done' })]), WORK)).toEqual({ gaps: [], noPromises: false });
  });
  it('says when a feature has no promise', () => {
    const { records } = book();
    const none = records.filter((r) => r.kind !== 'promise' && r.kind !== 'promise-approval');
    expect(promiseGaps(current(none), WORK).noPromises).toBe(true);
  });
  it('an accepted gap holds for that version', () => {
    const { records, promise } = book();
    const a = gapAsk(promise.at);
    expect(promiseGaps(current([...records, serving(), a, said(a, YES_TO['accept-gap'])]), WORK).gaps).toEqual([]);
  });
  it('answering no accepts nothing', () => {
    const { records, promise } = book();
    const a = gapAsk(promise.at);
    expect(promiseGaps(current([...records, serving(), a, said(a, 'No')]), WORK).gaps).toHaveLength(1);
  });
  it('an accepted gap lapses on a new version', () => {
    const { records, promise } = book();
    const a = gapAsk(promise.at);
    const newer = rec(P, 'promise', promiseBody('New words'));
    expect(promiseGaps(current([...records, serving(), a, said(a, YES_TO['accept-gap']), newer]), WORK).gaps).toHaveLength(1);
  });
  it('an accepted gap lapses on a later failure', () => {
    const { records, promise } = book();
    const a = gapAsk(promise.at);
    expect(promiseGaps(current([...records, serving(), a, said(a, YES_TO['accept-gap']), run({ result: 'fail' })]), WORK).gaps).toHaveLength(1);
  });
  it('refuses nothing: work with a gap can still be written as done', () => {
    const { records } = book();
    const proof = rec('proof:p', 'proof', { work: WORK, kind: 'test', evidence: 'e', title: 't' });
    const done: Proposed = { id: WORK, kind: 'work', by: 'agent:claude', replaces: null, body: workBody({ state: 'done', serves: [P], verdict: { served: 'yes' } }) };
    const reasons = refusals(current([...records, serving(), proof]), done);
    expect(reasons.filter((r) => /promise/i.test(r))).toEqual([]);
  });
});

describe('what a work records when it begins', () => {
  const body = (state: string) => workBody({ state });
  it('stamps what is Proven around it when it moves to now', () => {
    const { records } = book();
    expect(stampedAtStart(current([...records, run()]), body('next'), body('now')).provenAtStart).toEqual([P]);
  });
  it('adds nothing when nothing is Proven', () => {
    const { records } = book();
    expect(stampedAtStart(current(records), body('next'), body('now'))).toEqual(body('now'));
  });
  it('does not stamp again once under way', () => {
    const { records } = book();
    expect(stampedAtStart(current([...records, run()]), body('now'), body('now'))).toEqual(body('now'));
  });
  it('does not stamp work that is not starting', () => {
    const { records } = book();
    expect(stampedAtStart(current([...records, run()]), undefined, body('next'))).toEqual(body('next'));
  });
});
