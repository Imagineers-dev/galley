// The editor writes a document from the website: a new one in a section or on a feature, or a new version of one. A
// plain form posts here. Only the editor, from this site, today; every redirect stays on this site. With sign-in off
// (lib/server/session.ts), whoever opens the book on this machine is the editor.
import { MAX_WRITTEN_BYTES, writeDocument } from '../../../../lib/attach';
import { safeBack } from '../../../../lib/book/links';
import { asOf } from '../../../../lib/load';
import { href, isBookName } from '../../../../lib/routes';
import { reasonsOf } from '../../../../lib/server/errors';
import { isEditor } from '../../../../lib/server/session';

export const dynamic = 'force-dynamic';

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
/** After a form post, the browser is sent on with a GET (303), to a path on the host it used. */
const go = (to: string) => new Response(null, { status: 303, headers: { Location: to } });
const back = (to: string, reason: string) => `${to}${to.includes('?') ? '&' : '?'}${new URLSearchParams({ write: reason })}`;

export async function POST(request: Request, { params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  if (!isBookName(book)) return new Response('Not found', { status: 404 });
  const site = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  if ((site && site !== 'same-origin') || (origin && origin !== new URL(request.url).origin && origin !== `http://${request.headers.get('host')}`)) {
    return new Response('Another site cannot write in the book.', { status: 403 });
  }
  if (!(await isEditor())) return go(href.signIn(href.book(book)));
  if (Number(request.headers.get('content-length') ?? 0) > MAX_WRITTEN_BYTES * 2) return go(href.book(book));
  const form = await request.formData();
  const here = safeBack(text(form, 'here'), href.book(book));
  if (await asOf()) return go(here); // nothing is written into the past
  const document = text(form, 'document') || undefined;
  const tags = text(form, 'tags').split(',').map((t) => t.trim()).filter(Boolean);
  try {
    const record = await writeDocument(book, 'editor', {
      asset: document,
      title: text(form, 'title') || undefined,
      format: text(form, 'format') === 'html' ? 'html' : 'markdown',
      text: String(form.get('text') ?? ''),
      place: text(form, 'feature') ? { feature: text(form, 'feature') }
        : form.has('section') && !document ? { section: text(form, 'section'), folder: text(form, 'folder'), tags } : undefined,
    });
    return go(href.asset(book, record.id));
  } catch (error) {
    return go(back(here, reasonsOf(error).join(' ')));
  }
}
