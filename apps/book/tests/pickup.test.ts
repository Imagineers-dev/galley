import { describe, expect, it } from 'vitest';
import { areasOf, pickup } from '../lib/book/pickup';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 19, 9, 0, tick++)).toISOString();
const rec = (r: Omit<BookRecord, 'book' | 'at' | 'replaces'>): BookRecord => ({ book: 'b', at: at(), replaces: null, ...r });
const agent = 'agent:claude';
const work = ids.work('tasks', 'goal');
const base = [
  rec({ id: 'project', kind: 'project', by: agent, body: { title: 'P', forWriter: 'x' } }),
  rec({ id: 'feature:tasks', kind: 'feature', by: agent, body: { title: 'Partner tasks', slug: 'tasks', forWriter: 'Tasks' } }),
  rec({ id: work, kind: 'work', by: agent, body: { feature: 'feature:tasks', title: 'Goal', slug: 'goal', on: '2026-11-18', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-18' } } }),
  rec({ id: 'diary:2026-11-19', kind: 'diary', by: agent, body: { day: '2026-11-19', headline: 'Stamped.', done: [], next: [{ text: 'Add scale cases', work }], waiting: [] } }),
  rec({ id: 'release:worker', kind: 'release', by: agent, body: { part: 'Worker', where: 'Cloudflare', sha: '4937e507b', repo: 'sc', by: agent, undo: 'u', deployedAt: '2026-11-16T03:59:00Z', confirmed: false } }),
];
const checkout = (over: object = {}) => ({
  repo: 'sc', checkedAt: '2026-11-19T10:00:00.000Z', branch: 'main', head: { sha: '4377b9855', subject: 'Stamp' },
  unpushed: [], uncommitted: [], live: [], ...over,
});
const reported = (body: object) => rec({ id: 'checkout:sc', kind: 'checkout', by: 'repo', body: body as Record<string, unknown> });

describe('pick up', () => {
  it('says the world is unknown until a repository reports, and names the diary’s next step first', () => {
    const p = pickup('b', current(base), 'editor', '2026-11-19');
    expect(p.leftOff?.next[0].text).toBe('Add scale cases');
    expect(p.first).toBe('Add scale cases');
    expect(p.disagreements.join()).toMatch(/No repository has reported/);
  });

  it('agrees when the checkout is fresh, pushed and live matches the book', () => {
    const p = pickup('b', current([...base, reported(checkout({ live: [{ part: 'Worker', where: 'w', commit: '4937e507b1' }] }))]), 'editor', '2026-11-19');
    expect(p.disagreements).toEqual([]);
    expect(p.repos[0].live[0].agrees).toBe(true);
  });

  it('names unpushed commits, a live part that differs, a stale checkout and commits the diary missed', () => {
    const records = [
      ...base,
      reported(checkout({ checkedAt: '2026-11-18T10:00:00.000Z', unpushed: [{ sha: '4377b9855', subject: 'Stamp' }], live: [{ part: 'Worker', where: 'w', commit: 'abcdef123' }] })),
      rec({ id: 'commit:sc:aaaaaaa', kind: 'commit', by: 'repo', body: { work, repo: 'sc', sha: 'aaaaaaa', subject: 'Late', committedAt: '2026-11-20T04:00:00+05:30' } }),
    ];
    const text = pickup('b', current(records), 'editor', '2026-11-19').disagreements.join('\n');
    expect(text).toMatch(/before the diary/);
    expect(text).toMatch(/not on the remote/);
    expect(text).toMatch(/Worker runs abcdef123, but the book says 4937e507b/);
    expect(text).toMatch(/1 commit was made after the diary/);
  });

  it('puts answers given since the diary before the next step', () => {
    const records = [...base, rec({ id: 'approval:x', kind: 'approval', by: 'editor', body: { paper: ids.paper(work, 'intent', 'editor'), verdict: 'approved' } })];
    expect(pickup('b', current(records), 'editor', '2026-11-19').first).toMatch(/^Read what was answered since the diary \(1\)/);
  });

  it('groups uncommitted files by area, largest first', () => {
    expect(areasOf(['apps/api/a.ts', 'apps/api/b/c.ts', 'apps/desktop/x.ts', 'README.md'])).toEqual([
      { area: 'apps/api', files: 2 }, { area: '(top level)', files: 1 }, { area: 'apps/desktop', files: 1 },
    ]);
  });

  it('lets only the repository report its own checkout, under its own id', () => {
    const proposal = (by: string, id = 'checkout:sc') => ({ id, kind: 'checkout' as const, by, replaces: null, body: checkout() as Record<string, unknown> });
    expect(refusals(current(base), proposal('repo'))).toEqual([]);
    expect(refusals(current(base), proposal(agent)).join()).toMatch(/reported by the repository/);
    expect(refusals(current(base), proposal('repo', 'checkout:other')).join()).toMatch(/checkout id is checkout:sc/);
  });
});
