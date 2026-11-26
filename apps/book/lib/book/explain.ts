// Explain any part: a feature told from the book's own records, so nothing is invented. Each line links its source.
import type { Proof, Release, Risk } from './oversight-types';
import { editorPaperOf } from './governing';
import { lessonsFor } from './lessons';
import { proofsOf } from './proof';
import type { Decision, Feature, Work } from './types';
import type { Ask } from './inbox-types';
import { type Current, type Entry, entries, featureTree, flatten, standingNotes, storyOf } from './views';

/** The first paragraph under the paper's first heading: the problem, in the editor's terms. */
export function firstParagraph(text: string | undefined): string | null {
  if (!text) return null;
  const para = text.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !p.startsWith('#') && !p.startsWith('>'));
  return para ? para.replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') : null;
}

export type Explained = {
  feature: Entry<Feature>;
  parts: Entry<Feature>[];
  story: { work: Entry<Work>; why: string | null; proofs: Entry<Proof>[] }[];
  decisions: Entry<Decision>[];
  open: { id: string; text: string }[];
  risks: Entry<Risk>[];
  releases: Entry<Release>[];
  lessons: ReturnType<typeof lessonsFor>;
};

export function explain(now: Current, featureId: string): Explained | null {
  const node = flatten(featureTree(now)).find((n) => n.id === featureId);
  if (!node) return null;
  const within = new Set(flatten([node]).map((n) => n.id));
  const works = flatten([node]).flatMap((n) => storyOf(now, n.id)).filter((s) => s.type === 'work').map((s) => s.item as Entry<Work>);
  const workIds = new Set(works.map((w) => w.id));
  const answered = new Set([...now.values()].filter((r) => r.kind === 'reply').map((r) => String(r.body.to)));
  const open = [
    ...standingNotes(now, 'question').filter((q) => workIds.has(q.body.work) && !answered.has(q.id)).map((q) => ({ id: q.id, text: q.body.text })),
    ...entries<Ask>(now, 'ask').filter((a) => workIds.has(a.body.work) && !answered.has(a.id)).map((a) => ({ id: a.id, text: a.body.subject })),
  ];
  const slugs = [...within].map((id) => id.slice('feature:'.length));
  return {
    feature: node,
    parts: node.children,
    story: works.map((work) => ({ work, why: firstParagraph(editorPaperOf(now, work.id, 'intent')?.body.text as string | undefined), proofs: proofsOf(now, work.id) })),
    decisions: entries<Decision>(now, 'decision').filter((d) => workIds.has(d.body.work)),
    open,
    risks: entries<Risk>(now, 'risk').filter((r) => r.body.work && workIds.has(r.body.work)),
    releases: entries<Release>(now, 'release').filter((r) => slugs.some((s) => r.body.part.toLowerCase().includes(s.replace(/-/g, ' ')))),
    lessons: lessonsFor(now, slugs),
  };
}
