// A repository's reviewer says a piece of work goes beyond its feature's approved papers. The book records it under
// that repository's name, and only for work the repository has commits on.
import { randomUUID } from 'node:crypto';
import { failed, forBook, gate, jsonOf, reply, repoOf } from '../../../lib/server/local-route';
import { write } from '../../../lib/write';

type Posted = { book: string; work: string; text: string };

export async function POST(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const body = await jsonOf<Posted>(request);
  if (body instanceof Response) return body;
  const { book, work, text } = body;
  const refused = forBook(gated, String(book));
  if (refused) return refused;
  try {
    const record = await write(String(book), { id: `beyond:${randomUUID()}`, kind: 'beyond', by: 'repo', replaces: null, body: { work, raisedBy: 'reviewer', text, repo: repoOf(gated) } });
    return reply({ recorded: record.id });
  } catch (error) {
    return failed(error);
  }
}
