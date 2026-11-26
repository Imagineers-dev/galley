// The production watch reports what it saw of a part ("Worker (API)", "Website") where it runs. The book ties the
// result to that part's latest release there from the same repository, so the work it carried can read it.
import { latestRelease } from '../../../lib/book/live';
import { failed, forBook, gate, jsonOf, refuse, reply, repoOf } from '../../../lib/server/local-route';
import { Refused, writeAll } from '../../../lib/write';

type Posted = { book: string; part: string; where: string; result: string };

export async function POST(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const body = await jsonOf<Posted>(request);
  if (body instanceof Response) return body;
  const { book, part, where, result } = body;
  const refused = forBook(gated, String(book));
  if (refused) return refused;
  if (result !== 'pass' && result !== 'fail') return refuse(400, 'A watch result is "pass" or "fail".');
  if (typeof where !== 'string' || !where) return refuse(400, 'Say where the watched part runs (where), e.g. "production".');
  const repo = repoOf(gated);
  try {
    // Unchanged results are not written again, so a watch every few minutes does not grow the book.
    const [record] = await writeAll(String(book), (now) => {
      const release = latestRelease(now, String(part), repo, where);
      if (!release) throw new Refused([`No release of "${String(part)}" to ${where} from ${repo} is recorded, so there is nothing to attach this watch to.`]);
      const id = `watch:${release.id}`;
      if (now.get(id)?.body.result === result) return [];
      return [{ id, kind: 'watch', by: 'repo', replaces: null, body: { release: release.id, result } }];
    });
    return reply({ recorded: record?.id ?? null });
  } catch (error) {
    return failed(error);
  }
}
