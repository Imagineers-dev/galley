// The shapes of a feature's promises and of what can prove them. A promise is a plain sentence the editor approves;
// its state is worked out in promise-status.ts and is never written down.

export type Surface = 'server' | 'app';
/** What a run was tried on: a real story, by id and never by its words, or made-up test data. */
export type Subject = { real: string } | 'synthetic';

export type BookPromise = { feature: string; text: string; serves?: string; mustHoldIn: Surface; serverReason?: string };
/** The words the editor approved. They stay in force until a new approval, because the book keeps only the latest version as current. */
export type PromiseSnapshot = { text: string; mustHoldIn: Surface; serverReason?: string };
export type PromiseApprovalItem = { promise: string; at: string; snapshot: PromiseSnapshot };
/** The editor's one answer to some of a feature's promises, each at the version on their screen. */
export type PromiseApproval = { feature: string; items: PromiseApprovalItem[]; verdict: 'approved' | 'changes'; words?: string };

/** A second agent vouches for a run it did not do. */
export type Witness = { run: string; evidence: string };
/** An agent that did not write the test accepts that it proves the promise, for this version of the test and this command. */
export type LinkAccept = { link: string; testAt: string; argv: string[] };

/** How a test runs by itself; bin/prove-rules.mjs says what the runner will take. */
export type TestCommand = { repo: string; argv: string[]; surface: Surface; subject: Subject };

/** A bug naming what it broke, and on what. */
export type PromiseBreak = { promise: string; subject: Subject };

/** The build the installed app reported, and when the book read it. */
export type InstalledBuild = { sha: string; readAt: string };

/** What a editor's reply to an ask answers. Each rule reads only its own `act`. */
export type AskAbout = {
  act: 'pass' | 'retract' | 'accept-gap';
  test?: string;
  promise?: string;
  event?: string;
  run?: string; // retract: a failed run that should not have counted
  version?: string;
  sha?: string;
  committedAt?: string;
  surface?: Surface;
  subject?: Subject;
};
/** The option a editor picks to say yes to a retraction or an accepted gap: any other answer leaves things as they are. */
export const YES_TO: Record<'retract' | 'accept-gap', string> = { retract: 'Yes, this was a mistake', 'accept-gap': 'Yes, accept this gap' };

export const subjectKey = (s: Subject | undefined) => (s && s !== 'synthetic' ? `real:${s.real}` : 'synthetic');
