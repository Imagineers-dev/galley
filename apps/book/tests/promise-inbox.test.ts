// Promises in the inbox and on the feature: a bug cannot be overwritten, new words reach them, a feature keeps its promises.
import { describe, expect, it } from 'vitest';
import { messagesOf } from '../lib/book/inbox';
import { markId } from '../lib/book/inbox-types';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { type Proposed, refusals } from '../lib/rules/check';
import { P, approve, book, promiseBody, rec } from './helpers/promise-book';

const refused = (records: BookRecord[], r: BookRecord) => refusals(current(records), r as Proposed);
const ID = 'event:scene/bug-11111111-1111-4111-8111-111111111111';
const plain = { feature: 'feature:scene', title: 'Bug', on: '2026-11-23', text: 'nothing happened' };
const waitingFor = (records: BookRecord[]) => messagesOf('b', current(records), 'editor', '2026-11-23').filter((m) => m.subject.includes('for “scene”'));
const archive = (message: string) => rec(markId('editor', message), 'mark', { message, person: 'editor', state: 'archived' }, 'editor');

describe('a recorded bug', () => {
  const { records } = book();
  const bug = rec(ID, 'event', { ...plain, breaks: [{ promise: P, subject: { real: 's' } }] });
  it('cannot be overwritten by a plain event with the same id', () => {
    expect(refused([...records, bug], rec(ID, 'event', plain)).join()).toContain('never rewritten');
  });
  it('cannot be written again with its promise taken off', () => {
    const none = rec(ID, 'event', { ...plain, noPromiseYet: true });
    expect(refused([...records, none], rec(ID, 'event', plain)).join()).toContain('never rewritten');
  });
  it('cannot land on a plain event already there', () => {
    const old = rec(ID, 'event', plain);
    expect(refused([...records, old], rec(ID, 'event', { ...plain, noPromiseYet: true })).join()).toContain('never rewritten');
  });
  it('leaves a plain event free to be written again, as today', () => {
    const old = rec(ID, 'event', plain);
    expect(refused([...records, old], rec(ID, 'event', { ...plain, text: 'more' }))).toEqual([]);
  });
});

describe('promises waiting in the inbox', () => {
  it('new words come back after they archived the old message', () => {
    const { records, promise } = book();
    const base = records.filter((r) => r.id !== promise.id && r.kind !== 'promise-approval');
    const first = rec(P, 'promise', promiseBody('First words.'));
    const [message] = waitingFor([...base, first]);
    const mark = archive(message.id);
    expect(refused([...base, first], mark)).toEqual([]);
    expect(waitingFor([...base, first, mark])[0].folder).toBe('archived');
    const second = rec(P, 'promise', promiseBody('Second words.'));
    expect(waitingFor([...base, first, mark, second])[0].folder).toBe('inbox');
  });
  it('sends nothing once answered', () => {
    const { records, promise } = book();
    expect(waitingFor([...records, approve(promise)])).toEqual([]);
  });
});

describe('withdrawing a feature', () => {
  it('is refused while it holds a promise', () => {
    const { records } = book();
    const leaf = records.filter((r) => r.kind === 'project' || r.id === 'feature:top' || r.id === 'feature:scene');
    const promise = rec('promise:scene/22222222-2222-4222-8222-222222222222', 'promise', promiseBody());
    const scene = records.find((r) => r.id === 'feature:scene')!;
    const withdrawn = rec('feature:scene', 'feature', { ...scene.body, withdrawn: { reason: 'gone' } });
    expect(refused(leaf, withdrawn)).toEqual([]);
    expect(refused([...leaf, promise], withdrawn).join()).toContain('1 promise');
  });
});
