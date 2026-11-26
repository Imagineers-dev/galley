// Shaping a book through MCP: the order of a list, taking out what was added by mistake, and the book's own name.
// Each writes a new version; the book keeps every old one (book_read shows them).
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ORDER_LISTS, orderId } from '../book/order';
import { STUDY } from '../book/study-types';
import { Refused, writeFrom } from '../write';
import { revise } from './add';
import { changed } from './changes';
import { as, book, run } from './run';

export function registerShapeTools(server: McpServer) {
  server.registerTool('book_order', {
    description: "Say the order of one list: the book's top features (of: features, no feature), the features under a feature (of: features, feature), "
      + "or a feature's work (of: work, feature). The ids named come first in the order given; the rest follow as they came. "
      + 'The sidebar, the pages, a story within each day and a chapter\'s grid all follow it. Saying it again replaces the order; [] clears it.',
    inputSchema: {
      book, of: z.enum(ORDER_LISTS),
      feature: z.string().optional().describe('The feature whose list this is, by id; leave out for the book\'s top features'),
      items: z.array(z.string()).describe('Feature or work ids, in order'),
    },
  }, ({ book: n, of, feature, items }, x) =>
    run(() => writeFrom(n, () => ({ id: orderId(of, feature), kind: 'order', by: as(x, n), replaces: null, body: { of, ...(feature ? { feature } : {}), items } }))));

  server.registerTool('book_withdraw', {
    description: 'Take a feature or a piece of work out of the book when it was added by mistake. It leaves every page, the sidebar, the grid, '
      + 'the counts, book_contents and what waits on the editor; its address answers not found. The book keeps it and every version '
      + '(book_read shows it with the reason). Only a feature with nothing under it, or work that is not done and has nothing recorded on it. '
      + 'Work that was really done is replaced instead (book_add_work with replaces). Adding it again under the same title brings it back.',
    inputSchema: { book, id: z.string().describe('The feature or work id'), reason: z.string().describe('Why, in one line') },
  }, ({ book: n, id, reason }, x) =>
    run(() => writeFrom(n, (now) => {
      const by = as(x, n);
      const old = now.get(id);
      if (old?.kind !== 'feature' && old?.kind !== 'work') throw new Refused([`"${id}" is not a feature or a piece of work in this book.`]);
      return { id, kind: old.kind, by, replaces: old.replaces, body: { ...old.body, withdrawn: { reason } } };
    })));

  server.registerTool('book_update_book', {
    description: "Write a new version of the book's own title, its one-line description (what the product does for the people who use it) or its kind. The book's name and address stay as they are.",
    inputSchema: { book, title: z.string().optional(), forWriter: z.string().optional().describe('One line: what the product does for the people who use it'), kind: z.literal(STUDY).optional().describe('study: this book is a course of study steps') },
  }, ({ book: n, ...change }, x) => run(() => revise(n, 'project', 'project', as(x, n), (old) => changed(old, change))));
}
