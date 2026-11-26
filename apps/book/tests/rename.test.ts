// A feature or a piece of work can be renamed: a new version with a new title, keeping its id, slug and address.
import { describe, expect, it } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current, featureTree, storyOf } from '../lib/book/views';
import { changedFeature, changed } from '../lib/mcp/changes';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 22, 11, 0, tick++)).toISOString();
const agent = 'agent:claude';
const rec = (id: string, kind: BookRecord['kind'], body: object): BookRecord => ({ book: 'b', id, kind, by: agent, at: at(), replaces: null, body: body as Record<string, unknown> });
const work = ids.work('tasks', 'goal');
const workBody = { feature: 'feature:tasks', title: 'Goal', slug: 'goal', on: '2026-11-22', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-22' } };
const base = [
  rec('project', 'project', { title: 'P', forWriter: 'x' }),
  rec('feature:tasks', 'feature', { title: 'Tasks', slug: 'tasks', forWriter: 'x' }),
  rec(work, 'work', workBody),
];

describe('renaming', () => {
  it('gives a feature a new title and keeps its id, slug and address', () => {
    const body = changedFeature(base[1].body, { title: 'Everything to do' });
    expect(body).toEqual({ title: 'Everything to do', slug: 'tasks', forWriter: 'x' });
    expect(refusals(current(base), { id: 'feature:tasks', kind: 'feature', by: agent, replaces: null, body })).toEqual([]);
    const now = current([...base, rec('feature:tasks', 'feature', body)]);
    expect(featureTree(now).map((f) => [f.id, f.body.title, f.body.slug])).toEqual([['feature:tasks', 'Everything to do', 'tasks']]);
  });

  it('gives a piece of work a new title, and changes only what is given', () => {
    const renamed = changed(workBody, { title: 'The goal, said plainly' });
    expect(renamed).toEqual({ ...workBody, title: 'The goal, said plainly' });
    expect(changed(workBody, { state: 'next', summary: '' })).toEqual({ ...workBody, state: 'next' });
    expect(refusals(current(base), { id: work, kind: 'work', by: agent, replaces: null, body: renamed })).toEqual([]);
    expect(storyOf(current([...base, rec(work, 'work', renamed)]), 'feature:tasks').map((s) => [s.item.id, s.item.body.title])).toEqual([[work, 'The goal, said plainly']]);
  });

  it('never moves a piece of work to another address', () => {
    expect(changed(workBody, { title: 'x' }).slug).toBe('goal');
    expect(refusals(current(base), { id: work, kind: 'work', by: agent, replaces: null, body: { ...workBody, slug: 'other' } }).join()).toMatch(/This work's id is/);
  });
});
