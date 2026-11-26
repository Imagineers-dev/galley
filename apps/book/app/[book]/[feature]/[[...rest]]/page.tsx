import { notFound, permanentRedirect } from 'next/navigation';
import { loadBook } from '../../../../lib/load';
import { href } from '../../../../lib/routes';

/**
 * A feature's earlier address, kept working: /<book>/<feature>/… moved to /<book>/f/<feature>/…. Only a feature
 * the book holds is sent on; anything else here (a mistyped address, junk under a page such as /<book>/inbox/x)
 * is not found, so no permanent redirect points nowhere. The segments arrive still encoded and are passed on as
 * they are.
 */
export default async function MovedFeature({ params }: { params: Promise<{ book: string; feature: string; rest?: string[] }> }) {
  const { book, feature, rest } = await params;
  const { now } = await loadBook(book);
  if (now.get(`feature:${decodeURIComponent(feature)}`)?.kind !== 'feature') notFound();
  permanentRedirect(`${href.book(book)}/f/${[feature, ...(rest ?? [])].join('/')}`);
}
