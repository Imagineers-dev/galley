import { redirect } from 'next/navigation';
import { progress } from '../../../lib/book/views';
import { loadBook } from '../../../lib/load';
import { productOnly } from '../../../lib/server/product-only';
import { href } from '../../../lib/routes';

export const dynamic = 'force-dynamic';

/** Continue reading: the first paper, in book order, that waits on the editor. */
export default async function Read({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const { now } = await loadBook(book);
  productOnly(now, book);
  const first = progress(now).toRead[0];
  redirect(first ? href.paperOf(book, first.paper.body) : href.book(book));
}
