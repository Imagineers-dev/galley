// What a study book shows in place of a product's stages and words, and the edges of its lesson page.
import { describe, expect, it } from 'vitest';
import { workInMotion } from '../lib/book/diary-now';
import { lessonOf } from '../lib/book/lesson';
import { deliversProduct, keyed, liveTicks, stepChanges } from '../lib/book/study';
import { tickId } from '../lib/book/study-types';
import type { Work } from '../lib/book/types';
import { current } from '../lib/book/views';
import { wordsOf } from '../lib/book/vocabulary';
import { refusals } from '../lib/rules/check';
import { P, book, propose, rec, step } from './helpers/study-book';

const id = (i: number) => `work:l/s${i}`;
const ticked = (done = true) => rec(tickId(id(0), 'one'), 'tick', { work: id(0), pointer: 'one', done }, 'editor');

describe('a study step in motion', () => {
  it('shows pointer progress in place of the eight stages', () => {
    const [m] = workInMotion(current([...book(['now']), ticked()]), undefined);
    expect(m.steps).toEqual([]);
    expect(m.progress).toBe('1 of 1 done');
  });
  it('with no pointers it says where it stands', () => {
    const records = book(['next', 'now']);
    expect(workInMotion(current(records), undefined)[0].progress).toBe('under way');
  });
  it('a product step keeps its stages', () => {
    const [m] = workInMotion(current(book(['now'], {})), undefined);
    expect(m.steps).toHaveLength(8);
    expect(m.progress).toBeNull();
  });
});

describe('the words of each kind of book', () => {
  it('a product book keeps its words and its reports', () => {
    const now = current(book(['now'], {}));
    expect(wordsOf(now).storyCount(2, 1)).toBe('2 pieces of work · 1 event');
    expect(wordsOf(now).featureIs('The book')).toBe('Feature of The book');
    expect(deliversProduct(now)).toBe(true);
  });
  it('a study book counts steps and reports no delivery', () => {
    const now = current(book(['now']));
    expect(wordsOf(now).storyCount(5, 0)).toBe('5 steps');
    expect(wordsOf(now).works(1)).toBe('1 step');
    expect(wordsOf(now).addedOn('now')).toBe('Planned');
    expect(deliversProduct(now)).toBe(false);
    expect(wordsOf(now).yearLine({ commits: 0, commitDays: 0, began: '22 November', recordedDays: 1 })).toBe('You began on 22 November and have recorded 1 day');
  });
});

describe('the lesson page', () => {
  it('names the group from the parent grid', () => {
    const records = [
      rec('project', 'project', { title: 'T', forWriter: 'x', kind: 'study' }),
      rec('feature:p', 'feature', { title: 'Layers', slug: 'p', forWriter: 'x', view: { kind: 'grid', groups: [{ title: 'See it', size: 1 }, { title: 'Build it', size: 1 }] } }),
      rec('feature:l', 'feature', { title: 'Layer', slug: 'l', forWriter: 'x', parent: 'feature:p' }),
      rec(id(0), 'work', step('s0', 'now')),
      rec(id(1), 'work', step('s1', 'next')),
    ];
    expect(lessonOf(current(records), id(1), records[4].body as Work).eyebrow).toBe('Layer · step 2 of 2 · Build it');
  });
  it('a replaced step names what took its place and claims no group', () => {
    const records = [...book(['now']), rec('work:l/new', 'work', step('new', 'next'), 'agent:a', id(0))];
    const lesson = lessonOf(current(records), id(0), records[2].body as Work);
    expect(lesson.replacedBy?.id).toBe('work:l/new');
    expect(lesson.eyebrow).toBe('Layer');
  });
  it('hands over the video and its start', () => {
    const link = 'https://www.youtube.com/watch?v=LPZh9BOjkQs&t=467s';
    const body = step('s0', 'now', { pointers: [{ ...P, link }] }) as unknown as Work;
    expect(lessonOf(current([...book(['now']), rec(id(0), 'work', body)]), id(0), body).pointers[0].video).toEqual({ id: 'LPZh9BOjkQs', start: 467 });
  });
});

describe('the edges of marking', () => {
  it('a step the editor reopened is not dropped by taking back an earlier one', () => {
    const records = [...book(['done', 'now', 'next']), rec(id(1), 'work', step('s1', 'now'), 'editor')];
    expect(stepChanges(current(records), id(1), true)[0]).toEqual({ id: id(1), state: 'done', startedBy: null });
    expect(stepChanges(current(records), id(0), false)).toEqual([{ id: id(0), state: 'now' }]);
  });
  it('only a standing tick counts', () => {
    expect(liveTicks(current([...book(['now']), ticked()]))).toHaveLength(1);
    expect(liveTicks(current([...book(['now']), ticked(false)]))).toHaveLength(0);
  });
  it('a standing tick keeps a step from being withdrawn; an untick does not', () => {
    const withdraw = propose('work', id(0), { ...step('s0', 'now', { pointers: [P] }), withdrawn: { reason: 'by mistake' } });
    expect(refusals(current([...book(['now']), ticked()]), withdraw).join()).toMatch(/recorded on it/);
    expect(refusals(current([...book(['now']), ticked(false)]), withdraw)).toEqual([]);
  });
  it('a title with no Latin letters is refused with a plain reason', () => {
    const pointers = keyed([{ act: 'do', title: 'ಕನ್ನಡ' }]);
    expect(refusals(current(book(['now', 'next'])), propose('work', id(1), step('s1', 'next', { pointers }))).join()).toMatch(/give this pointer a key/);
  });
});
