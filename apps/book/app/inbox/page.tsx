import { permanentRedirect } from 'next/navigation';
import { href, isBookName } from '../../lib/routes';

/**
 * The inbox's earlier address, kept working: `?m=<book>~<id>` opens that message in its book, `?b=<book>` that book's
 * inbox, and anything else the list of books. Agents' messages and papers already hold these links.
 */
export default async function OldInbox({ searchParams }: { searchParams: Promise<{ b?: string; m?: string }> }) {
  const { b, m } = await searchParams;
  const book = (m?.includes('~') ? m.slice(0, m.indexOf('~')) : b) ?? '';
  if (!isBookName(book)) permanentRedirect(href.books());
  permanentRedirect(m?.includes('~') ? href.message(book, m.slice(m.indexOf('~') + 1)) : href.inbox(book));
}
