import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { bookFrameOf } from '../../lib/server/book-frame';
import { AppShell } from '../ui/shell/app-shell';
import { Sidebar } from '../ui/shell/sidebar';

/** Every page of a book: the book's one sidebar, drawn once here, and the page in the rounded panel beside it. */
export default async function BookLayout({ params, children }: { params: Promise<{ book: string }>; children: ReactNode }) {
  const { book } = await params;
  const frame = await bookFrameOf(book);
  if (!frame.now.get('project')) notFound();
  const sidebar = <Sidebar book={book} now={frame.now} books={frame.books} waiting={frame.waiting} disagreements={frame.stand.disagreements.length} />;
  return <AppShell sidebar={sidebar}>{children}</AppShell>;
}
