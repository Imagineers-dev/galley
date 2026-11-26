// Slides on a feature and the research library, for agents. An agent writes a deck or a research note as HTML or
// markdown and attaches it here; any other file (a PDF, an image, a video) goes through `galley attach`, so its bytes
// never pass through the agent's context.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { attach, withdrawAsset } from '../attach';
import type { Asset } from '../book/asset-types';
import { filterResearch, folderTree, researchOf, tagCounts } from '../book/assets';
import { isText } from '../book/file-types';
import { Refused } from '../write';
import { readRange } from '../store/files';
import { load } from './add';
import { as, book, run } from './run';

const TEXT_LIMIT = 1024 * 1024;

export function registerAssetTools(server: McpServer) {
  server.registerTool('book_attach', {
    description: 'Attach slides or a document you wrote, as HTML or markdown text: to a feature (feature: its id), where the team reads and presents it, or to the research library (folder: a path such as "market/competitors", made by naming it; tags; informs: the features it led to). Slides are an HTML deck (slides: true). With asset: its id, attaches a new version, moves it or retags it, and text may be left out. For PDFs, images, video and other files, run `galley attach <file> …` in the repository.',
    inputSchema: {
      book, asset: z.string().optional(), title: z.string().optional(), slug: z.string().optional(), about: z.string().optional(),
      feature: z.string().optional(), folder: z.string().optional(), tags: z.array(z.string()).optional(), informs: z.array(z.string()).optional(),
      slides: z.boolean().optional(), name: z.string().optional().describe('The file name, e.g. "pricing-review.html" or "interviews.md"; its extension says what it is'),
      text: z.string().optional().describe('The whole file, at most 1 MB'),
    },
  }, ({ book: n, asset, title, slug, about, feature, folder, tags, informs, slides, name, text }, x) => run(async () => {
    const by = as(x, n);
    if ((text === undefined) !== (name === undefined)) throw new Refused(['A file comes with both its name and its text.']);
    if (text !== undefined && Buffer.byteLength(text) > TEXT_LIMIT) throw new Refused(['Text is at most 1 MB here; attach a larger file with `galley attach`.']);
    const place = feature ? { feature } : folder !== undefined || tags || informs ? { folder, tags, informs } : undefined;
    const file = text !== undefined && name !== undefined ? { name, bytes: new TextEncoder().encode(text) } : undefined;
    const record = await attach(n, by, { asset, title, slug, about, slides, place, file });
    return { attached: record.id, file: record.body.file };
  }));

  server.registerTool('book_withdraw_asset', {
    description: 'Take slides or a research document out of the book, with why in one line. The book keeps it; no list shows it.',
    inputSchema: { book, asset: z.string(), reason: z.string() },
  }, ({ book: n, asset, reason }, x) => run(async () => ({ withdrawn: (await withdrawAsset(n, as(x, n), asset, reason)).id })));

  server.registerTool('book_research', {
    description: 'Read the research library: its folders, its tags and its documents (newest first), in one folder or with one tag when given. Read the research behind a feature before changing it.',
    inputSchema: { book, folder: z.string().optional(), tag: z.string().optional() },
  }, ({ book: n, folder, tag }) => run(async () => {
    const docs = researchOf(await load(n));
    return {
      folders: folderTree(docs), tags: tagCounts(docs),
      documents: filterResearch(docs, folder, tag).map((d) => ({ id: d.id, title: d.body.title, folder: d.body.folder, tags: d.body.tags ?? [], informs: d.body.informs ?? [], type: d.body.file.type, at: d.firstAt })),
    };
  }));

  server.registerTool('book_read_asset', {
    description: 'Read one asset: where it sits and, for a text file (HTML, markdown, CSV, JSON) of at most 1 MB, its text.',
    inputSchema: { book, asset: z.string() },
  }, ({ book: n, asset }) => run(async () => {
    const found = (await load(n)).get(asset);
    if (found?.kind !== 'asset') throw new Refused([`No asset "${asset}" in this book.`]);
    const body = found.body as Asset;
    const readable = isText(body.file.type) && body.file.size <= TEXT_LIMIT;
    const bytes = readable ? await readRange(n, body.file.hash, body.file.size) : null;
    return { id: asset, ...body, ...(bytes ? { text: bytes.toString('utf8') } : {}) };
  }));
}
