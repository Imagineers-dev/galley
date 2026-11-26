// A work following its feature's What says plainly when that What needs translating, and which tests went out of date.
import { type ReactElement, createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lineCoverage, needsTranslating, staleTestsOf } from '../lib/book/testing';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current } from '../lib/book/views';

const book = vi.hoisted(() => ({ now: null as unknown }));
vi.mock('../lib/load', () => ({ loadBook: async () => ({ now: book.now }), asOf: async () => undefined, AS_OF_COOKIE: 'as-of' }));
vi.mock('../lib/server/session', () => ({ isEditor: async () => true, signIn: vi.fn(), signOut: vi.fn() }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('not found'); }, redirect: vi.fn() }));

const { default: Page } = await import('../app/[book]/f/[feature]/[work]/tests/page');
const { NeedsTranslating } = await import('../app/ui/work/needs-translating');
const { Matrix } = await import('../app/ui/work/tests');

let tick = 0;
const rec = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:claude'): BookRecord => ({ book: 'b', id, kind, by, at: new Date(Date.UTC(2026, 10, 23, 12, 0, tick++)).toISOString(), replaces: null, body: body as Record<string, unknown> });
const scene = 'feature:scene';
const work = ids.work('scene', 'draft');
const what = ids.featurePaper(scene, 'spec', 'editor');
const paper = (text: string) => rec(what, 'paper', { feature: scene, kind: 'spec', for: 'editor', text });
const approve = (p: BookRecord) => rec(`approval:${tick}`, 'approval', { paper: p.id, verdict: 'approved', paperAt: p.at }, 'editor');
const translate = (p: BookRecord) => rec(ids.paper(work, 'spec', 'agents'), 'paper', { work, kind: 'spec', for: 'agents', text: 'Do it [¶1]', against: p.at });
const test = () => rec(`test:${tick}`, 'test', { work, title: 'T', proves: ['spec¶1'], level: 'unit', runs: 'r' });
const base = () => [rec('project', 'project', { title: 'P', forWriter: 'x' }), rec(scene, 'feature', { title: 'Scene', slug: 'scene', forWriter: 'x' }), rec(work, 'work', { feature: scene, title: 'Draft', slug: 'draft', on: '2026-11-23', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-23' } })];

function find(node: unknown, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) return node.map((n) => find(n, type)).find(Boolean);
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node as ReactElement<Record<string, unknown>>;
  return find((node.props as { children?: unknown }).children, type);
}
const open = () => Page({ params: Promise.resolve({ book: 'b', feature: 'scene', work: 'draft' }) } as never);

describe('a work whose feature paper needs translating', () => {
  beforeEach(() => { tick = 0; });

  it.each([
    ['rewritten, not yet approved', () => { const p = paper('One.'); const t = test(); return [p, approve(p), translate(p), t, paper('New.')]; }],
    ['rewritten and approved again', () => { const p = paper('One.'); const t = test(); const n = paper('New.'); return [p, approve(p), translate(p), t, n, approve(n)]; }],
  ])('keeps its test, marked out of date, when the paper is %s', async (_name, more) => {
    const records = [...base(), ...more()];
    const now = current(records);
    const testId = records.find((r) => r.kind === 'test')?.id;
    expect(needsTranslating(now, work, 'spec')).toBe(true);
    expect(staleTestsOf(now, work, 'spec')).toEqual([testId]);
    book.now = now;
    const page = await open();
    expect(find(page, NeedsTranslating)?.props.tests).toBe(1);
    expect(find(page, Matrix)).toBeUndefined();
  });

  it('says so for an approved paper with no translation yet', async () => {
    const p = paper('One.');
    book.now = current([...base(), p, approve(p)]);
    const page = await open();
    expect(find(page, NeedsTranslating)?.props.tests).toBe(0);
    expect(renderToStaticMarkup(createElement(NeedsTranslating, { tests: 0 }))).not.toMatch(/no What you/);
  });

  it('says in plain words what went out of date', () => {
    expect(renderToStaticMarkup(createElement(NeedsTranslating, { tests: 2 }))).toMatch(/needs translating.*2 tests/);
  });

  it('shows the lines once translated, with an older test out of date', async () => {
    const p = paper('One.');
    const early = test();
    const n = paper('New.');
    const now = current([...base(), p, early, n, approve(n), translate(n)]);
    expect(needsTranslating(now, work, 'spec')).toBe(false);
    expect(staleTestsOf(now, work, 'spec')).toEqual([early.id]);
    expect(lineCoverage(now, work)[0].staleTests).toEqual([early.id]);
    book.now = now;
    expect(find(await open(), Matrix)).toBeDefined();
  });

  it('never applies to a work with its own What', () => {
    const own = rec(ids.paper(work, 'spec', 'editor'), 'paper', { work, kind: 'spec', for: 'editor', text: 'Own.' });
    const now = current([...base(), own, test()]);
    expect(needsTranslating(now, work, 'spec')).toBe(false);
    expect(staleTestsOf(now, work, 'spec')).toEqual([]);
  });
});
