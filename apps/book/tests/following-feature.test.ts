// What agents and the editor read about a work that follows its feature's papers.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkSide } from '../app/ui/work/work-side';
import { neighbourhood } from '../lib/book/neighbourhood';
import { briefPapers } from '../lib/book/testing';
import type { BookRecord, PaperKind } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

let tick = 0;
const rec = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:claude'): BookRecord => ({ book: 'b', id, kind, by, at: new Date(Date.UTC(2026, 10, 23, 13, 0, tick++)).toISOString(), replaces: null, body: body as Record<string, unknown> });
const scene = 'feature:scene';
const work = ids.work('scene', 'draft');
const onFeature = (kind: PaperKind, text = 'One.\n\nTwo.') => rec(ids.featurePaper(scene, kind, 'editor'), 'paper', { feature: scene, kind, for: 'editor', text });
const own = (kind: PaperKind, text = 'Own one.\n\nOwn two.') => rec(ids.paper(work, kind, 'editor'), 'paper', { work, kind, for: 'editor', text });
const approve = (p: BookRecord) => rec(`approval:${tick}`, 'approval', { paper: p.id, verdict: 'approved', paperAt: p.at }, 'editor');
const translate = (p: BookRecord, kind: PaperKind) => rec(ids.paper(work, kind, 'agents'), 'paper', { work, kind, for: 'agents', text: 'Do it [¶1]', against: p.at });
const test = () => rec(`test:${tick}`, 'test', { work, title: 'T', proves: ['spec¶1'], level: 'unit', runs: 'r' });
const base = () => [rec('project', 'project', { title: 'P', forWriter: 'x' }), rec(scene, 'feature', { title: 'Scene', slug: 'scene', forWriter: 'x' }), rec(work, 'work', { feature: scene, title: 'Draft', slug: 'draft', on: '2026-11-23', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-23' } })];
const specOf = (records: BookRecord[]) => briefPapers(current(records), work).find((p) => p.kind === 'spec');

describe('the brief', () => {
  it('names no gaps on a feature paper, since a work takes on only some of its lines', () => {
    const p = onFeature('spec');
    const brief = specOf([...base(), p, approve(p), translate(p, 'spec')]);
    expect(brief).toMatchObject({ source: 'feature', needsTranslating: false, staleTests: [] });
    expect(brief).not.toHaveProperty('gaps');
  });

  it('lists the tests a rewritten feature paper left out of date', () => {
    const p = onFeature('spec');
    const t = test();
    const brief = specOf([...base(), p, approve(p), translate(p, 'spec'), t, onFeature('spec', 'New.')]);
    expect(brief).toMatchObject({ needsTranslating: true, staleTests: [t.id] });
  });

  it('reads as before for a work with its own What', () => {
    const p = own('spec');
    const brief = specOf([...base(), p, approve(p), translate(p, 'spec')]);
    expect(brief).toMatchObject({ source: 'own', gaps: ['¶2'], stale: false });
    expect(brief).not.toHaveProperty('staleTests');
    expect(brief).not.toHaveProperty('needsTranslating');
  });
});

describe('the version a translation names', () => {
  it('is checked even when empty', () => {
    const p = onFeature('spec');
    const body = { work, kind: 'spec', for: 'agents', text: 'Do it [¶1]', against: '' };
    const proposed = { id: ids.paper(work, 'spec', 'agents'), kind: 'paper' as const, by: 'agent:claude', replaces: null, body };
    expect(refusals(current([...base(), p, approve(p)]), proposed).join()).toMatch(/older version/);
  });

  it('must be named', () => {
    const p = onFeature('spec');
    const body = { work, kind: 'spec', for: 'agents', text: 'Do it [¶1]' };
    expect(refusals(current([...base(), p, approve(p)]), { id: ids.paper(work, 'spec', 'agents'), kind: 'paper', by: 'agent:claude', replaces: null, body }).join()).toMatch(/names the version of the editor's paper it was written from/);
  });
});

describe('a work following its feature', () => {
  const approved = () => { const p = onFeature('spec'); return [...base(), p, approve(p)]; };

  it('shows the paper beside the work, not "Not written yet"', () => {
    const html = renderToStaticMarkup(createElement(WorkSide, { book: 'b', now: current(approved()), id: work }));
    expect(html).toMatch(/Approved/);
    expect(html).toContain('/b/f/scene/draft/what-you-get');
  });

  it('gives its governing paper to an agent reading the work', () => {
    expect(neighbourhood(current(approved()), work)?.papers).toEqual([{ kind: 'spec', forEditor: 'One.\n\nTwo.', forAgents: null, editor: 'approved', source: 'feature' }]);
  });

  it('reads as before with its own paper', () => {
    const p = own('spec');
    expect(neighbourhood(current([...base(), p]), work)?.papers).toEqual([{ kind: 'spec', forEditor: p.body.text, forAgents: null, editor: 'waiting' }]);
    expect(renderToStaticMarkup(createElement(WorkSide, { book: 'b', now: current(base()), id: work }))).toMatch(/Not written yet/);
  });
});
