// Beside a paper: every editor paper in book order, the one open marked, each with where their answer stands.
import Link from 'next/link';
import { PAPER_NAMES } from '../../../lib/book/types';
import type { Reading } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { Label } from '../parts/section';
import styles from './reading-rail.module.css';

const RING = { missing: styles.ringPlain, waiting: styles.ringWaiting, approved: styles.ringApproved, changes: styles.ringChanges } as const;

export function ReadingRail({ book, list, open }: { book: string; list: Reading[]; open: string }) {
  return (
    <>
      <Label>Your reading, in book order</Label>
      {list.map((r) => (
        <Link key={r.paper.id} href={href.paperOf(book, r.paper.body)} className={`${styles.item} ${r.paper.id === open ? styles.on : ''}`} aria-current={r.paper.id === open ? 'page' : undefined}>
          <span className={`${styles.ring} ${RING[r.state.status]}`} />
          <span>
            {r.title} · {PAPER_NAMES[r.paper.body.kind].name}
            {r.history && <span className={styles.history}> (history)</span>}
          </span>
        </Link>
      ))}
    </>
  );
}
