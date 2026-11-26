// The rules switched on with per-feature approval. A piece of work follows its
// feature's What and How unless it is a list's item or goes beyond them; a feature becomes a list only on the
// editor's Go; and work is done only while every promise it answers for is Proven.
import { beyondStands, isPerItem } from '../book/governing';
import type { Reply } from '../book/inbox-types';
import { promiseGaps } from '../book/promise-gaps';
import { promiseStatus } from '../book/promise-status';
import type { BookPromise } from '../book/promise-types';
import { isStudy } from '../book/study';
import type { Feature, Paper, Work } from '../book/types';
import { ids } from '../book/types';
import { type Current, answersFor } from '../book/views';
import type { Proposed } from './check';

const ownWhatOrHow = (now: Current, workId: string) => now.has(ids.paper(workId, 'spec', 'editor')) || now.has(ids.paper(workId, 'plan', 'editor'));

function paperRules(now: Current, record: Proposed, paper: Paper): string[] {
  const out: string[] = [];
  const held = now.get(record.id);
  if (paper.for === 'editor' && held && held.body.text === paper.text) out.push('These are the same words as the current version, so there is nothing new to approve.');
  if (paper.for === 'agents' && !paper.against) out.push("An agents' paper names the version of the editor's paper it was written from (against).");
  if (paper.for !== 'editor' || paper.work === undefined || held || (paper.kind !== 'spec' && paper.kind !== 'plan')) return out;
  const work = now.get(paper.work)?.body as Work | undefined;
  if (!work || isPerItem(now, work.feature) || beyondStands(now, paper.work) || ownWhatOrHow(now, paper.work)) return out;
  out.push(`"${work.feature}" holds one What you'll get and one How for all its work. Write this work's version of them with book_translate_paper, or, if it goes beyond them, say so first with book_beyond.`);
  return out;
}

/** Whether this feature itself is marked as a list or shown as a grid (a story under a grid is not a new list). */
const marked = (f?: Feature) => f?.approval === 'per-item' || f?.view?.kind === 'grid';

/** The feature ids a text names, each whole: "feature:scene-other" does not name "feature:scene". */
const namedFeatures = (text: string) => new Set(text.match(/feature:[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? []);

/** A feature is marked a list, or shown as a grid, only on a editor's Go to an ask that names it. */
function listRules(now: Current, id: string, feature: Feature): string[] {
  if (!marked(feature) || marked(now.get(id)?.body as Feature | undefined)) return [];
  const reply = feature.perItemReply ? now.get(feature.perItemReply) : undefined;
  const answer = reply?.kind === 'reply' && reply.by === 'editor' ? (reply.body as Reply) : undefined;
  const ask = answer ? now.get(answer.to) : undefined;
  if (answer?.choice === 'Go' && ask?.kind === 'ask' && namedFeatures(String(ask.body.text)).has(id)) return [];
  return [`"${id}" becomes a list only on the editor's Go to an ask whose text names ${id}; perItemReply names that reply.`];
}

/**
 * Work goes to done only while every promise it answers for is Proven, or its gap accepted. Work already done stays
 * as it was, but it takes on no new promise that is not Proven: finishing first and naming promises after would
 * skip the gate.
 */
function doneRules(now: Current, record: Proposed, work: Work): string[] {
  if (work.state !== 'done' || isStudy(now)) return [];
  const held = now.get(record.id);
  if (!held) return [];
  if ((held.body as Work).state === 'done') {
    const added = (work.serves ?? []).filter((p) => !(held.answeredFor ?? []).includes(p) && promiseStatus(now, p).state !== 'proven');
    return added.map((p) => `Finished work takes on only Proven promises; "${(now.get(p)?.body as BookPromise | undefined)?.text ?? p}" is not Proven.`);
  }
  // What it answers for, read while it is still open (promiseGaps passes over work already done), with this version
  // added to its history.
  const open = { ...work, state: (held.body as Work).state };
  const answeredFor = [...new Set([...(held.answeredFor ?? []), ...answersFor({ ...held, body: work as unknown as Record<string, unknown> })])];
  const after: Current = new Map(now).set(record.id, { ...held, body: open as unknown as Record<string, unknown>, answeredFor });
  const { gaps, noPromises } = promiseGaps(after, record.id);
  const out = gaps.map((g) => `"${(now.get(g.promise)?.body as BookPromise | undefined)?.text ?? g.promise}" is not Proven (${g.state.replace('-', ' ')}): ${g.reasons[0] ?? 'prove it first'}`);
  if (noPromises) out.push(`"${work.feature}" has no promise yet. Propose its promises with book_propose_promise before calling work done.`);
  return out;
}

export function switchedRefusals(now: Current, record: Proposed, body: Record<string, unknown>): string[] {
  switch (record.kind) {
    case 'paper': return paperRules(now, record, body as unknown as Paper);
    case 'feature': return listRules(now, record.id, body as unknown as Feature);
    case 'work': return doneRules(now, record, body as unknown as Work);
    default: return [];
  }
}
