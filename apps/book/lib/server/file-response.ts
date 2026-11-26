// How the book sends a file's bytes. A file that can run script (HTML slides, SVG) is sent inside a sandbox: it runs
// in an origin of its own, so it cannot read the editor's sign-in or act as them. Every file says exactly what it is,
// a file the browser cannot show is downloaded, and a range of a video or audio file can be asked for.
import type { AssetFile } from '../book/asset-types';
import { DOWNLOAD, SANDBOX_TOKENS, isText, runsScript } from '../book/file-types';

const SANDBOX = `sandbox ${SANDBOX_TOKENS}`;

export type ByteRange = { start: number; end: number };

/** The range a request asks for, within a file of `size` bytes: null for the whole file, 'unsatisfiable' when outside it. */
export function rangeOf(header: string | null, size: number): ByteRange | null | 'unsatisfiable' {
  const m = header ? /^bytes=(\d*)-(\d*)$/.exec(header.trim()) : null;
  if (!m || (!m[1] && !m[2])) return null;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  return start > end || start >= size ? 'unsatisfiable' : { start, end };
}

const quoted = (name: string) => name.replace(/[^\w.\- ]+/g, '_');

/** The headers for a file, or for one range of it. */
export function fileHeaders(file: AssetFile, range: ByteRange | null): Headers {
  const h = new Headers({
    'Content-Type': isText(file.type) ? `${file.type}; charset=utf-8` : file.type,
    'Content-Length': String(range ? range.end - range.start + 1 : file.size),
    'Accept-Ranges': 'bytes',
    ETag: `"${file.hash}"`,
    // The address names the bytes' hash, so the browser asks again only to learn it is still served (a 304): a
    // withdrawn file stops opening at once, even from the browser's cache.
    'Cache-Control': 'private, no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `${file.type === DOWNLOAD ? 'attachment' : 'inline'}; filename="${quoted(file.name)}"`,
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  if (runsScript(file.type)) h.set('Content-Security-Policy', `${SANDBOX}; frame-ancestors 'self'`);
  else h.set('Content-Security-Policy', "frame-ancestors 'self'");
  if (range) h.set('Content-Range', `bytes ${range.start}-${range.end}/${file.size}`);
  return h;
}
