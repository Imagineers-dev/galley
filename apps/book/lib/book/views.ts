// Pure views over a book's records: no store, no I/O. Everything the website and agents read comes from here.
import type { Approval, BookRecord, Decision, Event, Feature, Link, Note, Paper, PaperKind, Work } from './types';
import { PAPER_KINDS, ids } from './types';
import { inOrder, orderId } from './order';

/**
 * `writers`: everyone who wrote any version of this id. `answeredFor`: every promise any version of a work answered
 * for: those it served, and those Proven around it when it started.
 */
export type Latest = BookRecord & { firstAt: string; writers?: string[]; answeredFor?: string[] };

/** The promises a version of a record answers for: a piece of work's serves and provenAtStart; nothing else answers. */
export const answersFor = (record: BookRecord): string[] =>
  record.kind === 'work' ? [record.body.serves, record.body.provenAtStart].flatMap((list) => (Array.isArray(list) ? (list as string[]) : [])) : [];
export type Current = Map<string, Latest>;
export type Entry<T> = { id: string; at: string; firstAt: string; by: string; replaces: string | null; body: T };

/** The latest record of every id, remembering when each id first appeared. */
export function current(records: BookRecord[]): Current {
  const latest = new Map<string, Latest>();
  for (const record of [...records].sort((a, b) => a.at.localeCompare(b.at))) {
    const was = latest.get(record.id);
    const answeredFor = [...new Set([...(was?.answeredFor ?? []), ...answersFor(record)])];
    latest.set(record.id, { ...record, firstAt: was?.firstAt ?? record.at, writers: [...new Set([...(was?.writers ?? []), record.by])], ...(answeredFor.length ? { answeredFor } : {}) });
  }
  return currentOf([...latest.values()]);
}

/** A feature or a piece of work that was withdrawn is read as if it were not there; the store keeps it. */
const shown = (r: Latest) => !((r.kind === 'feature' || r.kind === 'work') && r.body.withdrawn);

/** A book's current records, as the store reads them (the latest version of each id), keyed by id. */
export const currentOf = (latest: Latest[]): Current => new Map(latest.filter(shown).map((r) => [r.id, r]));

export const entry = <T>(r: Latest): Entry<T> => ({ id: r.id, at: r.at, firstAt: r.firstAt, by: r.by, replaces: r.replaces, body: r.body as T });

export function entries<T>(now: Current, kind: BookRecord['kind']): Entry<T>[] {
  return [...now.values()].filter((r) => r.kind === kind).map((r) => entry<T>(r)).sort((a, b) => a.firstAt.localeCompare(b.firstAt));
}

export const titleOf = (now: Current, id: string) => String(now.get(id)?.body.title ?? id);

/** Ids that a later record replaced, mapped to what replaced them. */
export function replacedBy(now: Current): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of now.values()) if (r.replaces && r.replaces !== r.id) map.set(r.replaces, r.id);
  return map;
}

export type FeatureNode = Entry<Feature> & { children: FeatureNode[]; depth: number };

export function featureTree(now: Current): FeatureNode[] {
  const nodes = entries<Feature>(now, 'feature').map((f) => ({ ...f, children: [] as FeatureNode[], depth: 0 }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: FeatureNode[] = [];
  for (const node of nodes) {
    const parent = node.body.parent ? byId.get(node.body.parent) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const depth = (list: FeatureNode[], d: number) => list.forEach((n) => { n.depth = d; depth(n.children, d + 1); });
  for (const node of nodes) node.children = inOrder(now, orderId('features', node.id), node.children);
  const top = inOrder(now, orderId('features'), roots);
  depth(top, 0);
  return top;
}

export const flatten = (tree: FeatureNode[]): FeatureNode[] => tree.flatMap((n) => [n, ...flatten(n.children)]);

export type StoryItem = { type: 'work'; item: Entry<Work> } | { type: 'event'; item: Entry<Event> };

/**
 * A feature's story: its work and the events between them, day by day as they happened. Within a day, the day's
 * works take that day's times in the order said for the feature's work, so the events keep their place in time.
 */
export function storyOf(now: Current, featureId: string): StoryItem[] {
  const works = inOrder(now, orderId('work', featureId), entries<Work>(now, 'work').filter((w) => w.body.feature === featureId));
  const times = new Map<string, string[]>();
  for (const w of works) times.set(w.body.on, [...(times.get(w.body.on) ?? []), w.firstAt]);
  for (const list of times.values()) list.sort();
  const placed = works.map((item) => ({ item: { type: 'work' as const, item }, on: item.body.on, at: (times.get(item.body.on) as string[]).shift() as string }));
  const events = entries<Event>(now, 'event').filter((e) => e.body.feature === featureId).map((item) => ({ item: { type: 'event' as const, item }, on: item.body.on, at: item.firstAt }));
  return [...placed, ...events].sort((a, b) => a.on.localeCompare(b.on) || a.at.localeCompare(b.at)).map((s) => s.item);
}

export type PaperState = { status: 'missing' | 'waiting' | 'approved' | 'changes'; words?: string; at?: string };

/**
 * A editor paper's answer is the latest one given to its current version. An answer names the version it read
 * (paperAt); an answer from before that rule (no paperAt) counts when it came after the latest version.
 */
export function paperState(now: Current, paperId: string): PaperState {
  const paper = now.get(paperId);
  if (!paper) return { status: 'missing' };
  const forThisVersion = (a: Entry<Approval>) => (a.body.paperAt ? a.body.paperAt === paper.at : a.at > paper.at);
  const last = entries<Approval>(now, 'approval')
    .filter((a) => a.body.paper === paperId && forThisVersion(a))
    .sort((a, b) => a.at.localeCompare(b.at))
    .at(-1);
  if (!last) return { status: 'waiting' };
  return { status: last.body.verdict === 'approved' ? 'approved' : 'changes', words: last.body.words, at: last.at };
}

export type PaperPair = { kind: PaperKind; editor?: Entry<Paper>; agents?: Entry<Paper>; state: PaperState };

/** The three papers of one owner: a piece of work or a feature. */
export function papersOf(now: Current, ownerId: string): PaperPair[] {
  const get = (id: string) => (now.get(id) ? entry<Paper>(now.get(id) as Latest) : undefined);
  return PAPER_KINDS.map((kind) => {
    const editorId = ids.paperOf(ownerId, kind, 'editor');
    return { kind, editor: get(editorId), agents: get(ids.paperOf(ownerId, kind, 'agents')), state: paperState(now, editorId) };
  });
}

/** One editor paper to read. `work` is absent on a feature's own paper; `title` names its owner either way. */
export type Reading = { paper: Entry<Paper>; title: string; work?: Entry<Work>; feature: Entry<Feature>; state: PaperState; history: boolean };

/** Every editor paper in book order (feature tree; a feature's own papers, then its story; why / what / how), with where it stands. */
export function readingList(now: Current): Reading[] {
  const out: Reading[] = [];
  for (const feature of flatten(featureTree(now))) {
    for (const pair of papersOf(now, feature.id)) {
      if (pair.editor) out.push({ paper: pair.editor, title: feature.body.title, feature, state: pair.state, history: false });
    }
    for (const story of storyOf(now, feature.id)) {
      if (story.type !== 'work') continue;
      for (const pair of papersOf(now, story.item.id)) {
        if (!pair.editor) continue;
        out.push({ paper: pair.editor, title: story.item.body.title, work: story.item, feature, state: pair.state, history: story.item.body.state === 'done' });
      }
    }
  }
  return out;
}

export function progress(now: Current) {
  const list = readingList(now);
  const toRead = list.filter((r) => r.state.status === 'waiting');
  return { list, toRead, approved: list.filter((r) => r.state.status === 'approved').length, total: list.length };
}

/**
 * The findings or open questions that still stand: nothing replaced them (an answer, or the note said better or on
 * the work it belongs to) and no one withdrew them. Every place that shows a work's notes reads them from here.
 */
export function standingNotes(now: Current, kind: 'finding' | 'question'): Entry<Note>[] {
  const replaced = replacedBy(now);
  return entries<Note>(now, kind).filter((n) => !replaced.has(n.id) && !n.body.withdrawn);
}

export function notesOf(now: Current, workId: string) {
  const replaced = replacedBy(now);
  return {
    decisions: entries<Decision>(now, 'decision').filter((d) => d.body.work === workId),
    findings: standingNotes(now, 'finding').filter((f) => f.body.work === workId),
    questions: standingNotes(now, 'question').filter((q) => q.body.work === workId),
    links: entries<Link>(now, 'link').filter((l) => l.body.from === workId || l.body.to === workId),
    replaced,
  };
}

export const linksOf = (now: Current, id: string) => entries<Link>(now, 'link').filter((l) => l.body.from === id || l.body.to === id);

export function minutes(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 230));
}
