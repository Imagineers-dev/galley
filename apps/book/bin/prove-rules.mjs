// What the runner may run: one definition, read by the runner and by the book's write rules.
import { REPOSITORIES } from './galley-config.mjs';

/** The repositories the runner may run tests in: those in this install's settings (bin/galley-config.mjs). */
/** @type {readonly string[]} */
export const PROVE_REPOS = Object.freeze(Object.keys(REPOSITORIES));
/** The name in each repository's package.json, so the runner knows it is in the tree it says it is. */
/** @type {Readonly<Record<string, string>>} */
export const REPO_PACKAGES = Object.freeze(Object.fromEntries(Object.entries(REPOSITORIES).map(([name, repo]) => [name, repo.package])));

const isFlag = (arg) => arg.startsWith('-');
const insideRepo = (path) => !path.startsWith('/') && !path.split('/').includes('..');

/** `node [--test] <script inside the repository> [its arguments]`: no flag that runs other code. */
function refusedNode(args) {
  const rest = args[0] === '--test' ? args.slice(1) : args;
  if (rest.length === 0) return args[0] === '--test' ? null : 'it names no script for node';
  if (isFlag(rest[0])) return 'node runs a script here, with no flags that run other code';
  return insideRepo(rest[0]) ? null : 'its script is outside the repository';
}

/** The packages a pnpm command filters to, and the script it runs (none when it is not `test` or `run <script>`). */
export function pnpmTarget(args) {
  const filters = [];
  let rest = args;
  while (rest[0] === '--filter' || rest[0] === '-F' || rest[0]?.startsWith('--filter=')) {
    const joined = rest[0].includes('=');
    filters.push(joined ? rest[0].slice('--filter='.length) : rest[1]);
    rest = rest.slice(joined ? 1 : 2);
  }
  const script = rest[0] === 'test' ? 'test' : rest[0] === 'run' && rest[1] && !isFlag(rest[1]) ? rest[1] : undefined;
  return { filters, script };
}

/** `pnpm [--filter <package>] test` or `pnpm [--filter <package>] run <script>`: never dlx, exec or a shell. */
function refusedPnpm(args) {
  if (args.some((a) => /^--(script-shell|shell-emulator)/.test(a))) return 'it changes the shell pnpm uses';
  return pnpmTarget(args).script ? null : 'pnpm runs only `test` or `run <script>` here';
}

/** Why this command may not run, in plain words, or null. */
export function refusedArgv(argv) {
  if (!Array.isArray(argv) || (argv[0] !== 'pnpm' && argv[0] !== 'node')) return 'its program is not pnpm or node';
  return argv[0] === 'node' ? refusedNode(argv.slice(1)) : refusedPnpm(argv.slice(1));
}
