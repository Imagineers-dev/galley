// One paper as a card: its name and where it stands (waiting on you, approved, changes asked) with its length. A paper
// not written yet is a quiet card that says why. Used beside a piece of work and on a feature's page.
import type { ReactNode } from 'react';
import { PAPER_STATUS_WORDS, dayLong } from '../../lib/book/format';
import type { Paper } from '../../lib/book/types';
import { type Entry, type PaperState, minutes } from '../../lib/book/views';
import { Card } from './parts/card';
import styles from './paper-card.module.css';

const TONE = { waiting: 'waiting', approved: 'done', changes: 'plain', missing: 'plain' } as const;

export const PaperCards = ({ across = false, children }: { across?: boolean; children: ReactNode }) =>
  <div className={across ? styles.across : styles.papers}>{children}</div>;

export function PaperCard({ name, paper, state, to, absent }: { name: string; paper?: Entry<Paper>; state: PaperState; to: string; absent: string }) {
  if (!paper) {
    return <Card flat><div className={styles.kind}>{name}</div><div className={styles.state}>{absent}</div></Card>;
  }
  return (
    <Card href={to} tone={TONE[state.status]} flat>
      <div className={styles.kind}>{name}</div>
      <div className={state.status === 'waiting' ? styles.stateWaiting : styles.state}>
        {PAPER_STATUS_WORDS[state.status]}
        {state.at ? ` ${dayLong(state.at)}` : ''} · {minutes(paper.body.text)} min read
      </div>
    </Card>
  );
}
