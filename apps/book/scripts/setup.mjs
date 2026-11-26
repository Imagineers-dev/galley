#!/usr/bin/env node
// pnpm galley:setup: makes this checkout a running Galley, and says what is already in place. Safe to run again: it creates
// only what is missing and never replaces a secret, a setting or a record.
//
//   1. .env.local with the database address and the editor's passcode (made once, shown once)
//   2. Galley's settings, ~/.config/galley/config.json, with this machine's time zone
//   3. the `galley` launcher in ~/.config/galley/bin, which adopting repositories call
//   4. ClickHouse answering, then every migration applied (each one is safe to apply again)
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { configPath, galleyHome } from '../bin/galley-config.mjs';

const app = join(import.meta.dirname, '..');
const say = (done, line) => console.log(`${done ? '✓' : '•'} ${line}`);
const stop = (lines) => {
  console.error(['', ...lines].join('\n'));
  process.exit(1);
};

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18)) stop([`Galley needs Node 22.18 or later; this is ${process.versions.node}.`]);

// 1. The secrets this install keeps, in one file only you can read.
const envFile = join(app, '.env.local');
if (!existsSync(envFile)) {
  const passcode = randomBytes(18).toString('base64url');
  const lines = [`CLICKHOUSE_URL=${process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123'}`, `CLICKHOUSE_DATABASE=${process.env.CLICKHOUSE_DATABASE ?? 'book'}`, `BOOK_EDITOR_PASSCODE=${passcode}`];
  writeFileSync(envFile, `${lines.join('\n')}\n`, { mode: 0o600 });
  say(false, `Wrote apps/book/.env.local. Your passcode for signing in is ${passcode} (it is kept there; change it any time).`);
} else say(true, 'apps/book/.env.local is in place.');
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8').split('\n').map((l) => /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]),
);
if (!env.BOOK_EDITOR_PASSCODE) say(false, 'apps/book/.env.local has no BOOK_EDITOR_PASSCODE, so nobody can sign in. Add one.');

// 2. The settings the editor owns. No agent can change them through the book.
const settings = configPath();
mkdirSync(galleyHome(), { recursive: true, mode: 0o700 });
if (!existsSync(settings)) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  writeFileSync(settings, `${JSON.stringify({ timeZone, repositories: {} }, null, 2)}\n`, { mode: 0o600 });
  say(false, `Wrote ${settings} with your time zone, ${timeZone}.`);
} else say(true, `${settings} is in place.`);

// 3. One command for adopting repositories, pointing at this checkout wherever it lives.
const bin = join(galleyHome(), 'bin');
mkdirSync(bin, { recursive: true, mode: 0o700 });
const launcher = join(bin, 'galley');
const script = `#!/bin/sh
# Runs a command of the Galley checkout at ${join(app, '..', '..')} (written by pnpm galley:setup there; run it again if the checkout moves).
# galley pickup|prove|report-commit|attach [options]
command="$1"; [ -n "$command" ] && shift
case "$command" in
  pickup|prove|report-commit|attach) exec node "${join(app, 'bin')}/$command.mjs" "$@" ;;
  *) echo "Usage: galley pickup|prove|report-commit|attach [options]" >&2; exit 2 ;;
esac
`;
const had = existsSync(launcher) ? readFileSync(launcher, 'utf8') : null;
writeFileSync(launcher, script, { mode: 0o755 });
chmodSync(launcher, 0o755);
say(had === script, had === script ? `${launcher} points at this checkout.` : `Wrote ${launcher}, pointing at this checkout.`);

// 4. The database.
const url = process.env.CLICKHOUSE_URL ?? env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123';
const ping = await fetch(`${url.replace(/\/$/, '')}/ping`, { signal: AbortSignal.timeout(3000) }).then((r) => r.ok).catch(() => false);
if (!ping)
  stop([
    `ClickHouse is not answering at ${url}. Start it, then run pnpm galley:setup again:`,
    '  macOS:  brew install --cask clickhouse',
    '  Linux:  curl https://clickhouse.com/ | sh',
    '  then, in a folder for its data:  clickhouse server -- --listen_host=127.0.0.1 --tcp_port=9100',
    '  or with Docker:  docker run -d --name galley-clickhouse -p 127.0.0.1:8123:8123 -e CLICKHOUSE_SKIP_USER_SETUP=1 clickhouse/clickhouse-server',
  ]);
say(true, `ClickHouse answers at ${url}.`);
const migrated = spawnSync(process.execPath, ['--env-file-if-exists=.env.local', 'scripts/migrate.ts'], { cwd: app, stdio: 'inherit' });
if (migrated.status !== 0) stop(['The migrations did not apply; the lines above say why.']);

const site = process.env.BOOK_URL ?? 'http://127.0.0.1:3300';
// Something may answer there that is not Galley (another app on the same port): only Galley's own page counts.
const page = await fetch(site, { signal: AbortSignal.timeout(3000) }).then((r) => r.text()).catch(() => '');
if (/<title>Galley<\/title>/.test(page)) console.log(`\n✓ Galley is running at ${site}.`);
else if (page) console.log(`\nSomething other than Galley answers at ${site}. Stop it, or run Galley on another port and set BOOK_URL.`);
else console.log(`\nGalley is ready. Start it with pnpm dev (or pnpm build && pnpm start), then open ${site}.`);
console.log('To connect a repository and its agents: pnpm galley:adopt <path to the repository> --book <name>');
