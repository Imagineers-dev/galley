#!/usr/bin/env node
// The runner: proves a piece of work's promises from a clean copy of the last commit. For each test with an accepted
// link it makes a detached worktree, installs, runs the test's command with no shell, without the book's key and with a
// temporary home, removes the worktree, and records the result as the repository. A test that could not run records
// nothing and says so. The repository's key is readable on this machine, so a deliberate forgery is possible but visible.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { callBook } from './book-call.mjs';
import { PROVE_REPOS, REPO_PACKAGES, pnpmTarget, refusedArgv } from './prove-rules.mjs';

const MINUTES = 60_000;

/** Why this command may not run here, or null. */
export function refusedCommand(command, repo) {
  if (!PROVE_REPOS.includes(command?.repo)) return `it names a repository the runner does not run (${command?.repo})`;
  if (command.repo !== repo) return `it runs in ${command.repo}, not ${repo}`;
  return refusedArgv(command.argv);
}

/** The environment a test runs in: this one, without the book's key and, given a home, unable to find the key file through it. */
export function childEnv(env = process.env, home) {
  const { BOOK_KEY: _key, XDG_CONFIG_HOME: _config, ...rest } = env;
  return home ? { ...rest, HOME: home, USERPROFILE: home } : rest;
}

const git = (cwd, args) => {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`git ${args[0]} failed: ${(run.stderr ?? '').trim()}`);
  return run.stdout.trim();
};

/** Whether the commit is the repository it says it is. */
function isRepo(root, sha, repo) {
  try {
    return JSON.parse(git(root, ['show', `${sha}:package.json`])).name === REPO_PACKAGES[repo];
  } catch {
    return false;
  }
}

/** The script node would run, when the command names one. */
const nodeScript = (argv) => (argv[0] === 'node' ? (argv[1] === '--test' ? argv[2] : argv[1]) : undefined);

/** The folders of the packages a pnpm command runs in, read from pnpm and not from a test's output. */
function packagesOf(copy, filters, env) {
  if (!filters.length) return [copy];
  const args = [...filters.flatMap((f) => ['--filter', f]), 'list', '--depth', '-1', '--json'];
  const listed = spawnSync('pnpm', args, { cwd: copy, env, encoding: 'utf8', shell: false, timeout: MINUTES });
  if (listed.status !== 0) return [];
  try {
    return JSON.parse(listed.stdout || '[]').map((p) => p.path);
  } catch {
    return [];
  }
}

/** Why this command has nothing to run in this commit, or null. */
function nothingToRun(copy, argv, env) {
  const script = nodeScript(argv);
  if (argv[0] === 'node') return script && !existsSync(join(copy, script)) ? `its script ${script} is not in this commit` : null;
  const target = pnpmTarget(argv.slice(1));
  const folders = packagesOf(copy, target.filters, env);
  if (!folders.length) return 'no package matches its filter';
  const has = (dir) => {
    try {
      return !!JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts?.[target.script];
    } catch {
      return false;
    }
  };
  return folders.every(has) ? null : `a package it runs in has no "${target.script}" script`;
}

/** Runs one command in a fresh copy of `sha`. Returns its exit code, or `{ couldNot }`. */
function runInCopy(root, sha, argv, store) {
  const parent = mkdtempSync(join(tmpdir(), 'book-prove-'));
  const copy = join(parent, 'copy');
  const home = join(parent, 'home');
  mkdirSync(home);
  const env = childEnv(process.env, home);
  try {
    git(root, ['worktree', 'add', '--quiet', '--detach', copy, sha]);
    const install = spawnSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline', '--store-dir', store], { cwd: copy, env, stdio: 'ignore', shell: false, timeout: 10 * MINUTES });
    if (install.status !== 0) return { couldNot: 'its install failed' };
    const nothing = nothingToRun(copy, argv, env);
    if (nothing) return { couldNot: nothing };
    const run = spawnSync(argv[0], argv.slice(1), { cwd: copy, env, stdio: 'ignore', shell: false, timeout: 15 * MINUTES });
    if (run.error || run.status === null) return { couldNot: run.error?.message ?? 'it was stopped before it finished' };
    return { code: run.status };
  } catch (error) {
    return { couldNot: error.message };
  } finally {
    spawnSync('git', ['worktree', 'remove', '--force', copy], { cwd: root });
    rmSync(parent, { recursive: true, force: true });
    spawnSync('git', ['worktree', 'prune'], { cwd: root });
  }
}

/**
 * Posts one result. A server test suite can leave this machine briefly unable to open local connections, so a book that
 * does not answer is asked again, three times in all, a few seconds apart. A refusal is never retried.
 */
export async function postRun(url, repo, body, { tries = 3, waitMs = 3000, call = callBook } = {}) {
  let posted = await call(url, '/api/runs', { repo, body });
  for (let left = tries - 1; posted.unreachable && left > 0; left--) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    posted = await call(url, '/api/runs', { repo, body });
  }
  return posted;
}

/** Proves one work. Returns what was recorded and what could not run. */
export async function prove({ work, book, repo, url, cwd = process.cwd() }) {
  const stop = (why) => ({ recorded: [], couldNotRun: [{ test: null, why }] });
  if (!PROVE_REPOS.includes(repo)) return stop(`the runner does not run ${repo}`);
  const root = git(cwd, ['rev-parse', '--show-toplevel']);
  const sha = git(root, ['rev-parse', 'HEAD']);
  if (!isRepo(root, sha, repo)) return stop(`this checkout is not ${repo}`);
  const listed = await callBook(url, `/api/runs?book=${encodeURIComponent(book)}&work=${encodeURIComponent(work)}`, { repo });
  if (!listed.ok) return stop('the book did not list the tests');
  const committedAt = git(root, ['show', '-s', '--format=%cI', sha]);
  // The real pnpm store, found once, so a test's temporary home still installs offline.
  const storePath = spawnSync('pnpm', ['store', 'path'], { cwd: root, env: childEnv(), encoding: 'utf8' });
  if (storePath.status !== 0) return stop('pnpm could not find its store');
  const store = storePath.stdout.trim();
  const recorded = [];
  const couldNotRun = [];
  for (const test of listed.data.tests) {
    const no = refusedCommand(test.command, repo);
    if (no) { couldNotRun.push({ test: test.id, why: no }); continue; }
    const outcome = runInCopy(root, sha, test.command.argv, store);
    if ('couldNot' in outcome) { couldNotRun.push({ test: test.id, why: outcome.couldNot }); continue; }
    // The command and its exit code only: a test's output can hold a user's words.
    const evidence = `${test.command.argv.join(' ')} exited ${outcome.code} at ${sha.slice(0, 9)}`;
    const body = { book, test: test.id, testAt: test.at, argv: test.command.argv, result: outcome.code === 0 ? 'pass' : 'fail', sha, committedAt, evidence };
    const posted = await postRun(url, repo, body);
    if (posted.ok) recorded.push({ test: test.id, result: body.result, run: posted.data.recorded });
    else couldNotRun.push({ test: test.id, why: `the book did not record its ${body.result}: ${posted.unreachable ? 'it is not answering' : (posted.refused ?? posted.fault).join(' ')}` });
  }
  return { recorded, couldNotRun };
}

function option(args, name) {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const [work] = args;
  const book = option(args, 'book');
  const repo = option(args, 'repo');
  if (!work || work.startsWith('--') || !book || !repo) {
    console.error('Usage: prove.mjs <work> --book <book> --repo <a repository in Galley\'s settings> [--url <book url>]');
    process.exit(2);
  }
  const { recorded, couldNotRun } = await prove({ work, book, repo, url: option(args, 'url') ?? process.env.BOOK_URL ?? 'http://127.0.0.1:3300' });
  for (const r of recorded) console.log(`${r.result === 'pass' ? 'passed' : 'FAILED'}  ${r.test}`);
  for (const c of couldNotRun) console.log(`could not run  ${c.test ?? work}: ${c.why}`);
  process.exit(couldNotRun.length || recorded.some((r) => r.result === 'fail') ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
