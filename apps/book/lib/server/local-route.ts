// The gate for the routes a repository on this machine calls (/api/commits, checkouts, history, pickup, works).
// A call must come to the loopback address, not from another site in a browser, carry JSON when it writes, and
// bring its repository's key for the book it names (a call without one is refused). A key lives in
// ~/.config/galley/<repo>.token.
import { NextResponse } from 'next/server';
import { Refused } from '../write';
import { reasonsOf } from './errors';
import { type Caller, callerOf, mayWrite } from './keys';

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

export type Gated = { caller: Caller };

export const refuse = (status: number, ...reasons: string[]) => NextResponse.json({ refused: reasons }, { status });

/** Checks where a call comes from and whose key it carries. Returns the caller, or the refusal to send. */
export async function gate(request: Request): Promise<Gated | Response> {
  const host = request.headers.get('host') ?? '';
  if (!LOOPBACK.has(host.replace(/:\d+$/, ''))) return refuse(403, 'The book answers repositories on this machine only.');
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return refuse(403, 'Another site cannot call the book.');
  const origin = request.headers.get('origin');
  if (origin && origin !== `http://${host}`) return refuse(403, 'Another site cannot call the book.');
  if (request.method === 'POST' && !(request.headers.get('content-type') ?? '').startsWith('application/json')) {
    return refuse(415, 'Send JSON (Content-Type: application/json).');
  }
  const auth = request.headers.get('authorization') ?? '';
  if (!auth) return refuse(401, 'Bring this repository\'s key (Authorization: Bearer <key>): pnpm key issue repo:<name> --books <book> in Galley.');
  const caller = auth.startsWith('Bearer ') ? await callerOf(auth.slice(7).trim()) : null;
  if (!caller) return refuse(401, 'That key is not one the book knows, or it was revoked.');
  if (!caller.who.startsWith('repo:')) return refuse(403, 'These routes are for repositories; agents use the book\'s tools.');
  return { caller };
}

/** Refuses a call whose key does not cover the book it names. */
export const forBook = (gated: Gated, book: string): Response | null =>
  mayWrite(gated.caller, book) ? null : refuse(403, `This key is not for the "${book}" book.`);

/** The repository a gated call comes from: its key's name without "repo:". */
export const repoOf = (gated: Gated): string => gated.caller.who.slice('repo:'.length);

/** Refuses a call that names a repository other than its own: a repository writes only its own records. */
export const ownRepo = (gated: Gated, repo: unknown): Response | null =>
  repo === repoOf(gated) ? null : refuse(403, `This key is for ${repoOf(gated)}; it cannot write ${String(repo)}'s records.`);

/** Sends an answer. */
export const reply = (body: unknown, status = 200): Response => NextResponse.json(body, { status });

/** Reads a JSON body, or the refusal for one that is not JSON. */
export async function jsonOf<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return refuse(400, 'The body is not JSON.');
  }
}

/** A refusal is 422 with the book's reasons; anything else is 500 with an error id only. */
export const failed = (error: unknown, extra: Record<string, unknown> = {}) =>
  reply({ ...extra, refused: reasonsOf(error) }, error instanceof Refused ? 422 : 500);
