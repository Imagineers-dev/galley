// Their failure on a build the book cannot name still holds the bar: a planted older failure cannot lower it.
import { describe, expect, it } from 'vitest';
import { promiseStatus } from '../lib/book/promise-status';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { COMMITTED, P, SHA, WORK, book, commit, newCode, rec, run } from './helpers/promise-book';

const OLD = 'e0e0e0e1';
const OLD_AT = '2026-11-22T12:00:00+05:30';
const stateOf = (records: BookRecord[]) => promiseStatus(current(records), P).state;

/** They say it is wrong on a dirty build (no sha), and an agent plants a failure naming a real older commit. */
function planted() {
  // In the order they happen, because each record takes the next time: their answer follows the link and the commits.
  const base = [...book().records, commit(OLD, OLD_AT), commit(SHA, COMMITTED)];
  const ask = rec(`ask:${crypto.randomUUID()}`, 'ask', { work: WORK, to: 'editor', needs: 'try', subject: 's', text: 't', about: { act: 'pass', test: 'test:t', promise: P, surface: 'app', subject: 'synthetic' } });
  const wrong = rec(`reply:${crypto.randomUUID()}`, 'reply', { to: ask.id, tried: 'wrong' }, 'editor');
  return [...base, ask, wrong, run({ result: 'fail', by: 'agent:claude', sha: OLD, committedAt: OLD_AT })];
}

describe('their failure on a build the book cannot name', () => {
  it('does not clear with one pass on unchanged code', () => expect(stateOf([...planted(), run()])).toBe('broken'));
  it('does not clear with two', () => expect(stateOf([...planted(), run(), run()])).toBe('broken'));
  it('clears with three on the code it failed on', () => expect(stateOf([...planted(), run(), run(), run()])).toBe('proven'));
  it('does not clear with three on older code', () => {
    const old = { sha: OLD, committedAt: OLD_AT };
    expect(stateOf([...planted(), run(old), run(old), run(old)])).toBe('broken');
  });
  it('clears with one pass on code committed after it', () => {
    const records = planted();
    const code = newCode();
    expect(stateOf([...records, commit(code.sha, code.committedAt), run(code)])).toBe('proven');
  });
});
