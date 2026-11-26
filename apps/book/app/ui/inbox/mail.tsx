// The inbox's frame: the rail of folders, the list of messages and the reading pane, as columns that each scroll on
// their own. The columns are drawn here; what sits in them belongs to the rail, the list and the pane.
import { ReaderOnly } from '../parts/sheet';
import type { ReactNode } from 'react';
import { Meta } from '../parts/text';
import styles from './mail.module.css';

export function Mail({ open, banner, rail, list, pane }: { open: boolean; banner?: ReactNode; rail: ReactNode; list: ReactNode; pane: ReactNode }) {
  return (
    <div className={styles.main}>
      {banner}
      {!open && <ReaderOnly as="h1">What waits on you</ReaderOnly>}
      <div className={`${styles.mail} ${open ? styles.open : styles.closed}`}>
        <nav className={styles.rail} aria-label="Folders and needs">{rail}</nav>
        <section className={styles.list}>{list}</section>
        <div className={styles.pane}>{pane}</div>
      </div>
    </div>
  );
}

/** The reading pane when no message is open. */
export function MailNone({ any }: { any: boolean }) {
  return (
    <section className={styles.none}>
      <p className={styles.noneText}>{any ? 'Choose a message to read it.' : 'All clear.'}</p>
      <Meta>j and k move between messages; e archives.</Meta>
    </section>
  );
}
