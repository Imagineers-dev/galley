// One level of the sidebar's tree, and every level under it. An entry with entries under it is a native <details>:
// its row (a link) and a chevron that opens or closes it. Siblings share a name, so one is open at a time, and a
// closed entry hides its entries from tab and screen reader alike. Server-side: it is given its rows and draws them.
import type { ReactNode } from 'react';
import styles from './nav-tree.module.css';

export type NavNode = { key: string; label: string; row: ReactNode; children: NavNode[] };

export function NavTree({ nodes, open, group, nested = false }: { nodes: NavNode[]; open: Set<string>; group: string; nested?: boolean }) {
  return (
    <div className={nested ? styles.kids : undefined}>
      {nodes.map((n) => (n.children.length === 0 ? <div key={n.key}>{n.row}</div> : (
        <details key={n.key} name={group} data-node={n.key} open={open.has(n.key)} className={styles.node}>
          <summary className={styles.summary} aria-label={`${n.label}: show or hide what is under it`}>
            <span className={styles.head}>{n.row}</span>
            <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
          </summary>
          <NavTree nodes={n.children} open={open} group={`${group}>${n.key}`} nested />
        </details>
      )))}
    </div>
  );
}
