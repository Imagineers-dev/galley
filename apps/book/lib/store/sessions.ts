// The editor's sign-ins: only a hash of each session token is stored, with its expiry. Signing out is a new row,
// and once ended a sign-in stays ended (max), whatever the order of rows written in the same millisecond.
import { client, toClickhouseTime, toIso } from './client';

export type SessionRow = { hash: string; expires: string; revoked: boolean };

export async function appendSession(session: SessionRow): Promise<void> {
  await client.insert({
    table: 'sessions',
    values: [{ hash: session.hash, expires: toClickhouseTime(session.expires), revoked: session.revoked ? 1 : 0, at: toClickhouseTime(new Date().toISOString()) }],
    format: 'JSONEachRow',
  });
}

/** The session with this hash as it stands now, or null. */
export async function sessionOf(hash: string): Promise<SessionRow | null> {
  const result = await client.query({
    query: 'SELECT hash, tuple(argMax(toString(expires), at), max(revoked)) AS v FROM sessions WHERE hash = {hash:String} GROUP BY hash',
    query_params: { hash },
    format: 'JSONEachRow',
  });
  const [row] = await result.json<{ hash: string; v: [string, number] }>();
  return row ? { hash: row.hash, expires: toIso(row.v[0]), revoked: row.v[1] === 1 } : null;
}

/** Ends every sign-in that is still open, on every browser. Returns how many were ended. */
export async function revokeOpenSessions(now: string): Promise<number> {
  const result = await client.query({
    query: `SELECT hash, tuple(argMax(toString(expires), at), max(revoked)) AS v FROM sessions GROUP BY hash
            HAVING v.2 = 0 AND parseDateTime64BestEffort(v.1, 3, 'UTC') > {now:DateTime64(3, 'UTC')}`,
    query_params: { now: toClickhouseTime(now) },
    format: 'JSONEachRow',
  });
  const open = await result.json<{ hash: string; v: [string, number] }>();
  for (const row of open) await appendSession({ hash: row.hash, expires: toIso(row.v[0]), revoked: true });
  return open.length;
}
