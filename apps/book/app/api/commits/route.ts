// A repository's post-commit hook reports each commit that names a piece of work.
import { failed, forBook, gate, jsonOf, ownRepo, reply } from '../../../lib/server/local-route';
import { write } from '../../../lib/write';

type Commit = { book: string; work: string; repo: string; sha: string; subject: string; committedAt: string };

export async function POST(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const body = await jsonOf<Commit>(request);
  if (body instanceof Response) return body;
  const { book, work, repo, sha, subject, committedAt } = body;
  const refused = forBook(gated, String(book));
  if (refused) return refused;
  // A repository records only its own commits: other rules trust commit:<repo>:… to say who changed the work.
  const notOwn = ownRepo(gated, repo);
  if (notOwn) return notOwn;
  try {
    const record = await write(String(book), { id: `commit:${repo}:${sha}`, kind: 'commit', by: 'repo', replaces: null, body: { work, repo, sha, subject, committedAt } });
    return reply({ recorded: record.id });
  } catch (error) {
    return failed(error);
  }
}
