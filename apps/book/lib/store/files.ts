// The bytes of attached files, in chunks of 1 MiB per (book, hash, n). Only this file reads or writes the files
// table; an asset record names a file by its hash, which is always computed here, from the bytes.
import { createHash } from 'node:crypto';
import { client, toClickhouseTime } from './client';

export const CHUNK = 1024 * 1024;

export const hashOf = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Keeps a file's bytes in one book and returns their hash. The same bytes kept twice stay one file. */
export async function putFile(book: string, bytes: Uint8Array): Promise<string> {
  const hash = hashOf(bytes);
  const at = toClickhouseTime(new Date().toISOString());
  const values = [];
  for (let n = 0; n * CHUNK < bytes.length; n++) {
    values.push({ book, hash, n, data: Buffer.from(bytes.subarray(n * CHUNK, (n + 1) * CHUNK)).toString('base64'), at });
  }
  await client.insert({ table: 'files', values, format: 'JSONEachRow' });
  return hash;
}

/**
 * Bytes `start` to `end` (inclusive) of one file in one book, or null when the book does not hold it whole. Only the
 * chunks the range touches are read.
 */
export async function readRange(book: string, hash: string, size: number, start = 0, end = size - 1): Promise<Buffer | null> {
  const first = Math.floor(start / CHUNK);
  const last = Math.floor(end / CHUNK);
  const result = await client.query({
    query: `SELECT n, any(data) AS data FROM files WHERE book = {book:String} AND hash = {hash:String}
            AND n BETWEEN {first:UInt32} AND {last:UInt32} GROUP BY n ORDER BY n`,
    query_params: { book, hash, first, last },
    format: 'JSONEachRow',
  });
  const rows = await result.json<{ n: number; data: string }>();
  if (rows.length !== last - first + 1) return null;
  const joined = Buffer.concat(rows.map((r) => Buffer.from(r.data, 'base64')));
  return joined.subarray(start - first * CHUNK, end - first * CHUNK + 1);
}
