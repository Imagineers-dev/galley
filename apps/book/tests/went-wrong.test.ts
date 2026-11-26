// What went wrong in a feature: the events on it or on its work, newest first, with what each broke and led to.
import { describe, expect, it } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { wentWrong } from '../lib/book/went-wrong';
import { P, WORK, book, rec, workBody } from './helpers/promise-book';

const event = (slug: string, more: object = {}, feature = 'feature:scene') =>
  rec(`event:${slug}`, 'event', { feature, title: `Event ${slug}`, on: '2026-11-20', text: 'It went wrong.', ...more });
const elsewhere = (slug: string) => event(slug, {}, 'feature:far');
const leadsTo = (from: string, to: string) => rec(`link:${from}-${to}`, 'link', { from, to, kind: 'leads-to' });
const cameFrom = (from: string, to: string) => rec(`link:${from}-${to}`, 'link', { from, to, kind: 'came-from' });
const begunFrom = (eventId: string) => rec('work:scene/fix', 'work', workBody({ slug: 'fix', title: 'The fix', origin: { event: eventId } }));

const cases: { name: string; more: BookRecord[]; feature?: string; want: string[] }[] = [
  { name: 'a feature with no events has nothing', more: [], want: [] },
  { name: 'an event on the feature is listed', more: [event('a')], want: ['event:a'] },
  { name: 'an event on another feature is not', more: [elsewhere('b')], want: [] },
  { name: 'newest day first, then the later one written that day', more: [event('old', { on: '2026-11-01' }), event('first'), event('second')], want: ['event:second', 'event:first', 'event:old'] },
  { name: 'an event elsewhere that led to work here is listed', more: [elsewhere('c'), leadsTo('event:c', WORK)], want: ['event:c'] },
  { name: 'so is one the work says it came from', more: [elsewhere('d'), cameFrom(WORK, 'event:d')], want: ['event:d'] },
  { name: 'so is one a piece of work here began from', more: [elsewhere('e'), begunFrom('event:e')], want: ['event:e'] },
  { name: "a child feature's events stay on the child", more: [event('f', {}, 'feature:child')], want: [] },
  { name: 'a parent shows none of its children’s events', more: [event('g')], feature: 'feature:top', want: [] },
];

describe('what went wrong in a feature', () => {
  it.each(cases)('$name', ({ more, feature = 'feature:scene', want }) => {
    expect(wentWrong(current([...book().records, ...more]), feature).map((e) => e.id)).toEqual(want);
  });

  it('names the promises an event broke, once each, and the work it led to', () => {
    const breaks = [{ promise: P, subject: 'synthetic' }, { promise: P, subject: { real: 'x' } }];
    const [e] = wentWrong(current([...book().records, event('h', { breaks }), leadsTo('event:h', WORK)]), 'feature:scene');
    expect(e).toMatchObject({ broke: [{ id: P, text: 'Only your choice stops a draft.' }], noPromiseYet: false, ledTo: [{ id: WORK, title: 'Draft' }] });
  });

  it('says when no promise covered what went wrong', () => {
    const [e] = wentWrong(current([...book().records, event('i', { noPromiseYet: true })]), 'feature:scene');
    expect(e).toMatchObject({ broke: [], noPromiseYet: true, ledTo: [] });
  });
});
