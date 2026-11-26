// What keeps the editor on top of the product: what is live, proof, lessons, agents' quality, risks, the pulse,
// who may do what, and goals. Each is an append-only record like the rest of the book.

/** A part of the product sent out from a commit. The latest release of each part is what is live. */
/** confirmed: the commit was read from the deployment itself; otherwise it was inferred (e.g. from the deploy time). */
export type Release = { part: string; where: string; sha: string; repo: string; by: string; undo: string; deployedAt: string; confirmed: boolean; note?: string; works?: string[] };
/** Evidence that a piece of work is done: test output, a screenshot (data URL), an eval run or a link. */
export type Proof = { work: string; title: string; kind: 'output' | 'screenshot' | 'eval' | 'link'; evidence: string; part?: string };
/** A correction or incident turned into a rule agents read before working in its areas. */
export type Lesson = { rule: string; why: string; from: { words: string; saidOn: string } | { event: string } | { work: string }; areas: string[] };
/** A lesson broken in practice. */
export type Slip = { lesson: string; work?: string; text: string };
/** One eval run of an agent skill. Scores are out of 10. */
export type EvalRun = { skill: string; suite: string; score: number; passed: number; cases: number; sha?: string; incident?: string };
export type Risk = {
  title: string; kind: 'risk' | 'debt'; cost: string; likelihood: 'low' | 'medium' | 'high'; impact: 'low' | 'medium' | 'high';
  payDown: string; state: 'open' | 'accepted' | 'paid'; work?: string;
};
/** One reading of a measure of the running product, with its limit when it has one. */
export type Pulse = { measure: string; part: string; value: number; unit: string; limit?: number; higherIsWorse: boolean; note?: string };
/** Which band an action is in: agents alone, another agent's review, or only the editor. */
export type Band = { action: string; band: 'alone' | 'reviewed' | 'editor'; why: string; source?: string };
export type Goal = { title: string; measure: string; unit: string; target: number; by?: string; higherIsBetter: boolean };
export type Result = { goal: string; value: number; note?: string; work?: string; measuredOn: string };

export const BAND_WORDS = {
  alone: { title: 'Agents do alone', sub: 'and record it' },
  reviewed: { title: 'Another agent reviews first', sub: 'never the one that wrote it' },
  editor: { title: 'Only you decide', sub: 'through the inbox' },
} as const;
