// One row of the inbox's list: bold until read, tagged by what it needs. A message's row and the reading list's row
// share this shape.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { dayOf } from '../../../lib/book/days';
import { dayBrief, timeOfDay } from '../../../lib/book/format';
import styles from './row.module.css';

/** Today's messages show their time; older ones their day. */
const when = (iso: string) => (dayOf(iso) === dayOf(Date.now()) ? timeOfDay(iso) : dayBrief(iso));

export function Row({ href, unread, selected, from, at, subject, snip, chips, keepScroll = true }: {
  keepScroll?: boolean; href: string; unread: boolean; selected: boolean; from: string; at: string; subject: string; snip: string; chips: ReactNode;
}) {
  const bold = unread ? styles.bold : '';
  return (
    <Link href={href} className={`${styles.row} ${selected ? styles.sel : styles.plain}`} scroll={!keepScroll}>
      <i className={`${styles.dot} ${unread ? styles.unread : ''}`} />
      <span className={`${styles.from} ${bold}`}>{from}</span>
      <span className={styles.time}>{when(at)}</span>
      <span className={`${styles.subject} ${bold}`}>{subject}</span>
      <span className={styles.snip}>{snip}</span>
      <span className={styles.chips}>{chips}</span>
    </Link>
  );
}
