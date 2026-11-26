// The one sidebar of a book, drawn once by the book's layout. It is given what it shows and reads nothing itself:
// the brand and day/night; the book you are in, as a switcher; Now (the overview, what waits on you, the work in motion, the diary);
// the product's chapters, each opening to its entries (the features under it and its slides), one open at a time;
// the research library by folder; and keeping watch (production and the agents). Where you are is marked by the links.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { assetsOn, folderTree, researchOf } from '../../../lib/book/assets';
import { formOf } from '../../../lib/book/asset-types';
import { deliversProduct } from '../../../lib/book/study';
import { type Current, type FeatureNode, featureTree, readingList } from '../../../lib/book/views';
import { wordsOf } from '../../../lib/book/vocabulary';
import { href } from '../../../lib/routes';
import { Label } from '../parts/section';
import { type BookEntry, BookSwitcher } from './book-switcher';
import { BrandMark } from './brand-mark';
import { ChapterSync } from './chapter-sync';
import { Count } from './count';
import { NavItem } from './nav-item';
import { NavIcon, NavLabel, WaitsDot } from './nav-parts';
import styles from './sidebar.module.css';
import { ThemeToggle } from './theme-toggle';

/** The features under which some paper waits on the editor. */
function waitingFeatures(now: Current): Set<string> {
  return new Set(readingList(now).filter((r) => r.state.status === 'waiting').map((r) => r.feature.id));
}

export function Sidebar({ book, now, books, waiting, disagreements, open }: {
  book: string; now: Current; books: BookEntry[]; waiting: number; disagreements: number; open: string | null;
}) {
  const words = wordsOf(now);
  const waits = waitingFeatures(now);
  const holds = (n: FeatureNode): boolean => waits.has(n.id) || n.children.some(holds);
  const item = (n: FeatureNode, kind: 'top' | 'plain') => (
    <NavItem to={href.feature(book, n.id)} match="within" kind={kind}>
      <span>{n.body.title}</span>
      {holds(n) && <WaitsDot />}
    </NavItem>
  );
  // A feature's slides and documents, as entries under it, beside the features under it.
  const assets = (n: FeatureNode): ReactNode => {
    const list = assetsOn(now, n.id);
    return list.length > 0 && (
      <div key={`${n.id}:assets`} className={styles.kids}>
        {list.map((a) => (
          <NavItem key={a.id} to={href.asset(book, a.id)}>
            <NavIcon name={formOf(a.body) === 'slides' ? 'slides' : 'file'} /><NavLabel>{a.body.title}</NavLabel>
          </NavItem>
        ))}
      </div>
    );
  };
  const feature = (n: FeatureNode): ReactNode => (
    <div key={n.id} className={styles.kids}>{item(n, 'plain')}{n.children.map(feature)}{assets(n)}</div>
  );
  const chapter = (n: FeatureNode): ReactNode => {
    const entries = [...n.children.map(feature), assets(n)].filter(Boolean);
    if (!entries.length) return <div key={n.id}>{item(n, 'top')}</div>;
    return (
      <details key={n.id} name={`chapters-${book}`} data-chapter={n.id} open={open === n.id} className={styles.chapter}>
        <summary className={styles.summary} aria-label={`${n.body.title}: show or hide its entries`}>
          <span className={styles.head}>{item(n, 'top')}</span>
          <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
        </summary>
        {entries}
      </details>
    );
  };
  const research = researchOf(now);
  return (
    <aside className={styles.side} aria-label="The book">
      <div className={styles.brandRow}>
        <Link href={href.books()} className={styles.brand}><BrandMark /> Galley</Link>
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
        <ChapterSync book={book}>{featureTree(now).map(chapter)}</ChapterSync>
      </section>
      <section className={styles.section} aria-label="Research">
        <div className={styles.heading}><Label as="h2" tone="canvas" gap="none">Research</Label></div>
        <NavItem to={href.research(book)}><NavIcon name="research" /><NavLabel>The library</NavLabel><Count n={research.length} /></NavItem>
        {folderTree(research).map((f) => (
          <div key={f.path} className={styles.kids}><NavItem to={href.research(book, { folder: f.path })}><NavLabel>{f.name}</NavLabel></NavItem></div>
        ))}
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
