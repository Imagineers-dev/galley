// book_guide: the method an agent follows, from the running Galley, with what changed since the version it last read.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GALLEY_VERSION } from '../server/version';
import { CHANGES, METHOD } from './method';
import { run } from './run';

const parts = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10) || 0);

/** Whether version a is newer than b, comparing major, minor and patch. */
export function newer(a: string, b: string): boolean {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
}

/** The guide as book_guide returns it: the method, its version, and the changes after `since` when one is named. */
export function guide(since?: string) {
  const changes = since ? CHANGES.filter((c) => newer(c.version, since)) : [];
  return { galley: GALLEY_VERSION, method: METHOD, ...(since ? { changesSince: { since, changes } } : {}) };
}

export function registerGuideTools(server: McpServer) {
  server.registerTool(
    'book_guide',
    {
      description: "Call once at the start of every session: how to work in Galley, from the running server, so it is always this version's method. Name since (the Galley version you last read) to see what changed after it.",
      inputSchema: { since: z.string().regex(/^\d+\.\d+\.\d+$/).optional().describe('The Galley version you last read the guide at, e.g. 0.1.0') },
    },
    ({ since }) => run(async () => guide(since)),
  );
}
