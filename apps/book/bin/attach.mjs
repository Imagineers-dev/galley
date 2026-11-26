#!/usr/bin/env node
// Attaches a file to the book from a repository: slides or a document to a feature, or a document to a section
// (Research unless --section names another), filed in a folder and tagged. Any file up to 20 MB; the book decides what it is from its bytes.
//
//   galley attach <file> --book <name> --repo <name> --title "<title>" (--feature <id> | [--section <slug>] --folder <a/b>)
//                 [--tags a,b] [--informs feature:x,feature:y] [--slides] [--about "<words>"] [--asset <id>] [--url <book url>]
//
// With --asset it attaches a new version of that asset (and any new title, place or tags).
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { callBook } from './book-call.mjs';

const MAX = 20 * 1024 * 1024;

/** The call's body from the command line: the file's name and bytes and where it goes. */
export function attachBody(args, read = (p) => readFileSync(p)) {
  const option = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const list = (flag) => option(flag)?.split(',').map((s) => s.trim()).filter(Boolean);
  const path = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
  const body = {
    book: option('--book'), asset: option('--asset'), title: option('--title'), about: option('--about'),
    feature: option('--feature'), section: option('--section'), folder: option('--folder'), tags: list('--tags'), informs: list('--informs'),
    ...(args.includes('--slides') ? { slides: true } : {}),
  };
  if (path) Object.assign(body, { name: basename(path), data: read(path).toString('base64') });
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
}

async function main() {
  const args = process.argv.slice(2);
  const option = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const repo = option('--repo');
  if (!option('--book') || !repo || (!args[0] && !option('--asset'))) {
    console.error('Usage: galley attach <file> --book <name> --repo <name> --title "<title>" (--feature <id> | [--section <slug>] --folder <a/b>) [--tags a,b] [--informs ids] [--slides] [--asset <id>]');
    process.exitCode = 2;
    return;
  }
  if (args[0] && !args[0].startsWith('--') && statSync(args[0]).size > MAX) {
    console.error('A file is at most 20 MB.');
    process.exitCode = 1;
    return;
  }
  const url = option('--url') ?? process.env.BOOK_URL ?? 'http://127.0.0.1:3300';
  const call = await callBook(url, '/api/assets', { repo, body: attachBody(args), timeoutMs: 60_000 });
  if (call.ok) console.log(`Attached ${call.data.attached} (${call.data.file.type}, ${call.data.file.size} bytes).`);
  else {
    console.error(call.unreachable ? `Galley at ${url} is not answering.` : `Galley ${call.fault ? 'failed' : 'refused'}: ${(call.fault ?? call.refused).join(' ')}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
