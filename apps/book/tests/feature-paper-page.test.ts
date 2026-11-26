// The page of a feature's own paper: it shows the version it answers, and only a real paper of that feature.
import { type ReactElement, isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { type Current, current } from '../lib/book/views';

const book = vi.hoisted(() => ({ now: null as unknown }));
vi.mock('../lib/load', () => ({ loadBook: async () => ({ now: book.now }), asOf: async () => undefined, AS_OF_COOKIE: 'as-of' }));
vi.mock('../lib/server/session', () => ({ isEditor: async () => true, signIn: vi.fn(), signOut: vi.fn() }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('not found'); }, redirect: (to: string) => { throw new Error(`redirect ${to}`); } }));

const { default: Page } = await import('../app/[book]/paper/[feature]/[kind]/page');
const { AnswerBar } = await import('../app/ui/answer');

const rec = (id: string, kind: BookRecord['kind'], body: object, at: string): BookRecord => ({ book: 'b', id, kind, by: 'agent:claude', at, replaces: null, body: body as Record<string, unknown> });
const why = ids.featurePaper('feature:scene', 'intent', 'editor');
const records = [
  rec('project', 'project', { title: 'P', forWriter: 'x' }, '2026-11-23T08:00:00.000Z'),
  rec('feature:scene', 'feature', { title: 'Scene', slug: 'scene', forWriter: 'x' }, '2026-11-23T08:00:01.000Z'),
  rec(why, 'paper', { feature: 'feature:scene', kind: 'intent', for: 'editor', text: 'Why it matters.' }, '2026-11-23T08:00:02.000Z'),
];
const open = (feature: string, kind: string) => Page({ params: Promise.resolve({ book: 'b', feature, kind }), searchParams: Promise.resolve({}) });

function find(node: unknown, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) return node.map((n) => find(n, type)).find(Boolean);
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node as ReactElement<Record<string, unknown>>;
  return find((node.props as { children?: unknown }).children, type);
}

describe('a feature paper page', () => {
  beforeEach(() => { book.now = current(records) as Current; });

  it('offers the answer for the version on screen', async () => {
    const bar = find(await open('scene', 'why'), AnswerBar);
    expect(bar?.props).toMatchObject({ paperId: why, paperAt: '2026-11-23T08:00:02.000Z', here: '/b/paper/scene/why', editor: true });
  });

  it('does not exist in a study book, which has no papers to read', async () => {
    const study = rec('project', 'project', { title: 'P', forWriter: 'x', kind: 'study' }, '2026-11-23T08:00:03.000Z');
    book.now = current([...records, study]);
    await expect(open('scene', 'why')).rejects.toThrow('redirect /b/f/scene');
  });

  it.each([['no such feature', 'none', 'why'], ['no such paper', 'scene', 'what-you-get'], ['no such kind', 'scene', 'nope']])('answers not found for %s', async (_name, feature, kind) => {
    await expect(open(feature, kind)).rejects.toThrow('not found');
  });
});
