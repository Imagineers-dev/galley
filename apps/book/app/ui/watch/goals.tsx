import { dayShort } from '../../../lib/book/format';
import { goals } from '../../../lib/book/goals';
import { href } from '../../../lib/routes';
import { Card } from '../parts/card';
import { Label } from '../parts/section';
import { Flow } from '../parts/sheet';
import { StatusPill } from '../parts/status';
import { Empty, TextLink } from '../parts/text';
import { Spark } from './spark';
import styles from './watch.module.css';
import { WatchSection } from './watch-section';

import type { Current } from '../../../lib/book/views';

/** Goals and results: each goal's measure over time against its target, and the work serving it; done work with no result since is marked. */
export function GoalsSection({ book, now }: { book: string; now: Current }) {
  const list = goals(now);
  return (
    <WatchSection id="goals" title="Goals and results" lede="What the work is for, measured after it ships, so work that moves nothing shows.">
      {list.length === 0 && <Empty>No goals yet. Agents record them with <code>book_goal</code> once you name them.</Empty>}
      <Flow>
        {list.map((g) => (
          <Card key={g.goal.id} tone={g.serving.some((s) => s.quiet) ? 'event' : 'plain'}>
            <Label>{g.goal.body.measure}{g.goal.body.by ? ` · by ${dayShort(g.goal.body.by)}` : ''}</Label>
            <h3 className={styles.nameSmall}>{g.goal.body.title}</h3>
            <p className={styles.big}>{g.latest ? g.latest.body.value : '—'}<span className={styles.unit}> / {g.goal.body.target} {g.goal.body.unit}</span></p>
            <Spark values={g.results.map((r) => r.body.value)} line={g.goal.body.target} />
            <p className={styles.chips}><StatusPill status={g.met ? 'done' : 'underway'}>{g.met ? 'Met' : g.latest ? 'Not met yet' : 'Not measured yet'}</StatusPill></p>
            {g.serving.length > 0 && (
              <ul className={styles.list}>
                {g.serving.map((s) => <li key={s.work.id}><TextLink href={href.work(book, s.work.id)}>{s.work.body.title}</TextLink>{s.quiet && <> <StatusPill status="event">changed nothing yet</StatusPill></>}</li>)}
              </ul>
            )}
          </Card>
        ))}
      </Flow>
    </WatchSection>
  );
}
