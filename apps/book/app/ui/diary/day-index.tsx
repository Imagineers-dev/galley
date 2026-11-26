// The index of days: every day the diary holds, by month, newest first, each a link to its entry. A day something
// went wrong carries the went-wrong dot. It sits beside the days, on a wide screen only.
import type { DayView } from '../../../lib/book/diary';
import { weekdayOf } from '../../../lib/book/days';
import { Label } from '../parts/section';
import { StatusDot } from '../parts/status';
import styles from './day-index.module.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DayIndex({ months }: { months: { month: string; days: DayView[] }[] }) {
  return (
    <nav className={styles.index} aria-label="Days">
      {months.map((m) => (
        <section key={m.month} className={styles.month}>
          <Label gap="none">{m.month}</Label>
          <ul className={styles.days}>
            {m.days.map((d) => (
              <li key={d.day}>
                <a className={styles.day} href={`#day-${d.day}`} title={d.headline ?? undefined}>
                  {Number(d.day.slice(8))} {WEEKDAYS[weekdayOf(d.day)]}
                  {d.recorded.some((r) => r.kind === 'event') && <StatusDot status="event" label="Something went wrong" />}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
