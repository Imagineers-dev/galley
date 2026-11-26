import { skills } from '../../../lib/book/evals';
import { dayShort } from '../../../lib/book/format';
import { Card } from '../parts/card';
import { Label } from '../parts/section';
import { Flow } from '../parts/sheet';
import { StatusPill } from '../parts/status';
import { Empty, Meta } from '../parts/text';
import { Spark } from './spark';
import styles from './watch.module.css';
import { WatchSection } from './watch-section';

import type { Current } from '../../../lib/book/views';

/** How good the agents are: each skill's eval score over time, with drift marked before a user meets it. */
export function QualitySection({ now }: { now: Current }) {
  const list = skills(now);
  return (
    <WatchSection id="quality" title="How good the agents are" lede="Each skill's evals over time. A skill whose latest run falls below its usual level is marked, so drift shows before a user sees it.">
      {list.length === 0 && <Empty>No eval runs recorded yet. Agents record each run with <code>book_eval</code>.</Empty>}
      <Flow>
        {list.map((s) => (
          <Card key={s.skill} tone={s.drift ? 'event' : 'plain'}>
            <Label>{s.latest.body.suite}</Label>
            <h3 className={styles.name}>{s.skill}</h3>
            <p className={styles.big}>{s.latest.body.score.toFixed(1)}<span className={styles.unit}>/10</span></p>
            <Spark values={s.runs.map((r) => r.body.score)} line={s.usual ?? undefined} bad={s.drift} />
            <p className={styles.fact}>{s.latest.body.passed} of {s.latest.body.cases} cases · {dayShort(s.latest.firstAt)}{s.latest.body.sha ? <> · <code>{s.latest.body.sha.slice(0, 9)}</code></> : null}</p>
            {s.drift && <p className={styles.chips}><StatusPill status="event">Below its usual {s.usual?.toFixed(1)}</StatusPill></p>}
            <Meta>{s.runs.length} {s.runs.length === 1 ? 'run' : 'runs'}{s.runs.some((r) => r.body.incident) ? ` · ${s.runs.filter((r) => r.body.incident).length} from incidents` : ''}</Meta>
          </Card>
        ))}
      </Flow>
    </WatchSection>
  );
}
