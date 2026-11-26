// A file's bytes, by their hash. Only a file that an asset in this book names (as the book stands, or as of the day
// it is read) is served; a range is served for video and audio. Headers come from lib/server/file-response.ts.
import type { Asset } from '../../../../lib/book/asset-types';
import { entries } from '../../../../lib/book/views';
import { loadBook } from '../../../../lib/load';
import { fileHeaders, rangeOf } from '../../../../lib/server/file-response';
import { readRange } from '../../../../lib/store/files';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ book: string; hash: string }> }) {
  const { book, hash } = await params;
  if (!/^[0-9a-f]{64}$/.test(hash)) return new Response('Not found', { status: 404 });
  const { now } = await loadBook(book);
  const file = entries<Asset>(now, 'asset').find((a) => !a.body.withdrawn && a.body.file.hash === hash)?.body.file;
  if (!file) return new Response('Not found', { status: 404 });
  if (request.headers.get('if-none-match') === `"${hash}"`) return new Response(null, { status: 304, headers: fileHeaders(file, null) });
  const range = rangeOf(request.headers.get('range'), file.size);
  if (range === 'unsatisfiable') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${file.size}` } });
  const bytes = await readRange(book, hash, file.size, range?.start, range?.end);
  if (!bytes) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(bytes), { status: range ? 206 : 200, headers: fileHeaders(file, range) });
}
