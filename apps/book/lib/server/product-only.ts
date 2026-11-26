// The pages only a product book has: production, the agents, papers, tests and reviews. A study book has none of them,
// so an address that reaches one (the book switcher keeps the page you are on) goes to what the study book has instead.
import { redirect } from 'next/navigation';
import { deliversProduct } from '../book/study';
import type { Current } from '../book/views';
import { href } from '../routes';

export function productOnly(now: Current, book: string, instead: string = href.book(book)) {
  if (!deliversProduct(now)) redirect(instead);
}
