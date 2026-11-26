// The book's sections beside the product, for agents: define one (a library of documents in folders, with tags),
// rename it or take it away, list them, and browse one. Research is every book's first section.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RESEARCH, folderPath, tagOf } from '../book/asset-types';
import { documentsIn, filterDocuments, folderTree, tagCounts } from '../book/assets';
import { sectionNamed, sectionsOf } from '../book/sections';
import { Refused, writeFrom } from '../write';
import { load } from './add';
import { as, book, run } from './run';

export function registerSectionTools(server: McpServer) {
  server.registerTool('book_section', {
    description: 'Define a section of the book beside the product, when the team asks for one: a library of documents filed in folders and tagged, such as "Meeting notes", "Design" or "Pitch decks". It shows in the sidebar under its title. With the slug of one that exists (Research is "research"), it renames it or changes its line; withdraw takes it away (only once it holds no documents).',
    inputSchema: {
      book, title: z.string().describe('What the sidebar calls it, e.g. "Meeting notes"'),
      slug: z.string().optional().describe('Its address, e.g. "meetings"; made from the title when left out'),
      about: z.string().optional().describe('One line on what belongs in it'),
      withdraw: z.string().optional().describe('Why it is taken away, in one line'),
    },
  }, ({ book: n, title, slug, about, withdraw }, x) => run(async () => {
    const by = as(x, n);
    const s = slug ?? folderPath(title).replace(/\//g, '-').slice(0, 40);
    const record = await writeFrom(n, (now) => {
      const icon = now.get(`section:${s}`)?.body.icon; // a renamed section keeps its icon
      return {
        id: `section:${s}`, kind: 'section', by, replaces: null,
        body: { title, slug: s, ...(about ? { about } : {}), ...(icon ? { icon } : {}), ...(withdraw ? { withdrawn: { reason: withdraw } } : {}) },
      };
    });
    return { section: record.id, title, withdrawn: Boolean(withdraw) };
  }));

  server.registerTool('book_sections', {
    description: 'List the book\'s sections beside the product: each one\'s slug, title, what belongs in it and how many documents it holds.',
    inputSchema: { book },
  }, ({ book: n }) => run(async () => {
    const now = await load(n);
    return sectionsOf(now).map((s) => ({ ...s, documents: documentsIn(now, s.slug).length }));
  }));

  server.registerTool('book_browse', {
    description: 'Read one section (Research when none is named): its folders, its tags and its documents, newest first, in one folder or with one tag when given. Read the research behind a feature before changing it; read a document with book_read_asset.',
    inputSchema: { book, section: z.string().optional(), folder: z.string().optional(), tag: z.string().optional() },
  }, ({ book: n, section = RESEARCH, folder, tag }) => run(async () => {
    const now = await load(n);
    if (!sectionNamed(now, section)) throw new Refused([`"${section}" is not a section of this book; book_sections lists them.`]);
    const docs = documentsIn(now, section);
    return {
      section, folders: folderTree(docs), tags: tagCounts(docs),
      documents: filterDocuments(docs, folder ? folderPath(folder) : undefined, tag ? tagOf(tag) : undefined)
        .map((d) => ({ id: d.id, title: d.body.title, folder: d.body.folder ?? '', tags: d.body.tags ?? [], informs: d.body.informs ?? [], type: d.body.file.type, at: d.firstAt })),
    };
  }));
}
