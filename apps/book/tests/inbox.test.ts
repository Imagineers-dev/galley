import { describe, expect, it } from 'vitest';
import { messagesOf, subjectOf, waitingOn } from '../lib/book/inbox';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { markId } from '../lib/book/inbox-types';
import { current } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 19, 8, 0, tick++)).toISOString();
const rec = (r: Omit<BookRecord, 'book' | 'at' | 'replaces'> & { replaces?: string }): BookRecord => ({ book: 'b', at: at(), replaces: null, ...r });
const agent = 'agent:claude';
const work = ids.work('tasks', 'goal');
const intent = ids.paper(work, 'intent', 'editor');
const ask = { work, to: 'editor', needs: 'decision', subject: 'Decide: the context budget', text: 'Over by 79.', options: [{ option: 'Raise it' }, { option: 'Trim it' }], recommend: 0 };
const base = [
  rec({ id: 'project', kind: 'project', by: agent, body: { title: 'P', forWriter: 'x' } }),
  rec({ id: 'feature:tasks', kind: 'feature', by: agent, body: { title: 'Partner tasks', slug: 'tasks', forWriter: 'x' } }),
  rec({ id: work, kind: 'work', by: agent, body: { feature: 'feature:tasks', title: 'Goal', slug: 'goal', on: '2026-11-18', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-18' } } }),
  rec({ id: intent, kind: 'paper', by: agent, body: { work, kind: 'intent', for: 'editor', text: 'why' } }),
  rec({ id: 'ask:1', kind: 'ask', by: agent, body: ask }),
  rec({ id: 'question:1', kind: 'question', by: agent, body: { work, text: 'Scene drafting runs alone. Does it move now, or later? (Recommend later.)' } }),
];
const propose = (kind: BookRecord['kind'], id: string, body: object, by = agent) => ({ id, kind, by, replaces: null, body: body as Record<string, unknown> });
const inbox = (records: BookRecord[], today = '2026-11-19') => messagesOf('b', current(records), 'editor', today);
const find = (records: BookRecord[], id: string) => inbox(records).find((m) => m.id === id);

describe('the inbox records', () => {
  it('lets an agent ask with a subject and options, and refuses a recommendation that is not an option', () => {
    expect(refusals(current(base), propose('ask', 'ask:2', ask))).toEqual([]);
    expect(refusals(current(base), propose('ask', 'ask:2', { ...ask, recommend: 5 }))[0]).toMatch(/index into options/);
    expect(refusals(current(base), propose('ask', 'ask:2', { ...ask, needs: 'fyi' }))[0]).toMatch(/Only a decision carries options/);
  });

  it('only the editor replies or files mail, and a reply must answer something real with a real option', () => {
    expect(refusals(current(base), propose('reply', 'reply:1', { to: 'ask:1', choice: 'Raise it' }))).toContain('Only the person a message is for answers or files it, signed in on the website.');
    expect(refusals(current(base), propose('reply', 'reply:1', { to: 'ask:1', choice: 'Raise it' }, 'editor'))).toEqual([]);
    expect(refusals(current(base), propose('reply', 'reply:1', { to: 'ask:1', choice: 'Ignore it' }, 'editor'))[0]).toMatch(/not one of the options/);
    expect(refusals(current(base), propose('reply', 'reply:1', { to: 'nothing', words: 'hi' }, 'editor'))[0]).toMatch(/not an ask/);
    expect(refusals(current(base), propose('mark', markId('editor', 'ask:1'), { message: 'ask:1', person: 'editor', state: 'snoozed' }, 'editor'))[0]).toMatch(/until/);
  });
});

describe('the inbox view', () => {
  it('turns asks, open questions and waiting papers into messages that wait on the editor', () => {
    const waiting = waitingOn(inbox(base)).map((m) => m.id).sort();
    expect(waiting).toEqual(['ask:1', intent, 'question:1'].sort());
    expect(find(base, intent)?.subject).toBe('Approve: Why for “Goal”');
    expect(find(base, 'question:1')?.subject).toBe('Decide: does it move now, or later?');
    expect(find(base, 'ask:1')?.from).toMatchObject({ agent: 'Claude', feature: 'Partner tasks', workTitle: 'Goal' });
  });

  it('files a message as answered once replied to or approved, and keeps the answer', () => {
    const records = [
      ...base,
      rec({ id: 'reply:1', kind: 'reply', by: 'editor', body: { to: 'ask:1', choice: 'Raise it', words: 'to 7,500' } }),
      rec({ id: 'approval:1', kind: 'approval', by: 'editor', body: { paper: intent, verdict: 'approved' } }),
    ];
    expect(find(records, 'ask:1')).toMatchObject({ folder: 'answered', read: true, answer: { text: 'Raise it · to 7,500' } });
    expect(find(records, intent)?.folder).toBe('answered');
    expect(waitingOn(inbox(records)).map((m) => m.id)).toEqual(['question:1']);
  });

  it('archives, marks read, and snoozes until a day, then brings it back', () => {
    const records = [
      ...base,
      rec({ id: markId('editor', 'question:1'), kind: 'mark', by: 'editor', body: { message: 'question:1', person: 'editor', state: 'archived' } }),
      rec({ id: markId('editor', 'ask:1'), kind: 'mark', by: 'editor', body: { message: 'ask:1', person: 'editor', state: 'snoozed', until: '2026-11-21' } }),
      rec({ id: markId('editor', intent), kind: 'mark', by: 'editor', body: { message: intent, person: 'editor', state: 'read' } }),
    ];
    expect(find(records, 'question:1')?.folder).toBe('archived');
    expect(find(records, 'ask:1')).toMatchObject({ folder: 'snoozed', until: '2026-11-21' });
    expect(inbox(records, '2026-11-21').find((m) => m.id === 'ask:1')?.folder).toBe('inbox');
    expect(find(records, intent)).toMatchObject({ folder: 'inbox', read: true });
  });

  it('a question closed by a later record reads as settled', () => {
    const records = [...base, rec({ id: 'finding:1', kind: 'finding', by: agent, replaces: 'question:1', body: { work, text: 'Later.' } })];
    expect(find(records, 'question:1')).toMatchObject({ folder: 'answered', answer: { text: 'Settled in the book.' } });
  });

  it('a question asked again as a message shows once, as the new message', () => {
    const records = [...base, rec({ id: 'ask:2', kind: 'ask', by: agent, replaces: 'question:1', body: { ...ask, subject: 'Decide: scene drafting now or later?' } })];
    expect(find(records, 'question:1')).toBeUndefined();
    expect(find(records, 'ask:2')?.folder).toBe('inbox');
  });

  it('makes a subject from the question in a note', () => {
    expect(subjectOf('It was over. Raise it or trim it?', 'Decide')).toBe('Decide: raise it or trim it?');
  });
});
