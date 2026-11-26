import { permanentRedirect } from 'next/navigation';
import { href } from '../../../lib/routes';

/** An earlier address, kept working: this page now lives elsewhere in the book. */
export default async function Moved({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  permanentRedirect(href.production(book, 'pulse'));
}
