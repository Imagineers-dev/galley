import { describe, expect, it } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current, paperState, progress, storyOf } from '../lib/book/views';
import { decisionMap, lineage } from '../lib/book/decisions';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 18, 12, 0, tick++)).toISOString();
const rec = (r: Omit<BookRecord, 'book' | 'at' | 'replaces'> & { replaces?: string }): BookRecord => ({ book: 'b', at: at(), replaces: null, ...r });
const agent = 'agent:claude';

const work = ids.work('conflict', 'find');
const editorIntent = ids.paper(work, 'intent', 'editor');
const workBody = { feature: 'feature:conflict', title: 'Find', slug: 'find', on: '2026-11-18', state: 'now', summary: 's', origin: { words: 'find it', saidOn: '2026-11-18' } };
const base = [
  rec({ id: 'project', kind: 'project', by: agent, body: { title: 'P', forWriter: 'x' } }),
  rec({ id: 'feature:conflict', kind: 'feature', by: agent, body: { title: 'Conflict', slug: 'conflict', forWriter: 'x' } }),
  rec({ id: work, kind: 'work', by: agent, body: workBody }),
  rec({ id: 'event:conflict/fail', kind: 'event', by: agent, body: { feature: 'feature:conflict', title: 'Fail', on: '2026-11-17', text: 't' } }),
  rec({ id: editorIntent, kind: 'paper', by: agent, body: { work, kind: 'intent', for: 'editor', text: 'why' } }),
];
const propose = (kind: BookRecord['kind'], id: string, body: object, by = agent) => ({ id, kind, by, replaces: null, body: body as Record<string, unknown> });
const approve = (paper: string) => rec({ id: `approval:${tick}`, kind: 'approval', by: 'editor', body: { paper, verdict: 'approved' } });

describe('the write rules', () => {
  it('refuses work without an origin', () => {
    const { origin, ...rest } = workBody;
    expect(refusals(current(base), propose('work', ids.work('conflict', 'find'), rest))).not.toEqual([]);
  });

  it("refuses the agents' paper until the editor approves, then allows it", () => {
    const agents = propose('paper', ids.paper(work, 'intent', 'agents'), { work, kind: 'intent', for: 'agents', text: 'how [¶1]', against: base.find((r) => r.id === editorIntent)!.at });
    expect(refusals(current(base), agents)[0]).toMatch(/waits until the editor approves/);
    expect(refusals(current([...base, approve(editorIntent)]), agents)).toEqual([]);
  });

  it('a new version of a editor paper needs approving again', () => {
    const records = [...base, approve(editorIntent), rec({ id: editorIntent, kind: 'paper', by: agent, body: { work, kind: 'intent', for: 'editor', text: 'revised' } })];
    expect(paperState(current(records), editorIntent).status).toBe('waiting');
    expect(progress(current(records)).toRead.map((r) => r.paper.id)).toEqual([editorIntent]);
  });

  it('refuses an approval from an agent', () => {
    expect(refusals(current(base), propose('approval', 'approval:x', { paper: editorIntent, verdict: 'approved' }))[0]).toMatch(/Only the editor approves/);
  });

  it('refuses a decision with nothing turned down and no reason', () => {
    const d = { work, question: 'Q?', chosen: 'A', means: 'm', shapes: 'How it reads', context: 'c', turnedDown: [], why: '', madeAt: '2026-11-18T12:00:00.000Z' };
    expect(refusals(current(base), propose('decision', 'decision:1', d))).not.toEqual([]);
    expect(refusals(current(base), propose('decision', 'decision:1', { ...d, why: 'only option' }))).toEqual([]);
  });

  it('refuses done work that does not say whether it served its users', () => {
    expect(refusals(current(base), propose('work', work, { ...workBody, state: 'done' }))[0]).toMatch(/served its users/);
  });

  it("tells a feature's story in the order things happened, events included", () => {
    expect(storyOf(current(base), 'feature:conflict').map((s) => s.item.id)).toEqual(['event:conflict/fail', work]);
  });

  it('keeps a replaced decision on the map, linked to what replaced it, in the order they were made', () => {
    const decide = (id: string, chosen: string, madeAt: string, replaces?: string) =>
      rec({ id, kind: 'decision', by: agent, replaces, body: { work, question: 'Which palette?', chosen, means: 'm', shapes: 'How it looks', context: 'c', turnedDown: [], why: 'w', madeAt } });
    const records = [...base, decide('decision:warm', 'Morning Paper', '2026-11-18T15:27:00.000Z'), decide('decision:feather', 'Feather', '2026-11-18T15:28:00.000Z', 'decision:warm')];
    const now = current(records);
    const all = decisionMap(now, 'feature:conflict', true);
    expect(all.lanes).toEqual(['How it looks']);
    const shown = all.points.filter((p) => p.type === 'decision');
    expect(shown.map((p) => p.id)).toEqual(['decision:warm', 'decision:feather']);
    expect(shown[0].type === 'decision' && shown[0].replacedBy).toBe('decision:feather');
    expect(decisionMap(now, 'feature:conflict', false).points.filter((p) => p.type === 'decision').map((p) => p.id)).toEqual(['decision:feather']);
    expect(lineage(now, 'decision:feather').map((d) => d.body.chosen)).toEqual(['Morning Paper', 'Feather']);
  });
});
