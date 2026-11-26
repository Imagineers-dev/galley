'use client';
// The book you are in, and every other book with what waits on you there. Choosing a book opens the same kind of
// page in it (its diary, its inbox, its production), or its overview when the page belongs to this book alone.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { href } from '../../../lib/routes';
import styles from './book-switcher.module.css';
import { Label } from '../parts/section';
import { Count } from './count';

export type BookEntry = { book: string; title: string; waiting: number };

/** The pages every book has, by the first part of their address under the book. */
const SHARED = new Set(['inbox', 'diary', 'production', 'agents']);

export function BookSwitcher({ book, books }: { book: string; books: BookEntry[] }) {
  const path = usePathname();
  // The part of the address after the book (`agents/lessons`), kept when that page is one every book has.
  const [, , page = '', ...more] = path.split('/');
  const kept = SHARED.has(page) ? [page, ...(page === 'agents' ? more : [])].join('/') : '';
  const current = books.find((b) => b.book === book);
  return (
    <details className={styles.switch}>
      <summary className={styles.summary}>
        <Label as="span" tone="canvas" gap="none">Book</Label>
        <span className={styles.title} title={current?.title ?? book}>{current?.title ?? book}</span>
        {books.length > 1 && <i className={styles.mark} aria-hidden>⌄</i>}
      </summary>
      <div className={styles.menu}>
        {books.map((b) => (
          <Link key={b.book} href={kept ? `${href.book(b.book)}/${kept}` : href.book(b.book)} className={`${styles.item} ${b.book === book ? styles.on : ''}`} aria-current={b.book === book ? 'true' : undefined}>
            <span>{b.title}</span>
            <Count n={b.waiting} tone="waiting" label={`${b.waiting} waiting on you`} />
          </Link>
        ))}
      </div>
    </details>
  );
}
