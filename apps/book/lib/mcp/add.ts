// The two things every MCP tool file needs: read a book as it is now, and add one record to it.
import { type Current, currentOf } from '../book/views';
import type { Proposed } from '../rules/check';
import { readCurrent } from '../store/records';
import { Refused, write, writeFrom } from '../write';

/** A book as it stands now. */
export const load = async (book: string): Promise<Current> => currentOf(await readCurrent(book));

/** Adds one record. `replaces` names a record this one takes the place of. */
export const add = (book: string, kind: Proposed['kind'], id: string, by: string, body: object, replaces?: string) =>
  write(book, { id, kind, by, replaces: replaces ?? null, body: body as Record<string, unknown> });

/** Writes a new version of a record from its latest one, inside the book's write queue, so no change is lost. */
export const revise = (
  book: string,
  kind: Proposed['kind'],
  id: string,
  by: string,
  change: (old: Record<string, unknown>, now: Current) => object,
  replaces?: string,
) =>
  writeFrom(book, (now) => {
    const old = now.get(id);
    if (!old || old.kind !== kind) throw new Refused([`No ${kind} "${id}".`]);
    return { id, kind, by, replaces: replaces ?? old.replaces, body: change(old.body, now) as Record<string, unknown> };
  });
