import { describe, expect, it } from 'vitest';
import { bandOf } from '../lib/book/bands';
import { skills } from '../lib/book/evals';
import { explain, firstParagraph } from '../lib/book/explain';
import { goals } from '../lib/book/goals';
import { messagesOf } from '../lib/book/inbox';
import { lessons } from '../lib/book/lessons';
import { livePart } from '../lib/book/live';
import { measures } from '../lib/book/pulse';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 19, 9, 0, tick++)).toISOString();
const rec = (r: Omit<BookRecord, 'book' | 'at' | 'replaces'> & { replaces?: string }): BookRecord => ({ book: 'b', at: at(), replaces: null, ...r });
const agent = 'agent:claude';
const work = ids.work('tasks', 'goal');
const workBody = { feature: 'feature:tasks', title: 'Goal', slug: 'goal', on: '2026-11-18', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-18' } };
const base = [
  rec({ id: 'project', kind: 'project', by: agent, body: { title: 'P', forWriter: 'x' } }),
  rec({ id: 'feature:tasks', kind: 'feature', by: agent, body: { title: 'Partner tasks', slug: 'tasks', forWriter: 'Tasks for the partner' } }),
  rec({ id: work, kind: 'work', by: agent, body: workBody }),
  rec({ id: ids.paper(work, 'intent', 'editor'), kind: 'paper', by: agent, body: { work, kind: 'intent', for: 'editor', text: '## The problem\n\nIt forgets.\n\n## Your words' } }),
];
const propose = (kind: BookRecord['kind'], id: string, body: object, by = agent) => ({ id, kind, by, replaces: null, body: body as Record<string, unknown> });
const done = { ...workBody, state: 'done', verdict: { served: 'yes' } };

describe('proof for every done', () => {
  it('refuses done without proof, and allows it once proof is attached', () => {
    expect(refusals(current(base), propose('work', work, done)).join()).toMatch(/only with proof/);
    // A promise on the feature, which this work does not serve: the promise rules have nothing to say here.
    const promise = rec({ id: 'promise:tasks/11111111-1111-4111-8111-111111111111', kind: 'promise', by: agent, body: { feature: 'feature:tasks', text: 'A task ends in an answer.', mustHoldIn: 'app' } });
    const proved = [...base, promise, rec({ id: 'proof:1', kind: 'proof', by: agent, body: { work, title: 'Tests', kind: 'output', evidence: '22 passed' } })];
    expect(refusals(current(proved), propose('work', work, done))).toEqual([]);
  });
});

describe('what is live', () => {
  it('marks a part whose commit is only inferred, and sends it to the inbox', () => {
    const records = [
      ...base,
      rec({ id: 'commit:1', kind: 'commit', by: 'repo', body: { work, repo: 'r', sha: 'abc1234def', subject: 's', committedAt: '2026-11-19T08:00:00Z' } }),
      rec({ id: 'release:1', kind: 'release', by: agent, body: { part: 'Worker', where: 'production', sha: 'abc1234', repo: 'r', by: agent, undo: 'wrangler rollback', deployedAt: '2026-11-16T03:59:36Z', confirmed: false } }),
      rec({ id: 'release:2', kind: 'release', by: agent, body: { part: 'Website', where: 'production', sha: 'fff9999', repo: 'r', by: agent, undo: 'vercel rollback', deployedAt: '2026-11-18T03:38:00Z', confirmed: true } }),
    ];
    const live = livePart(current(records));
    expect(live.map((l) => [l.part, l.confirmed, l.recorded])).toEqual([['Website', true, false], ['Worker', false, true]]);
    const wrong = messagesOf('b', current(records), 'editor', '2026-11-19').filter((m) => m.needs === 'wrong').map((m) => m.id);
    expect(wrong).toEqual(['release:1']);
  });
});

describe('lessons, evals, pulse, bands, goals', () => {
  it('flags a lesson broken twice and sends it to the inbox', () => {
    const records = [
      ...base,
      rec({ id: 'lesson:1', kind: 'lesson', by: agent, body: { rule: 'Never resize the editor’s windows', why: 'It pushed the page off their screen.', from: { words: 'it again cuts to right', saidOn: '2026-11-19' }, areas: ['ui'] } }),
      rec({ id: 'slip:1', kind: 'slip', by: agent, body: { lesson: 'lesson:1', text: 'Resized Chrome to 2000' } }),
    ];
    expect(lessons(current(records))[0].flagged).toBe(false);
    const twice = [...records, rec({ id: 'slip:2', kind: 'slip', by: agent, body: { lesson: 'lesson:1', text: 'Again' } })];
    expect(lessons(current(twice))[0].flagged).toBe(true);
    expect(messagesOf('b', current(twice), 'editor', '2026-11-19').find((m) => m.id === 'slip:2')?.subject).toMatch(/broken 2 times/);
  });

  it('marks drift when the latest eval falls half a point under the usual', () => {
    const run = (n: number, score: number) => rec({ id: `eval:${n}`, kind: 'eval', by: agent, body: { skill: 'conflict', suite: 's', score, passed: 9, cases: 10 } });
    expect(skills(current([...base, run(1, 9), run(2, 9.2), run(3, 9.1)]))[0].drift).toBe(false);
    expect(skills(current([...base, run(1, 9), run(2, 9.2), run(3, 8.2)]))[0].drift).toBe(true);
  });

  it('treats a reading over its limit as a breach', () => {
    const records = [...base, rec({ id: 'pulse:1', kind: 'pulse', by: agent, body: { measure: 'errors per hour', part: 'Worker', value: 12, unit: 'errors', limit: 5, higherIsWorse: true } })];
    expect(measures(current(records))[0].breach).toBe(true);
  });

  it('finds an action’s band, and refuses an agent moving an action to another band', () => {
    const records = [...base, rec({ id: 'band:run-d1-migrations-on-production', kind: 'band', by: agent, body: { action: 'Run D1 migrations on production', band: 'alone', why: 'Standing authority' } })];
    expect(bandOf(current(records), 'apply the D1 migrations')?.body.band).toBe('alone');
    expect(bandOf(current(records), 'delete a writer story')).toBeUndefined();
    expect(refusals(current(records), propose('band', 'band:run-d1-migrations-on-production', { action: 'Run D1 migrations on production', band: 'editor', why: 'x' })).join()).toMatch(/editor's decision/);
  });

  it('marks done work serving a goal with no result since as changed nothing yet', () => {
    const records = [
      ...base,
      rec({ id: 'proof:1', kind: 'proof', by: agent, body: { work, title: 't', kind: 'link', evidence: 'https://x' } }),
      rec({ id: work, kind: 'work', by: agent, body: done }),
      rec({ id: 'goal:writers', kind: 'goal', by: agent, body: { title: 'Writers', measure: 'weekly writers', unit: 'writers', target: 10, higherIsBetter: true } }),
      rec({ id: 'link:1', kind: 'link', by: agent, body: { from: work, to: 'goal:writers', kind: 'serves' } }),
    ];
    expect(goals(current(records))[0].serving[0].quiet).toBe(true);
    const measured = [...records, rec({ id: 'result:1', kind: 'result', by: agent, body: { goal: 'goal:writers', value: 12, measuredOn: '2026-11-20' } })];
    expect(goals(current(measured))[0]).toMatchObject({ met: true, serving: [{ quiet: false }] });
  });
});

describe('explain any part', () => {
  it('tells a feature from its records: each work with the problem from its Why', () => {
    const e = explain(current(base), 'feature:tasks');
    expect(e?.story[0]).toMatchObject({ why: 'It forgets.' });
    expect(firstParagraph('## A\n\n> quote\n\nThe line.')).toBe('The line.');
  });
});
