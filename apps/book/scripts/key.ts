// Keys for repositories and agents, and the editor's sign-ins. Run from apps/book:
//
//   pnpm key issue repo:<name> --books <book>[,<book>]       writes ~/.config/galley/<name>.token (0600)
//   pnpm key issue agent:<name> --books <book>[,…] [--start]  writes ~/.config/galley/agents/<name>.token (0600)
//   pnpm key issue agent:<name> --read-only                    a key that reads every book and writes none
//   pnpm key revoke <who>          pnpm key list          pnpm key sign-out-everywhere
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { galleyHome } from '../bin/galley-config.mjs';
import { issueKey, listKeys, revokeKeys } from '../lib/server/keys';
import { revokeOpenSessions } from '../lib/store/sessions';

const [command, who, ...rest] = process.argv.slice(2);
const option = (name: string) => rest[rest.indexOf(name) + 1];
const books = () => (rest.includes('--books') ? option('--books').split(',').map((b) => b.trim()).filter(Boolean) : []);
const fail = (message: string): never => {
  console.error(message);
  process.exit(2);
};
const valid = (name: string | undefined): name is string => !!name && /^(repo|agent):[a-z0-9][a-z0-9-]*$/.test(name);

if (command === 'issue') {
  if (!valid(who)) fail('Name the key: repo:<name> or agent:<name>.');
  if (!books().length && !rest.includes('--read-only')) fail('Name the books it may write (--books <book>[,<book>]), or say --read-only.');
  const replaced = await revokeKeys(who); // one live key per caller: the one it replaces stops working
  const token = await issueKey(who, books(), rest.includes('--start'));
  const may = books().length ? `may write ${books().join(', ')}` : 'reads every book and writes none';
  // A repository's key is <repo>.token; an agent's lives in agents/<name>.token, so the two can never share a file.
  const root = galleyHome();
  const dir = who.startsWith('agent:') ? join(root, 'agents') : root;
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, `${who.slice(who.indexOf(':') + 1)}.token`);
  writeFileSync(file, `${token}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
  console.log(`${who} ${may}. Its key is in ${file}.${replaced ? ` The key it replaces (${replaced}) is revoked.` : ''}`);
} else if (command === 'revoke') {
  if (!valid(who)) fail('Name the key to revoke: repo:<name> or agent:<name>.');
  console.log(`Revoked ${await revokeKeys(who)} key(s) of ${who}.`);
} else if (command === 'list') {
  for (const key of await listKeys()) console.log(`${key.revoked ? 'revoked' : 'live   '}  ${key.who}  ${key.books.join(', ')}${key.mayStart ? '  (may start a book)' : ''}`);
} else if (command === 'sign-out-everywhere') {
  console.log(`Ended ${await revokeOpenSessions(new Date().toISOString())} sign-in(s).`);
} else {
  fail('Commands: issue, revoke, list, sign-out-everywhere.');
}
process.exit(0);
