// The book's days. A day is a date in the book's time zone (the editor's, from Galley's settings), so "today", the
// diary's days, snoozes and "as of" all turn over at the editor's midnight, not at UTC's. Every day is worked out here.
import { TIME_ZONE } from '../../bin/galley-config.mjs';

export const BOOK_TIME_ZONE: string = TIME_ZONE;

const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: BOOK_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** The book's day (YYYY-MM-DD) on which an instant falls. */
export const dayOf = (iso: string | number | Date) => dateParts.format(new Date(iso));

/** The day `n` days after `day` (calendar arithmetic, no time zone involved). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Minutes the book's zone is ahead of UTC at an instant. */
function offsetMinutes(at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: BOOK_TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(at)
      .map((x) => [x.type, Number(x.value)]),
  );
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - at.getTime() + at.getMilliseconds()) / 60_000;
}

/** The last instant (ISO, UTC) of a book's day: what "the book as it stood at the end of that day" reads up to. */
export function endOfDay(day: string): string {
  const nextMidnightUtc = Date.parse(`${addDays(day, 1)}T00:00:00Z`);
  const offset = offsetMinutes(new Date(nextMidnightUtc));
  return new Date(nextMidnightUtc - offset * 60_000 - 1).toISOString();
}

/** 0 for Monday … 6 for Sunday: the book's weeks start on Monday. */
export const weekdayOf = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;

export const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
