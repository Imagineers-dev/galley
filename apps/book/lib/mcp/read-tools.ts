// Reading the book through MCP: its outline, a piece of work's neighbourhood, and any record's history.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { neighbourhood } from '../book/neighbourhood';
import { attentionOf } from '../book/attention';
import { EDITOR } from '../book/people';
import { type FeatureNode, featureTree, storyOf } from '../book/views';
import { today } from '../server/clock';
import { books, readHistory } from '../store/records';
import { load } from './add';
import { book, run } from './run';

export function registerReadTools(server: McpServer) {
  server.registerTool(
    'book_contents',
    {
      description: "The book's features by name, the story of each (work and events), and what waits on the editor. Without a book, lists the books.",
      inputSchema: { book: book.optional() },
    },
    ({ book: name }) =>
      run(async () => {
        if (!name) return { books: (await books()).map((b) => b.book) };
        const now = await load(name);
        const outline = (node: FeatureNode): unknown => ({
          id: node.id,
          title: node.body.title,
          standing: node.body.standing ?? null,
          story: storyOf(now, node.id).map((s) =>
            s.type === 'work' ? { work: s.item.id, title: s.item.body.title, state: s.item.body.state, on: s.item.body.on } : { event: s.item.id, title: s.item.body.title, on: s.item.body.on },
          ),
          features: node.children.map(outline),
        });
        // What waits on the editor, counted the one way every screen counts it (lib/book/attention.ts).
        const attention = attentionOf(name, now, EDITOR, today());
        return {
          project: now.get('project')?.body ?? null,
          waitingOnEditor: {
            count: attention.count,
            asks: attention.asks.map((m) => ({ id: m.id, subject: m.subject })),
            papers: (attention.readingList?.papers ?? []).map((m) => ({ paper: m.id, subject: m.subject })),
          },
          features: featureTree(now).map(outline),
        };
      }),
  );

  server.registerTool(
    'book_neighbourhood',
    {
      description: 'Read before working on a piece of work: how it began, its papers, decisions, findings, open questions, links and replaced attempts.',
      inputSchema: { book, work: z.string().describe('Work id, e.g. "work:conflict/conflict-as-a-checked-task"') },
    },
    ({ book: name, work }) => run(async () => neighbourhood(await load(name), work) ?? { missing: work }),
  );

  server.registerTool(
    'book_read',
    { description: 'Any record by id, with every version it has had.', inputSchema: { book, id: z.string() } },
    ({ book: name, id }) => run(async () => readHistory(name, id)),
  );
}
