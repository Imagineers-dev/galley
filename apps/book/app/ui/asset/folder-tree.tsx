// The research library's folders, nested as their paths are, each a link showing how many documents it holds. The
// folder you are in is marked; "Everything" is the whole library.
import Link from 'next/link';
import type { Folder } from '../../../lib/book/assets';
import { href } from '../../../lib/routes';
import styles from './folder-tree.module.css';

export function FolderTree({ book, folders, total, on, tag }: { book: string; folders: Folder[]; total: number; on?: string; tag?: string }) {
  const link = (label: string, count: number, folder?: string) => (
    <Link className={folder === on ? `${styles.folder} ${styles.on}` : styles.folder} href={href.research(book, { folder, tag })} aria-current={folder === on ? 'page' : undefined}>
      <span>{label}</span><span className={styles.count}>{count}</span>
    </Link>
  );
  const branch = (list: Folder[]) => (
    <ul className={styles.list}>
      {list.map((f) => <li key={f.path}>{link(f.name, f.count, f.path)}{f.children.length > 0 && branch(f.children)}</li>)}
    </ul>
  );
  return (
    <nav aria-label="Folders">
      {link('Everything', total)}
      {branch(folders)}
    </nav>
  );
}
