// What every page of a book is framed with, read once per request: the other books with their waiting counts, this
// book's count, and where the book stands (its pick-up).
import { cache } from 'react';
import { EDITOR } from '../book/people';
import { pickup } from '../book/pickup';
import { loadBook } from '../load';
import { bookCounts, getAttention } from './attention';
import { today } from './clock';

export const bookFrameOf = cache(async (book: string) => {
  const [{ now }, books, attention] = await Promise.all([loadBook(book), bookCounts(), getAttention(book)]);
  return { now, books, waiting: attention.count, stand: pickup(book, now, EDITOR, today()) };
});
