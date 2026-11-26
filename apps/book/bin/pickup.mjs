#!/usr/bin/env node
// Pick up the work: run in a repository, it reports the checkout to the book (head, what is not on the remote,
// what is not committed, what each live part says it runs), then prints the book's pick-up: where the book left
// off beside what is true now, where they disagree, and the first step. Any repository can use it.
//
//   node pickup.mjs --book <name> [--repo <name>] [--url http://127.0.0.1:3300] [--json]
//                   [--live "<part>=https://…/version"] [--live "<part>=plist:/Applications/X.app"]
//
// A live part answers either at a URL returning { commit, uncommittedFiles } or in an app's Info.plist
// (GalleyCommit-style keys ending in Commit / UncommittedFiles). A part that does not say reports null.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { callBook } from './book-call.mjs';

const args = process.argv.slice(2);
const many = (flag) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const one = (flag, fallback) => many(flag)[0] ?? fallback;
const git = (...a) => {
  try {
    return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).replace(/\n$/, '');
  } catch {
    return null;
  }
};

const book = one('--book');
const url = one('--url', process.env.BOOK_URL ?? 'http://127.0.0.1:3300');
if (!book) {
  console.error('Usage: pickup.mjs --book <name> [--repo <name>] [--live "<part>=<url or plist:path>"] [--json]');
  process.exit(2);
}
const top = git('rev-parse', '--show-toplevel');
if (!top) {
  console.error('Run the pick-up inside a git repository.');
  process.exit(2);
}
const repo = one('--repo', basename(top));

function commits(range) {
  const out = git('log', '--format=%H%x09%s', range);
  return out ? out.split('\n').map((l) => ({ sha: l.slice(0, 40), subject: l.slice(41) || '(no subject)' })) : [];
}

async function reading(spec) {
  const [part, source] = [spec.slice(0, spec.indexOf('=')), spec.slice(spec.indexOf('=') + 1)];
  let commit = null;
  let uncommittedFiles = null;
  try {
    if (source.startsWith('plist:')) {
      const plist = `${source.slice(6)}/Contents/Info.plist`;
      const read = (key) => execFileSync('defaults', ['read', plist, key], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      commit = read('GalleyCommit') || null;
      // Only a whole number is a count: an unreadable value must not read as a clean build.
      const count = read('GalleyUncommittedFiles');
      uncommittedFiles = /^\d+$/.test(count) ? Number(count) : null;
    } else {
      const response = await fetch(source, { signal: AbortSignal.timeout(5000) });
      if (response.ok) ({ commit = null, uncommittedFiles = null } = await response.json());
    }
  } catch {
    // The part does not say which commit it runs: reported as null, and the book says so.
  }
  return { part, where: source, commit: /^[0-9a-f]{7,40}$/.test(commit ?? '') ? commit : null, uncommittedFiles };
}

git('fetch', '--quiet');
const upstream = git('rev-parse', '--abbrev-ref', '@{u}') ?? 'origin/main';
const [sha, subject] = (git('log', '-1', '--format=%H%x09%s') ?? '\t').split('\t');
const checkout = {
  book,
  repo,
  checkedAt: new Date().toISOString(),
  branch: git('rev-parse', '--abbrev-ref', 'HEAD') ?? 'unknown',
  head: { sha, subject: subject || '(no subject)' },
  unpushed: commits(`${upstream}..HEAD`).slice(0, 500),
  uncommitted: (git('status', '--porcelain', '--untracked-files=all') ?? '').split('\n').filter(Boolean).map((l) => l.slice(3)).slice(0, 5000),
  live: await Promise.all(many('--live').map(reading)),
};

const say = (call, what) => {
  if (call.unreachable) console.error(`The book at ${url} is not answering, so ${what}. Start the book (Galley, apps/book).`);
  else if (call.fault) console.error(`The book failed while taking ${what}: ${call.fault.join(' ')}`);
  else console.error(`The book refused ${what}: ${call.refused.join(' ')}`);
  process.exit(1);
};
{
  const posted = await callBook(url, '/api/checkouts', { repo, body: checkout });
  if (!posted.ok) say(posted, 'the checkout');
  const picked = await callBook(url, `/api/pickup?book=${encodeURIComponent(book)}`, { repo });
  if (!picked.ok) say(picked, 'the pick-up');
  const p = picked.data;
  const here = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  if (p.galley !== here) console.error(`Galley's checkout is ${here} but the running server is ${p.galley ?? 'older than 0.1.0'}: restart Galley (pnpm dev or pnpm start) so agents read this version's method.`);
  if (args.includes('--json')) {
    console.log(JSON.stringify(p, null, 2));
  } else {
    const lines = [`Start here: ${p.first}`, ''];
    if (p.leftOff) lines.push(`The book left off on ${p.leftOff.day}: ${p.leftOff.headline ?? ''}`, ...p.leftOff.next.map((l) => `  next: ${l.text}`), '');
    lines.push(p.disagreements.length ? 'Where the book and the world disagree:' : 'The book and the world agree.', ...p.disagreements.map((d) => `  - ${d}`));
    for (const r of p.repos) lines.push('', `${r.repo}: ${r.branch} at ${r.head.sha.slice(0, 9)}, ${r.unpushed.length} unpushed, ${r.uncommitted.count} uncommitted (${r.uncommitted.areas.slice(0, 4).map((a) => `${a.area} ${a.files}`).join(', ')})`, ...r.live.map((l) => `  ${l.part}: ${l.says ? l.says.slice(0, 9) : 'does not say'}${l.agrees === false ? `, the book says ${l.bookSays.slice(0, 9)}` : ''}`));
    if (p.since.answers.length) lines.push('', 'Answered since the diary:', ...p.since.answers.map((a) => `  - ${a.text}`));
    lines.push('', `${p.waitingOnYou} things wait on the editor. The page: ${url}/${book}#where-we-stand`);
    console.log(lines.join('\n'));
  }
}
