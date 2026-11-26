// A repository attaches a file (`galley attach`): slides to a feature, or a document to a section, or a
// new version of one already there (asset). The file comes as base64 in JSON, like every repository call; the book
// decides its type and hash from the bytes.
import { attach } from '../../../lib/attach';
import { failed, forBook, gate, jsonOf, refuse, reply } from '../../../lib/server/local-route';

export const dynamic = 'force-dynamic';

type Attach = {
  book: string; asset?: string; title?: string; slug?: string; about?: string; slides?: boolean;
  feature?: string; section?: string; folder?: string; tags?: string[]; informs?: string[]; name?: string; data?: string;
};

const strings = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : undefined);
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

export async function POST(request: Request) {
  const gated = await gate(request);
  if (gated instanceof Response) return gated;
  const body = await jsonOf<Attach>(request);
  if (body instanceof Response) return body;
  const refused = forBook(gated, String(body.book));
  if (refused) return refused;
  if ((body.data === undefined) !== (body.name === undefined)) return refuse(422, 'A file comes with both its name and its data (base64).');
  if (body.data !== undefined && !/^[A-Za-z0-9+/]*={0,2}$/.test(body.data)) return refuse(422, 'data is the file in base64.');
  const place = str(body.feature) ? { feature: str(body.feature) } : str(body.section) !== undefined || str(body.folder) !== undefined || body.tags || body.informs
    ? { section: str(body.section), folder: str(body.folder), tags: strings(body.tags), informs: strings(body.informs) } : undefined;
  try {
    const record = await attach(String(body.book), 'repo', {
      asset: str(body.asset), title: str(body.title), slug: str(body.slug), about: str(body.about),
      slides: typeof body.slides === 'boolean' ? body.slides : undefined, place,
      file: body.data !== undefined ? { name: String(body.name), bytes: new Uint8Array(Buffer.from(body.data, 'base64')) } : undefined,
    });
    return reply({ attached: record.id, file: record.body.file });
  } catch (error) {
    return failed(error);
  }
}
