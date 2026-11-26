// The editor attaches a file from the website: slides to a feature, or a document to a section. A plain
// form posts here (a route, not a server action, so a 20 MB file raises no limit for every other action). Only a
// signed-in editor, from this site, today; every redirect stays on this site.
import { attach } from '../../../../lib/attach';
import { MAX_FILE_BYTES } from '../../../../lib/book/asset-types';
import { safeBack } from '../../../../lib/book/links';
import { asOf } from '../../../../lib/load';
import { href, isBookName } from '../../../../lib/routes';
import { reasonsOf } from '../../../../lib/server/errors';
import { isEditor } from '../../../../lib/server/session';

export const dynamic = 'force-dynamic';

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
/** After a form post, the browser is sent on with a GET (303), to a path on the host it used (so its sign-in goes too). */
const go = (to: string) => new Response(null, { status: 303, headers: { Location: to } });
const back = (to: string, query: Record<string, string>) => `${to}${to.includes('?') ? '&' : '?'}${new URLSearchParams(query)}`;

export async function POST(request: Request, { params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  if (!isBookName(book)) return new Response('Not found', { status: 404 });
  const site = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  if ((site && site !== 'same-origin') || (origin && origin !== new URL(request.url).origin && origin !== `http://${request.headers.get('host')}`)) {
    return new Response('Another site cannot attach files to the book.', { status: 403 });
  }
  // Who is sending, and how much, are settled before the body is read.
  if (!(await isEditor())) return go(href.signIn(href.book(book)));
  if (Number(request.headers.get('content-length') ?? 0) > MAX_FILE_BYTES + 64 * 1024) return go(href.book(book));
  const form = await request.formData();
  const here = safeBack(text(form, 'here'), href.book(book));
  if (await asOf()) return go(here); // nothing is added to the past
  const file = form.get('file');
  const asset = text(form, 'asset') || undefined;
  if (!(file instanceof File) || !file.size) return go(back(here, { attach: 'Choose a file to attach.' }));
  const folder = text(form, 'folder');
  const tags = text(form, 'tags').split(',').map((t) => t.trim()).filter(Boolean);
  try {
    const record = await attach(book, 'editor', {
      asset,
      title: text(form, 'title') || (asset ? undefined : file.name.replace(/\.[^.]+$/, '')),
      about: text(form, 'about') || undefined,
      slides: form.get('slides') === 'on' || undefined,
      place: text(form, 'feature') ? { feature: text(form, 'feature') } : form.has('section') ? { section: text(form, 'section'), folder, tags } : undefined,
      file: { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
    });
    return go(href.asset(book, record.id));
  } catch (error) {
    return go(back(here, { attach: reasonsOf(error).join(' ') }));
  }
}
