// The runner (bin/prove.mjs) asks what it may run for a piece of work, and records each result as the repository.
import { randomUUID } from 'node:crypto';
import { linkedTests } from '../../../lib/book/promise-evidence';
import type { BookPromise } from '../../../lib/book/promise-types';
import type { Test } from '../../../lib/book/record-types';
import { type Current, currentOf, entries } from '../../../lib/book/views';
import { failed, forBook, gate, jsonOf, refuse, reply, repoOf } from '../../../lib/server/local-route';
import { readCurrent } from '../../../lib/store/records';
import { Refused, writeFrom } from '../../../lib/write';

type Posted = { book: string; test: string; testAt: string; argv: string[]; result: string; sha: string; committedAt: string; evidence: string };

/** A work's tests that have a command and an accepted link to at least one promise. */
function runnable(now: Current, work: string) {
  const accepted = new Set(entries<BookPromise>(now, 'promise').flatMap((p) => linkedTests(now, p.id).filter((t) => t.acceptedAt).map((t) => t.test.id)));
  return entries<Test>(now, 'test').filter((t) => t.body.work === work && t.body.command && accepted.has(t.id)).map((t) => ({ id: t.id, at: t.at, title: t.body.title, command: t.body.command }));
}

export async function GET(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const query = new URL(request.url).searchParams;
  const book = query.get('book') ?? '';
  const work = query.get('work') ?? '';
  const refused = forBook(gated, book);
  if (refused) return refused;
  if (!work) return refuse(400, 'Name the work (?work=).');
  try {
    return reply({ tests: runnable(currentOf(await readCurrent(book)), work) });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const body = await jsonOf<Posted>(request);
  if (body instanceof Response) return body;
  const { book, test, testAt, argv, result, sha, committedAt, evidence } = body;
  const refused = forBook(gated, String(book));
  if (refused) return refused;
  try {
    const record = await writeFrom(String(book), (now) => {
      const held = now.get(String(test));
      const command = (held?.body as Test | undefined)?.command;
      if (!command) throw new Refused([`"${String(test)}" is not a test with a command.`]);
      if (command.repo !== repoOf(gated)) throw new Refused([`This test runs in ${command.repo}; this key is for ${repoOf(gated)}.`]);
      if (held?.at !== testAt || JSON.stringify(command.argv) !== JSON.stringify(argv)) throw new Refused(['This test changed after the runner read it, so this result is not for it. Run it again.']);
      return { id: `run:${randomUUID()}`, kind: 'run', by: 'repo', replaces: null, body: { of: test, result, stage: 'check', evidence, sha, committedAt, surface: command.surface, subject: command.subject } };
    });
    return reply({ recorded: record.id });
  } catch (error) {
    return failed(error);
  }
}
