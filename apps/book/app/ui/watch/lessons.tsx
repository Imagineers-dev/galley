import { dayShort } from '../../../lib/book/format';
import { lessons } from '../../../lib/book/lessons';
import { Card } from '../parts/card';
import { Quote } from '../parts/quote';
import { Label } from '../parts/section';
import { Flow } from '../parts/sheet';
import { type Status, StatusPill } from '../parts/status';
import { Empty } from '../parts/text';
import styles from './watch.module.css';
import { WatchSection } from './watch-section';

import type { Current } from '../../../lib/book/views';

/** Kept since (done), broken once (under way: watched, not yet yours), broken twice (went wrong: it comes to you). */
const kept = (slips: number, flagged: boolean): Status => (slips === 0 ? 'done' : flagged ? 'event' : 'underway');

/** Lessons that stick: each correction as a rule, where it came from, the areas it covers, and every time it was broken. */
export function LessonsSection({ now }: { now: Current }) {
  const list = lessons(now);
  return (
    <WatchSection id="lessons" title="Lessons that stick" lede="What you corrected once, kept as a rule agents read before they work. A lesson broken twice comes to you." count={`${list.length} ${list.length === 1 ? 'lesson' : 'lessons'}`}>
      {list.length === 0 && <Empty>No lessons yet. Agents record one with <code>book_lesson</code> whenever you correct them.</Empty>}
      <Flow>
        {list.map(({ lesson, slips, flagged }) => (
          <Card key={lesson.id} tone={flagged ? 'event' : 'plain'}>
            <Label>{lesson.body.areas.join(' · ')}</Label>
            <h3 className={styles.nameSmall}>{lesson.body.rule}</h3>
            <p className={styles.note}>{lesson.body.why}</p>
            {'words' in lesson.body.from && <Quote text={lesson.body.from.words} who={`You, ${dayShort(lesson.body.from.saidOn)}`} />}
            <p className={styles.chips}>
              <StatusPill status={kept(slips.length, flagged)}>{slips.length === 0 ? 'Kept since' : `Broken ${slips.length === 1 ? 'once' : `${slips.length} times`}`}</StatusPill>
            </p>
            {slips.length > 0 && <ul className={styles.list}>{slips.map((s) => <li key={s.id}>{dayShort(s.firstAt)}: {s.body.text}</li>)}</ul>}
          </Card>
        ))}
      </Flow>
    </WatchSection>
  );
}
