// How the book writes dates and states for people, in one place. Dates are read in the book's time zone (the editor's), so
// a time and its day always agree with lib/book/days.ts.
import { BOOK_TIME_ZONE } from './days';

const at = (value: string) => new Date(value.length === 10 ? `${value}T12:00:00+05:30` : value);
const fmt = (options: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('en-GB', { ...options, timeZone: BOOK_TIME_ZONE });
  return (value: string) => f.format(at(value));
};

/** "19 November" */
export const dayLong = fmt({ day: 'numeric', month: 'long' });
/** "19 November 2026" */
export const dayFull = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
/** "19 Nov 2026" */
export const dayShort = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
/** "19 Nov" */
export const dayBrief = fmt({ day: 'numeric', month: 'short' });
/** "Thursday 19 November" */
export const dayNamed = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
/** "Thu 19 Nov, 18:10" */
export const dateTime = fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
/** "19 November, 18:10" */
export const dayTime = fmt({ day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
/** "18:10" */
export const timeOfDay = fmt({ hour: '2-digit', minute: '2-digit' });
/** "November 2026" */
export const monthYear = fmt({ month: 'long', year: 'numeric' });

export const STATE_WORDS = { done: 'done', now: 'under way', next: 'next' } as const;
/** A step of a plan, as a chapter's grid names it (the editor's words for their trial stories). */
export const STEP_WORDS = { done: 'done', now: 'in progress', next: 'not started' } as const;
/** A step no piece of work has been planned for yet. */
export const NOT_PLANNED = 'Not planned yet';
/** The first letter raised: "in progress" → "In progress". */
export const raise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const SERVED_WORDS = { yes: 'Served you', partly: 'Partly served you', no: 'Did not serve you yet' } as const;
export const LEVEL_WORDS = { low: 'Low', medium: 'Medium', high: 'High' } as const;
/** A paper's answer, as a person reads it. */
export const PAPER_STATUS_WORDS = { waiting: 'Waiting on you', approved: 'Approved', changes: 'Changes asked', missing: '' } as const;
/** How two pieces of work relate, read from each end: [from the one that links, from the one linked to]. */
export const LINK_WORDS = {
  'came-from': ['Came from', 'Led to this'],
  'depends-on': ['Depends on', 'Waits on this'],
  'leads-to': ['Leads to', 'Came from this'],
  touches: ['Touches', 'Touched by'],
  serves: ['Serves the goal', 'Served by'],
  'proves-promise': ['Proves the promise', 'Proven by'],
} as const;
