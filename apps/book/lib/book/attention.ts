// What asks for one person's attention in one book, worked out once. Every count the editor sees (the overview,
// the sidebar and the book switcher, the inbox, the diary, the pick-up) and every agent tool reads this, so a
// number means the same thing everywhere. Pure: a book's current records in, attention out.
import { type Message, messagesOf, waitingOn } from './inbox';
import type { Needs, Person } from './inbox-types';
import type { Current } from './views';

/** The papers waiting for the person's approval, read as one list in reading order. */
export type ReadingList = { papers: Message[]; at: string };

export type Attention = {
  /** Every message for the person in this book, newest first, filed (inbox, snoozed, answered, archived). */
  messages: Message[];
  /** What waits on the person and asks something of them other than reading a paper: decisions, tries, notes. */
  asks: Message[];
  /** The papers waiting for approval, or null when none waits. Counts once, however many papers it holds. */
  readingList: ReadingList | null;
  /** What went wrong and is still in the inbox. Told, not asked: not part of the count. */
  wrong: Message[];
  /** Snoozed until a later day: out of the count until they come back. */
  snoozed: Message[];
  /** How many things wait on the person: each ask, plus one for the reading list. */
  count: number;
  /** What waits, by what it needs, each paper on its own: what the inbox's filters show. */
  byNeed: Record<Needs, number>;
};

/** A waiting paper's short name for a list ("Why for “Goals”"), without the inbox subject's "Approve: ". */
export const paperTitle = (paper: Message) => paper.subject.replace(/^Approve: /, '');

export function attentionOf(book: string, now: Current, person: Person, day: string): Attention {
  const messages = messagesOf(book, now, person, day);
  const waiting = waitingOn(messages);
  const asks = waiting.filter((m) => m.needs !== 'approval');
  const papers = waiting.filter((m) => m.needs === 'approval');
  const readingList = papers.length ? { papers, at: papers.reduce((latest, m) => (m.at > latest ? m.at : latest), papers[0].at) } : null;
  const wrong = messages.filter((m) => m.folder === 'inbox' && m.needs === 'wrong');
  const snoozed = messages.filter((m) => m.folder === 'snoozed');
  const byNeed = { decision: 0, approval: 0, try: 0, fyi: 0, wrong: wrong.length };
  for (const m of messages) if (m.folder === 'inbox' && m.needs !== 'wrong') byNeed[m.needs] += 1;
  return { messages, asks, readingList, wrong, snoozed, count: asks.length + (readingList ? 1 : 0), byNeed };
}
