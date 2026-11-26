#!/usr/bin/env node
// Reads a repository's git history for the last year and gives the book how many commits were made each day.
// It only reads the repository's log. Usage: node scripts/import-history.mjs <book> <repo name> <repo path>
import { execFileSync } from 'node:child_process';
import { callBook } from '../bin/book-call.mjs';

const [book, repo, path] = process.argv.slice(2);
if (!book || !repo || !path) throw new Error('Usage: import-history.mjs <book> <repo name> <repo path>');
const log = execFileSync('git', ['-C', path, 'log', '--all', '--since=1 year ago', '--format=%cs'], { encoding: 'utf8' });
const counts = new Map();
for (const day of log.split('\n').filter(Boolean)) counts.set(day, (counts.get(day) ?? 0) + 1);
const days = [...counts.entries()].sort().map(([day, commits]) => ({ day, commits }));
const url = process.env.BOOK_URL ?? 'http://127.0.0.1:3300';
const call = await callBook(url, '/api/history', { repo, body: { book, repo, days } });
if (call.unreachable) throw new Error(`The book at ${url} is not answering.`);
if (call.fault) throw new Error(`The book failed while taking the history: ${call.fault.join(' ')}`);
if (!call.ok) throw new Error(`The book refused the history: ${call.refused.join(' ')}`);
console.log(`Wrote ${call.data.written} of ${days.length} days, ${days.reduce((n, d) => n + d.commits, 0)} commits.`);
