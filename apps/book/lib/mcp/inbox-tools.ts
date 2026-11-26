// Asking a person through the inbox, and reading their answers. Agents ask; only the person answers, on the website.
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { attentionOf } from '../book/attention';
import type { Message } from '../book/inbox';
import { EDITOR } from '../book/people';
import { builtAbout } from '../book/promise-ask';
import { askAboutInput } from '../rules/bodies-promises';
import { today } from '../server/clock';
import { load } from './add';
import { writeFrom } from '../write';
import { as, book, run } from './run';

export function registerInboxTools(server: McpServer) {
  server.registerTool('book_ask', {
    description:
      "Ask the editor something, as a message in the book's inbox. Write it like a good email: a subject that starts with what they must do (\"Decide: …\", \"Try: …\", \"For your information: …\"), then the why in plain words. A decision offers its options with the one you recommend; a waiting paper needs no ask, it arrives by itself. Read the answer later with book_answers.",
    inputSchema: {
      book,
      work: z.string().describe('The work id this belongs to'),
      needs: z.enum(['decision', 'try', 'fyi']).describe('decision: choose; try: use it in the product and say if it works; fyi: nothing to do'),
      subject: z.string().describe('One line, at most 120 characters, starting with what to do'),
      text: z.string().describe('Markdown: what is true, what you tried, what it means for them'),
      options: z.array(z.object({ option: z.string(), detail: z.string().optional() })).optional().describe('Decisions only: two or more'),
      recommend: z.number().int().optional().describe('Index of the option you recommend'),
      links: z.array(z.object({ label: z.string(), href: z.string() })).optional().describe('Links to what lies behind it: a paper, a failing test, a screenshot'),
      replaces: z.string().optional().describe('An open question (question id) this message asks again, properly; it then shows only as this message'),
      about: askAboutInput.optional().describe('What their reply settles about a promise; the book fills in the proof and shows them. pass (needs: try): a try of a test on a promise, which counts only for the installed build, so run `pnpm book:pickup` before asking and again after asking, so the reading is fresh when they answer; retract: a mistaken bug (event) or failed run; accept-gap: a promise they accept unproven'),
    },
  }, ({ book: n, replaces, about, ...body }, x) =>
    run(() => writeFrom(n, (now) => ({ id: `ask:${randomUUID()}`, kind: 'ask', by: as(x, n), replaces: replaces ?? null, body: { ...body, to: EDITOR, ...(about ? { about: builtAbout(now, about) } : {}) } }))));

  server.registerTool('book_answers', {
    description: "The editor's answers in a book, and what still waits on them, counted the way every screen counts it. Returns answered (what they chose, said or found when they tried it, newest first), waiting (decisions, tries and notes still open), papers (papers waiting for approval, read as one list), and snoozed (put off until a later day). Read before continuing work that asked them something.",
    inputSchema: { book, work: z.string().optional().describe('Only this work') },
  }, ({ book: n, work }) =>
    run(async () => {
      // The same attention every screen reads: what waits is the asks plus the reading list, snoozed apart.
      const attention = attentionOf(n, await load(n), EDITOR, today());
      const mine = (m: Message) => !work || m.from.work === work;
      const view = (m: Message) => ({ id: m.id, subject: m.subject, work: m.from.work, ...(m.answer ? { answer: m.answer.text, at: m.answer.at } : {}), folder: m.folder });
      return {
        answered: attention.messages.filter((m) => m.answer && mine(m)).map(view),
        waiting: attention.asks.filter(mine).map(view),
        papers: (attention.readingList?.papers ?? []).filter(mine).map(view),
        snoozed: attention.snoozed.filter(mine).map(view),
      };
    }));
}
