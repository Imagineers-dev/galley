// A section of a watch page: its title, what it is for, an optional count, and its content.
import type { ReactNode } from 'react';
import { Section } from '../parts/section';
import styles from './watch-section.module.css';

export function WatchSection({ id, title, lede, count, children }: { id: string; title: string; lede: string; count?: string; children: ReactNode }) {
  return (
    <div className={styles.watch}>
      <Section variant="title" id={id} title={title} lede={lede} count={count}><div className={styles.content}>{children}</div></Section>
    </div>
  );
}
