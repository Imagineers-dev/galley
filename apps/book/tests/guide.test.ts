// The method agents follow comes from the running Galley: it names only tools the server has, carries the version
// in package.json, and reports what changed after the version an agent last read.
import { describe, expect, it } from 'vitest';
import { workOf } from '../bin/report-commit.mjs';
import { guide, newer } from '../lib/mcp/guide-tools';
import { CHANGES, INSTRUCTIONS, METHOD } from '../lib/mcp/method';
import { GALLEY_VERSION } from '../lib/server/version';
import { filesUnder, read } from './helpers/source';

const registered = new Set(filesUnder('lib/mcp', (p) => p.endsWith('.ts')).flatMap((f) => [...read(f).matchAll(/registerTool\(\s*'(book_\w+)'/g)].map((m) => m[1])));

describe('the guide', () => {
  it('names only tools the server registers', () => {
    const named = new Set([...`${METHOD} ${INSTRUCTIONS}`.matchAll(/book_\w+/g)].map((m) => m[0]));
    expect(named.size).toBeGreaterThan(10);
    for (const tool of named) expect(registered, tool).toContain(tool);
  });

  it('carries the version in package.json, with a change line for it', () => {
    expect(GALLEY_VERSION).toBe(JSON.parse(read('package.json')).version);
    expect(CHANGES[0].version).toBe(GALLEY_VERSION);
    expect(guide()).toMatchObject({ galley: GALLEY_VERSION, method: METHOD });
  });

  it('reports only the changes after the version an agent last read', () => {
    expect(newer('0.10.0', '0.9.9')).toBe(true);
    expect(newer('1.0.0', '1.0.0')).toBe(false);
    expect(guide(GALLEY_VERSION).changesSince?.changes).toEqual([]);
    expect(guide('0.0.0').changesSince?.changes.length).toBe(CHANGES.length);
  });
});

describe('a commit names its work in its last paragraph', () => {
  it.each([
    ['Fix the inbox\n\nWork: inbox/archive-keeps-answers', { book: 'app', work: 'work:inbox/archive-keeps-answers' }],
    ['Fix\n\nBody.\n\nwork: other:inbox/x\nCo-Authored-By: A <a@b>', { book: 'other', work: 'work:inbox/x' }],
    ['Fix\n\nWork: inbox/x\n\nNo trailer here.', null],
    ['Fix\n\nWork: Not A Work', null],
  ])('%j', (message, expected) => expect(workOf(message, 'app')).toEqual(expected));
});
