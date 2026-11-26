// An editor's try counts only for the build they ran, as the installed app's own Info.plist reports it through a repository.
import { describe, expect, it } from 'vitest';
import { aboutNote, builtAbout } from '../lib/book/promise-ask';
import { promiseStatus } from '../lib/book/promise-status';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { type Proposed, refusals } from '../lib/rules/check';
import { P, WORK, book, commit, reading, rec, release, run, stamp } from './helpers/promise-book';

const A = 'aaaaaaa1a1a1';
const B = 'bbbbbbb2b2b2';
const AT_A = '2026-11-23T01:00:00Z';
const AT_B = '2026-11-23T02:00:00Z';
const input = { act: 'pass' as const, test: 'test:t', promise: P };
const ask = (records: BookRecord[]) => rec(`ask:${crypto.randomUUID()}`, 'ask', { work: WORK, to: 'editor', needs: 'try', subject: 's', text: 't', about: builtAbout(current(records), input) });
const answer = (a: BookRecord, build?: { sha: string; readAt: string }, tried = 'works') => rec(`reply:${crypto.randomUUID()}`, 'reply', { to: a.id, tried, ...(build ? { build } : {}) }, 'editor');
/** They are asked, the pick-up reads the app again, and they answer with that reading stamped on their reply. */
const tried = (records: BookRecord[], sha: string) => {
  const a = ask(records);
  const fresh = reading(sha);
  return [...records, a, fresh, answer(a, { sha, readAt: fresh.at })];
};
const stateOf = (records: BookRecord[]) => promiseStatus(current(records), P).state;
const base = () => book().records;

describe("a editor's try", () => {
  it('names the build the app reports, not the newest commit', () => {
    const records = [...base(), commit(A, AT_A), commit(B, AT_B), reading(A)];
    expect(builtAbout(current(records), input)).toMatchObject({ sha: A, committedAt: AT_A });
    expect(stateOf(tried(records, A))).toBe('not-rechecked');
  });
  it('proves the promise when the app runs the newest code', () => {
    expect(stateOf(tried([...base(), commit(A, AT_A), commit(B, AT_B), reading(B)], B))).toBe('proven');
  });
  it('is not moved by a release an agent wrote', () => {
    const records = [...base(), commit(A, AT_A), commit(B, AT_B), release(B)];
    expect(builtAbout(current(records), input).sha).toBeUndefined();
    const a = ask(records);
    expect(stateOf([...records, a, answer(a)])).toBe('claimed');
  });
  it('is not moved by a backdated release after their answer', () => {
    const records = [...base(), commit(A, AT_A), commit(B, AT_B), release(B)];
    const a = ask(records);
    const replaced = release(A);
    const backdated = release(B);
    const said = answer(a);
    expect(stateOf([...records, a, replaced, said, { ...backdated, at: stamp() }])).toBe('claimed');
  });
  it('on the old build does not clear a bug fixed by an unshipped commit', () => {
    const bug = rec(`event:scene/bug-${crypto.randomUUID()}`, 'event', { feature: 'feature:scene', title: 'Bug', on: '2026-11-23', text: 't', breaks: [{ promise: P, subject: 'synthetic' }] });
    const later = commit(B, new Date(Date.parse(bug.at) + 1000).toISOString());
    expect(stateOf(tried([...base(), commit(A, AT_A), reading(A), bug, later], A))).toBe('broken');
  });
  it.each<[string, () => BookRecord[]]>([
    ['no reading', () => [commit(A, AT_A)]],
    ['a reading with uncommitted files', () => [commit(A, AT_A), reading(A, { uncommittedFiles: 2 })]],
    ['a reading that does not say if it is clean', () => [commit(A, AT_A), reading(A, { uncommittedFiles: null })]],
    ['a reading with no commit', () => [commit(A, AT_A), reading(null)]],
    ['a reading from a web address', () => [commit(A, AT_A), reading(A, { where: 'https://example.test/version' })]],
    ['a reading of another part', () => [commit(A, AT_A), reading(A, { part: 'Worker' })]],
    ['a reading of code outside this promise', () => [commit(A, AT_A, 'work:far/x'), reading(A)]],
    ['a reading of an app at another path', () => [commit(A, AT_A), reading(A, { where: 'plist:/tmp/Fake.app' })]],
    ['a reading only from a worktree', () => [commit(A, AT_A), reading(A, {}, 'cards-part1')]],
    ['a reading from a repository with no installed app', () => [commit(A, AT_A), reading(A, {}, 'example-tools')]],
  ])('with %s names no build and reads Claimed', (_name, more) => {
    const records = [...base(), ...more()];
    expect(builtAbout(current(records), input).sha).toBeUndefined();
    const a = ask(records);
    expect(stateOf([...records, a, answer(a)])).toBe('claimed');
  });
  it('is not disturbed by a second checkout from a worktree', () => {
    const records = [...base(), commit(A, AT_A), reading(A), reading(B, {}, 'cards-part1')];
    expect(builtAbout(current(records), input).sha).toBe(A);
  });
  it('ignores a checkout no repository wrote', () => {
    const forged = { ...reading(A), by: 'agent:claude' };
    expect(builtAbout(current([...base(), commit(A, AT_A), forged]), input).sha).toBeUndefined();
  });
  it.each<[string, (a: BookRecord, r: BookRecord) => { sha: string; readAt: string } | undefined]>([
    ['no build on their reply', () => undefined],
    ['a reading from before they were asked', (_a, r) => ({ sha: A, readAt: r.at })],
    ['another build on their reply', (a) => ({ sha: B, readAt: a.at })],
  ])('does not prove with %s', (_name, build) => {
    const r = reading(A);
    const records = [...base(), commit(A, AT_A), r];
    const a = ask(records);
    expect(stateOf([...records, a, answer(a, build(a, r))])).toBe('claimed');
  });
  it('with no known build clears no failure', () => {
    const records = [...base(), run({ result: 'fail' }), commit(A, AT_A)];
    const a = ask(records);
    expect(stateOf([...records, a, answer(a)])).toBe('broken');
  });
  it('counts their failure even with no known build', () => {
    const records = [...base(), commit(A, AT_A)];
    const a = ask(records);
    expect(stateOf([...records, a, answer(a, undefined, 'wrong')])).toBe('broken');
  });
  it('finds the commit from a short sha', () => {
    expect(builtAbout(current([...base(), commit(A, AT_A), reading(A.slice(0, 7))]), input).sha).toBe(A);
  });
  it('tells them which build it is for', () => {
    const now = current([...base(), commit(A, AT_A), reading(A)]);
    expect(aboutNote(now, builtAbout(now, input), '2026-01-01T00:00:00.000Z')).toContain(`installed build, commit ${A.slice(0, 9)}`);
  });
  it('tells them when the book cannot tell', () => {
    const now = current(base());
    expect(aboutNote(now, builtAbout(now, input), '2026-01-01T00:00:00.000Z')).toContain('cannot tell which build');
  });
  it('refuses a build on a reply that is not the reading the book holds', () => {
    const r = reading(A);
    const records = [...base(), commit(A, AT_A), r];
    const a = ask(records);
    const forged = answer(a, { sha: B, readAt: r.at });
    expect(refusals(current([...records, a]), forged as Proposed).join()).toContain('installed build');
    expect(refusals(current([...records, a]), answer(a, { sha: A, readAt: r.at }) as Proposed)).toEqual([]);
  });
});
