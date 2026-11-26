import { dayShort } from '../../../lib/book/format';
import { measures } from '../../../lib/book/pulse';
import { Card } from '../parts/card';
import { Label } from '../parts/section';
import { Flow } from '../parts/sheet';
import { Empty } from '../parts/text';
import { Spark } from './spark';
import styles from './watch.module.css';
import { WatchSection } from './watch-section';

import type { Current } from '../../../lib/book/views';

/** The live pulse: each measure of the running product over time against its limit. Breaches go to the inbox and diary. */
export function PulseSection({ now }: { now: Current }) {
  const list = measures(now);
  return (
    <WatchSection id="pulse" title="The live pulse" lede="Health and cost of the running product, against their limits. A reading over its limit comes to your inbox and the day's diary.">
      {list.length === 0 && <Empty>No readings yet. Agents and checks record them with <code>book_pulse</code>.</Empty>}
      <Flow>
        {list.map((m) => (
          <Card key={m.key} tone={m.breach ? 'event' : 'plain'}>
            <Label>{m.part}</Label>
            <h3 className={styles.nameSmall}>{m.measure}</h3>
            <p className={styles.big}>{m.latest.body.value}<span className={styles.unit}> {m.unit}</span></p>
            <Spark values={m.readings.map((r) => r.body.value)} line={m.latest.body.limit} bad={m.breach} />
            <p className={styles.fact}>{m.latest.body.limit !== undefined ? `Limit ${m.latest.body.limit} ${m.unit} · ` : ''}{dayShort(m.latest.firstAt)} · {m.readings.length} readings</p>
            {m.latest.body.note && <p className={styles.note}>{m.latest.body.note}</p>}
          </Card>
        ))}
      </Flow>
    </WatchSection>
  );
}
