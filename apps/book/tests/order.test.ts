// The order of a list is said once, by an order record, and every view follows it: the feature tree, a story within
// a day, the grid's rows and columns. A partial order puts the named first; the rest follow by when they were added.
import { describe, expect, it } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { gridOf } from '../lib/book/grid';
import { orderId } from '../lib/book/order';
import { current, featureTree, flatten, readingList, storyOf } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 22, 9, 0, tick++)).toISOString();
const agent = 'agent:claude';
const rec = (id: string, kind: BookRecord['kind'], body: object, replaces: string | null = null): BookRecord =>
  ({ book: 'b', id, kind, by: agent, at: at(), replaces, body: body as Record<string, unknown> });
const feature = (slug: string, extra: object = {}) => rec(ids.feature(slug), 'feature', { title: slug.toUpperCase(), slug, forWriter: 'x', ...extra });
const work = (story: string, slug: string, on = '2026-11-22', replaces: string | null = null) =>
  rec(ids.work(story, slug), 'work', { feature: ids.feature(story), title: slug, slug, on, state: 'next', summary: 's', origin: { words: 'w', saidOn: on } }, replaces);
const order = (of: 'features' | 'work', items: string[], under?: string) =>
  rec(orderId(of, under), 'order', { of, ...(under ? { feature: under } : {}), items });
const propose = (of: 'features' | 'work', items: string[], under?: string, id = orderId(of, under)) =>
  ({ id, kind: 'order' as const, by: agent, replaces: null, body: { of, ...(under ? { feature: under } : {}), items } });

const base = [
  rec('project', 'project', { title: 'P', forWriter: 'x' }),
  feature('a'), feature('b'), feature('c'),
  feature('trials', { view: { kind: 'grid' } }),
  feature('one', { parent: 'feature:trials' }), feature('two', { parent: 'feature:trials' }),
  work('a', 'first'), work('a', 'second'), work('a', 'third'),
  rec('event:a/fell', 'event', { feature: 'feature:a', title: 'Fell', on: '2026-11-22', text: 't' }),
  work('a', 'later', '2026-11-23'),
  work('one', 'premise'), work('one', 'people'), work('one', 'treatment'),
  work('two', 'premise'), work('two', 'people'),
];
const top = (records: BookRecord[]) => featureTree(current(records)).map((f) => f.id);
const story = (records: BookRecord[]) => storyOf(current(records), 'feature:a').map((s) => s.item.id);

describe('the order of a list', () => {
  it('changes nothing until an order is said', () => {
    expect(top(base)).toEqual(['feature:a', 'feature:b', 'feature:c', 'feature:trials']);
    expect(story(base)).toEqual(['work:a/first', 'work:a/second', 'work:a/third', 'event:a/fell', 'work:a/later']);
  });

  it("puts the book's features in the order said, and only those listed first when the list is partial", () => {
    expect(top([...base, order('features', ['feature:trials', 'feature:c', 'feature:a', 'feature:b'])])).toEqual(['feature:trials', 'feature:c', 'feature:a', 'feature:b']);
    expect(top([...base, order('features', ['feature:c'])])).toEqual(['feature:c', 'feature:a', 'feature:b', 'feature:trials']);
  });

  it('orders the features under a feature without moving any other list', () => {
    const records = [...base, order('features', ['feature:two', 'feature:one'], 'feature:trials')];
    expect(top(records)).toEqual(top(base));
    expect(featureTree(current(records)).at(-1)?.children.map((c) => c.id)).toEqual(['feature:two', 'feature:one']);
    expect(flatten(featureTree(current(records))).map((f) => f.id).slice(-2)).toEqual(['feature:two', 'feature:one']);
  });

  it('keeps a story day by day, with the order said deciding within a day', () => {
    const records = [...base, order('work', ['work:a/later', 'work:a/third', 'work:a/first'], 'feature:a')];
    expect(story(records)).toEqual(['work:a/third', 'work:a/first', 'work:a/second', 'event:a/fell', 'work:a/later']);
  });

  it('follows the latest version of an order, and reads papers in the new order', () => {
    const paper = (w: string) => rec(ids.paper(w, 'intent', 'editor'), 'paper', { work: w, kind: 'intent', for: 'editor', text: 'why' });
    const records = [...base, paper('work:a/first'), paper('work:a/second'), order('work', ['work:a/third'], 'feature:a'), order('work', ['work:a/second'], 'feature:a')];
    expect(story(records).slice(0, 3)).toEqual(['work:a/second', 'work:a/first', 'work:a/third']);
    expect(readingList(current(records)).map((r) => r.work?.id)).toEqual(['work:a/second', 'work:a/first']);
  });

  it("orders a grid's rows and each row's steps", () => {
    const records = [
      ...base,
      order('features', ['feature:two'], 'feature:trials'),
      order('work', ['work:one/treatment', 'work:one/premise'], 'feature:one'),
    ];
    const grid = gridOf(current(records), 'feature:trials');
    expect(grid?.rows.map((r) => r.feature)).toEqual(['feature:two', 'feature:one']);
    expect(grid?.rows[1].cells.map((c) => c?.work)).toEqual(['work:one/treatment', 'work:one/premise', 'work:one/people']);
  });

  it('keeps a replaced step in the place the order gave the work it replaced', () => {
    const records = [...base, order('work', ['work:one/people', 'work:one/premise'], 'feature:one'), work('one', 'people-again', '2026-11-22', 'work:one/people')];
    const grid = gridOf(current(records), 'feature:trials');
    expect(grid?.rows[0].cells.map((c) => c?.work)).toEqual(['work:one/people-again', 'work:one/premise', 'work:one/treatment']);
  });

  it('ignores an item that has moved to another list', () => {
    const moved = { ...base.find((r) => r.id === 'feature:one'), at: at(), body: { title: 'ONE', slug: 'one', forWriter: 'x' } } as BookRecord;
    const records = [...base, order('features', ['feature:one', 'feature:two'], 'feature:trials'), moved];
    expect(featureTree(current(records)).find((f) => f.id === 'feature:trials')?.children.map((c) => c.id)).toEqual(['feature:two']);
    expect(top(records)).toEqual(['feature:a', 'feature:b', 'feature:c', 'feature:trials', 'feature:one']);
  });
});

describe('the rules for an order', () => {
  const now = current(base);
  it('takes a whole or partial list of the right things', () => {
    expect(refusals(now, propose('features', ['feature:c', 'feature:a']))).toEqual([]);
    expect(refusals(now, propose('features', ['feature:two'], 'feature:trials'))).toEqual([]);
    expect(refusals(now, propose('work', ['work:a/third'], 'feature:a'))).toEqual([]);
    expect(refusals(now, propose('work', [], 'feature:a'))).toEqual([]);
  });

  it('refuses what is not in the book, of the wrong kind, in another list, or named twice', () => {
    expect(refusals(now, propose('features', ['feature:nope'])).join()).toMatch(/"feature:nope" is not in this book/);
    expect(refusals(now, propose('features', ['work:a/first'])).join()).toMatch(/is a work, not a feature/);
    expect(refusals(now, propose('features', ['feature:one'])).join()).toMatch(/"feature:one" is not one of the book's top features/);
    expect(refusals(now, propose('features', ['feature:a'], 'feature:trials')).join()).toMatch(/"feature:a" is not under "feature:trials"/);
    expect(refusals(now, propose('work', ['work:one/premise'], 'feature:a')).join()).toMatch(/"work:one\/premise" is not work in "feature:a"/);
    expect(refusals(now, propose('features', ['feature:a', 'feature:a'])).join()).toMatch(/"feature:a" is named twice/);
  });

  it("refuses work with no feature, a feature that isn't one, and an id that does not match the list", () => {
    expect(refusals(now, propose('work', ['work:a/first'])).join()).toMatch(/names the feature/);
    expect(refusals(now, propose('work', [], 'feature:nope')).join()).toMatch(/not a feature in this book/);
    expect(refusals(now, propose('features', [], undefined, 'order:features:a')).join()).toMatch(/This order's id is order:features\./);
  });
});
