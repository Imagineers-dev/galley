// The frame of one page inside a book: the banner when reading an earlier day, the trail from the book to where
// you are, the page itself, and an optional rail beside it. The sidebar belongs to the book's layout.
import type { ReactNode } from 'react';
import type { Current } from '../../lib/book/views';
import { loadBook } from '../../lib/load';
import { href } from '../../lib/routes';
import { AsOfBanner } from './as-of';
import styles from './frame.module.css';
import { Breadcrumbs, type Crumb } from './shell/breadcrumbs';

export async function Frame({ book, now, trail = [], aside, rail, children }: {
  book: string; now: Current; trail?: Crumb[]; aside?: ReactNode; rail?: ReactNode; children: ReactNode;
}) {
  const { asOf } = await loadBook(book);
  const title = String(now.get('project')?.body.title ?? book);
  return (
    <div className={rail ? `${styles.page} ${styles.withRail}` : styles.page}>
      <div className={styles.body}>
        {asOf && <AsOfBanner asOf={asOf} />}
        <Breadcrumbs trail={[{ label: title, to: href.book(book) }, ...trail]} aside={aside} />
        {children}
      </div>
      {rail && <aside className={styles.rail} aria-label="Your reading">{rail}</aside>}
    </div>
  );
}
