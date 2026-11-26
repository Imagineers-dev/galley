// Icons for agents: find a Phosphor icon by words, and give one (with its weight and tone) to a chapter or feature,
// a section, or a document, or take it away. The sidebar and the thing's own page show it.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ICON_TONES, ICON_WEIGHTS, findIcons } from '../book/icons';
import { RESEARCH_SECTION } from '../book/sections';
import { Refused, writeFrom } from '../write';
import { as, book, run } from './run';

const MARKED = ['feature', 'section', 'asset'];

export function registerIconTools(server: McpServer) {
  server.registerTool('book_find_icon', {
    description: 'Find Phosphor icons (phosphoricons.com) by words, e.g. "film", "chart line", "rocket": up to 40 names, best first. Give one with book_icon.',
    inputSchema: { query: z.string() },
  }, ({ query }) => run(async () => ({ icons: findIcons(query), weights: ICON_WEIGHTS, tones: ICON_TONES })));

  server.registerTool('book_icon', {
    description: `Give a chapter or feature (feature:<slug>), a section (section:<slug>) or a document (asset:<slug>) an icon, shown beside it in the sidebar and on its page: a Phosphor icon name from book_find_icon, a weight (${ICON_WEIGHTS.join(', ')}; regular when left out) and a tone (${ICON_TONES.join(', ')}; ink when left out). Tones name things, never a state. clear: true takes the icon away.`,
    inputSchema: {
      book, id: z.string(), name: z.string().optional(), weight: z.enum(ICON_WEIGHTS).optional(), tone: z.enum(ICON_TONES).optional(),
      clear: z.boolean().optional(),
    },
  }, ({ book: n, id, name, weight, tone, clear }, x) => run(async () => {
    const by = as(x, n);
    const record = await writeFrom(n, (now) => {
      // Research is every book's before it has a record: its first icon writes one, as it stands.
      const old = now.get(id) ?? (id === `section:${RESEARCH_SECTION.slug}` ? { kind: 'section' as const, replaces: null, body: { ...RESEARCH_SECTION } } : undefined);
      if (!old || !MARKED.includes(old.kind)) throw new Refused([`"${id}" is not a feature, a section or a document in this book.`]);
      const { icon: _was, ...body } = old.body;
      if (clear) return { id, kind: old.kind, by, replaces: old.replaces, body };
      if (!name) throw new Refused(['Name the icon (book_find_icon finds one), or say clear: true.']);
      return { id, kind: old.kind, by, replaces: old.replaces, body: { ...body, icon: { name, ...(weight ? { weight } : {}), ...(tone ? { tone } : {}) } } };
    });
    return { marked: record.id, icon: record.body.icon ?? null };
  }));
}
