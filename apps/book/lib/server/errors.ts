// What a caller is told when something fails. A refusal says why in the book's words; anything else is logged here
// with a short id, and the caller hears only that id, never the internals (queries, paths, stack traces).
import { randomUUID } from 'node:crypto';
import { Refused } from '../write';

export function reasonsOf(error: unknown): string[] {
  if (error instanceof Refused) return error.reasons;
  const id = randomUUID().slice(0, 8);
  console.error(`[book error ${id}]`, error);
  return [`The book could not do that (error ${id}; the details are in the book's log).`];
}
