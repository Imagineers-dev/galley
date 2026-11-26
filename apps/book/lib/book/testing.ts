// What holds a piece of work to the editor's papers: translation coverage, tests, guards, runs and reviews.
import { type Governing, editorPaperOf, governingPaper } from './governing';
import { coverage, paragraphs } from './paragraphs';
import type { Commit, Guard, Review, Run, Test } from './record-types';
import type { Paper, PaperKind } from './types';
import { PAPER_KINDS, ids } from './types';
import { type Current, type Entry, type Latest, entries, entry } from './views';

export type Translation = {
  kind: PaperKind;
  source: Governing['source']; // whose paper this work answers to
  editor?: Entry<Paper>;
  agents?: Entry<Paper>;
  stale: boolean; // the editor's paper changed after the agents' version was written
  coverage?: ReturnType<typeof coverage>;
};

export function translations(now: Current, workId: string): Translation[] {
  const get = (record?: Latest) => (record ? entry<Paper>(record) : undefined);
  return PAPER_KINDS.map((kind) => {
    const editor = get(editorPaperOf(now, workId, kind));
    const agents = get(now.get(ids.paper(workId, kind, 'agents')));
    const stale = !!(editor && agents && agents.body.against && agents.body.against !== editor.at);
    return { kind, source: governingPaper(now, workId, kind).source, editor, agents, stale, coverage: editor && agents ? coverage(editor.body.text, agents.body.text) : undefined };
  });
}

/** The papers as an agent's brief gives them. A work takes on only some lines of a feature's paper, so those have no gaps. */
export const briefPapers = (now: Current, workId: string) => translations(now, workId).map((t) => ({
  kind: t.kind,
  source: t.source,
  version: t.editor?.at ?? null,
  editorLines: t.editor ? paragraphs(t.editor.body.text).map((p) => `¶${p.n} ${p.text}`) : null,
  agents: t.agents?.body.text ?? null,
  stale: t.stale,
  ...(t.source === 'feature'
    ? { needsTranslating: needsTranslating(now, workId, t.kind), staleTests: staleTestsOf(now, workId, t.kind) }
    : { gaps: t.coverage?.gaps.map((g) => `¶${g}`) ?? null }),
}));

const latestRun = (runs: Entry<Run>[], of: string, stage?: Run['stage']) =>
  runs.filter((r) => r.body.of === of && (!stage || r.body.stage === stage)).sort((a, b) => a.at.localeCompare(b.at)).at(-1);

export type TestRow = Entry<Test> & { last?: Entry<Run> };
export type GuardRow = Entry<Guard> & { baseline?: Entry<Run>; after?: Entry<Run> };

/** The tests that `keep` chooses, each with its last run. */
export function testRows(now: Current, keep: (test: Entry<Test>) => boolean): TestRow[] {
  const runs = entries<Run>(now, 'run');
  return entries<Test>(now, 'test').filter(keep).map((t) => ({ ...t, last: latestRun(runs, t.id) }));
}

export const testsOf = (now: Current, workId: string) => testRows(now, (t) => t.body.work === workId);

export function guardsOf(now: Current, workId: string): GuardRow[] {
  const runs = entries<Run>(now, 'run');
  return entries<Guard>(now, 'guard')
    .filter((g) => g.body.work === workId)
    .map((g) => ({ ...g, baseline: latestRun(runs, g.id, 'baseline'), after: latestRun(runs, g.id, 'after') }));
}

export const reviewsOf = (now: Current, workId: string) =>
  entries<Review>(now, 'review').filter((r) => r.body.work === workId).sort((a, b) => b.at.localeCompare(a.at));

/** `staleTests`: on a feature's paper, tests of this line written before its current version. They prove nothing now. */
export type LineRow = { ref: string; kind: PaperKind; n: number; text: string; tests: string[]; staleTests?: string[] };

/** The lines of a feature's paper this work took on: those its current agents' paper cites. */
export function citedLines(now: Current, workId: string, kind: PaperKind, paper: Latest): Set<number> {
  const agents = now.get(ids.paper(workId, kind, 'agents'));
  if (!agents || agents.body.against !== paper.at) return new Set();
  return new Set(coverage(String(paper.body.text), String(agents.body.text)).covered);
}

/** Whether a work following its feature's paper has no translation of the paper's current words. */
export function needsTranslating(now: Current, workId: string, kind: PaperKind): boolean {
  const paper = editorPaperOf(now, workId, kind);
  return !!paper?.body.feature && now.get(ids.paper(workId, kind, 'agents'))?.body.against !== paper.at;
}

/** The work's tests of a feature paper that prove nothing now: all of them until it is translated, then those older than it. */
export function staleTestsOf(now: Current, workId: string, kind: PaperKind): string[] {
  const paper = editorPaperOf(now, workId, kind);
  if (!paper?.body.feature) return [];
  const untranslated = needsTranslating(now, workId, kind);
  return testsOf(now, workId).filter((t) => t.body.proves.some((ref) => ref.startsWith(`${kind}¶`)) && (untranslated || t.at < paper.at)).map((t) => t.id);
}

/** Every line the work answers for, with the tests that prove it: all of its own paper, or what it cites of its feature's. A line with none is a gap. */
export function lineCoverage(now: Current, workId: string, kinds: PaperKind[] = ['spec']): LineRow[] {
  const tests = testsOf(now, workId);
  const rows: LineRow[] = [];
  for (const kind of kinds) {
    const paper = editorPaperOf(now, workId, kind);
    if (!paper) continue;
    const cited = paper.body.feature ? citedLines(now, workId, kind, paper) : undefined;
    for (const p of paragraphs(String(paper.body.text))) {
      if (cited && !cited.has(p.n)) continue;
      const ref = `${kind}¶${p.n}`;
      const proving = tests.filter((t) => t.body.proves.includes(ref));
      const old = cited ? proving.filter((t) => t.at < paper.at) : [];
      rows.push({ ref, kind, n: p.n, text: p.text, tests: proving.filter((t) => !old.includes(t)).map((t) => t.id), ...(old.length ? { staleTests: old.map((t) => t.id) } : {}) });
    }
  }
  return rows;
}

export const commitsOf = (now: Current, workId: string) =>
  entries<Commit>(now, 'commit').filter((c) => c.body.work === workId).sort((a, b) => b.body.committedAt.localeCompare(a.body.committedAt));
