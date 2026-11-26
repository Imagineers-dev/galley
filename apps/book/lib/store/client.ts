// The one ClickHouse connection and the two time formats it speaks. Only lib/store uses this file.
import { createClient } from '@clickhouse/client';

export const client = createClient({
  url: process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123',
  database: process.env.CLICKHOUSE_DATABASE ?? 'book',
});

/** ISO 8601 (the book's own times) to ClickHouse's DateTime64 text, and back. Always UTC. */
export const toClickhouseTime = (iso: string) => iso.replace('T', ' ').replace('Z', '');
export const toIso = (time: string) => `${time.replace(' ', 'T')}Z`;
