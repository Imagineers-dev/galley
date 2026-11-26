// Scale: 100 books × 10,000 records (one million rows), with a 2 MB proof in the book that is read. Reading one
// book's current records must stay fast and touch only that book. Runs only with BOOK_SCALE=1 (it writes ~1M rows).
import { createClient } from '@clickhouse/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { throwawayDatabase } from './helpers/db';

const run = process.env.BOOK_SCALE === '1';
let db: Awaited<ReturnType<typeof throwawayDatabase>>;
let store: typeof import('../lib/store/records');
const BOOKS = 100;
const PER_BOOK = 10_000;
const KINDS = ['work', 'paper', 'decision', 'finding', 'question', 'commit', 'approval', 'diary', 'link', 'mark'];

describe.skipIf(!run)('a hundred books of ten thousand records', () => {
  beforeAll(async () => {
    db = await throwawayDatabase('book_scale');
    const client = createClient({ url: process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123', database: db.name });
    const base = Date.parse('2026-01-01T00:00:00Z');
    for (let b = 0; b < BOOKS; b++) {
      const values = Array.from({ length: PER_BOOK }, (_, n) => ({
        book: `book-${b}`,
        id: n === 0 ? 'project' : `${KINDS[n % KINDS.length]}:${Math.floor(n / 3)}`,
        kind: n === 0 ? 'project' : KINDS[n % KINDS.length],
        at: new Date(base + n * 60_000).toISOString().replace('T', ' ').replace('Z', ''),
        by: 'agent:claude',
        replaces: null,
        body: JSON.stringify(n === 0 ? { title: `Book ${b}`, forWriter: 'x' } : { text: `Record ${n} of book ${b}. `.repeat(8) }),
      }));
      if (b === 0) values.push({ ...values[1], id: 'proof:big', kind: 'proof', body: JSON.stringify({ evidence: 'x'.repeat(2_000_000) }) });
      await client.insert({ table: 'records', values, format: 'JSONEachRow' });
    }
    await client.close();
    store = await import('../lib/store/records');
  }, 600_000);
  afterAll(async () => db?.drop());

  it('reads one book of the hundred in well under 300 ms, warm and cold, and only that book', async () => {
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const started = performance.now();
      const rows = await store.readCurrent('book-0');
      times.push(performance.now() - started);
      expect(rows.every((r) => r.book === 'book-0')).toBe(true);
      expect(rows.length).toBeGreaterThan(3_000);
    }
    console.log(`readCurrent of one book among ${BOOKS}×${PER_BOOK}: cold ${times[0].toFixed(0)} ms, warm ${Math.min(...times.slice(1)).toFixed(0)}–${Math.max(...times.slice(1)).toFixed(0)} ms`);
    expect(Math.max(...times.slice(1))).toBeLessThan(300);
    expect(times[0]).toBeLessThan(600);
  });

  it('lists the hundred books in well under 100 ms', async () => {
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const started = performance.now();
      expect((await store.books()).length).toBe(BOOKS);
      times.push(performance.now() - started);
    }
    console.log(`books() among ${BOOKS}×${PER_BOOK}: cold ${times[0].toFixed(0)} ms, warm ${Math.min(...times.slice(1)).toFixed(0)}–${Math.max(...times.slice(1)).toFixed(0)} ms`);
    expect(Math.max(...times.slice(1))).toBeLessThan(100);
  });
});
