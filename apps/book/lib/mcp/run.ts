// Shared plumbing for the book's MCP tools: who is calling and which books their key may write, and how answers
// and refusals are returned. A tool names its writer with `as(x, book)`, which refuses a book outside the key.
import { z } from 'zod';
import { isBookName } from '../routes';
import { reasonsOf } from '../server/errors';
import { Refused } from '../write';

export type Extra = { authInfo?: { clientId?: string; extra?: { books?: string[]; mayStart?: boolean } } };

/** The agent writing to `book`, as the book records it; refused when its key does not cover that book. */
export function as(extra: Extra, book: string): string {
  const books = extra.authInfo?.extra?.books ?? [];
  if (!books.includes(book)) throw new Refused([`Your key is not for the "${book}" book.`]);
  return `agent:${extra.authInfo?.clientId ?? 'unknown'}`;
}

/** The agent starting `book`: its key must allow starting books, and the name must follow the book-name rule. */
export function starting(extra: Extra, book: string): string {
  if (!extra.authInfo?.extra?.mayStart) throw new Refused(['Your key may not start a book.']);
  if (!isBookName(book)) throw new Refused([`"${book}" is not a book name: lower-case letters, digits and hyphens, and not a page's name.`]);
  return `agent:${extra.authInfo?.clientId ?? 'unknown'}`;
}

export async function run(task: () => Promise<unknown>) {
  try {
    return { content: [{ type: 'text' as const, text: JSON.stringify(await task(), null, 2) }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text' as const, text: `Refused:\n- ${reasonsOf(error).join('\n- ')}` }] };
  }
}

export const book = z.string().describe('The project, e.g. "example-app".');
export const day = z.string().describe('A date, YYYY-MM-DD');
export const origin = z
  .union([
    z.object({ words: z.string(), saidOn: day }).describe("The editor's words, quoted, and the day"),
    z.object({ work: z.string() }).describe('An earlier piece of work, by id'),
    z.object({ event: z.string() }).describe('Something that happened, by event id'),
  ])
  .describe('How this work began. Required.');
export const verdict = z
  .object({ served: z.enum(['yes', 'partly', 'no']), words: z.string().optional() })
  .describe('Whether it served its users, and why');
