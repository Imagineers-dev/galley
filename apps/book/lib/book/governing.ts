// Which papers govern a piece of work: its own, its feature's, or none. Pure. The book's translations, tests and pages
// read it; the repository's gates do not yet.
import { coverage } from './paragraphs';
import type { Beyond } from './record-types';
import type { Feature, Paper, PaperKind, Work } from './types';
import { PAPER_KINDS, ids } from './types';
import { type Current, type Entry, type Latest, type PaperPair, type PaperState, entries, entry, paperState, replacedBy } from './views';

export type Governing = {
  kind: PaperKind;
  source: 'own' | 'feature' | 'none';
  paperId: string | null;
  version: string | null; // the governing paper's time; null when there is no paper
  editorStatus: PaperState['status'];
  covered: boolean; // the agents' What and How exist, against the governing versions, citing only real lines
  beyond: boolean; // someone said this work goes beyond its papers, and no later own What was approved
  text: string | null;
};

/** Whether a feature with this body is a list: marked, shown as a grid, or a child of a grid. */
export function bodyIsPerItem(now: Current, feature: Feature): boolean {
  const parent = feature.parent ? (now.get(feature.parent)?.body as Feature | undefined) : undefined;
  return feature.approval === 'per-item' || feature.view?.kind === 'grid' || parent?.view?.kind === 'grid';
}

/** A list's items each carry their own papers, so the feature itself holds none. */
export function isPerItem(now: Current, featureId: string): boolean {
  const feature = now.get(featureId);
  return feature?.kind === 'feature' && bodyIsPerItem(now, feature.body as Feature);
}

type Track = { source: Governing['source']; paperId: string | null };
const NONE: Track = { source: 'none', paperId: null };

/** A work's own paper always governs its kind, and an own What makes all three own. Otherwise the direct feature's paper. */
function trackOf(now: Current, workId: string, kind: PaperKind): Track {
  const work = now.get(workId);
  if (work?.kind !== 'work') return NONE;
  const own = ids.paper(workId, kind, 'editor');
  if (now.has(own) || now.has(ids.paper(workId, 'spec', 'editor'))) return { source: 'own', paperId: own };
  const feature = String(work.body.feature);
  if (now.get(feature)?.kind !== 'feature' || isPerItem(now, feature)) return NONE;
  const paperId = ids.featurePaper(feature, kind, 'editor');
  return now.has(paperId) && !replacedBy(now).has(workId) ? { source: 'feature', paperId } : NONE;
}

/** The editor paper that governs a piece of work. */
export function editorPaperOf(now: Current, workId: string, kind: PaperKind): Latest | undefined {
  const { paperId } = trackOf(now, workId, kind);
  return paperId ? now.get(paperId) : undefined;
}

/** A work's three papers as it answers to them: what governs each, beside the agents' version on the work. */
export function workPapers(now: Current, workId: string): (PaperPair & { source: Governing['source'] })[] {
  return PAPER_KINDS.map((kind) => {
    const { source, paperId } = trackOf(now, workId, kind);
    const editor = paperId ? now.get(paperId) : undefined;
    const agents = now.get(ids.paper(workId, kind, 'agents'));
    return { kind, source, editor: editor && entry<Paper>(editor), agents: agents && entry<Paper>(agents), state: paperId ? paperState(now, paperId) : { status: 'missing' } };
  });
}

/** The unfinished work in a feature that this feature paper governs. */
export function workRelyingOn(now: Current, featureId: string, kind: PaperKind): Entry<Work>[] {
  const paperId = ids.featurePaper(featureId, kind, 'editor');
  return entries<Work>(now, 'work').filter((w) => w.body.feature === featureId && w.body.state !== 'done' && trackOf(now, w.id, kind).paperId === paperId);
}

function isCovered(now: Current, workId: string): boolean {
  return (['spec', 'plan'] as const).every((kind) => {
    const paper = editorPaperOf(now, workId, kind);
    const agents = now.get(ids.paper(workId, kind, 'agents'));
    if (!paper || !agents || agents.body.against !== paper.at) return false;
    const { uncited, unknown } = coverage(String(paper.body.text), String(agents.body.text));
    return uncited.length === 0 && unknown.length === 0;
  });
}

/** The latest beyond on the work stands, unless the current own What was approved after it. */
export function beyondStands(now: Current, workId: string): boolean {
  const latest = entries<Beyond>(now, 'beyond').filter((b) => b.body.work === workId).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).at(-1);
  if (!latest) return false;
  const what = paperState(now, ids.paper(workId, 'spec', 'editor'));
  return !(what.status === 'approved' && what.at !== undefined && Date.parse(what.at) > Date.parse(latest.at));
}

export function governingPaper(now: Current, workId: string, kind: PaperKind): Governing {
  const { source, paperId } = trackOf(now, workId, kind);
  const paper = paperId ? now.get(paperId) : undefined;
  return {
    kind,
    source,
    paperId,
    version: paper?.at ?? null,
    editorStatus: paperId ? paperState(now, paperId).status : 'missing',
    covered: source !== 'none' && isCovered(now, workId),
    beyond: beyondStands(now, workId),
    text: paper ? String(paper.body.text) : null,
  };
}

/** A Why stands on the editor's answer alone. A What or How also needs no standing beyond, and an own or covered paper. */
export function effectiveStatus(g: Governing): PaperState['status'] {
  if (g.kind === 'intent' || g.editorStatus !== 'approved') return g.editorStatus;
  return !g.beyond && (g.source === 'own' || (g.source === 'feature' && g.covered)) ? 'approved' : 'waiting';
}
