import { permanentRedirect } from 'next/navigation';
import { href } from '../../../lib/routes';

/** An earlier address, kept working: this page now lives elsewhere in the book. */
export default async function Moved({ params, searchParams }: { params: Promise<{ book: string }>; searchParams: Promise<{ f?: string }> }) {
  const { book } = await params;
  const { f } = await searchParams;
  permanentRedirect(`${href.agents(book, 'explain')}${f ? `?f=${encodeURIComponent(f)}` : ''}`);
}
