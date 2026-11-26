// What a repository or an author reports about a piece of work: "goes beyond", a review receipt and a watch.
import { describe, expect, it } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

let tick = 0;
const rec = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:claude'): BookRecord => ({ book: 'b', id, kind, by, at: new Date(Date.UTC(2026, 10, 23, 9, 0, tick++)).toISOString(), replaces: null, body: body as Record<string, unknown> });
const propose = (id: string, kind: BookRecord['kind'], body: object, by = 'repo', replaces: string | null = null) => ({ id, kind, by, replaces, body: body as Record<string, unknown> });

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const work = ids.work('scene', 'draft');
const sha = 'a'.repeat(40);
const head = 'b'.repeat(40);
const release = 'release:web-1';
const releaseBody = { part: 'Website', where: 'vercel', sha, repo: 'r', by: 'agent', undo: 'roll back', deployedAt: '2026-11-23T08:00:00.000Z', confirmed: true };
const base = [
  rec('project', 'project', { title: 'P', forWriter: 'x' }),
  rec('feature:scene', 'feature', { title: 'Scene', slug: 'scene', forWriter: 'x' }),
  rec(work, 'work', { feature: 'feature:scene', title: 'Draft', slug: 'draft', on: '2026-11-23', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-23' } }),
  rec(`commit:example-tools:${sha}`, 'commit', { work, repo: 'example-tools', sha, subject: 's', committedAt: '2026-11-23T08:00:00.000Z' }, 'repo'),
  rec(release, 'release', releaseBody),
];
const now = current(base);
const beyond = { work, raisedBy: 'reviewer', text: 'It goes further than the feature.', repo: 'example-tools' };
const receiptId = `receipt:example-tools:scene/draft:${head}:${uuid}`;
const receipt = { work, repo: 'example-tools', range: { base: sha, head }, verdict: 'pass', commits: [{ sha, subject: 's', patchId: 'p', work }], papers: [{ work: `b:${work}`, title: 'Draft', spec: 'approved', plan: 'approved' }] };

describe('a beyond', () => {
  it('is written once under a uuid, on real work', () => {
    expect(refusals(now, propose(`beyond:${uuid}`, 'beyond', beyond))).toEqual([]);
    expect(refusals(now, propose('beyond:x', 'beyond', beyond)).join()).toMatch(/beyond:<uuid>/);
    expect(refusals(now, propose(`beyond:${uuid}`, 'beyond', { ...beyond, work: 'work:none' })).join()).toMatch(/not a work/);
    expect(refusals(current([...base, rec(`beyond:${uuid}`, 'beyond', beyond, 'repo')]), propose(`beyond:${uuid}`, 'beyond', beyond)).join()).toMatch(/written once/);
    expect(refusals(now, propose(`beyond:${uuid}`, 'beyond', beyond, 'repo', work)).join()).toMatch(/replaces nothing/);
  });

  it('comes from the repository if and only if a reviewer raised it', () => {
    const { repo: _repo, ...rest } = beyond;
    const author = { ...rest, raisedBy: 'author' };
    expect(refusals(now, propose(`beyond:${uuid}`, 'beyond', author, 'agent:claude'))).toEqual([]);
    expect(refusals(now, propose(`beyond:${uuid}`, 'beyond', author, 'repo')).join()).toMatch(/A reviewer raises/);
    expect(refusals(now, propose(`beyond:${uuid}`, 'beyond', beyond, 'agent:claude')).join()).toMatch(/A reviewer raises/);
    expect(refusals(now, propose(`beyond:${uuid}`, 'beyond', rest)).join()).toMatch(/names the repository it came from/);
    expect(refusals(now, propose(`beyond:${uuid}`, 'beyond', { ...beyond, repo: 'elsewhere' })).join()).toMatch(/elsewhere has no commit recorded on/);
  });
});

describe('a receipt', () => {
  it('names its repository, work and head in its id', () => {
    expect(refusals(now, propose(receiptId, 'receipt', receipt))).toEqual([]);
    expect(refusals(now, propose(`receipt:example-tools:scene/draft:${sha}:${uuid}`, 'receipt', receipt)).join()).toMatch(/A receipt's id/);
    expect(refusals(now, propose(`receipt:example-tools:scene/draft:${head}:nope`, 'receipt', receipt)).join()).toMatch(/A receipt's id/);
  });

  it('is written only by a repository', () => {
    expect(refusals(now, propose(receiptId, 'receipt', receipt, 'agent:claude')).join()).toMatch(/recorded by a repository/);
  });

  it('is written once: a verdict cannot be flipped', () => {
    const held = current([...base, rec(receiptId, 'receipt', { ...receipt, verdict: 'fail' }, 'repo')]);
    expect(refusals(held, propose(receiptId, 'receipt', receipt)).join()).toMatch(/written once/);
    expect(refusals(now, propose(receiptId, 'receipt', receipt, 'repo', receiptId)).join()).toMatch(/replaces nothing/);
  });

  it('checks only the commits naming its work, each recorded on it', () => {
    const other = 'c'.repeat(40);
    const naming = { ...receipt, commits: [{ sha: other, subject: 's', patchId: 'p', work }] };
    expect(refusals(now, propose(receiptId, 'receipt', naming)).join()).toMatch(/is not recorded on/);
    const elsewhere = { ...receipt, commits: [...receipt.commits, { sha: other, subject: 's', patchId: 'p', work: 'work:scene/other' }] };
    expect(refusals(now, propose(receiptId, 'receipt', elsewhere))).toEqual([]);
    const unnamed = { ...receipt, commits: [...receipt.commits, { sha: other, subject: 's', patchId: 'p' }] };
    expect(refusals(now, propose(receiptId, 'receipt', unnamed))).toEqual([]);
    expect(refusals(now, propose(receiptId, 'receipt', { ...receipt, commits: [{ sha: other, subject: 's', patchId: 'p' }] })).join()).toMatch(/covers at least one commit of example-tools/);
    expect(refusals(now, propose(receiptId, 'receipt', { ...receipt, papers: [] })).join()).toMatch(/records the papers of/);
    expect(refusals(now, propose(receiptId, 'receipt', { ...receipt, papers: [{ ...receipt.papers[0], work: `other-book:${work}` }] })).join()).toMatch(/records the papers of/);
  });
});

describe('a watch', () => {
  it('has one id per release, and the repository reports it', () => {
    expect(refusals(now, propose(`watch:${release}`, 'watch', { release, result: 'pass' }))).toEqual([]);
    expect(refusals(now, propose('watch:other', 'watch', { release, result: 'pass' })).join()).toMatch(/A watch's id/);
    expect(refusals(now, propose('watch:release:none', 'watch', { release: 'release:none', result: 'pass' })).join()).toMatch(/not a release/);
    expect(refusals(now, propose(`watch:${release}`, 'watch', { release, result: 'pass' }, 'agent:claude')).join()).toMatch(/reported by a repository/);
    expect(refusals(now, propose(`watch:${release}`, 'watch', { release, result: 'maybe' }))).not.toEqual([]);
  });

  it('a newer watch on the same release is allowed: the latest wins', () => {
    const watched = current([...base, rec(`watch:${release}`, 'watch', { release, result: 'fail' }, 'repo')]);
    expect(refusals(watched, propose(`watch:${release}`, 'watch', { release, result: 'pass' }))).toEqual([]);
  });
});

describe('a repository writes only its own kinds', () => {
  it('may write a commit, receipt, watch and a reviewer beyond', () => {
    expect(refusals(now, propose(`beyond:${uuid}`, 'beyond', beyond)).filter((r) => r.startsWith('A repository records'))).toEqual([]);
    expect(refusals(now, propose(receiptId, 'receipt', receipt)).filter((r) => r.startsWith('A repository records'))).toEqual([]);
  });

  it.each([
    ['paper', ids.paper(work, 'intent', 'editor'), { work, kind: 'intent', for: 'editor', text: 'w' }],
    ['finding', 'finding:1', { work, text: 'w' }],
    ['feature', 'feature:x', { title: 'X', slug: 'x', forWriter: 'x' }],
  ] as const)('refuses a %s', (kind, id, body) => {
    expect(refusals(now, propose(id, kind, body))).toContainEqual(expect.stringMatching(/^A repository records/));
  });
});

describe('a study book', () => {
  it.each([
    ['beyond', `beyond:${uuid}`, beyond, 'repo'],
    ['receipt', receiptId, { ...receipt, commits: [] }, 'repo'],
  ] as const)('cannot be made from a book holding a %s, which is product work', (kind, id, body, by) => {
    const records = [...base.slice(0, 3), rec(id, kind, body, by)];
    expect(refusals(current(records), propose('project', 'project', { title: 'P', forWriter: 'x', kind: 'study' }, 'agent:claude')).join()).toMatch(/holds product work/);
  });

  it('cannot be made from a book holding a watch', () => {
    const records = [base[0], rec(`watch:${release}`, 'watch', { release, result: 'pass' }, 'repo')];
    expect(refusals(current(records), propose('project', 'project', { title: 'P', forWriter: 'x', kind: 'study' }, 'agent:claude')).join()).toMatch(/holds product work/);
  });
});

describe('a release', () => {
  it('may name the work it carried, and only real work', () => {
    expect(refusals(now, propose('release:web-2', 'release', { ...releaseBody, works: [work] }, 'agent:claude'))).toEqual([]);
    expect(refusals(now, propose('release:web-2', 'release', { ...releaseBody, works: ['work:none'] }, 'agent:claude')).join()).toMatch(/not a work/);
  });
});
