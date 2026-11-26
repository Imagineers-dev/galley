// A repository's review posts its receipt for each piece of work it reviewed, so the work's Review stage can read it.
import { randomUUID } from 'node:crypto';
import type { Receipt } from '../../../lib/book/record-types';
import { slugOf } from '../../../lib/book/types';
import { failed, forBook, gate, jsonOf, reply, repoOf } from '../../../lib/server/local-route';
import { write } from '../../../lib/write';

type Posted = Omit<Receipt, 'repo'> & { book: string };

export async function POST(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const body = await jsonOf<Posted>(request);
  if (body instanceof Response) return body;
  const { book, ...rest } = body;
  const refused = forBook(gated, String(book));
  if (refused) return refused;
  const receipt: Receipt = { ...rest, repo: repoOf(gated) };
  try {
    const id = `receipt:${receipt.repo}:${slugOf(String(receipt.work))}:${receipt.range?.head}:${randomUUID()}`;
    const record = await write(String(book), { id, kind: 'receipt', by: 'repo', replaces: null, body: receipt });
    return reply({ recorded: record.id });
  } catch (error) {
    return failed(error);
  }
}
