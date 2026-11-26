// Loading a book for a request, as it stands or as it stood on the day it is read as of. Addresses live in lib/routes.ts.
import { cookies } from 'next/headers';
import { cache } from 'react';
import { BOOK_TIME_ZONE, endOfDay, isDay } from './book/days';
import { currentOf } from './book/views';
import { days as bookDays, readCurrent } from './store/records';

export const AS_OF_COOKIE = 'book_asof';

/** The day the editor is reading the book as of (YYYY-MM-DD), or null for today. */
export async function asOf(): Promise<string | null> {
  const value = (await cookies()).get(AS_OF_COOKIE)?.value ?? '';
  return isDay(value) ? value : null;
}

/** One book as it stands, or as it stood at the end of the as-of day when one is set. Read once per request. */
export const loadBook = cache(async (book: string) => {
  const day = await asOf();
  const [latest, days] = await Promise.all([readCurrent(book, day ? { asOf: endOfDay(day) } : {}), bookDays(book, BOOK_TIME_ZONE)]);
  return { now: currentOf(latest), asOf: day, days };
});
