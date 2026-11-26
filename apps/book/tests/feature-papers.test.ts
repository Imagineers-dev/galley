// A feature can hold its own Why, What and How; a feature that is a list refuses them.
import { describe, expect, it } from 'vitest';
import { diaryDays } from '../lib/book/diary';
import { isPerItem } from '../lib/book/governing';
import { messagesOf } from '../lib/book/inbox';
import type { BookRecord } from '../lib/book/types';
import { ids, paperOwner } from '../lib/book/types';
import { current, paperState, progress } from '../lib/book/views';
import { changedFeature } from '../lib/mcp/changes';
import { refusals } from '../lib/rules/check';

let tick = 0;
const at = () => new Date(Date.UTC(2026, 10, 23, 8, 0, tick++)).toISOString();
const rec = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:claude'): BookRecord => ({ book: 'b', id, kind, by, at: at(), replaces: null, body: body as Record<string, unknown> });
const propose = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:claude', replaces: string | null = null) => ({ id, kind, by, replaces, body: body as Record<string, unknown> });
const featureBody = (slug: string, more: object = {}) => ({ title: slug.toUpperCase(), slug, forWriter: 'x', ...more });

const scene = 'feature:scene';
const why = ids.featurePaper(scene, 'intent', 'editor');
const whyBody = { feature: scene, kind: 'intent', for: 'editor', text: 'Why it matters.' };
const work = ids.work('scene', 'draft');
const base = [
  rec('project', 'project', { title: 'P', forWriter: 'x' }),
  rec(scene, 'feature', featureBody('scene')),
  rec('feature:list', 'feature', featureBody('list', { approval: 'per-item' })),
  rec('feature:grid', 'feature', featureBody('grid', { view: { kind: 'grid' } })),
  rec('feature:row', 'feature', featureBody('row', { parent: 'feature:grid' })),
  rec(work, 'work', { feature: scene, title: 'Draft', slug: 'draft', on: '2026-11-23', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-23' } }),
];
const withWhy = () => [...base, rec(why, 'paper', whyBody)];
const approve = (paper: BookRecord, verdict = 'approved') => rec(`approval:${tick}`, 'approval', { paper: paper.id, verdict, paperAt: paper.at }, 'editor');

describe('a feature paper', () => {
  it('has its own id and owner', () => {
    expect(why).toBe('paper:scene/intent/editor');
    expect(paperOwner(whyBody as never)).toBe(scene);
    expect(ids.paperOf(scene, 'intent', 'editor')).toBe(why);
    expect(ids.paperOf(work, 'intent', 'editor')).toBe(ids.paper(work, 'intent', 'editor'));
  });

  it('is written for a real feature, under its own id, for one owner only', () => {
    expect(refusals(current(base), propose(why, 'paper', whyBody))).toEqual([]);
    expect(refusals(current(base), propose('paper:x', 'paper', whyBody))[0]).toMatch(/This paper's id is paper:scene\/intent\/editor/);
    expect(refusals(current(base), propose('paper:none/intent/editor', 'paper', { ...whyBody, feature: 'feature:none' }))[0]).toMatch(/is not a feature/);
    expect(refusals(current(base), propose(why, 'paper', { ...whyBody, work }))[0]).toMatch(/one piece of work or one feature/);
    const { feature: _none, ...ownerless } = whyBody;
    expect(refusals(current(base), propose(why, 'paper', ownerless))[0]).toMatch(/one piece of work or one feature/);
  });

  it('never takes an id that another owner holds', () => {
    const held = rec('paper:a/b/intent/editor', 'paper', { work: 'work:a/b', kind: 'intent', for: 'editor', text: 'w' });
    const records = [...base, rec('feature:a/b', 'feature', featureBody('a/b')), rec('feature:a', 'feature', featureBody('a')), rec('work:a/b', 'work', { feature: 'feature:a', title: 'B', slug: 'b', on: '2026-11-23', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-23' } }), held];
    expect(refusals(current(records), propose(held.id, 'paper', { ...whyBody, feature: 'feature:a/b' })).join()).toMatch(/already belongs to work:a\/b/);
  });

  it('is written for the editor only: agents translate on each piece of work', () => {
    const records = withWhy();
    const approved = [...records, approve(records.at(-1) as BookRecord)];
    const id = ids.featurePaper(scene, 'intent', 'agents');
    expect(refusals(current(approved), propose(id, 'paper', { ...whyBody, for: 'agents', text: 'Do it [¶1]' })).join()).toMatch(/only papers written for the editor/);
  });

  it('is refused in a study book, whose work papers stay as they are', () => {
    const study = [...base, rec('project', 'project', { title: 'P', forWriter: 'x', kind: 'study' })];
    expect(refusals(current(study), propose(why, 'paper', whyBody))).toContain('A study book holds no feature papers.');
    const own = { work, kind: 'intent', for: 'editor', text: 'Why.' };
    expect(refusals(current(study), propose(ids.paper(work, 'intent', 'editor'), 'paper', own))).toEqual([]);
  });

  it('comes first in the reading list and reaches the inbox', () => {
    const records = [...withWhy(), rec(ids.paper(work, 'intent', 'editor'), 'paper', { work, kind: 'intent', for: 'editor', text: 'w' })];
    const { list, toRead } = progress(current(records));
    expect(list.map((r) => r.paper.id)).toEqual([why, ids.paper(work, 'intent', 'editor')]);
    expect(toRead[0]).toMatchObject({ title: 'SCENE', history: false });
    expect(toRead[0].work).toBeUndefined();
    const message = messagesOf('b', current(records), 'editor', '2026-11-23').find((m) => m.id === why);
    expect(message).toMatchObject({ needs: 'approval', subject: 'Approve: Why for “SCENE”', folder: 'inbox' });
    expect(message?.from.work).toBeUndefined();
    expect(message?.links[0]).toEqual({ label: 'The paper', href: '/b/paper/scene/why' });
  });

  it('is approved for one version: new words wait again', () => {
    const records = withWhy();
    const paper = records.at(-1) as BookRecord;
    const answer = { paper: why, verdict: 'approved', paperAt: paper.at };
    expect(refusals(current(records), propose('approval:1', 'approval', answer, 'editor'))).toEqual([]);
    expect(refusals(current(records), propose('approval:1', 'approval', answer))[0]).toMatch(/Only the editor approves/);
    expect(refusals(current(records), propose('approval:1', 'approval', { ...answer, paperAt: '2026-01-01T00:00:00.000Z' }, 'editor')).join()).toMatch(/changed after you opened/);
    const approved = [...records, approve(paper)];
    expect(paperState(current(approved), why).status).toBe('approved');
    expect(paperState(current([...approved, rec(why, 'paper', { ...whyBody, text: 'New words.' })]), why).status).toBe('waiting');
  });

  it('writes its approval into the diary, linked to the feature', () => {
    const records = withWhy();
    const lines = diaryDays(current([...records, approve(records.at(-1) as BookRecord)])).flatMap((d) => d.recorded).filter((r) => r.kind === 'approval');
    expect(lines).toEqual([{ kind: 'approval', text: 'You approved Why of SCENE', href: { feature: scene } }]);
  });

  it('keeps its feature from being withdrawn', () => {
    const records = [...base.slice(0, 2), rec(why, 'paper', whyBody)];
    expect(refusals(current(records), propose(scene, 'feature', { ...featureBody('scene'), withdrawn: { reason: 'mistake' } })).join()).toMatch(/1 paper/);
  });
});

describe('a feature that is a list', () => {
  it.each([['marked', 'feature:list'], ['a grid', 'feature:grid'], ['a child of a grid', 'feature:row']])('refuses a feature paper when %s', (_name, feature) => {
    expect(isPerItem(current(base), feature)).toBe(true);
    const id = ids.featurePaper(feature, 'intent', 'editor');
    expect(refusals(current(base), propose(id, 'paper', { ...whyBody, feature })).join()).toMatch(/is a list/);
  });

  it('an ordinary feature is not one', () => expect(isPerItem(current(base), scene)).toBe(false));

  it.each([
    ['marked', { approval: 'per-item', perItemReply: 'reply:go' }],
    ['shown as a grid', { view: { kind: 'grid' }, perItemReply: 'reply:go' }],
    ['moved under a grid', { parent: 'feature:grid' }],
  ])('a feature holding a editor paper cannot be %s', (_name, change) => {
    const go = [rec('ask:go', 'ask', { work, to: 'editor', needs: 'decision', subject: 'Mark it?', text: 'Make feature:scene a list?', options: [{ option: 'Go' }, { option: 'Stop' }] }), rec('reply:go', 'reply', { to: 'ask:go', choice: 'Go' }, 'editor')];
    expect(refusals(current([...base, ...go]), propose(scene, 'feature', featureBody('scene', change)))).toEqual([]);
    expect(refusals(current([...withWhy(), ...go]), propose(scene, 'feature', featureBody('scene', change))).join()).toMatch(/holds a paper written for the editor/);
  });

  it('a grid cannot form over a child holding a editor paper', () => {
    const records = [...base, rec('feature:top', 'feature', featureBody('top')), rec(scene, 'feature', featureBody('scene', { parent: 'feature:top' })), rec(why, 'paper', whyBody)];
    expect(refusals(current(records), propose('feature:top', 'feature', featureBody('top', { view: { kind: 'grid' } }))).join()).toMatch(/sits under this feature/);
  });

  it('names a real reply by the editor when it says why it is a list', () => {
    const marked = featureBody('scene', { approval: 'per-item', perItemReply: 'reply:1' });
    const ask = rec('ask:1', 'ask', { work, to: 'editor', needs: 'decision', subject: 'Mark it?', text: 'Make feature:scene a list?', options: [{ option: 'Go' }, { option: 'Stop' }] });
    expect(refusals(current(base), propose(scene, 'feature', marked)).join()).toMatch(/not a reply by the editor/);
    expect(refusals(current([...base, rec('finding:1', 'finding', { work, text: 'x' })]), propose(scene, 'feature', featureBody('scene', { approval: 'per-item', perItemReply: 'finding:1' }))).join()).toMatch(/not a reply by the editor/);
    expect(refusals(current([...base, ask, rec('reply:1', 'reply', { to: 'ask:1', choice: 'Go' }, 'agent:claude')]), propose(scene, 'feature', marked)).join()).toMatch(/not a reply by the editor/);
    expect(refusals(current([...base, ask, rec('reply:1', 'reply', { to: 'ask:1', choice: 'Go' }, 'editor')]), propose(scene, 'feature', marked))).toEqual([]);
  });

  it("needs the editor's Go to an ask that names this feature", () => {
    const marked = featureBody('scene', { approval: 'per-item', perItemReply: 'reply:1' });
    const ask = (text: string) => rec('ask:1', 'ask', { work, to: 'editor', needs: 'decision', subject: 'Mark it?', text, options: [{ option: 'Go' }, { option: 'Stop' }] });
    const reply = (choice: string) => rec('reply:1', 'reply', { to: 'ask:1', choice }, 'editor');
    expect(refusals(current([...base, ask('Make feature:scene a list?'), reply('Stop')]), propose(scene, 'feature', marked)).join()).toMatch(/only on the editor's Go/);
    expect(refusals(current([...base, ask('Make feature:list a list?'), reply('Go')]), propose(scene, 'feature', marked)).join()).toMatch(/whose text names feature:scene/);
    expect(refusals(current([...base, ask('Make feature:scene-other a list?'), reply('Go')]), propose(scene, 'feature', marked)).join()).toMatch(/whose text names feature:scene/);
    expect(refusals(current([...base, ask('Make feature:scene, the drafts, a list?'), reply('Go')]), propose(scene, 'feature', marked))).toEqual([]);
    const already = [...base, rec(scene, 'feature', featureBody('scene', { approval: 'per-item', perItemReply: 'reply:1' })), ask('x'), reply('Go')];
    expect(refusals(current(already), propose(scene, 'feature', { ...marked, title: 'Scenes' }))).toEqual([]);
  });

  it('cannot be marked with no reply at all, and the refusal reads plainly', () => {
    const refused = refusals(current(base), propose(scene, 'feature', featureBody('scene', { approval: 'per-item' }))).join();
    expect(refused).toMatch(/needs a reply by the editor/);
    expect(refused).not.toMatch(/undefined/);
    expect(refusals(current(base), propose(scene, 'feature', featureBody('scene', { view: { kind: 'grid' } }))).join()).toMatch(/becomes a list only on the editor's Go/);
  });

  it('keeps its mark through other changes; taking the mark away takes its reply too', () => {
    const old = featureBody('list', { approval: 'per-item', perItemReply: 'reply:1' });
    expect(changedFeature(old, { title: 'New' })).toMatchObject({ title: 'New', approval: 'per-item', perItemReply: 'reply:1' });
    const cleared = changedFeature(old, { approval: null });
    expect(cleared).not.toHaveProperty('approval');
    expect(cleared).not.toHaveProperty('perItemReply');
  });
});
