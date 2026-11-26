// The one sidebar of a book, drawn once by the book's layout. It is given what it shows and reads nothing itself:
// the brand and day/night; the book you are in, as a switcher; Now (the overview, what waits on you, the work in motion, the diary);
// the product's chapters and each section's folders, as a tree that opens and closes at every depth (one sibling open
// at a time, as it was left);
// each section beside the product (Research, and any the book defines), its title a link to it and its folders and
// documents as its agent filed them; and keeping watch (production and the agents). Where you are is marked by the links.
import Link from 'next/link';
import type { Asset } from '../../../lib/book/asset-types';
import { type Folder, assetsOn, documentsIn, folderTree } from '../../../lib/book/assets';
import { folderKey } from '../../../lib/book/nav-open';
import { sectionsOf } from '../../../lib/book/sections';
import { formOf } from '../../../lib/book/asset-types';
import { deliversProduct } from '../../../lib/book/study';
import { type Current, type Entry, type FeatureNode, featureTree, readingList } from '../../../lib/book/views';
import { wordsOf } from '../../../lib/book/vocabulary';
import { href } from '../../../lib/routes';
import { Label } from '../parts/section';
import { type BookEntry, BookSwitcher } from './book-switcher';
import { BrandMark } from './brand-mark';
import { Count } from './count';
import { NavItem } from './nav-item';
import { NavIcon, NavLabel, WaitsDot } from './nav-parts';
import { NavSync } from './nav-sync';
import { type NavNode, NavTree } from './nav-tree';
import styles from './sidebar.module.css';
import { ThemeToggle } from './theme-toggle';

/** The features under which some paper waits on the editor. */
function waitingFeatures(now: Current): Set<string> {
  return new Set(readingList(now).filter((r) => r.state.status === 'waiting').map((r) => r.feature.id));
}

export function Sidebar({ book, now, books, waiting, disagreements, open }: {
  book: string; now: Current; books: BookEntry[]; waiting: number; disagreements: number; open: Set<string>;
}) {
  const words = wordsOf(now);
  const waits = waitingFeatures(now);
  const holds = (n: FeatureNode): boolean => waits.has(n.id) || n.children.some(holds);
  // A feature, at any depth: the features under it, then its slides and documents.
  const feature = (n: FeatureNode): NavNode => ({
    key: n.id, label: n.body.title,
    row: (
      <NavItem to={href.feature(book, n.id)} match="within" kind={n.depth === 0 ? 'top' : 'plain'}>
        <span>{n.body.title}</span>
        {holds(n) && <WaitsDot />}
      </NavItem>
    ),
    children: [...n.children.map(feature), ...assetsOn(now, n.id).map(document)],
  });
  // A slide deck or document, where it was filed.
  const document = (a: Entry<Asset>): NavNode => ({
    key: a.id, label: a.body.title, children: [],
    row: <NavItem to={href.asset(book, a.id)}><NavIcon name={formOf(a.body) === 'slides' ? 'slides' : 'file'} /><NavLabel>{a.body.title}</NavLabel></NavItem>,
  });
  // A section's folder, at any depth, as its agent made it: the folders inside it, then the documents filed in it.
  const folder = (section: string, docs: Entry<Asset>[]) => (f: Folder): NavNode => ({
    key: folderKey(section, f.path), label: f.name,
    children: [...f.children.map(folder(section, docs)), ...docs.filter((d) => d.body.folder === f.path).map(document)],
    row: <NavItem to={href.section(book, section, { folder: f.path })}><NavLabel>{f.name}</NavLabel></NavItem>,
  });
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
      <NavSync book={book}>
      <section className={styles.section} aria-label={words.features}>
        <div className={styles.heading}><Label as="h2" tone="canvas" gap="none">{words.features}</Label></div>
        <NavTree nodes={featureTree(now).map(feature)} open={open} group="nav" />
      </section>
      {sectionsOf(now).map((section) => {
        const docs = documentsIn(now, section.slug);
        return (
          <section key={section.slug} className={styles.section} aria-label={section.title}>
            <div className={styles.heading}>
              <Label as="h2" tone="canvas" gap="none"><Link href={href.section(book, section.slug)} className={styles.headingLink}>{section.title}</Link></Label>
            </div>
            <NavTree open={open} group={`nav>${section.slug}`}
              nodes={[...folderTree(docs).map(folder(section.slug, docs)), ...docs.filter((d) => !d.body.folder).map(document)]} />
          </section>
        );
      })}
      </NavSync>
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
