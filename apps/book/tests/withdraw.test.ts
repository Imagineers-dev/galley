// A feature or a piece of work added by mistake can be withdrawn: a new version that says why. It leaves every view
// at once, because the book is read without it; the store keeps it and every version. Only what nothing stands on
// can be withdrawn, so nothing is left pointing at it.
import { describe, expect, it } from 'vitest';
import { attentionOf } from '../lib/book/attention';
import { gridOf } from '../lib/book/grid';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current, currentOf, featureTree, flatten, storyOf } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 22, 10, 0, tick++)).toISOString();
const agent = 'agent:claude';
const rec = (id: string, kind: BookRecord['kind'], body: object, replaces: string | null = null): BookRecord =>
  ({ book: 'b', id, kind, by: agent, at: at(), replaces, body: body as Record<string, unknown> });
const featureBody = (slug: string, extra: object = {}) => ({ title: slug, slug, forWriter: 'x', ...extra });
const workBody = (story: string, slug: string, state = 'next') =>
  ({ feature: ids.feature(story), title: slug, slug, on: '2026-11-22', state, summary: 's', origin: { words: 'w', saidOn: '2026-11-22' }, ...(state === 'done' ? { verdict: { served: 'yes' } } : {}) });
const reason = { reason: 'Added by mistake.' };

const stray = ids.work('one', 'stray');
const base = [
  rec('project', 'project', { title: 'P', forWriter: 'x' }),
  rec('feature:trials', 'feature', featureBody('trials', { view: { kind: 'grid' } })),
  rec('feature:one', 'feature', featureBody('one', { parent: 'feature:trials' })),
  rec('feature:empty', 'feature', featureBody('empty', { parent: 'feature:trials' })),
  rec(ids.work('one', 'kept'), 'work', workBody('one', 'kept')),
  rec(stray, 'work', workBody('one', 'stray')),
];
const gone = [...base, rec(stray, 'work', { ...workBody('one', 'stray'), withdrawn: reason }), rec('feature:empty', 'feature', { ...featureBody('empty', { parent: 'feature:trials' }), withdrawn: reason })];
const propose = (id: string, kind: 'feature' | 'work', body: object, replaces: string | null = null) => ({ id, kind, by: agent, replaces, body: body as Record<string, unknown> });

describe('a withdrawn feature or piece of work', () => {
  it('leaves the feature tree, the story, the grid and the pages', () => {
    const now = current(gone);
    expect(flatten(featureTree(now)).map((f) => f.id)).toEqual(['feature:trials', 'feature:one']);
    expect(storyOf(now, 'feature:one').map((s) => s.item.id)).toEqual([ids.work('one', 'kept')]);
    expect(gridOf(now, 'feature:trials')?.rows.map((r) => [r.feature, r.cells.map((c) => c?.work)])).toEqual([['feature:one', [ids.work('one', 'kept')]]]);
    expect(now.get(stray)).toBeUndefined();
    expect(now.get('feature:empty')).toBeUndefined();
  });

  it('is hidden the same way when the store reads the book', () => {
    // The store gives the latest version of each id, with when it first appeared.
    const fromStore = [...new Map(gone.map((r) => [r.id, { ...r, firstAt: r.at }])).values()];
    expect(currentOf(fromStore).get(stray)).toBeUndefined();
    expect([...currentOf(fromStore).keys()]).toEqual([...current(gone).keys()]);
  });

  it('changes nothing that waits on the editor', () => {
    expect(attentionOf('b', current(gone), 'editor', '2026-11-22').count).toBe(attentionOf('b', current(base), 'editor', '2026-11-22').count);
  });

  it('cannot be changed, withdrawn again or named by anything new', () => {
    const now = current(gone);
    expect(refusals(now, propose(stray, 'work', { ...workBody('one', 'stray'), withdrawn: reason })).join()).toMatch(/Only a feature or work already in the book/);
    expect(refusals(now, { id: 'paper:one/stray/intent/editor', kind: 'paper', by: agent, replaces: null, body: { work: stray, kind: 'intent', for: 'editor', text: 't' } }).join()).toMatch(/is not a work in this book/);
    expect(refusals(now, propose(ids.work('empty', 'x'), 'work', workBody('empty', 'x'))).join()).toMatch(/is not a feature in this book/);
  });

  it('comes back when it is added again under the same name', () => {
    expect(refusals(current(gone), propose(stray, 'work', workBody('one', 'stray')))).toEqual([]);
    const back = current([...gone, rec(stray, 'work', workBody('one', 'stray'))]);
    expect(storyOf(back, 'feature:one').map((s) => s.item.id)).toEqual([ids.work('one', 'kept'), stray]);
  });
});

describe('the rules for withdrawing', () => {
  const withdrawWork = (records: BookRecord[], body = workBody('one', 'stray')) => refusals(current(records), propose(stray, 'work', { ...body, withdrawn: reason }));
  const withdrawFeature = (records: BookRecord[], slug: string, extra: object = {}) =>
    refusals(current(records), propose(ids.feature(slug), 'feature', { ...featureBody(slug, extra), withdrawn: reason }));

  it('takes work with nothing on it and a feature with nothing under it, with a one-line reason', () => {
    expect(withdrawWork(base)).toEqual([]);
    expect(withdrawFeature(base, 'empty', { parent: 'feature:trials' })).toEqual([]);
    expect(refusals(current(base), propose(stray, 'work', { ...workBody('one', 'stray'), withdrawn: { reason: 'One.\nTwo.' } }))).not.toEqual([]);
  });

  it('keeps everything else the record said', () => {
    expect(withdrawWork(base, { ...workBody('one', 'stray'), summary: 'changed' }).join()).toMatch(/keeps everything else/);
  });

  it('refuses a feature with anything under it, and says what', () => {
    expect(withdrawFeature(base, 'one', { parent: 'feature:trials' }).join()).toMatch(/2 pieces of work/);
    expect(withdrawFeature(base, 'trials', { view: { kind: 'grid' } }).join()).toMatch(/2 features/);
    const evented = [...base, rec('event:empty/x', 'event', { feature: 'feature:empty', title: 'x', on: '2026-11-22', text: 't' })];
    expect(withdrawFeature(evented, 'empty', { parent: 'feature:trials' }).join()).toMatch(/1 event/);
    const guarded = [...base, rec('guard:g', 'guard', { work: ids.work('one', 'kept'), feature: 'feature:empty', why: 'w', checks: ['c'], runs: 'r' })];
    expect(withdrawFeature(guarded, 'empty', { parent: 'feature:trials' }).join()).toMatch(/guard:g/);
  });

  it('lets a feature go once its last work is withdrawn', () => {
    const alone = [...base.filter((r) => r.id !== ids.work('one', 'kept')), rec(stray, 'work', { ...workBody('one', 'stray'), withdrawn: reason })];
    expect(withdrawFeature(alone, 'one', { parent: 'feature:trials' })).toEqual([]);
  });

  it('refuses work that is done or has anything recorded on it, and points to replacing it', () => {
    const done = base.map((r) => (r.id === stray ? { ...r, body: workBody('one', 'stray', 'done') } : r));
    expect(withdrawWork(done, workBody('one', 'stray', 'done')).join()).toMatch(/done.*book_add_work with replaces/);
    for (const [id, kind, body] of [
      ['paper:one/stray/intent/editor', 'paper', { work: stray, kind: 'intent', for: 'editor', text: 't' }],
      ['finding:f', 'finding', { work: stray, text: 't' }],
      ['link:l', 'link', { from: ids.work('one', 'kept'), to: stray, kind: 'leads-to' }],
      [ids.work('one', 'after'), 'work', { ...workBody('one', 'after'), origin: { work: stray } }],
    ] as const) {
      expect(withdrawWork([...base, rec(id, kind, body)]).join()).toContain(id);
    }
    expect(withdrawWork([...base, rec(ids.work('one', 'again'), 'work', workBody('one', 'again'), stray)]).join()).toContain(ids.work('one', 'again'));
    expect(withdrawWork([...base, rec('finding:gone', 'finding', { work: stray, text: 't', withdrawn: { reason: 'r' } })])).toEqual([]);
    const moved = [...base, rec('finding:wrong', 'finding', { work: stray, text: 't' }), rec('finding:moved', 'finding', { work: ids.work('one', 'kept'), text: 't' }, 'finding:wrong')];
    expect(withdrawWork(moved)).toEqual([]);
    const replacing = [...base, rec(ids.work('one', 'again'), 'work', workBody('one', 'again'), stray)];
    expect(refusals(current(replacing), propose(ids.work('one', 'again'), 'work', { ...workBody('one', 'again'), withdrawn: reason }, stray)).join()).toMatch(/would bring that work back/);
  });
});
