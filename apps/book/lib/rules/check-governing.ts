// The write rules for who holds papers: a feature's own papers, the features that are lists and refuse them, and what
// a repository or an author reports about a piece of work (a "goes beyond", a review receipt, a watch).
import { bodyIsPerItem, editorPaperOf, isPerItem } from '../book/governing';
import type { Beyond, Receipt, Watch } from '../book/record-types';
import { isStudy } from '../book/study';
import type { Feature, Paper } from '../book/types';
import { PAPER_KINDS, ids, paperOwner, slugOf } from '../book/types';
import { type Current, paperState } from '../book/views';
import type { Proposed } from './check';
import { agentsPaperRefusals } from './check-testing';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notA = (now: Current, id: string, kind: string, what: string) =>
  (now.get(id)?.kind === kind ? [] : [`${what} "${id}" is not a ${kind} in this book.`]);

const holdsEditorPaper = (now: Current, featureId: string) => PAPER_KINDS.some((kind) => now.has(ids.featurePaper(featureId, kind, 'editor')));

function paperRefusals(now: Current, id: string, paper: Paper): string[] {
  const owner = paperOwner(paper);
  const onFeature = paper.feature !== undefined;
  const out = onFeature ? notA(now, owner, 'feature', 'Feature') : notA(now, owner, 'work', 'Work');
  const expected = onFeature ? ids.featurePaper(owner, paper.kind, paper.for) : ids.paper(owner, paper.kind, paper.for);
  if (id !== expected) out.push(`This paper's id is ${expected}.`);
  const held = now.get(id);
  if (held?.kind === 'paper' && paperOwner(held.body as Paper) !== owner) out.push(`${id} already belongs to ${paperOwner(held.body as Paper)}.`);
  if (onFeature && isStudy(now)) out.push('A study book holds no feature papers.');
  if (onFeature && isPerItem(now, owner)) out.push(`"${owner}" is a list: each item carries its own papers, so the feature holds none.`);
  if (onFeature) {
    if (paper.for === 'agents') out.push('A feature holds only papers written for the editor; agents translate them on each piece of work.');
    return out;
  }
  // The editor's answer alone: `covered` would refuse the first translation, which is what makes a paper covered.
  if (paper.for === 'agents' && paperState(now, editorPaperOf(now, owner, paper.kind)?.id ?? '').status !== 'approved') {
    out.push(`The ${paper.kind} for agents waits until the editor approves the ${paper.kind} written for the editor.`);
  } else if (paper.for === 'agents') {
    out.push(...agentsPaperRefusals(now, paper));
  }
  return out;
}

/** A feature holding a editor paper cannot become a list, directly or by a grid above it; nor can a grid form over one. */
function featureRefusals(now: Current, id: string, feature: Feature): string[] {
  const out: string[] = [];
  if (holdsEditorPaper(now, id) && bodyIsPerItem(now, feature)) {
    out.push(`"${id}" holds a paper written for the editor, so it cannot be marked as a list, shown as a grid or moved under a grid.`);
  }
  // A mark rests on the editor's reply; check-switched.ts says what a new mark's reply must be.
  if (feature.approval === 'per-item' || feature.perItemReply) {
    const reply = feature.perItemReply ? now.get(feature.perItemReply) : undefined;
    if (!feature.perItemReply) out.push('Marking a feature as a list needs a reply by the editor (perItemReply).');
    else if (reply?.kind !== 'reply' || reply.by !== 'editor') out.push(`"${feature.perItemReply}" is not a reply by the editor in this book.`);
  }
  if (feature.view?.kind === 'grid') {
    for (const r of now.values()) {
      if (r.kind === 'feature' && r.body.parent === id && holdsEditorPaper(now, r.id)) out.push(`"${r.id}" sits under this feature and holds a paper written for the editor, so this feature cannot be shown as a grid.`);
    }
  }
  return out;
}

/** Whether a repository has a commit recorded on a piece of work. */
const recordedBy = (now: Current, repo: string, work: string) =>
  [...now.values()].some((r) => r.kind === 'commit' && r.id.startsWith(`commit:${repo}:`) && r.body.work === work);

function beyondRefusals(now: Current, record: Proposed, beyond: Beyond): string[] {
  const out = notA(now, beyond.work, 'work', 'Work');
  if (!record.id.startsWith('beyond:') || !UUID.test(record.id.slice('beyond:'.length))) out.push('A beyond\'s id is beyond:<uuid>.');
  if (now.has(record.id)) out.push(`${record.id} is already in the book; a beyond is written once.`);
  if (record.replaces) out.push('A beyond replaces nothing.');
  if ((record.by === 'repo') !== (beyond.raisedBy === 'reviewer')) out.push('A reviewer raises a beyond through the repository; an author raises it as themselves.');
  if ((beyond.raisedBy === 'reviewer') !== (beyond.repo !== undefined)) out.push("A reviewer's beyond names the repository it came from, and an author's names none.");
  if (beyond.repo !== undefined && !recordedBy(now, beyond.repo, beyond.work)) out.push(`${beyond.repo} has no commit recorded on ${beyond.work}, so its reviewer cannot speak for it.`);
  return out;
}

function receiptRefusals(now: Current, record: Proposed, receipt: Receipt): string[] {
  const out = notA(now, receipt.work, 'work', 'Work');
  if (record.by !== 'repo') out.push('A review receipt is recorded by a repository.');
  const prefix = `receipt:${receipt.repo}:${slugOf(receipt.work)}:${receipt.range.head}:`;
  if (!record.id.startsWith(prefix) || !UUID.test(record.id.slice(prefix.length))) out.push(`A receipt's id is ${prefix}<uuid>.`);
  if (now.has(record.id)) out.push(`${record.id} is already in the book; a receipt is written once.`);
  if (record.replaces) out.push('A receipt replaces nothing.');
  for (const c of receipt.commits) {
    if (c.work === receipt.work && now.get(`commit:${receipt.repo}:${c.sha}`)?.body.work !== receipt.work) out.push(`Commit ${c.sha} is not recorded on ${receipt.work}.`);
  }
  // A receipt speaks only for work its repository changed, and only through the papers of that work.
  if (!receipt.commits.some((c) => c.work === receipt.work)) out.push(`A receipt covers at least one commit of ${receipt.repo} on ${receipt.work}.`);
  if (!receipt.papers.some((p) => p.work === `${now.get(receipt.work)?.book}:${receipt.work}`)) out.push(`A receipt records the papers of ${receipt.work} it was reviewed against.`);
  return out;
}

function watchRefusals(now: Current, record: Proposed, watch: Watch): string[] {
  const out = notA(now, watch.release, 'release', 'Release');
  if (record.by !== 'repo') out.push('A watch is reported by a repository.');
  if (record.id !== `watch:${watch.release}`) out.push(`A watch's id is watch:${watch.release}.`);
  return out;
}

export function governingRefusals(now: Current, record: Proposed, body: Record<string, unknown>): string[] {
  switch (record.kind) {
    case 'paper': return paperRefusals(now, record.id, body as Paper);
    case 'feature': return featureRefusals(now, record.id, body as Feature);
    case 'beyond': return beyondRefusals(now, record, body as Beyond);
    case 'receipt': return receiptRefusals(now, record, body as unknown as Receipt);
    case 'watch': return watchRefusals(now, record, body as Watch);
    default: return [];
  }
}
