// The shapes of promises and of what proves them (see lib/book/promise-types.ts).
import { z } from 'zod';
import { PROVE_REPOS, refusedArgv } from '../../bin/prove-rules.mjs';

const text = z.string().trim().min(1);
const sha = z.string().regex(/^[0-9a-f]{7,40}$/, 'a git commit sha');
const time = z.string().datetime({ offset: true });
export const surface = z.enum(['server', 'app']);
export const subject = z.union([z.literal('synthetic'), z.object({ real: text }).strict()]);
const snapshot = z.object({ text, mustHoldIn: surface, serverReason: text.optional() }).strict();

/** The fields a run may add to say what it ran on. */
export const runProof = { sha: sha.optional(), committedAt: time.optional(), surface: surface.optional(), subject: subject.optional() };

export const testCommand = z.object({
  repo: z.string().refine((r) => PROVE_REPOS.includes(r), (r) => ({ message: `The runner does not run ${r}: add it to repositories in Galley's settings.` })),
  argv: z.array(text).min(1).max(40).refine((a) => !refusedArgv(a), (a) => ({ message: `A test command cannot run this: ${refusedArgv(a)}.` })),
  surface,
  subject,
}).strict();

export const promiseBreaks = z.array(z.object({ promise: text, subject }).strict()).min(1).max(20);

export const askAbout = z.object({
  act: z.enum(['pass', 'retract', 'accept-gap']),
  test: text.optional(), promise: text.optional(), event: text.optional(), run: text.optional(), version: time.optional(),
  sha: sha.optional(), committedAt: time.optional(), surface: surface.optional(), subject: subject.optional(),
}).strict();

/** The installed build the book stamps on their reply to a try. */
export const replyBuild = z.object({ sha, readAt: time }).strict();

/** What an agent may say an ask is about. The book fills in the rest (lib/book/promise-ask.ts). */
export const askAboutInput = z.object({
  act: z.enum(['pass', 'retract', 'accept-gap']), test: text.optional(), promise: text.optional(), event: text.optional(), run: text.optional(),
}).strict();

export const promiseBodies = {
  promise: z.object({ feature: text, text, serves: text.optional(), mustHoldIn: surface, serverReason: text.optional() }).strict(),
  'promise-approval': z.object({
    feature: text,
    items: z.array(z.object({ promise: text, at: time, snapshot }).strict()).min(1).max(200),
    verdict: z.enum(['approved', 'changes']),
    words: text.optional(),
  }).strict(),
  witness: z.object({ run: text, evidence: text }).strict(),
  'link-accept': z.object({ link: text, testAt: time, argv: z.array(text).max(40) }).strict(),
} as const;
