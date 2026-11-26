// How a script on this machine calls the book: with its repository's key (BOOK_KEY, else
// <galley home>/<repo>.token, ~/.config/galley unless GALLEY_HOME moves it), telling "the book refused" apart from "the book is not answering".
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { galleyHome } from './galley-config.mjs';

export function keyOf(repo) {
  if (process.env.BOOK_KEY) return process.env.BOOK_KEY.trim();
  try {
    return readFileSync(join(galleyHome(), `${repo}.token`), 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Calls the book. Returns { ok: true, data }; { ok: false, status, refused: [reasons] } when it turned the
 * call down; { ok: false, status, fault: [reasons] } when it failed on its side (5xx, an error id only); or
 * { ok: false, unreachable: true } when nothing answered.
 * @param {string} url
 * @param {string} path
 * @param {{ repo: string, body?: unknown, timeoutMs?: number }} options
 */
export async function callBook(url, path, { repo, body, timeoutMs = 5000 }) {
  const key = keyOf(repo);
  const headers = { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(key ? { Authorization: `Bearer ${key}` } : {}) };
  let response;
  try {
    response = await fetch(`${url}${path}`, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return { ok: false, unreachable: true };
  }
  const data = await response.json().catch(() => ({}));
  const reasons = data.refused ?? [`HTTP ${response.status}`];
  if (response.status >= 500) return { ok: false, status: response.status, fault: reasons };
  if (!response.ok) return { ok: false, status: response.status, refused: reasons, data };
  return { ok: true, data };
}
