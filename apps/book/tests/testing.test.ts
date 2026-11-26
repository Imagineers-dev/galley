import { describe, expect, it } from 'vitest';
import { coverage, paragraphs } from '../lib/book/paragraphs';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { lineCoverage } from '../lib/book/testing';
import { current } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 18, 12, 0, tick++)).toISOString();
const rec = (r: Omit<BookRecord, 'book' | 'at' | 'replaces'>): BookRecord => ({ book: 'b', at: at(), replaces: null, ...r });
const agent = 'agent:claude';
const work = ids.work('tasks', 'goal');
const spec = ids.paper(work, 'spec', 'editor');
const editorSpec = 'What you get.\n\n![a picture](x.svg)\n\n- One line shows the task.\n- You keep talking.\n\nIt ends in a receipt.';
const base = [
  rec({ id: 'project', kind: 'project', by: agent, body: { title: 'P', forWriter: 'x' } }),
  rec({ id: 'feature:tasks', kind: 'feature', by: agent, body: { title: 'Tasks', slug: 'tasks', forWriter: 'x' } }),
  rec({ id: work, kind: 'work', by: agent, body: { feature: 'feature:tasks', title: 'Goal', slug: 'goal', on: '2026-11-18', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-18' } } }),
  rec({ id: spec, kind: 'paper', by: agent, body: { work, kind: 'spec', for: 'editor', text: editorSpec } }),
];
const approved = [...base, rec({ id: 'approval:1', kind: 'approval', by: 'editor', body: { paper: spec, verdict: 'approved' } })];
const propose = (kind: BookRecord['kind'], id: string, body: object, by = agent) => ({ id, kind, by, replaces: null, body: body as Record<string, unknown> });

describe('numbered lines and citations', () => {
  it('numbers paragraphs and list items, not pictures', () => {
    expect(paragraphs(editorSpec).map((p) => p.text)).toEqual(['What you get.', 'One line shows the task.', 'You keep talking.', 'It ends in a receipt.']);
  });

  it('finds what an agents’ paper covers, leaves out, and fails to cite', () => {
    const c = coverage(editorSpec, '## Behaviour\n\n- Task line in work-activity [¶2]\n- start_task returns at once [¶3, ¶9]\n\nCache outputs in IndexedDB.');
    expect(c.covered).toEqual([2, 3]);
    expect(c.gaps).toEqual([1, 4]);
    expect(c.unknown).toEqual([9]);
    expect(c.uncited).toEqual(['Cache outputs in IndexedDB.']);
  });

  it('refuses an agents’ paper with an uncited paragraph, and accepts it once every paragraph cites a line', () => {
    const paper = (text: string) => propose('paper', ids.paper(work, 'spec', 'agents'), { work, kind: 'spec', for: 'agents', text, against: approved[3].at });
    expect(refusals(current(approved), paper('Task line [¶2]\n\nCache outputs.')).join(' ')).toMatch(/cites no line/);
    expect(refusals(current(approved), paper('Task line [¶2]\n\nKeep talking [¶3]'))).toEqual([]);
  });
});

describe('tests, runs and reviews', () => {
  it('a test must prove a line that exists, and the matrix shows gaps', () => {
    expect(refusals(current(base), propose('test', 'test:1', { work, title: 't', proves: ['spec¶7'], level: 'unit', runs: 'vitest' }))[0]).toMatch(/¶1 to ¶4/);
    const withTest = [...base, rec({ id: 'test:1', kind: 'test', by: agent, body: { work, title: 't', proves: ['spec¶2'], level: 'unit', runs: 'vitest' } })];
    expect(lineCoverage(current(withTest), work).filter((l) => l.tests.length === 0).map((l) => l.n)).toEqual([1, 3, 4]);
  });

  it('a run is only of a test or a guard', () => {
    expect(refusals(current(base), propose('run', 'run:1', { of: work, result: 'pass', stage: 'check', evidence: 'e' }))).not.toEqual([]);
  });

  it('a review is not by the agent that wrote the change, answers all seven, and its verdict follows the worst answer', () => {
    const answers = [1, 2, 3, 4, 5, 6, 7].map((q) => ({ q, verdict: q === 5 ? 'concern' : 'passes', evidence: 'e' }));
    const review = (by: string, verdict: string) => propose('review', 'review:1', { work, part: 'part 1', writtenBy: 'claude', answers, verdict }, by);
    expect(refusals(current(base), review('agent:claude', 'concern')).join(' ')).toMatch(/does not review it/);
    expect(refusals(current(base), review('agent:codex', 'passes')).join(' ')).toMatch(/"concern"/);
    expect(refusals(current(base), review('agent:codex', 'concern'))).toEqual([]);
  });
});
