// Keys for repositories and agents: only hashes are stored. A key's current state is its latest row, and once
// revoked it stays revoked (max), so a revoke written in the same millisecond as the issue still wins.
import { client, toClickhouseTime } from './client';

export type KeyRow = { hash: string; who: string; books: string[]; mayStart: boolean; revoked: boolean };

export async function appendKey(key: KeyRow): Promise<void> {
  await client.insert({
    table: 'keys',
    values: [{ hash: key.hash, who: key.who, books: key.books, may_start: key.mayStart ? 1 : 0, revoked: key.revoked ? 1 : 0, at: toClickhouseTime(new Date().toISOString()) }],
    format: 'JSONEachRow',
  });
}

type Row = { hash: string; v: [string, string[], number, number] };
const toKey = (row: Row): KeyRow => ({ hash: row.hash, who: row.v[0], books: row.v[1], mayStart: row.v[2] === 1, revoked: row.v[3] === 1 });

/** The key with this hash as it stands now, or null. */
export async function keyOf(hash: string): Promise<KeyRow | null> {
  const result = await client.query({
    query: 'SELECT hash, tuple(argMax(who, at), argMax(books, at), argMax(may_start, at), max(revoked)) AS v FROM keys WHERE hash = {hash:String} GROUP BY hash',
    query_params: { hash },
    format: 'JSONEachRow',
  });
  const [row] = await result.json<Row>();
  return row ? toKey(row) : null;
}

/** Every key as it stands now, revoked ones included, for listing. */
export async function allKeys(): Promise<KeyRow[]> {
  const result = await client.query({
    query: 'SELECT hash, tuple(argMax(who, at), argMax(books, at), argMax(may_start, at), max(revoked)) AS v FROM keys GROUP BY hash ORDER BY v.1',
    format: 'JSONEachRow',
  });
  return (await result.json<Row>()).map(toKey);
}
