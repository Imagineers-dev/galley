import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { assetsOn } from '../../lib/book/assets';
import { navCookie, openEntries } from '../../lib/book/nav-open';
import { featureTree } from '../../lib/book/views';
import { loadBook } from '../../lib/load';
import type { ReactNode } from 'react';
import { bookFrameOf } from '../../lib/server/book-frame';
import { AppShell } from '../ui/shell/app-shell';
import { LiveRefresh } from '../ui/shell/live-refresh';
import { Sidebar } from '../ui/shell/sidebar';

/**
 * Every page of a book: the book's one sidebar, drawn once here with what was left open, and the page in the rounded
 * panel beside it, kept current as the book changes.
 */
export default async function BookLayout({ params, children }: { params: Promise<{ book: string }>; children: ReactNode }) {
  const { book } = await params;
  const frame = await bookFrameOf(book);
  if (!frame.now.get('project')) notFound();
  const { asOf } = await loadBook(book);
  // At first, the first chapter with entries is open; after that, what the reader left open.
  const first = featureTree(frame.now).find((n) => n.children.length > 0 || assetsOn(frame.now, n.id).length > 0)?.id;
  const open = openEntries((await cookies()).get(navCookie(book))?.value, first);
  const sidebar = <Sidebar book={book} now={frame.now} books={frame.books} waiting={frame.waiting} disagreements={frame.stand.disagreements.length} open={open} />;
  return <AppShell sidebar={sidebar}><LiveRefresh book={book} past={!!asOf} />{children}</AppShell>;
}
