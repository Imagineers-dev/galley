// The one rule for what governs a piece of work, case by case. It only reports its answer.
import { describe, expect, it } from 'vitest';
import { effectiveStatus, governingPaper } from '../lib/book/governing';
import type { BookRecord, PaperKind } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current } from '../lib/book/views';

let tick = 0;
const rec = (id: string, kind: BookRecord['kind'], body: object, replaces: string | null = null, by = 'agent:claude'): BookRecord =>
  ({ book: 'b', id, kind, by, at: new Date(Date.UTC(2026, 10, 23, 10, 0, tick++)).toISOString(), replaces, body: body as Record<string, unknown> });
const feature = (slug: string, more: object = {}) => rec(`feature:${slug}`, 'feature', { title: slug, slug, forWriter: 'x', ...more });
const workBody = (on = 'scene') => ({ feature: `feature:${on}`, title: 'Draft', slug: 'draft', on: '2026-11-23', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-23' } });
const work = ids.work('scene', 'draft');
const base = () => [rec('project', 'project', { title: 'P', forWriter: 'x' }), feature('top'), feature('scene', { parent: 'feature:top' }), rec(work, 'work', workBody())];

const onFeature = (kind: PaperKind, text = 'The line.', slug = 'scene') => rec(ids.featurePaper(`feature:${slug}`, kind, 'editor'), 'paper', { feature: `feature:${slug}`, kind, for: 'editor', text });
const own = (kind: PaperKind, text = 'Own line.') => rec(ids.paper(work, kind, 'editor'), 'paper', { work, kind, for: 'editor', text });
const answer = (paper: BookRecord, verdict: 'approved' | 'changes' = 'approved') => rec(`approval:${tick}`, 'approval', { paper: paper.id, verdict, paperAt: paper.at }, null, 'editor');
const agents = (paper: BookRecord, kind: PaperKind, text = 'Do it [¶1]') => rec(ids.paper(work, kind, 'agents'), 'paper', { work, kind, for: 'agents', text, against: paper.at });
const beyond = () => rec(`beyond:${tick}`, 'beyond', { work, raisedBy: 'author', text: 'Goes further.' });
const read = (records: BookRecord[], kind: PaperKind, id = work) => governingPaper(current(records), id, kind);

/** The feature's What and How, approved and translated on the work. */
function coveredFeature() {
  const what = onFeature('spec');
  const how = onFeature('plan');
  return [what, answer(what), how, answer(how), agents(what, 'spec'), agents(how, 'plan')];
}

describe('whose paper governs', () => {
  const cases: [string, () => BookRecord[], PaperKind, 'own' | 'feature' | 'none', string | null][] = [
    ['an own What owns the What', () => [own('spec'), onFeature('spec')], 'spec', 'own', ids.paper(work, 'spec', 'editor')],
    ['an own What owns a Why it lacks', () => [own('spec'), onFeature('intent')], 'intent', 'own', ids.paper(work, 'intent', 'editor')],
    ['an own What owns a How it lacks', () => [own('spec'), onFeature('plan')], 'plan', 'own', ids.paper(work, 'plan', 'editor')],
    ['an own Why with no own What stays own', () => [own('intent'), onFeature('intent')], 'intent', 'own', ids.paper(work, 'intent', 'editor')],
    ['an own Why leaves the What to the feature', () => [own('intent'), onFeature('spec')], 'spec', 'feature', ids.featurePaper('feature:scene', 'spec', 'editor')],
    ['an own Why leaves the How to the feature', () => [own('intent'), onFeature('plan')], 'plan', 'feature', ids.featurePaper('feature:scene', 'plan', 'editor')],
    ['an own How governs the How', () => [own('plan'), onFeature('plan')], 'plan', 'own', ids.paper(work, 'plan', 'editor')],
    ['an own How leaves the What to the feature', () => [own('plan'), onFeature('spec')], 'spec', 'feature', ids.featurePaper('feature:scene', 'spec', 'editor')],
    ['no paper anywhere', () => [], 'spec', 'none', null],
    ['a parent feature never governs', () => [onFeature('spec', 'Parent.', 'top')], 'spec', 'none', null],
    ['replaced work has no feature paper', () => [onFeature('spec'), rec('work:scene/next', 'work', { ...workBody(), slug: 'next' }, work)], 'spec', 'none', null],
    ['replaced work keeps its own What', () => [own('spec'), rec('work:scene/next', 'work', { ...workBody(), slug: 'next' }, work)], 'spec', 'own', ids.paper(work, 'spec', 'editor')],
    ['a marked feature governs nothing', () => [onFeature('spec'), feature('scene', { parent: 'feature:top', approval: 'per-item' })], 'spec', 'none', null],
    ['a grid feature governs nothing', () => [onFeature('spec'), feature('scene', { parent: 'feature:top', view: { kind: 'grid' } })], 'spec', 'none', null],
    ['a grid child governs nothing', () => [onFeature('spec'), feature('top', { view: { kind: 'grid' } })], 'spec', 'none', null],
    ['a per-item work keeps its own What', () => [own('spec'), feature('scene', { parent: 'feature:top', approval: 'per-item' })], 'spec', 'own', ids.paper(work, 'spec', 'editor')],
    ['reparenting keeps the direct feature', () => [onFeature('spec'), onFeature('spec', 'Other.', 'other'), feature('other'), feature('scene', { parent: 'feature:other' })], 'spec', 'feature', ids.featurePaper('feature:scene', 'spec', 'editor')],
    ['work moved to a feature follows it', () => [feature('other'), onFeature('spec'), onFeature('spec', 'Other.', 'other'), rec(work, 'work', workBody('other'))], 'spec', 'feature', ids.featurePaper('feature:other', 'spec', 'editor')],
  ];
  it.each(cases)('%s', (_name, more, kind, source, paperId) => {
    expect(read([...base(), ...more()], kind)).toMatchObject({ kind, source, paperId });
  });

  it('knows nothing of work that is not in the book', () => {
    expect(read(base(), 'spec', 'work:scene/none')).toMatchObject({ source: 'none', paperId: null, version: null, editorStatus: 'missing', covered: false, text: null });
  });
});

describe('what the editor has said', () => {
  it.each([
    ['own waiting', () => [own('spec')], 'spec', 'waiting', 'waiting'],
    ['own changes', () => { const p = own('spec'); return [p, answer(p, 'changes')]; }, 'spec', 'changes', 'changes'],
    ['own approved', () => { const p = own('spec'); return [p, answer(p)]; }, 'spec', 'approved', 'approved'],
    ['own changes after an approval', () => { const p = own('spec'); return [p, answer(p), answer(p, 'changes')]; }, 'spec', 'changes', 'changes'],
    ['an own approval lapses with new words', () => { const p = own('spec'); return [p, answer(p), own('spec', 'New words.')]; }, 'spec', 'waiting', 'waiting'],
    ['a feature approval lapses with new words', () => [...coveredFeature(), onFeature('spec', 'New words.')], 'spec', 'waiting', 'waiting'],
    ['a feature What with no translation', () => { const p = onFeature('spec'); return [p, answer(p)]; }, 'spec', 'approved', 'waiting'],
    ['a covered feature What', coveredFeature, 'spec', 'approved', 'approved'],
    ['a covered feature How', coveredFeature, 'plan', 'approved', 'approved'],
    ['an own How with changes beats an approved feature How', () => { const f = onFeature('plan'); const p = own('plan'); return [f, answer(f), p, answer(p, 'changes')]; }, 'plan', 'changes', 'changes'],
    ['an own How waiting beats an approved feature How', () => { const f = onFeature('plan'); return [f, answer(f), own('plan')]; }, 'plan', 'waiting', 'waiting'],
    ['an own approved How stands with no own What', () => { const p = own('plan'); return [p, answer(p)]; }, 'plan', 'approved', 'approved'],
    ['a feature Why needs no translation', () => { const p = onFeature('intent'); return [p, answer(p)]; }, 'intent', 'approved', 'approved'],
  ] as [string, () => BookRecord[], PaperKind, string, string][])('%s', (_name, more, kind, editor, effective) => {
    const g = read([...base(), ...more()], kind);
    expect(g.editorStatus).toBe(editor);
    expect(effectiveStatus(g)).toBe(effective);
  });
});

describe('covered', () => {
  const pair = (whatText: string, howAgainstOld = false) => {
    const what = onFeature('spec');
    const how = onFeature('plan');
    const later = howAgainstOld ? [onFeature('plan', 'New how.')] : [];
    return [what, how, agents(what, 'spec', whatText), agents(how, 'plan'), ...later];
  };
  it.each([
    ['both current and cited', () => pair('Do it [¶1]'), true],
    ['an uncited paragraph', () => pair('Do it.'), false],
    ['an unknown line', () => pair('Do it [¶9]'), false],
    ['a How against an older version', () => pair('Do it [¶1]', true), false],
    ['a feature What and an own How, each translated', () => { const w = onFeature('spec'); const h = own('plan'); return [w, h, agents(w, 'spec'), agents(h, 'plan')]; }, true],
    ['an own How translated against the feature How', () => { const w = onFeature('spec'); const f = onFeature('plan'); const h = own('plan'); return [w, f, h, agents(w, 'spec'), agents(f, 'plan')]; }, false],
    ['no agents How', () => { const p = onFeature('spec'); return [p, onFeature('plan'), agents(p, 'spec')]; }, false],
  ] as [string, () => BookRecord[], boolean][])('%s', (_name, more, covered) => {
    expect(read([...base(), ...more()], 'spec').covered).toBe(covered);
  });
});

describe('going beyond', () => {
  it('stops a What and How but never a Why', () => {
    const why = onFeature('intent');
    const records = [...base(), why, answer(why), ...coveredFeature(), beyond()];
    expect(read(records, 'spec').beyond).toBe(true);
    expect(effectiveStatus(read(records, 'spec'))).toBe('waiting');
    expect(effectiveStatus(read(records, 'plan'))).toBe('waiting');
    expect(effectiveStatus(read(records, 'intent'))).toBe('approved');
  });

  it('stands over an own What approved before it', () => {
    const p = own('spec');
    const g = read([...base(), p, answer(p), beyond()], 'spec');
    expect(g.beyond).toBe(true);
    expect(effectiveStatus(g)).toBe('waiting');
  });

  it('clears when the own What is approved after it', () => {
    const p = own('spec');
    const g = read([...base(), p, answer(p), beyond(), answer(p)], 'spec');
    expect(g.beyond).toBe(false);
    expect(effectiveStatus(g)).toBe('approved');
  });

  it('does not clear on an answer of changes, and the latest beyond counts', () => {
    const p = own('spec');
    expect(read([...base(), p, beyond(), answer(p, 'changes')], 'spec').beyond).toBe(true);
    expect(read([...base(), p, beyond(), answer(p), beyond()], 'spec').beyond).toBe(true);
  });

  it('belongs to its own work', () => {
    const other = rec(`beyond:${tick}`, 'beyond', { work: 'work:scene/other', raisedBy: 'author', text: 'x' });
    expect(read([...base(), other], 'spec').beyond).toBe(false);
  });
});
