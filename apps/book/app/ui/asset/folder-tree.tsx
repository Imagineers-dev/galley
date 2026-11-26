// A section's folders, nested as their paths are, each a link showing how many documents it holds; the folder you
// are in is marked. The folders are the ones the section's agent made: the section itself is reached by its name.
import Link from 'next/link';
import type { Folder } from '../../../lib/book/assets';
import { href } from '../../../lib/routes';
import styles from './folder-tree.module.css';

export function FolderTree({ book, section, folders, on, tag }: { book: string; section: string; folders: Folder[]; on?: string; tag?: string }) {
  const link = (label: string, count: number, folder: string) => (
    <Link className={folder === on ? `${styles.folder} ${styles.on}` : styles.folder} href={href.section(book, section, { folder, tag })} aria-current={folder === on ? 'page' : undefined}>
      <span>{label}</span><span className={styles.count}>{count}</span>
    </Link>
  );
  const branch = (list: Folder[]) => (
    <ul className={styles.list}>
      {list.map((f) => <li key={f.path}>{link(f.name, f.count, f.path)}{f.children.length > 0 && branch(f.children)}</li>)}
    </ul>
  );
  return (
    <nav aria-label="Folders">{branch(folders)}</nav>
  );
}
