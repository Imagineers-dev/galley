// The eight stages of one piece of work, each read from its own record, and "no record" where the book holds none.
import { describe, expect, it } from 'vitest';
import { workStages } from '../lib/book/work-stages';
import type { BookRecord, PaperKind, Work } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current, entry } from '../lib/book/views';
import { P, SHA, WORK, book, commit, newCode, rec, release, run, workBody } from './helpers/promise-book';

const own = (kind: PaperKind) => rec(ids.paper(WORK, kind, 'editor'), 'paper', { work: WORK, kind, for: 'editor', text: 'Own line.' });
const approved = (kind: PaperKind) => {
  const paper = own(kind);
  return [paper, rec(`approval:${crypto.randomUUID()}`, 'approval', { paper: paper.id, verdict: 'approved', paperAt: paper.at }, 'editor')];
};
const papers = () => (['intent', 'spec', 'plan'] as PaperKind[]).flatMap(approved);
const withWork = (records: BookRecord[], more: object) => records.map((r) => (r.id === WORK ? rec(WORK, 'work', workBody(more)) : r));
const receipt = (verdict: 'pass' | 'fail') =>
  rec(`receipt:example-tools:draft:${SHA}:${crypto.randomUUID()}`, 'receipt', { work: WORK, repo: 'example-tools', range: { base: 'a', head: SHA }, verdict, commits: [], papers: [] }, 'repo');
const carried = (part = 'Worker (API)') => {
  const r = release(SHA, true, part);
  return rec(r.id, 'release', { ...r.body, works: [WORK] }, r.by);
};
const watch = (rel: BookRecord, result: 'pass' | 'fail') => rec(`watch:${rel.id}`, 'watch', { release: rel.id, result }, 'repo');

function stages(records: BookRecord[]) {
  const now = current(records);
  return Object.fromEntries(workStages(now, entry<Work>(now.get(WORK)!)).map((s) => [s.short, s.state]));
}

describe('the eight stages of a piece of work', () => {
  it('names all eight, in order', () => {
    const now = current(book().records);
    expect(workStages(now, entry<Work>(now.get(WORK)!)).map((s) => s.name)).toEqual(['Why', "What you'll get", 'How', 'Build', 'Test', 'Review', 'Release', 'Watch']);
  });

  it('new work under way is at its Why, and everything after is still to come', () => {
    const { records } = book();
    expect(stages(records.filter((r) => r.kind !== 'run'))).toMatchObject({ Why: 'current', What: 'todo', Build: 'todo', Release: 'todo', Watch: 'todo' });
  });

  it('approved papers and commits put it at its Test, which reads the promise it serves', () => {
    const records = withWork([...book().records, ...papers(), commit('c0ffee1', '2026-11-23T11:00:00Z')], { serves: [P] });
    expect(stages(records)).toMatchObject({ Why: 'done', What: 'done', How: 'done', Build: 'current', Test: 'todo' });
  });

  it('Test is done when every promise it serves is Proven', () => {
    const code = newCode();
    const records = withWork([...book().records, ...papers(), commit(code.sha, code.committedAt), run({ ...code })], { serves: [P] });
    expect(stages(records).Test).toBe('done');
  });

  it('with no promise named, Test reads the latest run of each of its tests', () => {
    const base = [...book().records, ...papers()];
    expect(stages([...base, run({ result: 'pass' })]).Test).toBe('done');
    expect(stages([...base, run({ result: 'pass' }), run({ result: 'fail' })]).Test).not.toBe('done');
  });

  it('Review reads the latest receipt; a failing one leaves it open', () => {
    const base = [...book().records, ...papers()];
    expect(stages([...base, receipt('pass')]).Review).toBe('done');
    expect(stages([...base, receipt('pass'), receipt('fail')]).Review).not.toBe('done');
  });

  it('a reviewed piece of work was built', () => {
    const base = [...book().records, ...papers(), commit('c0ffee1', '2026-11-23T11:00:00Z'), receipt('pass')];
    expect(stages(base).Build).toBe('done');
  });

  it('Release is done when a release names the work, and Watch when the watch of that release passed', () => {
    const rel = carried();
    const base = [...book().records, ...papers(), rel];
    expect(stages(base)).toMatchObject({ Release: 'done', Watch: 'unrecorded' });
    expect(stages([...base, watch(rel, 'fail')]).Watch).toBe('current');
    expect(stages([...base, watch(rel, 'pass')]).Watch).toBe('done');
  });

  it('the Studio has no production watch, so its released work says "no record" at Watch', () => {
    expect(stages([...book().records, carried('Studio')]).Watch).toBe('unrecorded');
  });

  it('finished work says "no record" for every stage the book holds nothing for, and nothing is current', () => {
    const s = stages(withWork(book().records, { state: 'done' }));
    expect(s).toMatchObject({ Why: 'unrecorded', Build: 'done', Review: 'unrecorded', Release: 'unrecorded', Watch: 'unrecorded' });
    expect(Object.values(s)).not.toContain('current');
  });

  it('a stage skipped by work that has moved past it reads "no record", not "still to come"', () => {
    expect(stages([...book().records, receipt('pass')])).toMatchObject({ Why: 'unrecorded', Test: 'unrecorded', Review: 'done' });
  });

  it('work not yet started has no current stage', () => {
    expect(Object.values(stages(withWork(book().records, { state: 'next' })))).not.toContain('current');
  });
});

describe('a stage never shows done over newer or missing evidence', () => {
  it('Test is not done while one of its tests has never run', () => {
    const base = [...book().records, rec('test:u', 'test', { work: WORK, title: 'Never run', proves: ['spec¶1'], level: 'unit', runs: 'x' })];
    expect(stages([...base, run({ result: 'pass' })]).Test).not.toBe('done');
  });

  it('Review follows whichever came last, a receipt or a review in the book', () => {
    // Each record is stamped as it is made, so the order they are made in is the order they happened.
    const older = receipt('pass');
    const failing = rec(`review:${crypto.randomUUID()}`, 'review', { work: WORK, answers: [], verdict: 'fails' }, 'agent:codex');
    const newer = receipt('pass');
    expect(stages([...book().records, older, failing]).Review).not.toBe('done');
    expect(stages([...book().records, older, failing, newer]).Review).toBe('done');
  });

  it('Watch keeps production, staging and each repository apart, and a tie goes to the release recorded last', () => {
    const production = carried();
    const staging = rec(`release:${crypto.randomUUID()}`, 'release', { ...production.body, where: 'staging', deployedAt: '2030-01-01T00:00:00Z' }, production.by);
    expect(stages([...book().records, production, staging, watch(production, 'fail'), watch(staging, 'pass')]).Watch).not.toBe('done');
    const first = carried();
    const second = rec(`release:${crypto.randomUUID()}`, 'release', { ...first.body }, first.by);
    expect(stages([...book().records, first, second, watch(first, 'pass'), watch(second, 'fail')]).Watch).not.toBe('done');
  });

  it('Watch never mistakes one place for another, however their names are written', () => {
    const a = rec(`release:${crypto.randomUUID()}`, 'release', { ...carried().body, part: 'API', repo: 'example-tools', where: 'prod|x', deployedAt: '2026-01-01T00:00:00Z' }, 'agent:claude');
    const b = rec(`release:${crypto.randomUUID()}`, 'release', { ...carried().body, part: 'API|cards', repo: 'prod', where: 'x', deployedAt: '2027-01-01T00:00:00Z' }, 'agent:claude');
    expect(stages([...book().records, a, b, watch(a, 'fail'), watch(b, 'pass')]).Watch).not.toBe('done');
  });

  it("Watch reads each part's newest release: an older pass never hides a newer failure", () => {
    const older = carried();
    const newer = carried();
    expect(stages([...book().records, older, newer, watch(older, 'pass'), watch(newer, 'fail')]).Watch).not.toBe('done');
    expect(stages([...book().records, older, newer, watch(older, 'fail'), watch(newer, 'pass')]).Watch).toBe('done');
  });
});
