// A chapter that shows its children side by side: the grid view, and the rules for moving a feature and choosing a view.
import { describe, expect, it } from 'vitest';
import type { BookRecord, WorkState } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { gridOf } from '../lib/book/grid';
import { current } from '../lib/book/views';
import { changedFeature } from '../lib/mcp/changes';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 20, 12, 0, tick++)).toISOString();
const agent = 'agent:claude';
const rec = (id: string, kind: BookRecord['kind'], body: object, replaces: string | null = null): BookRecord =>
  ({ book: 'b', id, kind, by: agent, at: at(), replaces, body: body as Record<string, unknown> });

const view = { kind: 'grid', noun: 'stories', target: 10, groups: [{ title: 'Foundation', size: 2 }, { title: 'Shape', size: 1 }] };
const feature = (slug: string, title: string, extra: object = {}) => rec(ids.feature(slug), 'feature', { title, slug, forWriter: 'x', ...extra });
const step = (story: string, n: number, title: string, state: WorkState, replaces: string | null = null) =>
  rec(ids.work(story, `step-${n}-${title}`), 'work', {
    feature: ids.feature(story), title: `Step ${n}: ${title}`, slug: `step-${n}-${title}`, on: '2026-11-20', state, summary: 's',
    origin: { words: 'w', saidOn: '2026-11-20' }, ...(state === 'done' ? { verdict: { served: 'yes' } } : {}),
  }, replaces);

const base = [
  rec('project', 'project', { title: 'P', forWriter: 'x' }),
  feature('trials', 'Trial stories', { view }),
  feature('lighthouse', 'The Lighthouse', { parent: 'feature:trials' }),
  step('lighthouse', 1, 'the premise', 'done'),
  step('lighthouse', 2, 'the people', 'now'),
  step('lighthouse', 3, 'the treatment', 'next'),
  feature('river', 'The river', { parent: 'feature:trials' }),
  step('river', 1, 'the premise', 'done'),
  step('river', 2, 'the people', 'done'),
  step('river', 3, 'the treatment', 'done'),
  step('river', 4, 'what it taught', 'done'),
];

describe('the stories grid', () => {
  it('draws one row per child, in the order they were added, and one cell per step', () => {
    const grid = gridOf(current(base), 'feature:trials');
    expect(grid?.rows.map((r) => r.title)).toEqual(['The Lighthouse', 'The river']);
    expect(grid?.rows[0].cells.map((c) => c && c.state)).toEqual(['done', 'now', 'next', null]);
    expect(grid?.columns.map((c) => c.step)).toEqual([1, 2, 3, 4]);
  });

  it('names each cell for a person: story, step, step title, state', () => {
    const cell = gridOf(current(base), 'feature:trials')?.rows[0].cells[1];
    expect(cell?.title).toBe('The people');
    expect(cell?.label).toBe('The Lighthouse, step 2, The people: in progress');
  });

  it('puts the group headings over their columns, and leaves later columns without one', () => {
    expect(gridOf(current(base), 'feature:trials')?.groups).toEqual([
      { title: 'Foundation', span: 2 }, { title: 'Shape', span: 1 }, { title: '', span: 1 },
    ]);
  });

  it('counts the stories begun and finished against the target', () => {
    expect(gridOf(current(base), 'feature:trials')?.summary).toBe('2 of 10 stories begun · 1 finished');
  });

  it("tells what the last finished story taught, from the finding on its last step", () => {
    const empty = gridOf(current(base), 'feature:trials');
    expect(empty?.latestFinding).toBeNull();
    const lesson = rec('finding:1', 'finding', { work: ids.work('river', 'step-4-what it taught'), text: 'Write the ending first.' });
    expect(gridOf(current([...base, lesson]), 'feature:trials')?.latestFinding).toMatchObject({ story: 'The river', text: 'Write the ending first.' });
  });

  it('puts a step that replaced another in the place of the one it replaced', () => {
    const old = ids.work('lighthouse', 'step-2-the people');
    const records = [...base, step('lighthouse', 2, 'the people again', 'now', old)];
    expect(gridOf(current(records), 'feature:trials')?.rows[0].cells.map((c) => c?.title)).toEqual(['The premise', 'The people again', 'The treatment', undefined]);
  });

  it('says so when there are no rows yet, in the words of the chapter', () => {
    expect(gridOf(current(base.slice(0, 2)), 'feature:trials')?.empty).toBe('No stories yet.');
  });

  it('numbers a column by its position when no title says "Step N"', () => {
    const records = [...base.slice(0, 2), feature('odd', 'Odd', { parent: 'feature:trials' }),
      rec(ids.work('odd', 'begin'), 'work', { feature: 'feature:odd', title: 'Begin', slug: 'begin', on: '2026-11-20', state: 'next', summary: 's', origin: { words: 'w', saidOn: '2026-11-20' } })];
    const grid = gridOf(current(records), 'feature:trials');
    expect(grid?.columns.map((c) => c.step)).toEqual([1, 2, 3]);
    expect(grid?.rows[0].cells[0]?.label).toBe('Odd, step 1, Begin: not started');
    expect(grid?.summary).toBe('0 of 10 stories begun · 0 finished');
  });

  it('counts a story finished only when every planned step is done', () => {
    const records = [...base.slice(0, 2), feature('early', 'Early', { parent: 'feature:trials' }), step('early', 1, 'the premise', 'done')];
    expect(gridOf(current(records), 'feature:trials')?.summary).toBe('1 of 10 stories begun · 0 finished');
  });

  it('takes a column number from the first story whose title says "Step N"', () => {
    const records = [...base, feature('late', 'Late', { parent: 'feature:trials' }), step('late', 7, 'out of order', 'next')];
    expect(gridOf(current(records), 'feature:trials')?.columns[0].step).toBe(1);
  });

  it('never tells a finding that a later one replaced', () => {
    const last = ids.work('river', 'step-4-what it taught');
    const records = [...base, rec('finding:1', 'finding', { work: last, text: 'First try.' }), rec('finding:2', 'finding', { work: last, text: 'Second.' }, 'finding:1'),
      rec('finding:1', 'finding', { work: last, text: 'First try, again.' })];
    expect(gridOf(current(records), 'feature:trials')?.latestFinding?.text).toBe('Second.');
  });

  it('is only for a feature that chose it', () => {
    expect(gridOf(current(base), 'feature:lighthouse')).toBeNull();
  });
});

describe('moving a feature and choosing its view', () => {
  const propose = (body: object) => ({ id: 'feature:lighthouse', kind: 'feature' as const, by: agent, replaces: null, body: { title: 'The Lighthouse', slug: 'lighthouse', forWriter: 'x', ...body } });

  it('lets a feature move under another feature', () => {
    expect(refusals(current(base), propose({ parent: 'feature:river' }))).toEqual([]);
  });

  it('refuses a feature under itself or under its own child', () => {
    expect(refusals(current(base), propose({ parent: 'feature:lighthouse' }))[0]).toMatch(/cannot sit under itself/);
    const trials = { id: 'feature:trials', kind: 'feature' as const, by: agent, replaces: null, body: { title: 'Trial stories', slug: 'trials', forWriter: 'x', parent: 'feature:lighthouse' } };
    expect(refusals(current(base), trials)[0]).toMatch(/cannot sit under/);
    const deeper = [...base, feature('scene', 'Scene', { parent: 'feature:lighthouse' })];
    expect(refusals(current(deeper), { ...trials, body: { ...trials.body, parent: 'feature:scene' } })[0]).toMatch(/cannot sit under/);
  });

  it('accepts the grid view and refuses one it does not know or a group of no columns', () => {
    const ask = { id: 'ask:grid', kind: 'ask' as const, by: agent, at: at(), book: 'b', replaces: null, body: { work: 'work:lighthouse/x', to: 'editor', needs: 'decision', subject: 'Grid?', text: 'Show feature:lighthouse as a grid?', options: [{ option: 'Go' }, { option: 'Stop' }] } };
    const go = { id: 'reply:grid', kind: 'reply' as const, by: 'editor', at: at(), book: 'b', replaces: null, body: { to: 'ask:grid', choice: 'Go' } };
    expect(refusals(current([...base, ask, go]), propose({ view, perItemReply: 'reply:grid' }))).toEqual([]);
    expect(refusals(current(base), propose({ view })).join()).toMatch(/only on the editor's Go/);
    expect(refusals(current(base), propose({ view: { kind: 'board' } }))).not.toEqual([]);
    expect(refusals(current(base), propose({ view: { kind: 'grid', groups: [{ title: 'A', size: 0 }] } }))).not.toEqual([]);
  });

  it('moves a feature and takes its view away through the update, keeping everything else', () => {
    const old = { title: 'T', slug: 't', forWriter: 'x', standing: 's', view };
    expect(changedFeature(old, { parent: 'feature:p', standing: undefined })).toEqual({ ...old, parent: 'feature:p' });
    expect(changedFeature(old, { view: null })).toEqual({ title: 'T', slug: 't', forWriter: 'x', standing: 's' });
  });
});
