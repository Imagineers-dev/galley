// pnpm galley:adopt <path> --book <name> [--repo <name>] [--agent <name>]: connects a repository to Galley. Safe to
// run again: it keeps keys that already work, rewrites only its own marked lines, and says what it did.
//
//   1. the repository in Galley's settings, so the runner may prove its tests (it needs a package.json)
//   2. a key for the repository (its scripts and hook) and one for the agent, which may also start the book
//   3. a post-commit hook that reports commits naming their work
//   4. a short pointer in the repository's AGENTS.md and CLAUDE.md: the method itself comes from the server
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { configPath, galleyHome } from '../bin/galley-config.mjs';
import { issueKey, listKeys, revokeKeys } from '../lib/server/keys';

const args = process.argv.slice(2);
const option = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const fail = (message: string): never => {
  console.error(message);
  process.exit(2);
};
const NAME = /^[a-z0-9][a-z0-9-]*$/;

const given = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const book = option('--book');
if (!given || !book) fail('Usage: pnpm galley:adopt <path to the repository> --book <name> [--repo <name>] [--agent <name>]');
const path = resolve(process.env.INIT_CWD ?? process.cwd(), given!);
const git = (...a: string[]) => execFileSync('git', ['-C', path, ...a], { encoding: 'utf8' }).trim();
const top = (() => {
  try {
    return git('rev-parse', '--show-toplevel');
  } catch {
    return fail(`${path} is not a git repository.`);
  }
})();
const repo = option('--repo') ?? basename(top).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
const agent = option('--agent') ?? 'claude';
for (const [what, name] of [['book', book], ['repository', repo], ['agent', agent]] as const)
  if (!NAME.test(name!)) fail(`"${name}" cannot name a ${what}: lower-case letters, digits and hyphens.`);

// 1. Settings: the editor's file, so the runner knows the repository by its package.json name.
const settingsFile = configPath();
const settings = existsSync(settingsFile) ? JSON.parse(readFileSync(settingsFile, 'utf8')) : { repositories: {} };
const pkgFile = join(top, 'package.json');
if (settings.repositories?.[repo]) console.log(`✓ ${repo} is already in ${settingsFile}.`);
else if (existsSync(pkgFile)) {
  const name = JSON.parse(readFileSync(pkgFile, 'utf8')).name;
  if (!name) fail(`${pkgFile} has no "name", which the runner checks before it runs a test there.`);
  settings.repositories = { ...settings.repositories, [repo]: { package: name } };
  mkdirSync(galleyHome(), { recursive: true, mode: 0o700 });
  writeFileSync(settingsFile, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  console.log(`• Added ${repo} to ${settingsFile}. Restart Galley so it reads the change.`);
} else console.log(`• ${repo} has no package.json, so the runner cannot prove its tests. Everything else works.`);

// 2. Keys: one live key per caller. A key that already covers the book is kept; otherwise it is issued again with
// every book it had plus this one (issuing revokes the old one, so its file is rewritten with the new key).
const live = (await listKeys()).filter((k) => !k.revoked);
async function key(who: string, file: string, mayStart: boolean) {
  const had = live.find((k) => k.who === who);
  if (had?.books.includes(book!) && existsSync(file) && (!mayStart || had.mayStart)) return console.log(`✓ ${who} already has a key for ${book}.`);
  const books = [...new Set([...(had?.books ?? []), book!])];
  await revokeKeys(who);
  const token = await issueKey(who, books, mayStart || Boolean(had?.mayStart));
  mkdirSync(join(file, '..'), { recursive: true, mode: 0o700 });
  writeFileSync(file, `${token}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
  console.log(`• Issued ${who} a key for ${books.join(', ')}, in ${file}.`);
}
await key(`repo:${repo}`, join(galleyHome(), `${repo}.token`), false);
await key(`agent:${agent}`, join(galleyHome(), 'agents', `${agent}.token`), true);

// 3. The post-commit hook, through the launcher pnpm galley:setup wrote.
// Written with $HOME for the hook's shell and ~ for people reading the guide, so neither names whose machine it is.
const under = galleyHome().startsWith(homedir()) ? galleyHome().slice(homedir().length) : null;
const home = under === null ? galleyHome() : `$HOME${under}`;
const shown = under === null ? galleyHome() : `~${under}`;
const launcher = `${home}/bin/galley`;
const site = process.env.BOOK_URL ?? 'http://127.0.0.1:3300';
const hooks = resolve(top, git('rev-parse', '--git-path', 'hooks'));
const hook = join(hooks, 'post-commit');
const line = `"${launcher}" report-commit --book ${book} --repo ${repo} || true # galley`;
const old = existsSync(hook) ? readFileSync(hook, 'utf8') : '#!/bin/sh\n';
const kept = old.split('\n').filter((l) => !l.endsWith('# galley'));
while (kept.length && kept.at(-1) === '') kept.pop();
mkdirSync(hooks, { recursive: true });
const hooked = `${[...kept, line].join('\n')}\n`;
if (hooked !== old) writeFileSync(hook, hooked);
chmodSync(hook, 0o755);
console.log(`${hooked === old ? '✓' : '•'} The post-commit hook in ${hook} reports commits to ${book}.`);

// 4. The pointer. It names no version: the server serves the method of whatever Galley runs.
const start = '<!-- galley:start -->';
const end = '<!-- galley:end -->';
const block = `${start}
## Galley

This project's work is planned, followed and proven in Galley, in the book \`${book}\` (${site}/${book}).

- At the start of every session, call \`book_guide\` and follow the method it returns, then \`book_pickup\`. Or run
  \`${shown}/bin/galley pickup --book ${book} --repo ${repo}\`, which also reports this checkout.
- Name the work in the last paragraph of every commit: \`Work: <feature>/<work>\`.
- Prove a piece of work's promises: \`${shown}/bin/galley prove work:<feature>/<work> --book ${book} --repo ${repo}\`.
${end}`;
function point(file: string) {
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const at = text.indexOf(start);
  const next = at >= 0 ? `${text.slice(0, at)}${block}${text.slice(text.indexOf(end, at) + end.length)}` : `${text}${text && !text.endsWith('\n\n') ? (text.endsWith('\n') ? '\n' : '\n\n') : ''}${block}\n`;
  if (next !== text) writeFileSync(file, next);
  console.log(`${next === text ? '✓' : '•'} ${file} points agents at Galley.`);
}
const agents = join(top, 'AGENTS.md');
const claude = join(top, 'CLAUDE.md');
point(agents);
if (!existsSync(claude)) writeFileSync(claude, '@AGENTS.md\n');
else if (!/^@AGENTS\.md\s*$/m.test(readFileSync(claude, 'utf8'))) point(claude);

const token = `${shown}/agents/${agent}.token`;
console.log(`
Connect the agent to Galley's MCP endpoint, once per repository. For Claude Code, from ${top}:

  claude mcp add --transport http galley ${site}/api/mcp --header "Authorization: Bearer $(cat ${token})"

Any other MCP client: ${site}/api/mcp over streamable HTTP, with the header
Authorization: Bearer <the key in ${token}>. Then ask the agent to call book_guide.`);
process.exit(0);
