// The MCP endpoint at /api/mcp. Every agent signs in with its own key, which names the books it may write.
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { registerAssetTools } from '../../../lib/mcp/asset-tools';
import { registerGuideTools } from '../../../lib/mcp/guide-tools';
import { registerInboxTools } from '../../../lib/mcp/inbox-tools';
import { INSTRUCTIONS } from '../../../lib/mcp/method';
import { registerOversightReadTools } from '../../../lib/mcp/oversight-read-tools';
import { registerOversightTools } from '../../../lib/mcp/oversight-tools';
import { registerReadTools } from '../../../lib/mcp/read-tools';
import { registerPromiseTools } from '../../../lib/mcp/promise-tools';
import { registerTestTools } from '../../../lib/mcp/test-tools';
import { registerShapeTools } from '../../../lib/mcp/shape-tools';
import { registerWriteTools } from '../../../lib/mcp/write-tools';
import { callerOf } from '../../../lib/server/keys';
import { GALLEY_VERSION } from '../../../lib/server/version';

const handler = createMcpHandler((server) => {
  registerGuideTools(server);
  registerReadTools(server);
  registerWriteTools(server);
  registerShapeTools(server);
  registerTestTools(server);
  registerPromiseTools(server);
  registerInboxTools(server);
  registerOversightTools(server);
  registerOversightReadTools(server);
  registerAssetTools(server);
}, { serverInfo: { name: 'galley', version: GALLEY_VERSION }, instructions: INSTRUCTIONS }, {
  basePath: '/api',
  maxDuration: 60,
  disableSse: true,
});

const authed = withMcpAuth(
  handler,
  async (_req, token) => {
    const caller = await callerOf(token);
    if (!caller?.who.startsWith('agent:')) return undefined;
    const clientId = caller.who.slice('agent:'.length);
    return { token: token as string, clientId, scopes: ['book:write'], extra: { books: caller.books, mayStart: caller.mayStart } };
  },
  { required: true },
);

export { authed as GET, authed as POST };
