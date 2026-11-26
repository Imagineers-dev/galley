// The ask tells them the true reason a try would only show as Claimed, and what each answer will do.
import { describe, expect, it } from 'vitest';
import { messagesOf } from '../lib/book/inbox';
import { aboutNote, builtAbout } from '../lib/book/promise-ask';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { P, WORK, book, commit, reading, rec } from './helpers/promise-book';

const A = 'aaaaaaa1a1a1';
const B = 'bbbbbbb2b2b2';
const AT = '2026-11-23T01:00:00Z';
const OUTCOMES = 'If it works, this shows as Claimed. If it is wrong, the promise goes Broken.';
const input = { act: 'pass' as const, test: 'test:t', promise: P };
const EARLY = '2026-01-01T00:00:00.000Z';
const LATE = '2027-01-01T00:00:00.000Z';
const noteFor = (records: BookRecord[], askedAt: string, askedOn: BookRecord[] = records) =>
  aboutNote(current(records), builtAbout(current(askedOn), input), askedAt);

describe('what the ask says about the build', () => {
  it('names a clean build read since they were asked, with no warning', () => {
    const note = noteFor([...book().records, commit(A, AT), reading(A)], EARLY);
    expect(note).toContain(`installed build, commit ${A.slice(0, 9)}`);
    expect(note).not.toContain('Claimed');
  });
  it('says how many uncommitted files a dirty build has', () => {
    const note = noteFor([...book().records, commit(A, AT), reading(A, { uncommittedFiles: 5 })], EARLY);
    expect(note).toContain('has 5 uncommitted files');
    expect(note).not.toContain('cannot tell');
    expect(note).toContain(OUTCOMES);
  });
  it('says one file plainly', () => {
    expect(noteFor([...book().records, commit(A, AT), reading(A, { uncommittedFiles: 1 })], EARLY)).toContain('has 1 uncommitted file.');
  });
  it('says when a clean build has not been read since they were asked', () => {
    const note = noteFor([...book().records, commit(A, AT), reading(A)], LATE);
    expect(note).toContain('not re-read since this ask');
    expect(note).toContain(OUTCOMES);
  });
  it('says when another build is installed now', () => {
    const before = [...book().records, commit(A, AT), commit(B, AT), reading(A)];
    const note = noteFor([...before, reading(B)], EARLY, before);
    expect(note).toContain(`now commit ${B.slice(0, 9)}`);
    expect(note).toContain(OUTCOMES);
  });
  it('says when a build does not report whether it is clean', () => {
    const note = noteFor([...book().records, commit(A, AT), reading(A, { uncommittedFiles: null })], EARLY);
    expect(note).toContain('does not say whether it has uncommitted files');
    expect(note).toContain(OUTCOMES);
  });
  it('says when the book has no reading', () => {
    const note = noteFor(book().records, EARLY);
    expect(note).toContain('cannot tell which build');
    expect(note).toContain(OUTCOMES);
    expect(note).not.toContain('clears nothing');
  });
  it('reaches them on the inbox message', () => {
    const records = [...book().records, commit(A, AT), reading(A, { uncommittedFiles: 5 })];
    const ask = rec('ask:note', 'ask', { work: WORK, to: 'editor', needs: 'try', subject: 'Try it', text: 't', about: builtAbout(current(records), input) });
    const message = messagesOf('b', current([...records, ask]), 'editor', '2026-11-23').find((m) => m.id === ask.id)!;
    expect(message.text).toContain('has 5 uncommitted files');
  });
});
