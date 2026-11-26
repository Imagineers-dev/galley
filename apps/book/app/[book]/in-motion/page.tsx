import { notFound } from 'next/navigation';
import { diaryDays } from '../../../lib/book/diary';
import { workInMotion } from '../../../lib/book/diary-now';
import { wordsOf } from '../../../lib/book/vocabulary';
import { loadBook } from '../../../lib/load';
import { Frame } from '../../ui/frame';
import { MotionCard } from '../../ui/motion/motion-card';
import { Section } from '../../ui/parts/section';
import { Flow, PageHead, Sheet } from '../../ui/parts/sheet';
import { Empty } from '../../ui/parts/text';

export const dynamic = 'force-dynamic';

/**
 * The work in motion, each piece once: first what is under way, then what the latest day of the diary names as next.
 * Each card says where the work stands on its eight stages and what comes next for it.
 */
export default async function InMotionPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const { now } = await loadBook(book);
  const project = now.get('project');
  if (!project) notFound();
  const words = wordsOf(now);
  const motion = workInMotion(now, diaryDays(now)[0]);
  const groups = [
    { title: 'Under way', cards: motion.filter((m) => m.state === 'now') },
    { title: 'Next', cards: motion.filter((m) => m.state === 'next') },
  ].filter((g) => g.cards.length > 0);

  return (
    <Frame book={book} now={now} trail={[{ label: words.inMotion }]} aside={words.pieces(motion.length)}>
      <Sheet>
        <PageHead eyebrow={String(project.body.title)} title={words.inMotion} />
        {groups.length === 0 && <Empty>{words.nothingMoving}</Empty>}
        {groups.map((g) => (
          <Section key={g.title} title={g.title}>
            <Flow>{g.cards.map((m) => <MotionCard key={m.id} book={book} m={m} />)}</Flow>
          </Section>
        ))}
      </Sheet>
    </Frame>
  );
}
