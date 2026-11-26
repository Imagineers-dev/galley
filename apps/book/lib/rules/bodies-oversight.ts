// The shapes of the oversight records (see lib/book/oversight-types.ts). Refusals are read by agents.
import { z } from 'zod';

const text = z.string().trim().min(1);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a date written YYYY-MM-DD');
const level = z.enum(['low', 'medium', 'high']);

export const oversightBodies = {
  release: z.object({ part: text, where: text, sha: z.string().regex(/^[0-9a-f]{7,40}$/, 'a git commit sha'), repo: text, by: text, undo: text, deployedAt: z.string().datetime({ offset: true }), confirmed: z.boolean(), note: text.optional(), works: z.array(text).max(500).optional() }).strict(),
  proof: z
    .object({ work: text, title: text, kind: z.enum(['output', 'screenshot', 'eval', 'link']), evidence: text.max(2_000_000, 'evidence is at most 2 MB'), part: text.optional() })
    .strict(),
  lesson: z
    .object({
      rule: text, why: text, areas: z.array(text).min(1, 'a lesson applies to at least one area'),
      from: z.union([z.object({ words: text, saidOn: day }).strict(), z.object({ event: text }).strict(), z.object({ work: text }).strict()]),
    })
    .strict(),
  slip: z.object({ lesson: text, work: text.optional(), text }).strict(),
  eval: z
    .object({ skill: text, suite: text, score: z.number().min(0).max(10), passed: z.number().int().min(0), cases: z.number().int().min(1), sha: text.optional(), incident: text.optional() })
    .strict(),
  risk: z
    .object({ title: text, kind: z.enum(['risk', 'debt']), cost: text, likelihood: level, impact: level, payDown: text, state: z.enum(['open', 'accepted', 'paid']), work: text.optional() })
    .strict(),
  pulse: z
    .object({ measure: text, part: text, value: z.number(), unit: text, limit: z.number().optional(), higherIsWorse: z.boolean(), note: text.optional() })
    .strict(),
  band: z.object({ action: text, band: z.enum(['alone', 'reviewed', 'editor']), why: text, source: text.optional() }).strict(),
  goal: z.object({ title: text, measure: text, unit: text, target: z.number(), by: day.optional(), higherIsBetter: z.boolean() }).strict(),
  result: z.object({ goal: text, value: z.number(), note: text.optional(), work: text.optional(), measuredOn: day }).strict(),
} as const;
