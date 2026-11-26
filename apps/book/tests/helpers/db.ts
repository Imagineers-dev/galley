// A throwaway ClickHouse database for store tests: created with the book's migrations, dropped afterwards.
// Set before the store is imported, because the store reads CLICKHOUSE_DATABASE when it loads.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@clickhouse/client';

const url = process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123';
const migrations = join(import.meta.dirname, '..', '..', 'migrations');

export async function throwawayDatabase(prefix: string) {
  const name = `${prefix}_${process.pid}_${Date.now()}`;
  const admin = createClient({ url });
  await admin.command({ query: `CREATE DATABASE ${name}` });
  const db = createClient({ url, database: name });
  for (const file of readdirSync(migrations).filter((f) => f.endsWith('.sql')).sort()) {
    await db.command({ query: readFileSync(join(migrations, file), 'utf8') });
  }
  await db.close();
  process.env.CLICKHOUSE_DATABASE = name;
  return {
    name,
    drop: async () => {
      await admin.command({ query: `DROP DATABASE IF EXISTS ${name}` });
      await admin.close();
    },
  };
}
