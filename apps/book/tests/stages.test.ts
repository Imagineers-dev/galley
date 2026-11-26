// Where one story stands: the stage it is in, the steps done, and every step by name under its stage.
import { describe, expect, it } from 'vitest';
import type { BookRecord, WorkState } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { proofOf, stagesOf, underWay } from '../lib/book/stages';
import { gridOf } from '../lib/book/grid';
import { current } from '../lib/book/views';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 20, 12, 0, tick++)).toISOString();
const rec = (id: string, kind: BookRecord['kind'], body: object): BookRecord =>
  ({ book: 'b', id, kind, by: 'agent:claude', at: at(), replaces: null, body: body as Record<string, unknown> });
const stages = [{ title: 'Concept', size: 2 }, { title: 'Outline', size: 1 }, { title: 'Treatment', size: 2 }];
const feature = (slug: string, title: string, extra: object = {}) => rec(ids.feature(slug), 'feature', { title, slug, forWriter: 'x', ...extra });
const step = (story: string, n: number, title: string, state: WorkState, summary = 'They read the page.') =>
  rec(ids.work(story, `step-${n}`), 'work', { feature: ids.feature(story), title: `Step ${n}: ${title}`, slug: `step-${n}`, on: '2026-11-20', state, summary, origin: { words: 'w', saidOn: '2026-11-20' } });

const base = [
  feature('trials', 'Trial stories', { view: { kind: 'grid', noun: 'stories', target: 10, groups: stages } }),
  feature('lighthouse', 'The Lighthouse', { parent: 'feature:trials' }),
  step('lighthouse', 1, 'the premise', 'done'),
  step('lighthouse', 2, 'the people', 'done'),
  step('lighthouse', 3, 'the outline', 'now', 'The outline holds. They have read it twice and nothing in it is missing anymore; every beat has a reason to be there.'),
  step('lighthouse', 4, 'the treatment', 'next'),
];

describe("a story's stages", () => {
  it('says which stage the story is in and how many steps are done', () => {
    const s = stagesOf(current(base), 'feature:lighthouse');
    expect(s?.headline).toBe('The Lighthouse is in Outline');
    expect(s?.count).toBe('2 of 5 steps done');
    expect(s?.stages.map((x) => [x.title, x.done, x.total, x.look])).toEqual([
      ['Concept', 2, 2, 'finished'], ['Outline', 0, 1, 'here'], ['Treatment', 0, 2, 'ahead'],
    ]);
  });

  it('names every step under its stage, with how they know it is done and its state in words', () => {
    const [concept, outline, treatment] = stagesOf(current(base), 'feature:lighthouse')!.stages;
    expect(concept.steps[0]).toMatchObject({ step: 1, title: 'The premise', proof: 'They read the page.', when: 'Done 20 November' });
    expect(outline.steps[0]).toMatchObject({ step: 3, title: 'The outline', proof: 'The outline holds.', when: 'In progress' });
    expect(treatment.steps.map((s) => [s.step, s.title, s.when, s.work])).toEqual([
      [4, 'The treatment', 'Not started', ids.work('lighthouse', 'step-4')], [5, 'Step 5', 'Not planned yet', null],
    ]);
  });

  it('puts them in the first unfinished stage when nothing is under way, and says when the story is finished', () => {
    const resting = [...base.slice(0, 4), step('lighthouse', 3, 'the outline', 'next')];
    expect(stagesOf(current(resting), 'feature:lighthouse')?.headline).toBe('The Lighthouse is in Outline');
    const all = [...base.slice(0, 2), ...[1, 2, 3, 4, 5].map((n) => step('lighthouse', n, `part ${n}`, 'done'))];
    expect(stagesOf(current(all), 'feature:lighthouse')?.headline).toBe('The Lighthouse is finished');
  });

  it('calls an earlier stage with steps not done "unfinished", not ahead', () => {
    const skipped = [...base.slice(0, 2), step('lighthouse', 1, 'the premise', 'done'), step('lighthouse', 2, 'the people', 'next'), step('lighthouse', 3, 'the outline', 'now')];
    expect(stagesOf(current(skipped), 'feature:lighthouse')?.stages.map((x) => x.look)).toEqual(['unfinished', 'here', 'ahead']);
  });

  it('says a story with nothing begun has not started', () => {
    const fresh = [...base.slice(0, 2), step('lighthouse', 1, 'the premise', 'next')];
    expect(stagesOf(current(fresh), 'feature:lighthouse')?.headline).toBe('The Lighthouse has not started');
  });

  it('names the one stage of a chapter with none "Steps", and steps beyond the stages "More steps"', () => {
    const none = [feature('trials', 'Trial stories', { view: { kind: 'grid' } }), ...base.slice(1)];
    expect(stagesOf(current(none), 'feature:lighthouse')?.stages.map((x) => x.title)).toEqual(['Steps']);
    const over = [feature('trials', 'Trial stories', { view: { kind: 'grid', groups: [{ title: 'Concept', size: 2 }] } }), ...base.slice(1)];
    expect(stagesOf(current(over), 'feature:lighthouse')?.stages.map((x) => [x.title, x.total])).toEqual([['Concept', 2], ['More steps', 2]]);
  });

  it('is only for a story in a chapter shown as a grid', () => {
    expect(stagesOf(current(base), 'feature:trials')).toBeNull();
    const plain = [feature('book', 'Book'), feature('ch', 'Chapter', { parent: 'feature:book' })];
    expect(stagesOf(current(plain), 'feature:ch')).toBeNull();
  });

  it('finds the stories with a step under way', () => {
    const grid = gridOf(current([...base, feature('river', 'The river', { parent: 'feature:trials' }), step('river', 1, 'the premise', 'next')]), 'feature:trials')!;
    expect(underWay(grid).map((r) => r.title)).toEqual(['The Lighthouse']);
  });

  it('keeps a short summary whole and cuts a long one at its first sentence', () => {
    expect(proofOf('Short. Still short.')).toBe('Short. Still short.');
    expect(proofOf(`First sentence ends here. ${'More '.repeat(40)}`)).toBe('First sentence ends here.');
    expect(proofOf(`They pick one, e.g. the lighthouse story. ${'More '.repeat(30)}`)).toBe('They pick one, e.g. the lighthouse story.');
    expect(proofOf('word '.repeat(40))).toMatch(/^word( word)*…$/);
  });
});
