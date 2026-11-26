// The editor's marks on a study book: a tick on a pointer, and "I have it" on a step. Both go through the book's queue.
import { stepChanges, stepsInBook } from '../book/study';
import type { Pointer } from '../book/study-types';
import { tickId } from '../book/study-types';
import { replacedBy } from '../book/views';
import { Refused, writeAll, writeFrom } from '../write';

/** The step or pointer on screen is no longer as it was: nothing is written, and the page says so. */
export class StepChanged extends Refused {
  constructor() {
    super(['This step changed after you opened it. Look again, then mark it.']);
  }
}

export const tickPointer = (book: string, work: string, pointer: string, done: boolean) =>
  writeFrom(book, (now) => {
    const step = now.get(work);
    const held = step?.kind === 'work' && !replacedBy(now).has(work) && ((step.body.pointers ?? []) as Pointer[]).some((p) => p.key === pointer);
    if (!held) throw new StepChanged();
    return { id: tickId(work, pointer), kind: 'tick', by: 'editor', replaces: null, body: { work, pointer, done } };
  });

/** Marks a step done or takes that back, with whatever that changes for the next step, as one write. */
export const markStep = (book: string, work: string, have: boolean) =>
  writeAll(book, (now) => {
    const changes = stepChanges(now, work, have);
    // Already as asked (a second press) is no change and no news; a step no longer in the book is.
    if (!changes.length && !stepsInBook(now).some((s) => s.id === work)) throw new StepChanged();
    return changes.map(({ id, state, startedBy }) => {
      const old = now.get(id);
      if (!old) throw new StepChanged();
      const { startedBy: was, ...rest } = old.body;
      const link = startedBy === null ? undefined : (startedBy ?? was);
      return { id, kind: 'work' as const, by: 'editor', replaces: old.replaces, body: { ...rest, state, ...(link ? { startedBy: link } : {}) } };
    });
  });
