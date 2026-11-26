// The one sidebar of a book, drawn once by the book's layout. It is given what it shows and reads nothing itself:
// the brand and day/night; the book you are in, as a switcher; Now (the overview, what waits on you, the work in motion, the diary);
// the product's features; and keeping watch (production and the agents). Where you are is marked by the links.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { deliversProduct } from '../../../lib/book/study';
import { type Current, type FeatureNode, featureTree, readingList } from '../../../lib/book/views';
import { wordsOf } from '../../../lib/book/vocabulary';
import { href } from '../../../lib/routes';
import { Label } from '../parts/section';
import { type BookEntry, BookSwitcher } from './book-switcher';
import { Count } from './count';
import { NavItem } from './nav-item';
import { NavIcon, NavLabel, WaitsDot } from './nav-parts';
import styles from './sidebar.module.css';
import { ThemeToggle } from './theme-toggle';

/** The features under which some paper waits on the editor. */
function waitingFeatures(now: Current): Set<string> {
  return new Set(readingList(now).filter((r) => r.state.status === 'waiting').map((r) => r.feature.id));
}

export function Sidebar({ book, now, books, waiting, disagreements }: {
  book: string; now: Current; books: BookEntry[]; waiting: number; disagreements: number;
}) {
  const words = wordsOf(now);
  const waits = waitingFeatures(now);
  const holds = (n: FeatureNode): boolean => waits.has(n.id) || n.children.some(holds);
  const feature = (n: FeatureNode): ReactNode => (
    <div key={n.id} className={n.depth === 0 ? undefined : styles.kids}>
      <NavItem to={href.feature(book, n.id)} match="within" kind={n.depth === 0 ? 'top' : 'plain'}>
        <span>{n.body.title}</span>
        {holds(n) && <WaitsDot />}
      </NavItem>
      {n.children.map(feature)}
    </div>
  );
  return (
    <aside className={styles.side} aria-label="The book">
      <div className={styles.brandRow}>
        <Link href={href.books()} className={styles.brand}><i className={styles.mark} /> Galley</Link>
        <ThemeToggle />
      </div>
      <BookSwitcher book={book} books={books} />
      <nav className={styles.now} aria-label="Now">
        <div className={styles.heading}><Label tone="canvas" gap="none">Now</Label></div>
        <NavItem to={href.book(book)} kind="primary"><NavIcon name="stand" /><NavLabel>Overview</NavLabel><Count n={disagreements} tone="event" label="Where the book and the world disagree" /></NavItem>
        <NavItem to={href.inbox(book)} kind="primary"><NavIcon name="inbox" /><NavLabel>Waiting on you</NavLabel><Count n={waiting} tone="waiting" /></NavItem>
        <NavItem to={href.inMotion(book)} kind="primary"><NavIcon name="motion" /><NavLabel>{words.inMotion}</NavLabel></NavItem>
        <NavItem to={href.diary(book)} kind="primary"><NavIcon name="diary" /><NavLabel>Diary</NavLabel></NavItem>
      </nav>
      <section className={styles.section} aria-label={words.features}>
        <div className={styles.heading}><Label as="h2" tone="canvas" gap="none">{words.features}</Label></div>
        {featureTree(now).map(feature)}
      </section>
      {deliversProduct(now) && (
        <section className={`${styles.section} ${styles.quiet}`} aria-label="Keeping watch">
          <div className={styles.heading}><Label as="h2" tone="canvas" gap="none">Keeping watch</Label></div>
          <NavItem to={href.production(book)}>Production</NavItem>
          <NavItem to={href.agents(book)} match="within">The agents</NavItem>
        </section>
      )}
    </aside>
  );
}
