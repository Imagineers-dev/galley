// Keys and sign-ins keep only hashes, answer for live ones only, and are revoked by a new row. Throwaway database.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { throwawayDatabase } from './helpers/db';

let db: Awaited<ReturnType<typeof throwawayDatabase>>;
let keys: typeof import('../lib/server/keys');
let sessions: typeof import('../lib/store/sessions');
let secrets: typeof import('../lib/server/secrets');
let store: typeof import('../lib/store/client');

beforeAll(async () => {
  db = await throwawayDatabase('book_keys');
  keys = await import('../lib/server/keys');
  sessions = await import('../lib/store/sessions');
  secrets = await import('../lib/server/secrets');
  store = await import('../lib/store/client');
});
afterAll(async () => db.drop());

describe('keys', () => {
  it('names its caller and books, keeps no token, and stops working once revoked', async () => {
    const token = await keys.issueKey('agent:claude', ['a', 'b'], false);
    expect(await keys.callerOf(token)).toEqual({ who: 'agent:claude', books: ['a', 'b'], mayStart: false });
    expect(JSON.stringify(await keys.listKeys())).not.toContain(token);
    expect(await keys.callerOf('not-a-key')).toBeNull();
    expect(await keys.revokeKeys('agent:claude')).toBe(1);
    expect(await keys.callerOf(token)).toBeNull();
  });
  it('may start books only when issued so', async () => {
    expect((await keys.callerOf(await keys.issueKey('agent:codex', ['a'], true)))?.mayStart).toBe(true);
  });
});

describe('revoking', () => {
  it('wins even when written in the same millisecond as the issue, in either order', async () => {
    const at = '2026-11-19 12:00:00.000';
    for (const [name, order] of [['tie-a', [0, 1]], ['tie-b', [1, 0]]] as const) {
      const key = { hash: secrets.hashOf(name), who: 'repo:x', books: ['a'], may_start: 0, at };
      await store.client.insert({ table: 'keys', values: order.map((revoked) => ({ ...key, revoked })), format: 'JSONEachRow' });
      expect(await keys.callerOf(name), name).toBeNull();
      const signIn = { hash: secrets.hashOf(`${name}-session`), expires: '2099-01-01 00:00:00.000', at };
      await store.client.insert({ table: 'sessions', values: order.map((revoked) => ({ ...signIn, revoked })), format: 'JSONEachRow' });
      expect((await sessions.sessionOf(secrets.hashOf(`${name}-session`)))?.revoked, name).toBe(true);
    }
  });
});

describe('sign-ins', () => {
  it('are kept as hashes with an expiry, and all open ones can be ended at once', async () => {
    const token = secrets.newToken();
    const later = new Date(Date.now() + 86_400_000).toISOString();
    await sessions.appendSession({ hash: secrets.hashOf(token), expires: later, revoked: false });
    await sessions.appendSession({ hash: secrets.hashOf('old'), expires: new Date(Date.now() - 1000).toISOString(), revoked: false });
    expect((await sessions.sessionOf(secrets.hashOf(token)))?.revoked).toBe(false);
    expect(await sessions.revokeOpenSessions(new Date().toISOString())).toBe(1);
    expect((await sessions.sessionOf(secrets.hashOf(token)))?.revoked).toBe(true);
  });
});
