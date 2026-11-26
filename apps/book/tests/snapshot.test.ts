// On the editor's real books (read-only), the store's latest-version read gives exactly what folding every
// record in JavaScript gives: same ids, kinds, times, bodies and first appearances. Runs only with GALLEY_LIVE set,
// against the database Galley serves (CLICKHOUSE_DATABASE, or book).
import { createClient } from '@clickhouse/client';
import { describe, expect, it } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { attentionOf } from '../lib/book/attention';
import { dayOf } from '../lib/book/days';
import { idFits, mayReplace } from '../lib/rules/check';
import { EDITOR } from '../lib/book/people';
import { current, currentOf } from '../lib/book/views';
import { toClickhouseTime, toIso } from '../lib/store/client';
import { books, readCurrent } from '../lib/store/records';

const live = createClient({ url: process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123', database: process.env.CLICKHOUSE_DATABASE ?? 'book' });
const reachable = Boolean(process.env.GALLEY_LIVE) && (await live.ping().then((r) => r.success).catch(() => false));

async function everyRecord(book: string, cut: string): Promise<BookRecord[]> {
  const result = await live.query({
    query: `SELECT book, id, kind, toString(at) AS t, by, replaces, body FROM records
            WHERE book = {book:String} AND records.at <= {cut:DateTime64(3, 'UTC')} ORDER BY records.at`,
    query_params: { book, cut: toClickhouseTime(cut) },
    format: 'JSONEachRow',
  });
  return (await result.json<Omit<BookRecord, 'at' | 'body'> & { t: string; body: string }>()).map(({ t, ...r }) => ({ ...r, at: toIso(t), body: JSON.parse(r.body) }));
}

describe.skipIf(!reachable)('the editor’s books read the same both ways', () => {
  it('every book: the same current records', async () => {
    const all = await books();
    expect(all.length).toBeGreaterThan(0);
    // Both sides read the book as it stood at one moment, so a write during the test cannot make them differ.
    const cut = new Date().toISOString();
    for (const { book } of all) {
      const folded = current(await everyRecord(book, cut));
      const read = currentOf(await readCurrent(book, { asOf: cut }));
      expect([...read.keys()].sort(), book).toEqual([...folded.keys()].sort());
      for (const [id, r] of folded) expect(read.get(id), `${book} ${id}`).toEqual(r);
      // And what the editor is shown: the same messages, the same count.
      const day = dayOf(cut);
      expect(attentionOf(book, read, EDITOR, day), book).toEqual(attentionOf(book, folded, EDITOR, day));
    }
  });

  it("every record already written fits the id and replacement rules (slice 4's rules break nothing kept)", async () => {
    for (const { book } of await books()) {
      const records = await everyRecord(book, new Date().toISOString());
      const kindOf = new Map(records.map((r) => [r.id, r.kind]));
      for (const r of records) {
        expect(idFits(r.kind, r.id), `${book} ${r.id}`).toBe(true);
        if (r.replaces) expect(mayReplace(r.kind, kindOf.get(r.replaces) ?? '?'), `${book} ${r.id} replaces ${r.replaces}`).toBe(true);
      }
    }
  });
});
