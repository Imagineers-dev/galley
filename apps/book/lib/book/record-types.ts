// The records that follow a piece of work once it is under way: its tests, reviews and commits, the diary, a
// repository's history and checkout, and what a repository reports about a review or a release.
import type { Subject, Surface, TestCommand } from './promise-types';

/** A test, in plain words, naming the lines of the editor's papers it proves, e.g. "spec¶2". */
export type TestLevel = 'unit' | 'integration' | 'app' | 'editor';
export type Test = { work: string; title: string; proves: string[]; level: TestLevel; runs: string; part?: string; command?: TestCommand };
/** A feature this work could break, and the existing checks that guard it. */
export type Guard = { work: string; feature: string; why: string; checks: string[]; runs: string };
/** One run of a test or a guard. */
export type Run = { of: string; result: 'pass' | 'fail'; stage: 'baseline' | 'after' | 'check'; evidence: string; sha?: string; committedAt?: string; surface?: Surface; subject?: Subject };
export type Verdict = 'passes' | 'concern' | 'fails';
/** A review of a part of the work, by an agent that did not write it, answering the seven questions. */
export type Review = {
  work: string;
  part: string;
  writtenBy: string;
  answers: { q: number; verdict: Verdict; evidence: string }[];
  verdict: Verdict;
};

/** The seven questions every review answers. */
export const REVIEW_QUESTIONS = [
  { q: 1, title: 'Does it do what you approved?', sub: 'Nothing more, nothing less', asks: 'Every line of your papers is covered; no item is uncited; the agents’ version is current' },
  { q: 2, title: 'Do the tests prove it?', sub: 'Each line, for real', asks: 'Every line has a passing test; each new test was seen to fail without the change' },
  { q: 3, title: 'Does anything else break?', sub: 'No regression', asks: 'Every guard of every touched feature passed before and after' },
  { q: 4, title: 'Was it built as planned?', sub: 'Or the change is recorded', asks: 'Slices match How it gets built; any departure is a recorded decision' },
  { q: 5, title: 'Is it built well?', sub: 'The house rules', asks: 'Files under 200 lines; one pipeline, no duplicated logic; the style guide for anything you see' },
  { q: 6, title: 'Is your work safe?', sub: 'Nothing lost, nothing leaked', asks: 'No user’s work lost; data changes are reversible and carried by export; nothing private leaves the machine' },
  { q: 7, title: 'Can you try it?', sub: 'In the installed Studio', asks: 'The part’s “what you can try” works in a test story, with screenshots' },
] as const;

/** A commit that named this work, as the repository's post-commit hook reported it. */
export type Commit = { work: string; repo: string; sha: string; subject: string; committedAt: string };

/** One line of a day: what happened, linked to the piece of work it belongs to when there is one. */
export type DiaryItem = { text: string; work?: string };
/** A day in the book: a headline, what was done, what comes next, and what waits on the editor. One entry per day. */
export type Diary = { day: string; headline?: string; done: (DiaryItem | string)[]; next: (DiaryItem | string)[]; waiting: (DiaryItem | string)[] };

/** A day of a repository's git history from before or beside the book: how many commits were made that day. */
export type History = { repo: string; day: string; commits: number };

/** What a part runs, as it says itself (the Worker's /version, the Studio's app info); null when it does not say. */
export type LiveReading = { part: string; where: string; commit: string | null; uncommittedFiles?: number | null };
/**
 * A repository as it stands when someone picks up the work: its head, what is not yet on the remote, what is not
 * committed, and what each live part says it runs. Reported by the repository itself; one id per repository.
 */
export type Checkout = {
  repo: string;
  checkedAt: string;
  branch: string;
  head: { sha: string; subject: string };
  unpushed: { sha: string; subject: string }[];
  uncommitted: string[];
  live: LiveReading[];
};

/** Someone says this work goes beyond its feature's approved papers: its author, or a reviewer through the repository. */
export type Beyond = { work: string; raisedBy: 'author' | 'reviewer'; text: string; repo?: string };
/** One commit a review covered. `work` is the piece of work the commit names, when it names one. */
export type ReceiptCommit = { sha: string; subject: string; patchId: string; work?: string };
/** A repository's record that a range of commits was reviewed for a piece of work, and the state of its papers then. */
export type Receipt = {
  work: string;
  repo: string;
  range: { base: string; head: string };
  verdict: 'pass' | 'fail';
  commits: ReceiptCommit[];
  /** Each paper's raw state then, and what the governing rule decided for it (status, whose paper, which version). */
  papers: { work: string; title: string; spec: string; plan: string; effective?: Record<'spec' | 'plan', ReceiptDecision> }[];
};
export type ReceiptDecision = { status: string; source: 'own' | 'feature' | 'none'; version: string | null };
/** What the production watch last saw of a release. One record per release; the latest wins. */
export type Watch = { release: string; result: 'pass' | 'fail' };
