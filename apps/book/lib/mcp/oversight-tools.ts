// Recording what keeps the editor on top of the product. Each tool appends one record; none decides for the editor.
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { slug } from '../rules/check-oversight';
import { add as put } from './add';
import { as, book, run } from './run';

const level = z.enum(['low', 'medium', 'high']);

export function registerOversightTools(server: McpServer) {
  server.registerTool('book_release', {
    description: 'Record a release as you make it: which part (e.g. "Worker", "Website", "Studio"), where it runs, the commit it was built from, and the exact command that undoes it. The latest release of each part is what the editor sees as live.',
    inputSchema: {
      book, release: z.string().optional().describe('To correct a release you recorded: its id'), part: z.string(), where: z.string().describe('e.g. "production", "this machine"'),
      sha: z.string(), repo: z.string(), undo: z.string().describe('The exact command to roll it back'), deployedAt: z.string().describe('ISO time it went out'),
      confirmed: z.boolean().describe('true only when the commit was read from the deployment itself; false when inferred'), note: z.string().optional(),
      works: z.array(z.string()).optional().describe('The pieces of work this release carries, by id: their Release stage reads it'),
    },
  }, ({ book: n, release, ...b }, x) => run(() => put(n, 'release', release ?? `release:${randomUUID()}`, as(x, n), { ...b, by: as(x, n) })));

  server.registerTool('book_prove', {
    description: 'Attach proof to a piece of work: test output (kind output), a screenshot as a data URL (kind screenshot), an eval run, or a link. Work cannot be marked done without proof.',
    inputSchema: { book, work: z.string(), title: z.string(), kind: z.enum(['output', 'screenshot', 'eval', 'link']), evidence: z.string(), part: z.string().optional() },
  }, ({ book: n, ...b }, x) => run(() => put(n, 'proof', `proof:${randomUUID()}`, as(x, n), b)));

  server.registerTool('book_lesson', {
    description: 'Record a lesson when the editor corrects you or an incident teaches something: the rule in plain words, why, where it came from, and the areas it applies to (feature slugs or words like "deploy", "ui").',
    inputSchema: {
      book, rule: z.string(), why: z.string(), areas: z.array(z.string()),
      from: z.union([z.object({ words: z.string(), saidOn: z.string() }), z.object({ event: z.string() }), z.object({ work: z.string() })]),
    },
  }, ({ book: n, ...b }, x) => run(() => put(n, 'lesson', `lesson:${randomUUID()}`, as(x, n), b)));

  server.registerTool('book_slip', {
    description: 'Record honestly that a lesson was broken. A lesson broken twice goes to the editor.',
    inputSchema: { book, lesson: z.string(), work: z.string().optional(), text: z.string() },
  }, ({ book: n, ...b }, x) => run(() => put(n, 'slip', `slip:${randomUUID()}`, as(x, n), b)));

  server.registerTool('book_eval', {
    description: "Record one eval run of an agent skill: score out of 10, cases passed, the commit, and the incident it guards when it came from one.",
    inputSchema: { book, skill: z.string(), suite: z.string(), score: z.number(), passed: z.number().int(), cases: z.number().int(), sha: z.string().optional(), incident: z.string().optional() },
  }, ({ book: n, ...b }, x) => run(() => put(n, 'eval', `eval:${randomUUID()}`, as(x, n), b)));

  server.registerTool('book_risk', {
    description: 'Record a known risk or debt, or (with risk: its id) a new version of one: what it costs, likelihood, impact, how to pay it down, and whether it is open, accepted or paid.',
    inputSchema: {
      book, risk: z.string().optional(), title: z.string(), kind: z.enum(['risk', 'debt']), cost: z.string(), likelihood: level, impact: level,
      payDown: z.string(), state: z.enum(['open', 'accepted', 'paid']), work: z.string().optional(),
    },
  }, ({ book: n, risk, ...b }, x) => run(() => put(n, 'risk', risk ?? `risk:${randomUUID()}`, as(x, n), b)));

  server.registerTool('book_pulse', {
    description: 'Record a reading of the running product: a measure of a part (errors per hour, p95 ms, agents\' cost per day), its unit, and its limit. A reading over its limit goes to the editor and the diary.',
    inputSchema: { book, measure: z.string(), part: z.string(), value: z.number(), unit: z.string(), limit: z.number().optional(), higherIsWorse: z.boolean(), note: z.string().optional() },
  }, ({ book: n, ...b }, x) => run(() => put(n, 'pulse', `pulse:${randomUUID()}`, as(x, n), b)));

  server.registerTool('book_band', {
    description: 'Record which band an action is in (alone, reviewed, editor) with why and where the rule is written. An agent may add an action; moving an existing action to another band is the editor\'s, asked through book_ask.',
    inputSchema: { book, action: z.string(), band: z.enum(['alone', 'reviewed', 'editor']), why: z.string(), source: z.string().optional() },
  }, ({ book: n, ...b }, x) => run(() => put(n, 'band', `band:${slug(b.action)}`, as(x, n), b)));

  server.registerTool('book_goal', {
    description: 'Record a goal: what it is, its measure and unit, the target, by when, and whether higher is better. Link work to it with book_link kind "serves".',
    inputSchema: { book, title: z.string(), measure: z.string(), unit: z.string(), target: z.number(), by: z.string().optional(), higherIsBetter: z.boolean() },
  }, ({ book: n, ...b }, x) => run(() => put(n, 'goal', `goal:${slug(b.title)}`, as(x, n), b)));

  server.registerTool('book_result', {
    description: "Record a measurement against a goal, and the work it follows when there is one.",
    inputSchema: { book, goal: z.string(), value: z.number(), measuredOn: z.string(), note: z.string().optional(), work: z.string().optional() },
  }, ({ book: n, ...b }, x) => run(() => put(n, 'result', `result:${randomUUID()}`, as(x, n), b)));
}
