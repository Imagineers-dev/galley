// An asset's tags, each a link to the research library showing every document with that tag; inside a card (itself a
// link) they are plain words, since a link may not hold another.
import Link from 'next/link';
import { href } from '../../../lib/routes';
import styles from './asset-tags.module.css';

export function AssetTags({ book, tags, on, plain = false }: { book: string; tags?: string[]; on?: string; plain?: boolean }) {
  if (!tags?.length) return null;
  return (
    <ul className={styles.tags} aria-label="Tags">
      {tags.map((t) => (
        <li key={t}>
          {plain ? <span className={t === on ? `${styles.tag} ${styles.on}` : styles.tag}>{t}</span>
            : <Link className={t === on ? `${styles.tag} ${styles.on}` : styles.tag} href={href.research(book, { tag: t })}>{t}</Link>}
        </li>
      ))}
    </ul>
  );
}
