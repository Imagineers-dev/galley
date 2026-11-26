// One piece of work in motion, as a card: its feature, its title, where it stands on its eight stages, and what is next
// for it. The whole card opens the work.
import type { Motion } from '../../../lib/book/diary-now';
import { href } from '../../../lib/routes';
import { Card, CardTitle } from '../parts/card';
import { Label } from '../parts/section';
import { StageTrack } from '../stage-track';
import styles from './motion-card.module.css';

export function MotionCard({ book, m }: { book: string; m: Motion }) {
  return (
    <Card href={href.work(book, m.id)} flat={m.state === 'next'}>
      <span className={styles.card}>
        <Label as="span" gap="none">{m.feature}</Label>
        <CardTitle>{m.title}</CardTitle>
        {m.progress && <span className={styles.more}>{m.progress}</span>}
        {m.steps.length > 0 && <StageTrack stages={m.steps} />}
        {m.next[0] && <span className={styles.next}><b className={styles.nextWord}>Next:</b> {m.next[0]}</span>}
        {m.next.length > 1 && <span className={styles.more}>+{m.next.length - 1} more next</span>}
      </span>
    </Card>
  );
}
