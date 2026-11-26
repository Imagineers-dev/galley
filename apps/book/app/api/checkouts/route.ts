// A repository reports its checkout when someone picks up the work: head, unpushed, uncommitted, what live runs.
import type { Checkout } from '../../../lib/book/record-types';
import { failed, forBook, gate, jsonOf, ownRepo, reply } from '../../../lib/server/local-route';
import { write } from '../../../lib/write';

export async function POST(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const parsed = await jsonOf<Checkout & { book: string }>(request);
  if (parsed instanceof Response) return parsed;
  const { book, ...body } = parsed;
  const refused = forBook(gated, String(book)) ?? ownRepo(gated, body.repo);
  if (refused) return refused;
  try {
    const record = await write(String(book), { id: `checkout:${body.repo}`, kind: 'checkout', by: 'repo', replaces: null, body });
    return reply({ recorded: record.id });
  } catch (error) {
    return failed(error);
  }
}
