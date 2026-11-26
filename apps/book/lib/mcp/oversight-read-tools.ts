// Reading the oversight records before acting: what is live, a part explained, the lessons for an area, an action's band.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bandOf } from '../book/bands';
import { explain } from '../book/explain';
import { lessonsFor } from '../book/lessons';
import { livePart } from '../book/live';
import { pickup } from '../book/pickup';
import { EDITOR } from '../book/people';
import { today } from '../server/clock';
import { load } from './add';
import { book, run } from './run';


export function registerOversightReadTools(server: McpServer) {
  server.registerTool('book_pickup', {
    description: 'Call first, before any other work, every time you start or resume: where the book left off beside what is true now (repositories, commits and answers since the diary, what is live), where they disagree, and the first step. Run `pnpm book:pickup` in the repository first so its checkout is current.',
    inputSchema: { book },
  }, ({ book: n }) => run(async () => pickup(n, await load(n), EDITOR, today())));

  server.registerTool('book_live', {
    description: 'What is live: each part, the commit it runs, whether the book recorded that commit, and how to undo it. Read before deploying.',
    inputSchema: { book },
  }, ({ book: n }) => run(async () => livePart(await load(n)).map((l) => ({ part: l.part, where: l.now.body.where, sha: l.now.body.sha, confirmed: l.confirmed, recorded: l.recorded, deployedAt: l.now.body.deployedAt, undo: l.now.body.undo }))));

  server.registerTool('book_explain', {
    description: "A feature explained from the book's records: its works and why each began, decisions, open questions, risks, lessons. Read before working on a part you don't know.",
    inputSchema: { book, feature: z.string() },
  }, ({ book: n, feature }) => run(async () => {
    const e = explain(await load(n), feature);
    if (!e) return { missing: feature };
    return {
      feature: e.feature.body.title, about: e.feature.body.about ?? e.feature.body.forWriter,
      story: e.story.map((s) => ({ work: s.work.id, title: s.work.body.title, state: s.work.body.state, why: s.why, proofs: s.proofs.length })),
      decisions: e.decisions.map((d) => ({ question: d.body.question, chosen: d.body.chosen, revisitIf: d.body.revisitIf })),
      open: e.open, risks: e.risks.map((r) => r.body.title), lessons: e.lessons.map((l) => l.lesson.body.rule),
    };
  }));

  server.registerTool('book_lessons', {
    description: 'The lessons for the areas you are about to work in (feature slugs or words like "deploy", "ui"); all lessons without areas. Read before starting.',
    inputSchema: { book, areas: z.array(z.string()).optional() },
  }, ({ book: n, areas }) => run(async () => lessonsFor(await load(n), areas ?? []).map((l) => ({ id: l.lesson.id, rule: l.lesson.body.rule, why: l.lesson.body.why, broken: l.slips.length }))));

  server.registerTool('book_may', {
    description: 'Which band an action is in before you do it: alone (go ahead and record it), reviewed (another agent reviews first), editor (ask with book_ask). Unknown actions are the editor\'s.',
    inputSchema: { book, action: z.string() },
  }, ({ book: n, action }) => run(async () => {
    const b = bandOf(await load(n), action);
    return b ? { band: b.body.band, matched: b.body.action, why: b.body.why } : { band: 'editor', matched: null, why: 'No recorded band matches; ask the editor.' };
  }));
}
