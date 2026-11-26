import { permanentRedirect } from 'next/navigation';
import { href } from '../../../lib/routes';

/** "Where we stand" now lives on the book's overview. */
export default async function Moved({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  permanentRedirect(`${href.book(book)}#where-we-stand`);
}
