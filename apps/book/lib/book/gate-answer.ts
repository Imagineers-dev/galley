// What a repository's gates are told about a piece of work. `papers` is each own editor paper's raw state, which the
// old rule reads. `effective` is what the one governing rule (governing.ts) decides for each kind, with whose paper
// that is and its version, which the gates report beside the old answer until the switch. Pure.
import { effectiveStatus, governingPaper } from './governing';
import { citedLines } from './testing';
import { PAPER_KINDS, type PaperKind, type Work, ids } from './types';
import { type Current, paperState } from './views';

export type Effective = { status: string; source: 'own' | 'feature' | 'none'; version: string | null; beyond: boolean };
/** The governing text, the agents' paper written from it, and the lines of a feature's paper that work took on. */
export type GoverningText = { text: string | null; agents: string | null; cited: number[] | null };

export type GateAnswer = {
  exists: true;
  title: string;
  state: Work['state'];
  papers: Record<PaperKind, string>;
  effective: Record<PaperKind, Effective>;
  texts?: Record<PaperKind, string | null>;
  governing?: Record<PaperKind, GoverningText>;
};

const byKind = <T>(make: (kind: PaperKind) => T) => Object.fromEntries(PAPER_KINDS.map((kind) => [kind, make(kind)])) as Record<PaperKind, T>;

export function gateAnswer(now: Current, workId: string, withText: boolean): GateAnswer | null {
  const work = now.get(workId);
  if (!work || work.kind !== 'work') return null;
  const body = work.body as Work;
  const papers = byKind((kind) => paperState(now, ids.paper(workId, kind, 'editor')).status);
  const effective = byKind((kind): Effective => {
    const g = governingPaper(now, workId, kind);
    return { status: effectiveStatus(g), source: g.source, version: g.version, beyond: g.beyond };
  });
  const answer: GateAnswer = { exists: true, title: body.title, state: body.state, papers, effective };
  if (!withText) return answer;
  const texts = byKind((kind) => (now.get(ids.paper(workId, kind, 'editor'))?.body.text as string | undefined) ?? null);
  const governing = byKind((kind): GoverningText => {
    const g = governingPaper(now, workId, kind);
    const agents = (now.get(ids.paper(workId, kind, 'agents'))?.body.text as string | undefined) ?? null;
    const paper = g.source === 'feature' && g.paperId ? now.get(g.paperId) : undefined;
    return { text: g.text, agents, cited: paper ? [...citedLines(now, workId, kind, paper)].sort((a, b) => a - b) : null };
  });
  return { ...answer, texts, governing };
}
