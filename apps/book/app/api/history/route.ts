// A repository's git history, a day at a time: how many commits were made each day. Writing the same day again
// gives a new version, so re-importing is safe.
import { failed, forBook, gate, jsonOf, ownRepo, refuse, reply } from '../../../lib/server/local-route';
import { write } from '../../../lib/write';

type Day = { day: string; commits: number };

export async function POST(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const parsed = await jsonOf<{ book: string; repo: string; days: Day[] }>(request);
  if (parsed instanceof Response) return parsed;
  const { book, repo, days } = parsed;
  if (!Array.isArray(days)) return refuse(400, 'Send the days as [{ day, commits }].');
  const refused = forBook(gated, String(book)) ?? ownRepo(gated, repo);
  if (refused) return refused;
  let written = 0;
  try {
    for (const d of days) {
      await write(String(book), { id: `history:${repo}:${d.day}`, kind: 'history', by: 'repo', replaces: null, body: { repo, day: d.day, commits: d.commits } });
      written += 1;
    }
    return reply({ written });
  } catch (error) {
    return failed(error, { written });
  }
}
