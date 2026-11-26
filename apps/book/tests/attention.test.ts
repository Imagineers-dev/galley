// What waits on the editor is worked out once (lib/book/attention.ts), and every screen and tool reads that one
// count: papers waiting count as one reading list, what went wrong is told but not counted, and nothing else in
// the code counts what waits on its own.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { attentionOf } from '../lib/book/attention';
import { pickup } from '../lib/book/pickup';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { markId } from '../lib/book/inbox-types';
import { current } from '../lib/book/views';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 19, 8, 0, tick++)).toISOString();
const rec = (r: Omit<BookRecord, 'book' | 'at' | 'replaces'>): BookRecord => ({ book: 'b', at: at(), replaces: null, ...r });
const agent = 'agent:claude';
const work = ids.work('tasks', 'goal');
const ask = (subject: string) => ({ work, to: 'editor', needs: 'decision', subject, text: 't' });
const records = [
  rec({ id: 'project', kind: 'project', by: agent, body: { title: 'P', forWriter: 'x' } }),
  rec({ id: 'feature:tasks', kind: 'feature', by: agent, body: { title: 'Tasks', slug: 'tasks', forWriter: 'x' } }),
  rec({ id: work, kind: 'work', by: agent, body: { feature: 'feature:tasks', title: 'Goal', slug: 'goal', on: '2026-11-18', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-18' } } }),
  rec({ id: ids.paper(work, 'intent', 'editor'), kind: 'paper', by: agent, body: { work, kind: 'intent', for: 'editor', text: 'why' } }),
  rec({ id: ids.paper(work, 'spec', 'editor'), kind: 'paper', by: agent, body: { work, kind: 'spec', for: 'editor', text: 'what' } }),
  rec({ id: 'ask:open', kind: 'ask', by: agent, body: ask('Decide: open') }),
  rec({ id: 'ask:archived', kind: 'ask', by: agent, body: ask('Decide: archived') }),
  rec({ id: markId('editor', 'ask:archived'), kind: 'mark', by: 'editor', body: { message: 'ask:archived', person: 'editor', state: 'archived' } }),
  rec({ id: 'event:broke', kind: 'event', by: agent, body: { feature: 'feature:tasks', title: 'Broke', on: '2026-11-19', text: 'x' } }),
];

describe('attention', () => {
  const now = current(records);
  const attention = attentionOf('b', now, 'editor', '2026-11-19');

  it('counts each open ask, and the waiting papers once, as one reading list', () => {
    expect(attention.asks.map((m) => m.id)).toEqual(['ask:open']);
    expect(attention.readingList?.papers).toHaveLength(2);
    expect(attention.count).toBe(2);
    expect(attention.byNeed).toEqual({ decision: 1, approval: 2, try: 0, fyi: 0, wrong: 1 });
  });

  it('a snooze holds until its day, judged on the day the book is read as of', () => {
    const snoozed = [...records, rec({ id: markId('editor', 'ask:open'), kind: 'mark', by: 'editor', body: { message: 'ask:open', person: 'editor', state: 'snoozed', until: '2026-11-21' } })];
    expect(attentionOf('b', current(snoozed), 'editor', '2026-11-19').snoozed.map((m) => m.id)).toEqual(['ask:open']);
    expect(attentionOf('b', current(snoozed), 'editor', '2026-11-22').asks.map((m) => m.id)).toEqual(['ask:open']);
  });

  it('tells what went wrong without counting it', () => {
    expect(attention.wrong.map((m) => m.id)).toEqual(['event:broke']);
  });

  it('the pick-up says the same number', () => {
    expect(pickup('b', now, 'editor', '2026-11-19').waitingOnYou).toBe(attention.count);
  });

  it('nothing else in the code counts what waits on the editor', () => {
    const root = join(import.meta.dirname, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) files.push(path);
      }
    };
    walk(join(root, 'app'));
    walk(join(root, 'lib'));
    // Outside the two views that define them (attention.ts and inbox.ts), nothing builds messages or filters the inbox:
    // screens and tools read lib/book/attention.ts.
    const views = [join('lib', 'book', 'attention.ts'), join('lib', 'book', 'inbox.ts')];
    const counting = files.filter((f) => {
      if (views.some((v) => f.endsWith(v))) return false;
      const text = readFileSync(f, 'utf8');
      return /\bwaitingOn\(|\bmessagesOf\(|\.filter\([^;\n]*folder === 'inbox'/.test(text);
    });
    expect(counting.map((f) => f.slice(root.length + 1))).toEqual([]);
  });
});
