// The rules switched on with per-feature approval: own papers, identical rewrites, translations' versions, the done gate.
import { describe, expect, it } from 'vitest';
import type { BookRecord, PaperKind } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current } from '../lib/book/views';
import { refusals } from '../lib/rules/check';
import { P, WORK, book, newCode, commit, rec, run, workBody } from './helpers/promise-book';

const propose = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:claude') => ({ id, kind, by, replaces: null as string | null, body: body as Record<string, unknown> });
const own = (kind: PaperKind, text = 'Own line.') => propose(ids.paper(WORK, kind, 'editor'), 'paper', { work: WORK, kind, for: 'editor', text });
const asRecord = (p: ReturnType<typeof propose>) => rec(p.id, p.kind, p.body);
const done = (more: object = {}) => propose(WORK, 'work', workBody({ state: 'done', verdict: { served: 'yes' }, ...more }));
const proof = rec('proof:1', 'proof', { work: WORK, title: 't', kind: 'output', evidence: 'e' });
const says = (records: BookRecord[], p: ReturnType<typeof propose>) => refusals(current(records), p).join(' ');

describe("a piece of work's own What and How", () => {
  it('are refused in an ordinary feature, which holds one for all its work', () => {
    expect(says(book().records, own('spec'))).toMatch(/holds one What you'll get and one How for all its work/);
    expect(says(book().records, own('plan'))).toMatch(/book_beyond/);
  });

  it('are allowed for a Why, for a list item, once a beyond stands, or where the work already holds its own', () => {
    expect(refusals(current(book().records), own('intent'))).toEqual([]);
    const list = book().records.map((r) => (r.id === 'feature:scene' ? rec(r.id, 'feature', { ...r.body, approval: 'per-item', perItemReply: 'reply:x' }) : r));
    expect(says(list, own('spec'))).not.toMatch(/holds one What/);
    const beyond = rec(`beyond:${crypto.randomUUID()}`, 'beyond', { work: WORK, raisedBy: 'author', text: 'More.' });
    expect(refusals(current([...book().records, beyond]), own('spec'))).toEqual([]);
    expect(refusals(current([...book().records, asRecord(own('spec'))]), own('plan'))).toEqual([]);
  });

  it('a editor paper rewritten with the same words is refused; new words are a new version', () => {
    const records = [...book().records, asRecord(own('intent'))];
    expect(says(records, own('intent'))).toMatch(/same words as the current version/);
    expect(refusals(current(records), own('intent', 'New words.'))).toEqual([]);
  });
});

describe('the done gate', () => {
  it('refuses done while a promise the work serves is not Proven, naming it', () => {
    const records = [...book().records, proof];
    expect(says(records, done({ serves: [P] }))).toMatch(/"Only your choice stops a draft\." is not Proven \(not proven\)/);
  });

  it('lets done through once every promise it serves is Proven', () => {
    const code = newCode();
    const records = [...book().records, proof, commit(code.sha, code.committedAt), run({ ...code })];
    expect(refusals(current(records), done({ serves: [P] }))).toEqual([]);
  });

  it('cannot drop a promise it serves in the same update that marks it done', () => {
    const serving = [...book().records, proof].map((r) => (r.id === WORK ? rec(WORK, 'work', workBody({ serves: [P] })) : r));
    expect(says(serving, done({ serves: [] }))).toMatch(/is not Proven/);
  });

  it('answers for every promise the work ever served, however it was dropped on the way', () => {
    const serving = rec(WORK, 'work', workBody({ serves: [P] }));
    const base = [...book().records.filter((r) => r.id !== WORK), serving, proof];
    // Dropped in an earlier version, stepping back first: the history still holds it.
    const back = [...base, rec(WORK, 'work', workBody({ state: 'next', serves: [P] })), rec(WORK, 'work', workBody({ state: 'next', serves: [] }))];
    expect(says(back, done())).toMatch(/is not Proven/);
    // Withdrawn, then written again under the same id: the history still holds it.
    const again = [...base, rec(WORK, 'work', workBody({ serves: [P], withdrawn: { reason: 'x' } })), rec(WORK, 'work', workBody({ state: 'next' }))];
    expect(says(again, done())).toMatch(/is not Proven/);
  });

  it('answers for what was Proven when it started, even after it is withdrawn and written again', () => {
    const started = rec(WORK, 'work', workBody({ provenAtStart: [P] }));
    const records = [...book().records.filter((r) => r.id !== WORK), started, proof, rec(WORK, 'work', workBody({ withdrawn: { reason: 'x' } })), rec(WORK, 'work', workBody({ state: 'next' }))];
    expect(says(records, done())).toMatch(/is not Proven/);
  });

  it('finished work takes on no promise that is not Proven', () => {
    const finished = [...book().records.filter((r) => r.id !== WORK), rec(WORK, 'work', workBody({ state: 'done', verdict: { served: 'yes' } })), proof];
    expect(says(finished, done({ serves: [P] }))).toMatch(/Finished work takes on only Proven promises/);
    const code = newCode();
    expect(refusals(current([...finished, commit(code.sha, code.committedAt), run({ ...code })]), done({ serves: [P] }))).toEqual([]);
  });

  it('answers for every promise a work it replaced served', () => {
    const old = rec(WORK, 'work', workBody({ serves: [P] }));
    const next = ids.work('scene', 'draft-two');
    const replacing = { ...rec(next, 'work', workBody({ slug: 'draft-two', title: 'Draft two' })), replaces: WORK };
    const records = [...book().records.filter((r) => r.id !== WORK), old, replacing, rec('proof:2', 'proof', { work: next, title: 't', kind: 'output', evidence: 'e' })];
    const finish = { ...propose(next, 'work', workBody({ slug: 'draft-two', title: 'Draft two', state: 'done', verdict: { served: 'yes' } })), replaces: WORK };
    expect(says(records, finish)).toMatch(/is not Proven/);
  });

  it("refuses done in a feature with no promise at all, and says how to fix it", () => {
    const bare = book().records.filter((r) => !['promise', 'promise-approval', 'link', 'link-accept'].includes(r.kind));
    expect(says([...bare, proof], done())).toMatch(/"feature:scene" has no promise yet\. Propose its promises with book_propose_promise/);
  });

  it('never touches work already done, or a study book', () => {
    const bare = book().records.filter((r) => r.kind !== 'promise' && r.kind !== 'promise-approval').map((r) => (r.id === WORK ? rec(WORK, 'work', workBody({ state: 'done', verdict: { served: 'yes' } })) : r));
    expect(says([...bare, proof], done({ title: 'Renamed' }))).not.toMatch(/no promise yet/);
  });
});

describe('a product book with promises', () => {
  it('cannot become a study book, which would skip the done gate', () => {
    const bare = book().records.filter((r) => !['test', 'run', 'link', 'link-accept'].includes(r.kind));
    expect(says(bare, propose('project', 'project', { title: 'P', forWriter: 'x', kind: 'study' }))).toMatch(/cannot become a study book/);
  });
});
