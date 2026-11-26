// One day of the diary: the date, its headline, one row per piece of work it moved, what went wrong, and what is next.
// What the book recorded that day stays folded into one quiet line. Older days collapse to a single line.
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { DayView } from '../../../lib/book/diary';
import { byWork } from '../../../lib/book/diary-now';
import { weekdayOf } from '../../../lib/book/days';
import { dayBrief } from '../../../lib/book/format';
import { href } from '../../../lib/routes';
import { Label } from '../parts/section';
import { StatusDot, statusOf } from '../parts/status';
import { InTheBook } from './record';
import styles from './day.module.css';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHOWN_LINES = 3;

export function Month({ month, children }: { month: string; children: ReactNode }) {
  return (
    <section>
      <div className={styles.month}><Label as="h2" gap="none">{month}</Label></div>
      {children}
    </section>
  );
}

function Lines({ lines }: { lines: string[] }) {
  return <ul className={styles.list}>{lines.map((t) => <li key={t} className={styles.item}>{t}</li>)}</ul>;
}

function Row({ state, name, lines }: { state: string; name: ReactNode; lines: string[] }) {
  return (
    <div className={styles.row}>
      <span className={styles.mark}><StatusDot status={statusOf(state)} /></span>
      <div>
        {name}
        <Lines lines={lines.slice(0, SHOWN_LINES)} />
        {lines.length > SHOWN_LINES && (
          <details><summary className={styles.fold}>{lines.length - SHOWN_LINES} more</summary><Lines lines={lines.slice(SHOWN_LINES)} /></details>
        )}
      </div>
    </div>
  );
}

export function DayFull({ book, day }: { book: string; day: DayView }) {
  const wrong = day.recorded.filter((r) => r.kind === 'event');
  return (
    <article className={styles.day} id={`day-${day.day}`}>
      <div className={styles.date}>
        <span className={styles.number}>{Number(day.day.slice(8))}</span>
        <span className={styles.weekday}>{WEEKDAYS[weekdayOf(day.day)]}</span>
      </div>
      <div>
        <h3 className={styles.head}>{day.headline ?? 'No headline was written for this day.'}</h3>
        {byWork(day.done).map((g) => (
          <Row
            key={g.id}
            state={g.state ?? 'none'}
            lines={g.lines}
            name={g.id !== 'other' ? <Link className={styles.workLink} href={href.work(book, g.id)}>{g.name}</Link> : null}
          />
        ))}
        {wrong.map((w) => <Row key={w.text} state="wrong" lines={[w.text]} name={<span className={styles.work}>Went wrong</span>} />)}
        {day.next.length > 0 && <Row state="next" lines={day.next.map((l) => l.text)} name={<span className={styles.work}>Next</span>} />}
        <InTheBook book={book} recorded={day.recorded.filter((r) => r.kind !== 'work')} />
      </div>
    </article>
  );
}

export function DayLine({ day }: { day: DayView }) {
  const states = [...new Set(day.done.map((l) => l.work?.state ?? 'none'))];
  return (
    <a className={styles.line} id={`day-${day.day}`} href={`#day-${day.day}`}>
      <span className={styles.lineDate}>{dayBrief(day.day)}</span>
      <span className={styles.lineHead}>{day.headline ?? `${day.recorded.length} things recorded`}</span>
      <span className={styles.dots}>{states.map((s) => <StatusDot key={s} status={statusOf(s)} />)}</span>
    </a>
  );
}
