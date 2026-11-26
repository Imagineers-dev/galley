// MCP tools for holding work to the editor's papers: the brief, translating papers, tests, guards, runs and reviews.
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { editorPaperOf } from '../book/governing';
import { neighbourhood } from '../book/neighbourhood';
import { briefPapers, guardsOf, lineCoverage, reviewsOf, testsOf } from '../book/testing';
import { REVIEW_QUESTIONS } from '../book/record-types';
import { ids } from '../book/types';
import { testLevel } from '../rules/bodies';
import { runProof, testCommand } from '../rules/bodies-promises';
import { add, load } from './add';
import { Refused } from '../write';
import { as, book, run } from './run';

const kind = z.enum(['intent', 'spec', 'plan']);

export function registerTestTools(server: McpServer) {
  server.registerTool('book_brief', {
    description: "Everything an agent builds a piece of work from, in one call: the editor's papers with numbered lines, the agents' papers and their coverage, tests and the lines they prove, guards, reviews, the review questions, and the neighbourhood.",
    inputSchema: { book, work: z.string() },
  }, ({ book: n, work }) =>
    run(async () => {
      const now = await load(n);
      return {
        papers: briefPapers(now, work),
        lines: lineCoverage(now, work, ['spec']).map((l) => ({ line: l.ref, tests: l.tests })),
        tests: testsOf(now, work).map((t) => ({ id: t.id, ...t.body, last: t.last?.body ?? null })),
        guards: guardsOf(now, work).map((g) => ({ id: g.id, ...g.body, baseline: g.baseline?.body ?? null, after: g.after?.body ?? null })),
        reviews: reviewsOf(now, work).map((r) => ({ id: r.id, by: r.by, ...r.body })),
        reviewQuestions: REVIEW_QUESTIONS,
        neighbourhood: neighbourhood(now, work),
      };
    }));

  server.registerTool('book_translate_paper', {
    description: "Write the agents' version of the approved editor paper that governs this work: its own, or its feature's. Every paragraph must cite the editor's lines it serves, like [¶2] or [¶2, ¶5]; a paragraph that cites nothing is refused. Read editorLines from book_brief first.",
    inputSchema: { book, work: z.string(), kind, text: z.string().describe('Markdown; every paragraph and list item cites [¶n]'), against: z.string().describe('The version you read (version in book_brief); refused if it is no longer current') },
  }, ({ book: n, work, kind: k, text, against }, x) =>
    run(async () => {
      const editor = editorPaperOf(await load(n), work, k);
      if (!editor) throw new Refused([`There is no ${k} written for the editor.`]);
      return add(n, 'paper', ids.paper(work, k, 'agents'), as(x, n), { work, kind: k, for: 'agents', text, against });
    }));

  server.registerTool('book_add_test', {
    description: 'Add a test in plain words, naming the editor lines it proves (e.g. ["spec¶2"]), its level (unit, integration, app: run in the real installed app, or editor: tried by the editor there) and how it runs. A test is not a promise: link it to one with book_link (proves-promise). command: how the runner runs it by itself. replaces: the test this one takes over from.',
    inputSchema: { book, work: z.string(), title: z.string(), proves: z.array(z.string()), level: testLevel, runs: z.string(), part: z.string().optional(), command: testCommand.optional(), replaces: z.string().optional() },
  }, ({ book: n, replaces, ...body }, x) => run(() => add(n, 'test', `test:${randomUUID()}`, as(x, n), body, replaces)));

  server.registerTool('book_add_guard', {
    description: 'Name a feature this work could break, why, and the existing checks that guard it. Guards run before the work starts (baseline) and after each part.',
    inputSchema: { book, work: z.string(), feature: z.string(), why: z.string(), checks: z.array(z.string()), runs: z.string() },
  }, ({ book: n, ...body }, x) => run(() => add(n, 'guard', `guard:${randomUUID()}`, as(x, n), body)));

  server.registerTool('book_record_run', {
    description: 'Record a run of a test or guard: pass or fail, the stage (baseline before the work, after a part, or a check), and the evidence (command and the lines of its output that show the result). A result you record yourself reads as Claimed until the runner, the editor or a second agent backs it.',
    inputSchema: { book, of: z.string(), result: z.enum(['pass', 'fail']), stage: z.enum(['baseline', 'after', 'check']), evidence: z.string(), ...runProof },
  }, ({ book: n, ...body }, x) => run(() => add(n, 'run', `run:${randomUUID()}`, as(x, n), body)));

  server.registerTool('book_review', {
    description: 'Review a part of the work you did not write: answer all seven review questions (see book_brief) with passes, concern or fails and the evidence; the verdict follows the worst answer.',
    inputSchema: {
      book, work: z.string(), part: z.string(), writtenBy: z.string().describe('The agent that wrote the change'),
      answers: z.array(z.object({ q: z.number(), verdict: z.enum(['passes', 'concern', 'fails']), evidence: z.string() })),
      verdict: z.enum(['passes', 'concern', 'fails']),
    },
  }, ({ book: n, ...body }, x) => run(() => add(n, 'review', `review:${randomUUID()}`, as(x, n), body)));

  server.registerTool('book_beyond', {
    description: "Say that this piece of work goes beyond its feature's approved papers: it does something they neither ask for nor allow. Its own What you'll get then needs the editor's approval before it is built.",
    inputSchema: { book, work: z.string(), text: z.string().describe('What goes beyond the feature, in plain words') },
  }, ({ book: n, work, text }, x) => run(() => add(n, 'beyond', `beyond:${randomUUID()}`, as(x, n), { work, raisedBy: 'author', text })));
}
