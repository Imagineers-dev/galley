// A piece of work's reviews: each receipt, and the seven questions every review answers.
import { notFound } from 'next/navigation';
import { reviewsOf } from '../../../../../../lib/book/testing';
import type { Work } from '../../../../../../lib/book/types';
import { ids } from '../../../../../../lib/book/types';
import { titleOf } from '../../../../../../lib/book/views';
import { loadBook } from '../../../../../../lib/load';
import { productOnly } from '../../../../../../lib/server/product-only';
import { href } from '../../../../../../lib/routes';
import { Frame } from '../../../../../ui/frame';
import { Section } from '../../../../../ui/parts/section';
import { Eyebrow, Sheet } from '../../../../../ui/parts/sheet';
import { Meta } from '../../../../../ui/parts/text';
import { Questions, Receipt } from '../../../../../ui/work/review';
import { Pager, WorkTabs } from '../../../../../ui/work-tabs';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ book: string; feature: string; work: string }> }) {
  const { book, feature, work: slug } = await params;
  const { now } = await loadBook(book);
  productOnly(now, book, href.work(book, ids.work(feature, slug)));
  const id = ids.work(feature, slug);
  const record = now.get(id);
  if (!record || record.kind !== 'work') notFound();
  const work = record.body as Work;
  const reviews = reviewsOf(now, id);
  const trail = [{ label: titleOf(now, work.feature), to: href.feature(book, work.feature) }, { label: work.title, to: href.work(book, id) }, { label: 'Review' }];

  return (
    <Frame book={book} now={now} trail={trail} aside={`${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`}>
      <Sheet>
        <Eyebrow as="h1">{work.title}</Eyebrow>
        <WorkTabs book={book} now={now} workId={id} on="review" />
        <Section title="Reviews">
          {reviews.length === 0 && <Meta>No part has been reviewed yet. Each part is reviewed when it's built, by an agent that didn't write it.</Meta>}
          {reviews.map((r) => <Receipt key={r.id} review={r} />)}
        </Section>
        <Section title="The seven questions every review answers" lede="Asked by an agent that didn't write the change. Each gets passes, a concern, or fails, with evidence. A concern becomes an open question on the work; a failure blocks it.">
          <Questions />
        </Section>
        <Pager book={book} now={now} workId={id} on="review" />
      </Sheet>
    </Frame>
  );
}
