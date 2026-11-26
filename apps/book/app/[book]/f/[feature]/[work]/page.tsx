// A piece of work: what it is and how it began, how it works and what decided it, what was found, and whether it served
// the editor as someone who uses the product; beside it, its papers, connections, commits and proof.
import { notFound } from 'next/navigation';
import { decisions, laneOrder } from '../../../../../lib/book/decisions';
import { SERVED_WORDS, STATE_WORDS, dayLong } from '../../../../../lib/book/format';
import { isStudy } from '../../../../../lib/book/study';
import type { Work } from '../../../../../lib/book/types';
import { ids } from '../../../../../lib/book/types';
import { notesOf, titleOf } from '../../../../../lib/book/views';
import { loadBook } from '../../../../../lib/load';
import { href } from '../../../../../lib/routes';
import { isEditor } from '../../../../../lib/server/session';
import { Began } from '../../../../ui/began';
import { DecisionsTold } from '../../../../ui/decisions-told';
import { Frame } from '../../../../ui/frame';
import { LessonPage } from '../../../../ui/lesson/lesson';
import { Item } from '../../../../ui/parts/list';
import { Section } from '../../../../ui/parts/section';
import { Lede, PageHead, Sheet, Split } from '../../../../ui/parts/sheet';
import { StatusPill, statusOf } from '../../../../ui/parts/status';
import { WorkSide } from '../../../../ui/work/work-side';
import { Pager, WorkTabs } from '../../../../ui/work-tabs';
import styles from './work.module.css';

export const dynamic = 'force-dynamic';

export default async function WorkPage({ params, searchParams }: {
  params: Promise<{ book: string; feature: string; work: string }>;
  searchParams: Promise<{ changed?: string }>;
}) {
  const { book, feature, work: slug } = await params;
  const { now, asOf } = await loadBook(book);
  const id = ids.work(feature, slug);
  const record = now.get(id);
  if (!record || record.kind !== 'work') notFound();
  const work = record.body as Work;
  if (isStudy(now)) return <LessonPage book={book} now={now} id={id} work={work} editor={await isEditor()} past={!!asOf} changed={(await searchParams).changed === '1'} />;
  const notes = notesOf(now, id);
  const mine = decisions(now).filter((d) => d.body.work === id);
  const trail = [{ label: titleOf(now, work.feature), to: href.feature(book, work.feature) }, { label: work.title }];
  const verdict = work.verdict ? `${SERVED_WORDS[work.verdict.served]}${work.verdict.words ? `. ${work.verdict.words}` : ''}` : null;

  const main = (
    <>
      <Lede>{work.summary}</Lede>
      <Began origin={work.origin} now={now} book={book} />
      <Section title="How it works, and what decided it">
        <DecisionsTold book={book} list={mine} replaced={notes.replaced} lanes={laneOrder(now, work.feature, mine.map((d) => d.body.shapes))} />
      </Section>
      {(notes.findings.length > 0 || notes.questions.length > 0) && (
        <Section title="Found, and still open">
          {notes.findings.map((f) => <Item key={f.id}>{f.body.text}</Item>)}
          {notes.questions.map((q) => <Item key={q.id} note="Still open">{q.body.text}</Item>)}
        </Section>
      )}
      <Section title="For the people who use it">
        <p className={verdict ? styles.verdict : styles.unjudged}>{verdict ?? 'Not judged yet.'}</p>
      </Section>
    </>
  );

  return (
    <Frame book={book} now={now} trail={trail} aside={<StatusPill status={statusOf(work.state)}>{STATE_WORDS[work.state]}</StatusPill>}>
      <Sheet>
        <PageHead eyebrow={`Work in ${titleOf(now, work.feature)} · began ${dayLong(work.on)}`} title={work.title} />
        <WorkTabs book={book} now={now} workId={id} on="overview" />
        <Split main={main} side={<WorkSide book={book} now={now} id={id} />} />
        <Pager book={book} now={now} workId={id} on="overview" />
      </Sheet>
    </Frame>
  );
}
