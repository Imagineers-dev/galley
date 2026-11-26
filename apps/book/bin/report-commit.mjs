#!/usr/bin/env node
// A repository's post-commit hook: tells the book about the commit just made when its message names a piece of work
// in a trailer, so the work's story lists it. It never blocks, since the commit is already made.
//
//   node report-commit.mjs --book <name> --repo <name> [--url http://127.0.0.1:3300]
//
// The trailer is the last paragraph's "Work: <feature>/<work>", or "Work: <book>:<feature>/<work>" for another book.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { callBook } from './book-call.mjs';

const args = process.argv.slice(2);
const option = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** The work a commit message names in its trailers, or null. */
export function workOf(message, book) {
  const last = message.trim().split(/\n\s*\n/).at(-1) ?? '';
  const line = last.split('\n').map((l) => /^work:\s*(\S.*)$/i.exec(l)).find(Boolean);
  const match = /^(?:([a-z0-9-]+):)?([a-z0-9-]+\/[a-z0-9-]+)$/.exec(line?.[1].trim() ?? '');
  return match ? { book: match[1] ?? book, work: `work:${match[2]}` } : null;
}

async function main() {
  const book = option('--book');
  const repo = option('--repo');
  if (!book || !repo) {
    console.error('Usage: report-commit.mjs --book <name> --repo <name> [--url <book url>]');
    return;
  }
  const message = git('log', '-1', '--format=%B');
  const named = workOf(message, book);
  if (!named) return;
  const url = option('--url') ?? process.env.BOOK_URL ?? 'http://127.0.0.1:3300';
  const body = { ...named, repo, sha: git('rev-parse', 'HEAD'), subject: message.split('\n')[0], committedAt: git('log', '-1', '--format=%cI') };
  const call = await callBook(url, '/api/commits', { repo, body, timeoutMs: 2000 });
  if (call.unreachable) console.error(`Galley at ${url} is not answering, so this commit is not yet in ${named.work}'s story.`);
  else if (call.fault) console.error(`Galley failed while recording this commit: ${call.fault.join(' ')}`);
  else if (!call.ok) console.error(`Galley refused to record this commit: ${call.refused.join(' ')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main().catch((error) => console.error(`This commit was not reported to Galley: ${error.message}`));
