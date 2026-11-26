// The year at a glance, as GitHub draws it: one square per day for the last 53 weeks, darker where more happened.
// Colour comes from the book's own records and from git history; days before the book began are drawn as
// "not recorded", so a pale square there never reads as "no work". The squares share the column's width: weeks are
// implicit columns of equal width, and the month labels sit one per week above them, so both rows line up.
import type { YearCell } from '../../../lib/book/diary';
import { dayFull } from '../../../lib/book/format';
import type { Words } from '../../../lib/book/vocabulary';
import { Label } from '../parts/section';
import { Meta } from '../parts/text';
import styles from './year.module.css';

type Year = { cells: YearCell[]; bookStart: string; recordedDays: number; commitDays: number; commits: number };
const LEVEL: Record<YearCell['level'], string> = { 0: styles.l0, 1: styles.l1, 2: styles.l2, 3: styles.l3, 4: styles.l4 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function tip(c: YearCell) {
  const parts = [dayFull(c.day)];
  if (c.commits) parts.push(`${c.commits} ${c.commits === 1 ? 'commit' : 'commits'} (git history)`);
  if (c.recorded) parts.push(`${c.recorded} recorded in the book`);
  if (!c.commits && !c.recorded) parts.push(c.beforeBook ? 'before the book began' : 'nothing recorded');
  return parts.join(' · ');
}

function Cell({ c }: { c: YearCell }) {
  const cls = `${styles.cell} ${c.beforeBook && c.level === 0 ? styles.before : LEVEL[c.level]} ${c.recorded ? styles.ringed : ''}`;
  return c.recorded ? <a href={`#day-${c.day}`} className={cls} title={tip(c)} /> : <span className={cls} title={tip(c)} />;
}

export function YearHeat({ year, line }: { year: Year; line: Words['yearLine'] }) {
  const { cells } = year;
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, w) => cells.slice(w * 7, w * 7 + 7).find((c) => c.day.endsWith('-01')));
  return (
    <section className={styles.year}>
      <div className={styles.top}>
        <Label>The year</Label>
        <Meta as="span">{line({ commits: year.commits, commitDays: year.commitDays, began: dayFull(year.bookStart), recordedDays: year.recordedDays })}</Meta>
      </div>
      <div className={styles.body}>
        <div className={styles.months}>{weeks.map((first, w) => <span key={w}>{first ? MONTHS[Number(first.day.slice(5, 7)) - 1] : ''}</span>)}</div>
        <div className={styles.weekdays}><span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /></div>
        <div className={styles.grid}>{cells.map((c) => <Cell key={c.day} c={c} />)}</div>
      </div>
      <div className={styles.key}>
        <span className={styles.keyPart}><i className={`${styles.swatch} ${styles.l2} ${styles.ringed}`} /> ringed: a day in this diary</span>
        <span className={styles.keyPart}>Less {([0, 1, 2, 3, 4] as const).map((l) => <i key={l} className={`${styles.swatch} ${LEVEL[l]}`} />)} More</span>
      </div>
    </section>
  );
}
