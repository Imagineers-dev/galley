// Who is calling, for the routes and tools that take a key instead of the editor's sign-in. A key belongs to a
// repository ("repo:<name>") or an agent ("agent:<name>"), names the books it may write, and may start a book.
import { type KeyRow, allKeys, appendKey, keyOf } from '../store/keys';
import { hashOf, newToken } from './secrets';

export type Caller = { who: string; books: string[]; mayStart: boolean };

/** The caller a bearer token belongs to, or null for a missing, unknown or revoked key. */
export async function callerOf(token: string | undefined | null): Promise<Caller | null> {
  if (!token) return null;
  const key = await keyOf(hashOf(token));
  return key && !key.revoked ? { who: key.who, books: key.books, mayStart: key.mayStart } : null;
}

export const mayWrite = (caller: Caller, book: string) => caller.books.includes(book);

/** Issues a key and returns its token, the only time it is seen. */
export async function issueKey(who: string, books: string[], mayStart: boolean): Promise<string> {
  const token = newToken();
  await appendKey({ hash: hashOf(token), who, books, mayStart, revoked: false });
  return token;
}

/** Revokes every live key of one caller. */
export async function revokeKeys(who: string): Promise<number> {
  const live = (await allKeys()).filter((k) => k.who === who && !k.revoked);
  for (const key of live) await appendKey({ ...key, revoked: true });
  return live.length;
}

export const listKeys = async (): Promise<Omit<KeyRow, 'hash'>[]> => (await allKeys()).map(({ hash: _, ...rest }) => rest);
