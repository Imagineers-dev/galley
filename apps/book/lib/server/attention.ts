// The attention of the editor in a book, read once per request, as the book stands (or as it stood, when the
// editor reads an earlier day). Pages and components read it here; nothing counts on its own.
import { cache } from 'react';
import { type Attention, attentionOf } from '../book/attention';
import { EDITOR } from '../book/people';
import { loadBook } from '../load';
import { books } from '../store/records';
import { today } from './clock';

/** Read as the book stood, on the day it is read as of (so a snooze ends when it ended then), or as it stands today. */
export const getAttention = cache(async (book: string): Promise<Attention> => {
  const { now, asOf } = await loadBook(book);
  return attentionOf(book, now, EDITOR, asOf ?? today());
});

/** Every book with its title and how many things wait on the editor in it: what the book switcher shows. */
export const bookCounts = cache(async () =>
  Promise.all((await books()).map(async (b) => ({ ...b, waiting: (await getAttention(b.book)).count }))),
);
