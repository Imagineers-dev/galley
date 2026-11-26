// Adding to the book. Every write to a book goes through that book's one queue: it reads the book as it is now,
// checks the rules, stamps a time later than anything the book holds, and appends. Two writes to one book never
// interleave, so a rule never passes against a book that has already changed. Website actions and MCP tools both
// come through here. The book runs as one server process; the queue lives on globalThis so every route shares it.
import type { BookRecord } from './book/types';
import { changed } from './changes';
import { type Current, currentOf } from './book/views';
import { type Proposed, refusals } from './rules/check';
import { isBookName } from './routes';
import { appendAll, latestAt, readCurrent } from './store/records';

export class Refused extends Error {
  constructor(readonly reasons: string[]) {
    super(reasons.join('\n'));
  }
}

/**
 * Invariant: one process writes to a book. The lane's clock is seeded once from the book's latest time and then
 * kept in memory; a second writing process could stamp the same millisecond. If the book ever runs as several
 * instances, writes must move behind one writer first (a recorded decision, not a quiet change).
 */
type Lane = { tail: Promise<unknown>; lastAt: number | null };
const lanes: Map<string, Lane> = ((globalThis as { __bookLanes?: Map<string, Lane> }).__bookLanes ??= new Map());

/** Runs `work` after every earlier write to this book has finished, and before any later one starts. */
function inLane<T>(book: string, work: (lane: Lane) => Promise<T>): Promise<T> {
  const lane = lanes.get(book) ?? { tail: Promise.resolve(), lastAt: null };
  lanes.set(book, lane);
  const run = lane.tail.then(() => work(lane));
  lane.tail = run.catch(() => undefined);
  return run;
}

/** A time strictly after the book's last record, so the book's order is the order things were written. */
async function nextAt(book: string, lane: Lane): Promise<string> {
  if (lane.lastAt === null) {
    const last = await latestAt(book);
    lane.lastAt = last ? Date.parse(last) : 0;
  }
  lane.lastAt = Math.max(Date.now(), lane.lastAt + 1);
  return new Date(lane.lastAt).toISOString();
}

/**
 * Writes the records that `build` makes from the book as it stands at that moment, inside the book's queue: all of them
 * in one insert, or none if any is refused.
 */
export function writeAll(book: string, build: (now: Current) => Proposed[]): Promise<BookRecord[]> {
  if (!isBookName(book)) return Promise.reject(new Refused([`"${book}" is not a book name: lower-case letters, digits and hyphens, and not a page's name.`]));
  return inLane(book, async (lane) => {
    const now = currentOf(await readCurrent(book));
    const proposed = build(now);
    if (proposed.some((p) => p.kind !== 'project') && !now.get('project')) {
      throw new Refused([`There is no book "${book}". Start it with a project record first.`]);
    }
    const reasons = proposed.flatMap((p) => refusals(now, p));
    if (reasons.length) throw new Refused(reasons);
    const records: BookRecord[] = [];
    for (const p of proposed) records.push({ ...p, book, at: await nextAt(book, lane) });
    await appendAll(records);
    if (records.length) changed(book, records[records.length - 1].at);
    return records;
  });
}

/** Writes one record made from the book as it stands: a new version that keeps the old fields. Plain writes use `write`. */
export const writeFrom = (book: string, build: (now: Current) => Proposed): Promise<BookRecord> =>
  writeAll(book, (now) => [build(now)]).then(([record]) => record);

export const write = (book: string, proposed: Proposed) => writeFrom(book, () => proposed);

/** Starts a book: refused inside the book's queue when it already exists, so two starts never both succeed. */
export const start = (book: string, proposed: Proposed) =>
  writeFrom(book, (now) => {
    if (now.get('project')) throw new Refused(['This book already exists; a book is started once.']);
    return proposed;
  });

/** Adds a new record: refused when its id is already in the book, so adding again never overwrites what is there. */
export const create = (book: string, proposed: Proposed | ((now: Current) => Proposed), update: string) =>
  writeFrom(book, (now) => {
    const record = typeof proposed === 'function' ? proposed(now) : proposed;
    if (now.get(record.id)) throw new Refused([`"${record.id}" is already in this book. To change it, use ${update}.`]);
    return record;
  });
