// The only code that talks to ClickHouse. Every read names one book; nothing is updated or deleted, a change is a
// new record. "Current" means the latest version of each id, computed in ClickHouse, with when the id first appeared.
import type { BookRecord } from '../book/types';
import type { Latest } from '../book/views';
import { client, toClickhouseTime, toIso } from './client';

type Row = Omit<BookRecord, 'body'> & { body: string };
type LatestRow = { bk: string; id: string; v: [BookRecord['kind'], string, string | null, string]; lastAt: string; firstAt: string; writers: string[]; answeredFor: string[] };

const parse = (row: Row): BookRecord => ({ ...row, at: toIso(row.at), body: JSON.parse(row.body) });

/** The latest version of every id in one book, as it stood at `asOf` (an ISO time) when given. */
export async function readCurrent(book: string, options: { asOf?: string } = {}): Promise<Latest[]> {
  const cut = options.asOf ? "AND at <= {asOf:DateTime64(3, 'UTC')}" : '';
  const result = await client.query({
    // One whole version wins per id (a tuple), never fields from different versions. Output names differ from the
    // columns, or ClickHouse would read \`at\` inside argMax as the alias. \`book\` comes from the row itself.
    query: `SELECT book AS bk, id, argMax(tuple(kind, by, replaces, body), at) AS v, toString(max(at)) AS lastAt,
                   toString(min(at)) AS firstAt, groupUniqArray(records.by) AS writers,
                   groupUniqArrayArrayIf(arrayConcat(JSONExtract(records.body, 'serves', 'Array(String)'), JSONExtract(records.body, 'provenAtStart', 'Array(String)')), records.kind = 'work') AS answeredFor
            FROM records WHERE book = {book:String} ${cut} GROUP BY book, id`,
    query_params: { book, ...(options.asOf ? { asOf: toClickhouseTime(options.asOf) } : {}) },
    format: 'JSONEachRow',
  });
  return (await result.json<LatestRow>()).map(({ bk, id, v: [kind, by, replaces, body], lastAt, firstAt, writers, answeredFor }) => ({
    book: bk, id, kind, at: toIso(lastAt), by, replaces, body: JSON.parse(body), firstAt: toIso(firstAt), writers, ...(answeredFor.length ? { answeredFor } : {}),
  }));
}

/** Every version one id has had in one book, oldest first. */
export async function readHistory(book: string, id: string): Promise<BookRecord[]> {
  const result = await client.query({
    query: `SELECT book, id, kind, toString(at) AS at, by, replaces, body FROM records
            WHERE book = {book:String} AND id = {id:String} ORDER BY records.at`,
    query_params: { book, id },
    format: 'JSONEachRow',
  });
  return (await result.json<Row>()).map(parse);
}

/** The days (YYYY-MM-DD in `timeZone`) on which one book has records, oldest first. */
export async function days(book: string, timeZone: string): Promise<string[]> {
  const result = await client.query({
    query: 'SELECT DISTINCT toString(toDate(at, {zone:String})) AS day FROM records WHERE book = {book:String} ORDER BY day',
    query_params: { book, zone: timeZone },
    format: 'JSONEachRow',
  });
  return (await result.json<{ day: string }>()).map((row) => row.day);
}

/** The latest time written in one book, or null: the write queue starts its clock after it. */
export async function latestAt(book: string): Promise<string | null> {
  const result = await client.query({
    query: 'SELECT toString(max(at)) AS at, count() AS n FROM records WHERE book = {book:String}',
    query_params: { book },
    format: 'JSONEachRow',
  });
  const [row] = await result.json<{ at: string; n: string }>();
  return row && Number(row.n) > 0 ? toIso(row.at) : null;
}

/** Every book, with its title, from the books' own project records. */
export async function books(): Promise<{ book: string; title: string }[]> {
  const result = await client.query({
    query: `SELECT book, JSONExtractString(argMax(body, at), 'title') AS title FROM records
            WHERE kind = 'project' AND id = 'project' GROUP BY book ORDER BY book`,
    format: 'JSONEachRow',
  });
  return (await result.json<{ book: string; title: string }>()).map((row) => ({ book: row.book, title: row.title || row.book }));
}

/** Adds records in one insert, so a change that spans two records is never half written. */
export async function appendAll(records: BookRecord[]): Promise<void> {
  if (!records.length) return;
  await client.insert({
    table: 'records',
    values: records.map((record) => ({ ...record, at: toClickhouseTime(record.at), body: JSON.stringify(record.body) })),
    format: 'JSONEachRow',
  });
}
