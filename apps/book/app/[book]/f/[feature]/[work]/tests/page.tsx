// A piece of work's tests: every line the editor approved and what proves it, the tests, and what it could break.
import { notFound } from 'next/navigation';
import { guardsOf, lineCoverage, needsTranslating, staleTestsOf, testsOf } from '../../../../../../lib/book/testing';
import type { Work } from '../../../../../../lib/book/types';
import { ids } from '../../../../../../lib/book/types';
import { titleOf } from '../../../../../../lib/book/views';
import { loadBook } from '../../../../../../lib/load';
import { productOnly } from '../../../../../../lib/server/product-only';
import { href } from '../../../../../../lib/routes';
import { NeedsTranslating } from '../../../../../ui/work/needs-translating';
import { Frame } from '../../../../../ui/frame';
import { Section } from '../../../../../ui/parts/section';
import { Eyebrow, Sheet } from '../../../../../ui/parts/sheet';
import { Meta } from '../../../../../ui/parts/text';
import { Guards, Matrix, TestRows } from '../../../../../ui/work/tests';
import { Pager, WorkTabs } from '../../../../../ui/work-tabs';

export const dynamic = 'force-dynamic';

export default async function TestsPage({ params }: { params: Promise<{ book: string; feature: string; work: string }> }) {
  const { book, feature, work: slug } = await params;
  const { now } = await loadBook(book);
  productOnly(now, book, href.work(book, ids.work(feature, slug)));
  const id = ids.work(feature, slug);
  const record = now.get(id);
  if (!record || record.kind !== 'work') notFound();
  const work = record.body as Work;
  const tests = testsOf(now, id);
  const lines = lineCoverage(now, id, ['spec']);
  const guards = guardsOf(now, id);
  const label = new Map(tests.map((t, i) => [t.id, `T${i + 1}`]));
  const gaps = lines.filter((l) => l.tests.length === 0);
  const specHref = href.paper(book, id, 'spec');
  const untranslated = needsTranslating(now, id, 'spec');
  const outOfDate = staleTestsOf(now, id, 'spec').length;

  const trail = [{ label: titleOf(now, work.feature), to: href.feature(book, work.feature) }, { label: work.title, to: href.work(book, id) }, { label: 'Tests' }];

  return (
    <Frame book={book} now={now} trail={trail} aside={`${tests.length} tests · ${guards.length} guards`}>
      <Sheet>
        <Eyebrow as="h1">{work.title}</Eyebrow>
        <WorkTabs book={book} now={now} workId={id} on="tests" />
        <Section title="Every line you approved, and what proves it">
          {untranslated ? <NeedsTranslating tests={outOfDate} /> : lines.length === 0 ? <Meta>There is no What you'll get yet, so nothing to prove.</Meta> : <Matrix lines={lines} tests={tests} label={label} specHref={specHref} />}
          {gaps.length > 0 && <Meta>{gaps.length} {gaps.length === 1 ? 'line has' : 'lines have'} no test yet: {gaps.map((g) => `¶${g.n}`).join(', ')}. The work isn't done while a line is unproven.</Meta>}
          {!untranslated && outOfDate > 0 && <Meta>{outOfDate} {outOfDate === 1 ? 'test was' : 'tests were'} written before the feature's paper last changed, so {outOfDate === 1 ? 'it proves' : 'they prove'} nothing until rewritten.</Meta>}
        </Section>
        <Section title="The tests"><TestRows tests={tests} label={label} /></Section>
        <Section title="What it could break" lede="Features this work touches, and the checks that guard them. Each runs before the work starts and after each part; a guard that fails afterwards blocks the work.">
          <Guards guards={guards} />
        </Section>
        <Pager book={book} now={now} workId={id} on="tests" />
      </Sheet>
    </Frame>
  );
}
