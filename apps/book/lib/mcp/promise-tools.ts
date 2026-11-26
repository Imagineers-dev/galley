// Promises through MCP: agents propose them, read them, vouch for a run and accept a test's link. None of these approve.
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { promiseGaps } from '../book/promise-gaps';
import { promisesOf } from '../book/promises';
import type { Test } from '../book/record-types';
import { slugOf } from '../book/types';
import { testLevel } from '../rules/bodies';
import { surface, testCommand } from '../rules/bodies-promises';
import { Refused, writeFrom } from '../write';
import { add, load, revise } from './add';
import { changed } from './changes';
import { as, book, run } from './run';

export function registerPromiseTools(server: McpServer) {
  server.registerTool('book_propose_promise', {
    description: 'Propose a promise on a feature: one plain sentence that must always stay true for its users, on the deepest feature that owns it. Name `promise` to reword one; it goes back to the editor showing what changed. Only the editor approves.',
    inputSchema: {
      book, feature: z.string(), text: z.string(), promise: z.string().optional().describe('The promise to reword, by id'),
      serves: z.string().optional().describe("A promise on a feature above this one"),
      mustHoldIn: surface.optional().describe('Where it must hold: app (the default) or server'),
      serverReason: z.string().optional().describe('Needed for server: why, in plain words; the editor approves it with the promise'),
    },
  }, ({ book: n, feature, text, promise, serves, mustHoldIn, serverReason }, x) => run(() => {
    const id = promise ?? `promise:${slugOf(feature)}/${randomUUID()}`;
    return add(n, 'promise', id, as(x, n), { feature, text, mustHoldIn: mustHoldIn ?? 'app', ...(serves ? { serves } : {}), ...(serverReason ? { serverReason } : {}) });
  }));

  server.registerTool('book_promises', {
    description: 'What a feature promises and the state of each promise (Broken, Proven, Claimed, Server only, Not rechecked, Not proven), with its tests. Name `work` to also see what the done gate would refuse for it; this only reports.',
    inputSchema: { book, feature: z.string().describe('The feature id, like feature:scene-spec'), work: z.string().optional() },
  }, ({ book: n, feature, work }) => run(async () => {
    const now = await load(n);
    const promises = promisesOf(now, feature);
    if (!promises) return { missing: feature };
    return { ...promises, ...(work ? { wouldRefuse: promiseGaps(now, work) } : {}) };
  }));

  server.registerTool('book_witness', {
    description: 'Vouch for a run you did not do, with what you checked. Refused if you wrote any paper, test or run on that work, on its feature or on work serving its promise. Claude\'s work needs Codex, and the reverse; the editor proves a promise by trying it (book_ask with about.act: pass), not by witnessing.',
    inputSchema: { book, run: z.string(), evidence: z.string().describe('What you checked and what you saw') },
  }, ({ book: n, run: runId, evidence }, x) => run(() => add(n, 'witness', `witness:${randomUUID()}`, as(x, n), { run: runId, evidence })));

  server.registerTool('book_accept_link', {
    description: "Accept that a test proves a promise, for this version of the test and this command, after reading both. Refused for the test's own author. A changed test needs accepting again.",
    inputSchema: { book, link: z.string() },
  }, ({ book: n, link }, x) => run(() => writeFrom(n, (now) => {
    const test = now.get(String(now.get(link)?.body.from));
    if (test?.kind !== 'test') throw new Refused([`"${link}" is not a link from a test.`]);
    const body = { link, testAt: test.at, argv: (test.body as Test).command?.argv ?? [] };
    return { id: `link-accept:${randomUUID()}`, kind: 'link-accept', by: as(x, n), replaces: null, body };
  })));

  server.registerTool('book_update_test', {
    description: 'Write a new version of a test: its words, level, how it runs or its command. Any link accepted on the old version must be accepted again.',
    inputSchema: { book, test: z.string(), title: z.string().optional(), level: testLevel.optional(), runs: z.string().optional(), command: testCommand.optional() },
  }, ({ book: n, test, ...change }, x) => run(() => revise(n, 'test', test, as(x, n), (old) => changed(old, change))));
}
