// Where a piece of work stands, for a repository's gates: does it exist, the state of its own editor papers (which
// the old rule reads), and what the one governing rule decides (`effective`). With ?text=1 it also gives each paper's
// text and the governing text, for a reviewer who must read the spec and plan before the diff.
import { gateAnswer } from '../../../../../lib/book/gate-answer';
import { currentOf } from '../../../../../lib/book/views';
import { forBook, gate, reply } from '../../../../../lib/server/local-route';
import { readCurrent } from '../../../../../lib/store/records';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ book: string; id: string }> }) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const { book: rawBook, id } = await params;
  const book = decodeURIComponent(rawBook);
  const refused = forBook(gated, book);
  if (refused) return refused;
  const withText = new URL(request.url).searchParams.get('text') === '1';
  const answer = gateAnswer(currentOf(await readCurrent(book)), decodeURIComponent(id), withText);
  return answer ? reply(answer) : reply({ exists: false }, 404);
}
