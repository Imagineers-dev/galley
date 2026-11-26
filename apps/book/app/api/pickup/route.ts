// The pick-up as data, for a repository's script to print right after it reports its checkout.
import { pickup } from '../../../lib/book/pickup';
import { currentOf } from '../../../lib/book/views';
import { EDITOR } from '../../../lib/book/people';
import { today } from '../../../lib/server/clock';
import { forBook, gate, refuse, reply } from '../../../lib/server/local-route';
import { readCurrent } from '../../../lib/store/records';
import { GALLEY_VERSION } from '../../../lib/server/version';

export async function GET(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const book = new URL(request.url).searchParams.get('book') ?? '';
  const refused = forBook(gated, book);
  if (refused) return refused;
  const now = currentOf(await readCurrent(book));
  if (!now.get('project')) return refuse(404, `There is no book "${book}".`);
  return reply({ ...pickup(book, now, EDITOR, today()), galley: GALLEY_VERSION });
}
