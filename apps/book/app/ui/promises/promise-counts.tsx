// How many of a feature's promises stand in each state: a tile each, on its page and on the feature's page.
import { PROMISE_GROUPS, type PromiseCounts as Counts } from '../../../lib/book/promises';
import type { PromiseState } from '../../../lib/book/promise-status';
import { Card, type CardTone } from '../parts/card';
import { Label } from '../parts/section';
import styles from './promises.module.css';

const toneOf = (state: PromiseState, count: number): CardTone => (count === 0 ? 'plain' : state === 'broken' ? 'event' : state === 'proven' ? 'done' : 'plain');

export function PromiseCounts({ counts }: { counts: Counts }) {
  return (
    <div className={styles.tiles}>
      {PROMISE_GROUPS.map((g) => (
        <Card key={g.state} flat tone={toneOf(g.state, counts[g.state])}>
          <span className={styles.figure}>{counts[g.state]}</span>
          <Label as="span" gap="none">{g.title}</Label>
        </Card>
      ))}
    </div>
  );
}
