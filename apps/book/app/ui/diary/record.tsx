// What the book recorded on a day, folded into one quiet line ("In the book: 2 decisions · 3 commits") that opens to
// the list, decisions first, each marked by its kind and linked to where it lives.
import Link from 'next/link';
import type { Recorded } from '../../../lib/book/diary';
import { href } from '../../../lib/routes';
import styles from './day.module.css';

type Kept = Exclude<Recorded['kind'], 'work'>;
const KIND: Record<Kept, readonly [string, string]> = {
  decision: ['decision', 'decisions'], approval: ['approval', 'approvals'], commit: ['commit', 'commits'], event: ['thing went wrong', 'things went wrong'],
};
const MARK: Record<Recorded['kind'], string> = { decision: styles.decision, approval: styles.approval, commit: styles.commit, event: styles.event, work: '' };

function summary(recorded: Recorded[]) {
  return (Object.keys(KIND) as Kept[])
    .map((k) => ({ k, n: recorded.filter((r) => r.kind === k).length }))
    .filter((c) => c.n > 0)
    .map((c) => `${c.n} ${KIND[c.k][c.n === 1 ? 0 : 1]}`)
    .join(' · ');
}

function recordedHref(book: string, r: Recorded) {
  if (r.href?.decision) return href.decision(book, r.href.decision);
  if (r.href?.work) return href.work(book, r.href.work);
  if (r.href?.feature) return href.feature(book, r.href.feature);
  return undefined;
}

export function InTheBook({ book, recorded }: { book: string; recorded: Recorded[] }) {
  const line = summary(recorded);
  if (!line) return null;
  const ordered = [...recorded].sort((a, b) => (a.kind === 'decision' ? -1 : b.kind === 'decision' ? 1 : 0));
  return (
    <details className={styles.record}>
      <summary className={styles.fold}>In the book: {line}</summary>
      <ul className={styles.list}>
        {ordered.map((r, i) => {
          const to = recordedHref(book, r);
          return <li key={`${r.kind}-${i}`} className={`${styles.recorded} ${MARK[r.kind]}`}>{to ? <Link href={to}>{r.text}</Link> : r.text}</li>;
        })}
      </ul>
    </details>
  );
}
