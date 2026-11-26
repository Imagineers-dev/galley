// The shape each kind of record must have. Refusals carry plain words, because agents read them.
import { z } from 'zod';
import { linkTarget } from '../book/links';
import { ORDER_LISTS } from '../book/order';
import { STUDY } from '../book/study-types';
import { assetBodies } from './bodies-assets';
import { governingBodies } from './bodies-governing';
import { icon } from './bodies-icon';
import { oversightBodies } from './bodies-oversight';
import { askAbout, promiseBodies, promiseBreaks, replyBuild, runProof, testCommand } from './bodies-promises';
import { haveItWhen, pointers, startedBy, studyBodies } from './bodies-study';

const text = z.string().trim().min(1);
/** Why a note, a feature or a piece of work was taken out, in one line. */
const withdrawn = z.object({ reason: text.max(300).regex(/^[^\r\n]*$/, 'a reason is one line') }).strict();
/** A finding or an open question; withdrawn, it says why. */
const note = z.object({ work: text, text, withdrawn: withdrawn.optional() }).strict();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a date written YYYY-MM-DD');

export const origin = z.union([
  z.object({ words: text, saidOn: day }).strict(),
  z.object({ work: text }).strict(),
  z.object({ event: text }).strict(),
]);

const diaryItem = z.union([text, z.object({ text, work: text.optional() }).strict()]);

export const verdict = z.object({ served: z.enum(['yes', 'partly', 'no']), words: text.optional() }).strict();

/** How a feature shows its children. One kind so far; a new kind is a new member of this union. */
export const featureView = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('grid'),
    noun: text.optional(),
    target: z.number().int().min(1).max(10_000).optional(),
    groups: z.array(z.object({ title: text, size: z.number().int().min(1).max(100) }).strict()).max(50).optional(),
  }).strict(),
]);

/** How a test runs: `app` is in the real installed app, `editor` is tried by the editor there. */
export const testLevel = z.enum(['unit', 'integration', 'app', 'editor']);

export const bodies = {
  project: z.object({ title: text, forWriter: text, kind: z.literal(STUDY).optional() }).strict(),
  feature: z
    .object({ title: text, slug: text, parent: text.optional(), forWriter: text, standing: text.optional(), about: text.optional(), lanes: z.array(text).optional(), view: featureView.optional(), icon: icon.optional(), approval: z.literal('per-item').optional(), perItemReply: text.optional(), withdrawn: withdrawn.optional() })
    .strict(),
  work: z
    .object({
      feature: text,
      title: text,
      slug: text,
      on: day,
      state: z.enum(['done', 'now', 'next']),
      summary: text,
      origin,
      verdict: verdict.optional(),
      withdrawn: withdrawn.optional(),
      pointers: pointers.optional(),
      haveItWhen: haveItWhen.optional(),
      startedBy: startedBy.optional(),
      serves: z.array(text).max(100).optional(),
      provenAtStart: z.array(text).max(500).optional(),
    })
    .strict(),
  event: z.object({ feature: text, title: text, on: day, text, breaks: promiseBreaks.optional(), noPromiseYet: z.literal(true).optional() }).strict(),
  paper: z
    .object({ work: text.optional(), feature: text.optional(), kind: z.enum(['intent', 'spec', 'plan']), for: z.enum(['editor', 'agents']), text, against: z.string().optional() })
    .strict()
    .refine((p) => (p.work === undefined) !== (p.feature === undefined), 'a paper belongs to one piece of work or one feature'),
  decision: z
    .object({
      work: text,
      question: text,
      chosen: text,
      means: text,
      shapes: text,
      context: text,
      turnedDown: z.array(z.object({ option: text, whyNot: text }).strict()),
      why: z.string(),
      words: z.object({ text, saidAt: z.string().datetime() }).strict().optional(),
      madeAt: z.string().datetime(),
      revisitIf: text.optional(),
    })
    .strict(),
  finding: note,
  question: note,
  link: z
    .object({ from: text, to: text, kind: z.enum(['came-from', 'depends-on', 'leads-to', 'touches', 'serves', 'proves-promise']), label: text.optional(), failsWhen: text.optional() })
    .strict()
    .refine((l) => (l.kind === 'proves-promise') === (l.failsWhen !== undefined), 'a proves-promise link, and only that, says in plain words when the test fails (failsWhen)'),
  approval: z.object({ paper: text, verdict: z.enum(['approved', 'changes']), words: text.optional(), paperAt: z.string().datetime().optional() }).strict(),
  test: z
    .object({
      work: text,
      title: text,
      proves: z.array(z.string().regex(/^(intent|spec|plan)¶\d+$/, 'a line written like spec¶2')).min(1, 'a test proves at least one line'),
      level: testLevel,
      runs: text,
      part: text.optional(),
      command: testCommand.optional(),
    })
    .strict(),
  guard: z.object({ work: text, feature: text, why: text, checks: z.array(text).min(1), runs: text }).strict(),
  run: z.object({ of: text, result: z.enum(['pass', 'fail']), stage: z.enum(['baseline', 'after', 'check']), evidence: text, ...runProof }).strict(),
  review: z
    .object({
      work: text,
      part: text,
      writtenBy: text,
      answers: z.array(z.object({ q: z.number().int().min(1).max(7), verdict: z.enum(['passes', 'concern', 'fails']), evidence: text }).strict()).length(7, 'a review answers all seven questions'),
      verdict: z.enum(['passes', 'concern', 'fails']),
    })
    .strict(),
  commit: z
    .object({ work: text, repo: text, sha: z.string().regex(/^[0-9a-f]{7,40}$/), subject: text, committedAt: z.string().datetime({ offset: true }) })
    .strict(),
  diary: z
    .object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      headline: text.optional(),
      done: z.array(diaryItem),
      next: z.array(diaryItem),
      waiting: z.array(diaryItem),
    })
    .strict(),
  history: z
    .object({ repo: text, day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), commits: z.number().int().min(0).max(10_000) })
    .strict(),
  checkout: z
    .object({
      repo: text,
      checkedAt: z.string().datetime({ offset: true }),
      branch: text,
      head: z.object({ sha: z.string().regex(/^[0-9a-f]{7,40}$/), subject: text }).strict(),
      unpushed: z.array(z.object({ sha: z.string().regex(/^[0-9a-f]{7,40}$/), subject: text }).strict()).max(500),
      uncommitted: z.array(text).max(5_000),
      live: z
        .array(z.object({ part: text, where: text, commit: z.string().regex(/^[0-9a-f]{7,40}$/).nullable(), uncommittedFiles: z.number().int().min(0).nullable().optional() }).strict())
        .max(50),
    })
    .strict(),
  ask: z
    .object({
      work: text,
      to: text,
      needs: z.enum(['decision', 'try', 'fyi']),
      subject: text.max(120, 'a subject reads in one line: 120 characters at most'),
      text,
      options: z.array(z.object({ option: text, detail: text.optional() }).strict()).max(6).optional(),
      recommend: z.number().int().min(0).optional(),
      links: z.array(z.object({ label: text, href: text.refine((h) => linkTarget(h) !== null, 'a link is a path in the book (/…) or an http(s) address') }).strict()).optional(),
      about: askAbout.optional(),
    })
    .strict(),
  reply: z
    .object({ to: text, choice: text.optional(), words: text.optional(), tried: z.enum(['works', 'wrong']).optional(), build: replyBuild.optional() })
    .strict(),
  mark: z
    .object({ message: text, person: text, state: z.enum(['read', 'archived', 'snoozed', 'inbox']), until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })
    .strict(),
  order: z.object({ of: z.enum(ORDER_LISTS), feature: text.optional(), items: z.array(text).max(2_000) }).strict(),
  ...governingBodies,
  ...promiseBodies,
  ...oversightBodies,
  ...assetBodies,
  ...studyBodies,
} as const;
