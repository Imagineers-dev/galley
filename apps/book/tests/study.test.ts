import { describe, expect, it } from 'vitest';
import { lessonOf, minutesWords, totalWords, totalsLine } from '../lib/book/lesson';
import { keyed, stepChanges, tickKeysOf, tickedKeys } from '../lib/book/study';
import { tickId } from '../lib/book/study-types';
import type { Work } from '../lib/book/types';
import { clockWords, videoPlayer, youtubeVideo } from '../lib/book/video';
import { current } from '../lib/book/views';
import { wordsOf } from '../lib/book/vocabulary';
import { pickup } from '../lib/book/pickup';
import { doneWork } from '../lib/book/proof';
import { refusals } from '../lib/rules/check';
import { P, book, propose, rec, step } from './helpers/study-book';

const withPointers = (pointers: object[]) => propose('work', 'work:l/s1', step('s1', 'next', { pointers }));

describe('the video id', () => {
  it.each([
    ['https://www.youtube.com/watch?v=LPZh9BOjkQs', 'LPZh9BOjkQs'],
    ['https://youtu.be/zjkBMFhNj_g?t=30', 'zjkBMFhNj_g'],
    ['https://m.youtube.com/watch?list=x&v=LPZh9BOjkQs', 'LPZh9BOjkQs'],
  ])('reads %s', (link, id) => expect(youtubeVideo(link)?.id).toBe(id));
  it.each(['https://evil.example/watch?v=LPZh9BOjkQs', 'https://youtube.com.evil.example/watch?v=LPZh9BOjkQs', 'https://www.youtube.com/watch?v=bad"id', 'javascript:alert(1)', undefined])(
    'refuses %s', (link) => expect(youtubeVideo(link)).toBeNull());
  it('plays from the no-cookie address', () => expect(videoPlayer('LPZh9BOjkQs')).toContain('youtube-nocookie.com/embed/LPZh9BOjkQs'));
  it.each([['&t=467s', 467], ['&t=467', 467], ['&t=7m47s', 467], ['&t=1h2m3s', 3723], ['', null], ['&t=0', null], ['&t=soon', null], ['&t=999999999999999999999', null], ['#t=90', 90]])(
    'reads the start in "%s"', (t, start) => expect(youtubeVideo(`https://www.youtube.com/watch?v=LPZh9BOjkQs${t}`)?.start).toBe(start));
  it('starts the player there and says where', () => {
    expect(videoPlayer('LPZh9BOjkQs', 467)).toContain('&start=467');
    expect(videoPlayer('LPZh9BOjkQs')).not.toContain('start=');
    expect(clockWords(467)).toBe('7:47');
    expect(clockWords(3723)).toBe('1:02:03');
  });
});

describe('the words of a book', () => {
  it('a study book says journey and steps; a product book is unchanged', () => {
    expect(wordsOf(current(book(['next']))).features).toBe('The journey');
    expect(wordsOf(current(book(['next']))).pieces(2)).toBe('2 steps');
    expect(wordsOf(current(book(['next'], {}))).features).toBe('The product');
  });
  it('only a product book complains that no repository has reported', () => {
    expect(pickup('b', current(book(['next'])), 'editor', '2026-11-23').disagreements).toEqual([]);
    expect(pickup('b', current(book(['next'], {})), 'editor', '2026-11-23').disagreements[0]).toMatch(/No repository/);
  });
});

describe('the pointer rules', () => {
  const now = current(book(['now', 'next']));
  it('accepts a good list', () => expect(refusals(now, withPointers([P, { ...P, key: 'two', link: 'https://example.com/a' }]))).toEqual([]));
  it('refuses a duplicate key', () => expect(refusals(now, withPointers([P, P])).join()).toMatch(/Two pointers/));
  it('refuses an empty title', () => expect(refusals(now, withPointers([{ ...P, title: ' ' }]))).not.toEqual([]));
  it('refuses a link that is not allowed', () => expect(refusals(now, withPointers([{ ...P, link: 'javascript:alert(1)' }])).join()).toMatch(/link/));
  it('refuses more than twelve', () => {
    const many = Array.from({ length: 13 }, (_, i) => ({ ...P, key: `k${i}` }));
    expect(refusals(now, withPointers(many)).join()).toMatch(/at most 12/);
  });
  it('keeps a key when a video is retitled, and makes one from a new title', () => {
    const old = [{ ...P, key: 'kept', link: 'https://youtu.be/LPZh9BOjkQs' }];
    expect(keyed([{ act: 'watch', title: 'New name', link: old[0].link }, { act: 'do', title: 'Write it out' }], old).map((p) => p.key)).toEqual(['kept', 'write-it-out']);
  });
});

describe('ticks', () => {
  const work = 'work:l/s0';
  const tick = (by = 'editor', pointer = 'one') => propose('tick', tickId(work, pointer), { work, pointer, done: true }, by);
  it('the editor ticks a pointer the step holds', () => expect(refusals(current(book(['now'])), tick())).toEqual([]));
  it('an agent cannot', () => expect(refusals(current(book(['now'])), tick('agent:a')).join()).toMatch(/Only the editor/));
  it('a pointer that does not exist is refused', () => expect(refusals(current(book(['now'])), tick('editor', 'gone')).join()).toMatch(/no pointer/));
  it('a product book has none', () => expect(refusals(current(book(['now'], {})), tick()).join()).toMatch(/study book/));
  it('a tick for a removed pointer is not shown or counted', () => {
    const records = [...book(['now']), rec(tickId(work, 'one'), 'tick', { work, pointer: 'one', done: true }, 'editor')];
    expect(tickedKeys(current(records), work).size).toBe(1);
    const removed = [...records, rec(work, 'work', step('s0', 'now', { pointers: [{ ...P, key: 'other' }] }))];
    expect(tickedKeys(current(removed), work).size).toBe(0);
  });
  it('unticking is a later version', () => {
    const records = [...book(['now']), rec(tickId(work, 'one'), 'tick', { work, pointer: 'one', done: true }, 'editor'), rec(tickId(work, 'one'), 'tick', { work, pointer: 'one', done: false }, 'editor')];
    expect(tickedKeys(current(records), work).size).toBe(0);
  });
});

describe('I have it', () => {
  const id = (i: number) => `work:l/s${i}`;
  it('finishes the step and starts the next', () => {
    expect(stepChanges(current(book(['now', 'next', 'next'])), id(0), true)).toEqual([{ id: id(0), state: 'done', startedBy: null }, { id: id(1), state: 'now', startedBy: id(0) }]);
  });
  it('starts nothing when another step is under way', () => {
    expect(stepChanges(current(book(['next', 'now', 'next'])), id(0), true)).toEqual([{ id: id(0), state: 'done', startedBy: null }]);
  });
  it('skips steps already done', () => {
    expect(stepChanges(current(book(['now', 'done', 'next'])), id(0), true)[1]).toEqual({ id: id(2), state: 'now', startedBy: id(0) });
  });
  it('taken back, the step is under way and the step it started waits again', () => {
    const records = [...book(['done', 'next']), rec(id(1), 'work', step('s1', 'now', { startedBy: id(0) }), 'agent:a')];
    expect(stepChanges(current(records), id(0), false)).toEqual([{ id: id(0), state: 'now' }, { id: id(1), state: 'next', startedBy: null }]);
  });
  it('a study step needs no verdict or proof; a product step still does', () => {
    expect(refusals(current(book(['now'])), propose('work', id(0), step('s0', 'done', { pointers: [P] }), 'editor'))).toEqual([]);
    expect(refusals(current(book(['now'], {})), propose('work', id(0), step('s0', 'done', { pointers: [P] }))).join()).toMatch(/served its users/);
  });
  it('the editor changes only the state of a step', () => {
    expect(refusals(current(book(['now'])), propose('work', id(0), step('s0', 'now', { pointers: [P], summary: 'changed' }), 'editor')).join()).toMatch(/only whether/);
    expect(refusals(current(book(['now'], {})), propose('work', id(0), step('s0', 'next', { pointers: [P] }), 'editor')).join()).toMatch(/editor answers/);
  });
});

describe('what an agent may not do to a study book', () => {
  const id = 'work:l/s0';
  it('an agent cannot mark a step done, but may edit one the editor finished', () => {
    expect(refusals(current(book(['now'])), propose('work', id, step('s0', 'done', { pointers: [P] }))).join()).toMatch(/served its users/);
    expect(refusals(current(book(['done'])), propose('work', id, step('s0', 'done', { pointers: [P], haveItWhen: 'x' }))).filter((r) => /verdict|proof/.test(r))).toEqual([]);
  });
  it('a product book holding product work cannot become a study book, and a study book stays one', () => {
    const paper = rec('paper:l/s0/intent/editor', 'paper', { work: id, kind: 'intent', for: 'editor', text: 't' });
    const study = propose('project', 'project', { title: 'T', forWriter: 'x', kind: 'study' });
    expect(refusals(current([...book(['now'], {}).map((r) => (r.kind === 'work' ? { ...r, body: step('s0', 'now') } : r)), paper]), study).join()).toMatch(/cannot become/);
    expect(refusals(current(book(['now'])), propose('project', 'project', { title: 'T', forWriter: 'x' })).join()).toMatch(/stays/);
  });
  it('finished study steps are not reported as missing proof', () => expect(doneWork(current(book(['done'])))).toEqual([]));
  it('a young book with decisions cannot become a study book', () => {
    const d = rec('decision:1', 'decision', { work: id });
    expect(refusals(current([...book(['next'], {}).slice(0, 2), d]), propose('project', 'project', { title: 'T', forWriter: 'x', kind: 'study' })).join()).toMatch(/cannot become/);
  });
  it('a product step cannot hold pointers', () => {
    const records = book(['now'], {}).map((r) => (r.kind === 'work' ? { ...r, body: step('s0', 'now') } : r));
    expect(refusals(current(records), propose('work', id, step('s0', 'now', { pointers: [P] }))).join()).toMatch(/study book/);
  });
  it('taking back one step never returns a step another one started', () => {
    const records = [...book(['done', 'done']), rec('work:l/s2', 'work', step('s2', 'now', { startedBy: 'work:l/s1' }))];
    expect(stepChanges(current(records), id, false)).toEqual([{ id, state: 'now' }]);
  });
  it('a pointer with no link never takes the key of a linked one', () => {
    const old = [{ ...P, key: 'intro', title: 'Intro', link: 'https://youtu.be/AAAAAAAAAAA' }];
    expect(keyed([{ act: 'do', title: 'Intro' }, { act: 'watch', title: 'Renamed', link: old[0].link }], old).map((p) => p.key)).toEqual(['intro-2', 'intro']);
  });
  it('a new pointer never reuses a key a removed pointer was ticked under', () => {
    const records = [...book(['now']), rec(tickId(id, 'intro'), 'tick', { work: id, pointer: 'intro', done: true }, 'editor')];
    expect(keyed([{ act: 'watch', title: 'Intro' }], [], tickKeysOf(current(records), id))[0].key).toBe('intro-2');
  });
  it('a made key is always a valid key', () => {
    const title = `${'a'.repeat(55)} bbbbbbbb`;
    expect(keyed([{ act: 'do', title }, { act: 'do', title }])[1].key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it('a new video under an old title never inherits its tick', () => {
    const old = [{ ...P, key: 'intro', title: 'Intro', link: 'https://youtu.be/AAAAAAAAAAA' }];
    expect(keyed([{ act: 'watch', title: 'Intro', link: 'https://youtu.be/BBBBBBBBBBB' }], old)[0].key).toBe('intro-2');
  });
});

describe('the lesson', () => {
  it('says where the step sits, its totals and its neighbours', () => {
    const records = book(['now', 'next']);
    const lesson = lessonOf(current(records), 'work:l/s1', records[3].body as Work);
    expect(lesson.eyebrow).toBe('Layer · step 2 of 2');
    expect(lesson.previous?.id).toBe('work:l/s0');
    expect(lesson.next).toBeNull();
    expect(lesson.pointers).toEqual([]);
  });
  it('words time plainly', () => {
    expect(minutesWords(8)).toBe('8 minutes');
    expect(minutesWords(60)).toBe('1 hr');
    expect(minutesWords(135)).toBe('2 hr 15 min');
    expect(totalWords(88)).toBe('about 1.5 hours');
    expect(totalWords(540)).toBe('about 9 hours');
    expect(totalsLine([P, { ...P, key: 'b', act: 'do', minutes: 20 }])).toBe('28 minutes · 1 to watch · 1 to do');
  });
});
