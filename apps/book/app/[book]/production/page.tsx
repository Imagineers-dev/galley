import { notFound } from 'next/navigation';
import { loadBook } from '../../../lib/load';
import { productOnly } from '../../../lib/server/product-only';
import { Frame } from '../../ui/frame';
import { PageHead, Sheet } from '../../ui/parts/sheet';
import { LiveSection } from '../../ui/watch/live';
import { PulseSection } from '../../ui/watch/pulse';
import { RisksSection } from '../../ui/watch/risks';

export const dynamic = 'force-dynamic';

/** Production, in one place: what is live and how to undo it, what could go wrong, and how the running product is doing. */
export default async function ProductionPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const { now } = await loadBook(book);
  productOnly(now, book);
  if (!now.get('project')) notFound();
  return (
    <Frame book={book} now={now} trail={[{ label: 'Production' }]}>
      <Sheet>
        <PageHead eyebrow="Keeping watch" title="Production" lede="What is running and the commit it came from, what could go wrong, and how the product is doing against its limits." />
        <LiveSection now={now} />
        <RisksSection book={book} now={now} />
        <PulseSection now={now} />
      </Sheet>
    </Frame>
  );
}
