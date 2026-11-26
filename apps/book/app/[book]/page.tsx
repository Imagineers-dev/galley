// A book's front page: what the project is, beside what waits on you; where the book stands; then its features as a
// flow of cards, each top-level feature carrying its parts inside it.
import { notFound } from 'next/navigation';
import { deliversProduct } from '../../lib/book/study';
import { featureTree, progress } from '../../lib/book/views';
import { wordsOf } from '../../lib/book/vocabulary';
import { loadBook } from '../../lib/load';
import { getAttention } from '../../lib/server/attention';
import { bookFrameOf } from '../../lib/server/book-frame';
import { Frame } from '../ui/frame';
import { FeatureCard } from '../ui/overview/feature-card';
import { WaitingCard } from '../ui/overview/waiting-card';
import { Section } from '../ui/parts/section';
import { Flow, PageHead, Sheet } from '../ui/parts/sheet';
import { WhereWeStand } from '../ui/where-we-stand';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const { now } = await loadBook(book);
  const project = now.get('project');
  if (!project) notFound();
  const words = wordsOf(now);
  const { approved, total } = progress(now);
  const [attention, frame] = await Promise.all([getAttention(book), bookFrameOf(book)]);
  const waiting = <WaitingCard book={book} waiting={attention.count} papers={attention.readingList?.papers.length ?? 0} approved={approved} total={total} delivers={deliversProduct(now)} />;

  return (
    <Frame book={book} now={now}>
      <Sheet>
        <PageHead eyebrow={words.bookIs} title={String(project.body.title)} lede={String(project.body.forWriter)} aside={waiting} />
        <WhereWeStand book={book} p={frame.stand} words={words} delivers={deliversProduct(now)} />
        <Section title={words.featuresTitle}>
          <Flow>{featureTree(now).map((node) => <FeatureCard key={node.id} book={book} now={now} node={node} />)}</Flow>
        </Section>
      </Sheet>
    </Frame>
  );
}
