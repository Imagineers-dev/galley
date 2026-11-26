// Every piece of work in a book, as the gates see each: the old raw paper states, what the governing rule decides,
// and what the done rule would refuse. Read once from one snapshot of the book, so a comparison sees a single moment.
import { gateAnswer } from '../../../../lib/book/gate-answer';
import { promiseGaps } from '../../../../lib/book/promise-gaps';
import type { Work } from '../../../../lib/book/types';
import { currentOf, entries, replacedBy } from '../../../../lib/book/views';
import { forBook, gate, reply } from '../../../../lib/server/local-route';
import { readCurrent } from '../../../../lib/store/records';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ book: string }> }) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const book = decodeURIComponent((await params).book);
  const refused = forBook(gated, book);
  if (refused) return refused;
  const now = currentOf(await readCurrent(book));
  const replaced = replacedBy(now);
  const works = entries<Work>(now, 'work')
    .filter((w) => !replaced.has(w.id))
    .map((w) => ({ id: w.id, ...gateAnswer(now, w.id, false), done: promiseGaps(now, w.id) }));
  return reply({ book, works });
}
