// An asset's tags, each a link to its section showing every document with that tag. Without a section (inside a
// card, itself a link, which may not hold another) they are plain words.
import Link from 'next/link';
import { href } from '../../../lib/routes';
import styles from './asset-tags.module.css';

export function AssetTags({ book, section, tags, on }: { book: string; section?: string; tags?: string[]; on?: string }) {
  if (!tags?.length) return null;
  return (
    <ul className={styles.tags} aria-label="Tags">
      {tags.map((t) => (
        <li key={t}>
          {!section ? <span className={t === on ? `${styles.tag} ${styles.on}` : styles.tag}>{t}</span>
            : <Link className={t === on ? `${styles.tag} ${styles.on}` : styles.tag} href={href.section(book, section, { tag: t })}>{t}</Link>}
        </li>
      ))}
    </ul>
  );
}
