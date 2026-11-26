// The shapes of what a repository or an author reports about a piece of work (see lib/book/record-types.ts).
import { z } from 'zod';

const text = z.string().trim().min(1);
const sha = z.string().regex(/^[0-9a-f]{7,40}$/, 'a git commit sha');
const result = z.enum(['pass', 'fail']);
/** What the governing rule decided for a paper when the review ran: its status, whose paper, and which version. */
const decided = z.object({ status: text, source: z.enum(['own', 'feature', 'none']), version: z.string().datetime({ offset: true }).nullable() }).strict();

export const governingBodies = {
  beyond: z.object({ work: text, raisedBy: z.enum(['author', 'reviewer']), text, repo: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, 'a repository name').optional() }).strict(),
  receipt: z
    .object({
      work: text,
      repo: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, 'a repository name'),
      range: z.object({ base: sha, head: sha }).strict(),
      verdict: result,
      commits: z.array(z.object({ sha, subject: text, patchId: text, work: text.optional() }).strict()).max(2_000),
      papers: z.array(z.object({ work: text, title: text, spec: text, plan: text, effective: z.object({ spec: decided, plan: decided }).strict().optional() }).strict()).max(200),
    })
    .strict(),
  watch: z.object({ release: text, result }).strict(),
} as const;
