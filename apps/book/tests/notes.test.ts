// A finding or an open question stands on its work until something replaces it or someone withdraws it. Withdrawn, it
// leaves every place that shows a work's notes, but the book keeps it and every version of it.
import { describe, expect, it } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { explain } from '../lib/book/explain';
import { gridOf } from '../lib/book/grid';
import { messagesOf } from '../lib/book/inbox';
import { neighbourhood } from '../lib/book/neighbourhood';
import { current, notesOf, standingNotes } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 21, 9, 0, tick++)).toISOString();
const agent = 'agent:claude';
const rec = (id: string, kind: BookRecord['kind'], body: object, replaces: string | null = null): BookRecord =>
  ({ book: 'b', id, kind, by: agent, at: at(), replaces, body: body as Record<string, unknown> });

const work = ids.work('story', 'last-step');
const base = [
  rec('project', 'project', { title: 'P', forWriter: 'x' }),
  rec(ids.feature('trials'), 'feature', { title: 'Trials', slug: 'trials', forWriter: 'x', view: { kind: 'grid', groups: [{ title: 'All', size: 1 }] } }),
  rec(ids.feature('story'), 'feature', { title: 'Story', slug: 'story', forWriter: 'x', parent: ids.feature('trials') }),
  rec(work, 'work', { feature: ids.feature('story'), title: 'Last step', slug: 'last-step', on: '2026-11-21', state: 'done', summary: 's', origin: { words: 'w', saidOn: '2026-11-21' }, verdict: { served: 'yes' } }),
  rec('finding:keep', 'finding', { work, text: 'Keep this.' }),
  rec('finding:wrong', 'finding', { work, text: 'Belongs elsewhere.' }),
  rec('question:wrong', 'question', { work, text: 'Not a question for here?' }),
];
const withdraw = (id: string, kind: 'finding' | 'question', text: string, reason = 'Recorded on the wrong work.') =>
  rec(id, kind, { work, text, withdrawn: { reason } });
const withdrawn = [...base, withdraw('finding:wrong', 'finding', 'Belongs elsewhere.'), withdraw('question:wrong', 'question', 'Not a question for here?')];

describe('withdrawing a note', () => {
  it('leaves the work, keeping the notes nothing replaced or withdrew', () => {
    const notes = notesOf(current(withdrawn), work);
    expect(notes.findings.map((f) => f.id)).toEqual(['finding:keep']);
    expect(notes.questions).toEqual([]);
    expect(standingNotes(current(withdrawn), 'finding').map((f) => f.id)).toEqual(['finding:keep']);
  });

  it('hides a finding that a later one replaced, as it hides an answered question', () => {
    const moved = [...base, rec('finding:better', 'finding', { work, text: 'Said better.' }, 'finding:wrong')];
    expect(notesOf(current(moved), work).findings.map((f) => f.id)).toEqual(['finding:keep', 'finding:better']);
  });

  it("gives an agent each finding's id, and leaves out what was withdrawn", () => {
    expect(neighbourhood(current(base), work)?.findings).toEqual([{ id: 'finding:keep', text: 'Keep this.' }, { id: 'finding:wrong', text: 'Belongs elsewhere.' }]);
    expect(neighbourhood(current(withdrawn), work)?.findings).toEqual([{ id: 'finding:keep', text: 'Keep this.' }]);
    expect(neighbourhood(current(withdrawn), work)?.openQuestions).toEqual([]);
  });

  it('leaves the explanation, the inbox and what the last story taught', () => {
    expect(explain(current(base), ids.feature('story'))?.open.map((q) => q.id)).toEqual(['question:wrong']);
    expect(explain(current(withdrawn), ids.feature('story'))?.open).toEqual([]);
    expect(messagesOf('b', current(base), 'editor', '2026-11-21').some((m) => m.id === 'question:wrong')).toBe(true);
    expect(messagesOf('b', current(withdrawn), 'editor', '2026-11-21').some((m) => m.id === 'question:wrong')).toBe(false);
    expect(gridOf(current(base), ids.feature('trials'))?.latestFinding?.text).toBe('Belongs elsewhere.');
    expect(gridOf(current(withdrawn), ids.feature('trials'))?.latestFinding?.text).toBe('Keep this.');
  });

  it('needs a one-line reason, and keeps the words and the work it was written on', () => {
    const now = current(base);
    const propose = (id: string, body: Record<string, unknown>) => ({ id, kind: 'finding' as const, by: agent, replaces: null, body });
    expect(refusals(now, propose('finding:wrong', { work, text: 'Belongs elsewhere.', withdrawn: { reason: 'Wrong work.' } }))).toEqual([]);
    expect(refusals(now, propose('finding:wrong', { work, text: 'Belongs elsewhere.', withdrawn: { reason: ' ' } }))).not.toEqual([]);
    expect(refusals(now, propose('finding:wrong', { work, text: 'Belongs elsewhere.', withdrawn: { reason: 'One.\nTwo.' } }))).not.toEqual([]);
    expect(refusals(now, propose('finding:wrong', { work, text: 'Changed words.', withdrawn: { reason: 'Wrong work.' } }))[0]).toMatch(/keeps its words/);
    expect(refusals(now, propose('finding:new', { work, text: 'New.', withdrawn: { reason: 'Wrong work.' } }))[0]).toMatch(/already in the book/);
  });

  it('is refused for a question the editor answered, a note already withdrawn, or one being brought back', () => {
    const ask = (id: string, kind: 'finding' | 'question', body: Record<string, unknown>, replaces: string | null = null) => ({ id, kind, by: agent, replaces, body });
    const q = { work, text: 'Not a question for here?' };
    expect(refusals(current(base), ask('question:wrong', 'question', { ...q, withdrawn: { reason: 'Wrong work.' } }))).toEqual([]);
    const answered = [...base, rec('reply:1', 'reply', { to: 'question:wrong', text: 'Yes.' })];
    expect(refusals(current(answered), ask('question:wrong', 'question', { ...q, withdrawn: { reason: 'Wrong work.' } }))[0]).toMatch(/editor's answer/);
    expect(refusals(current(withdrawn), ask('question:wrong', 'question', { ...q, withdrawn: { reason: 'Again.' } }))[0]).toMatch(/already withdrawn/);
    expect(refusals(current(withdrawn), ask('question:wrong', 'question', q))[0]).toMatch(/stays withdrawn/);
    expect(refusals(current(base), ask('question:wrong', 'question', { ...q, withdrawn: { reason: 'One.\rTwo.' } }))).not.toEqual([]);
  });

  it('keeps what a withdrawn note replaced, so a moved note or an answered question stays closed', () => {
    const moved = [...base, rec('finding:moved', 'finding', { work, text: 'Moved here.' }, 'finding:wrong')];
    const propose = (replaces: string | null) => ({ id: 'finding:moved', kind: 'finding' as const, by: agent, replaces, body: { work, text: 'Moved here.', withdrawn: { reason: 'Not needed.' } } });
    expect(refusals(current(moved), propose(null))[0]).toMatch(/what it replaced/);
    expect(refusals(current(moved), propose('finding:wrong'))).toEqual([]);
    const after = [...moved, rec('finding:moved', 'finding', propose('finding:wrong').body, 'finding:wrong')];
    expect(notesOf(current(after), work).findings.map((f) => f.id)).toEqual(['finding:keep']);
  });
});
