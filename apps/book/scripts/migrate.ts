// Applies migrations/*.sql in order to the book's ClickHouse database. Each file is one statement.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@clickhouse/client';

const url = process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123';
const database = process.env.CLICKHOUSE_DATABASE ?? 'book';
const dir = join(import.meta.dirname, '..', 'migrations');

const admin = createClient({ url });
await admin.command({ query: `CREATE DATABASE IF NOT EXISTS ${database}` });
await admin.close();

const client = createClient({ url, database });
for (const file of readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()) {
  await client.command({ query: readFileSync(join(dir, file), 'utf8') });
  console.log(`applied ${file} to ${database}`);
}
await client.close();
