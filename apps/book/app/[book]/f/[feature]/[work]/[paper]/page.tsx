import { notFound } from 'next/navigation';
import type { Work } from '../../../../../../lib/book/types';
import { PAPER_NAMES, ids } from '../../../../../../lib/book/types';
import { governingPaper } from '../../../../../../lib/book/governing';
import { minutes, paperState, progress, titleOf } from '../../../../../../lib/book/views';
import { loadBook } from '../../../../../../lib/load';
import { productOnly } from '../../../../../../lib/server/product-only';
import { href, kindFromSlug } from '../../../../../../lib/routes';
import { isEditor } from '../../../../../../lib/server/session';
import { PAPER_STATUS_WORDS, dayLong } from '../../../../../../lib/book/format';
import { AnswerBar } from '../../../../../ui/answer';
import { Frame } from '../../../../../ui/frame';
import { Quote } from '../../../../../ui/parts/quote';
import { Eyebrow, Sheet } from '../../../../../ui/parts/sheet';
import { Meta, TextLink } from '../../../../../ui/parts/text';
import { ReadingRail } from '../../../../../ui/work/reading-rail';
import { Pager, WorkTabs } from '../../../../../ui/work-tabs';
import { AgentsVersion, NumberedPaper } from '../../../../../ui/translation';
import { coverage } from '../../../../../../lib/book/paragraphs';

export const dynamic = 'force-dynamic';

export default async function PaperPage({ params, searchParams }: {
  params: Promise<{ book: string; feature: string; work: string; paper: string }>;
  searchParams: Promise<{ answer?: string; need?: string; changed?: string }>;
}) {
  const { book, feature, work: slug, paper: paperSlug } = await params;
  const query = await searchParams;
  const kind = kindFromSlug(paperSlug);
  const { now } = await loadBook(book);
  productOnly(now, book, href.work(book, ids.work(feature, slug)));
  const workId = ids.work(feature, slug);
  const workRecord = now.get(workId);
  if (!kind || !workRecord) notFound();
  const work = workRecord.body as Work;
  const { paperId, source } = governingPaper(now, workId, kind);
  const paper = paperId ? now.get(paperId) : undefined;
  if (!paperId || !paper) notFound();
  const fromFeature = source === 'feature';
  const agents = now.get(ids.paper(workId, kind, 'agents'));
  const state = paperState(now, paperId);
  const editor = await isEditor();
  const { list, toRead } = progress(now);
  const position = list.findIndex((r) => r.paper.id === paperId) + 1;
  const next = toRead.find((r) => r.paper.id !== paperId);
  const text = String(paper.body.text);

  const trail = [
    { label: titleOf(now, work.feature), to: href.feature(book, work.feature) },
    { label: work.title, to: href.work(book, workId) },
    { label: PAPER_NAMES[kind].name },
  ];
  const rail = <ReadingRail book={book} list={list} open={paperId} />;

  return (
    <Frame book={book} now={now} trail={trail} aside={`${position} of ${list.length} · about ${minutes(text)} min`} rail={rail}>
      <Sheet>
        <Eyebrow as="h1">{work.title}</Eyebrow>
        <WorkTabs book={book} now={now} workId={workId} on={kind} />
        <Eyebrow>
          {PAPER_NAMES[kind].name} · {PAPER_NAMES[kind].what.toLowerCase()} · {PAPER_STATUS_WORDS[state.status].toLowerCase()}
          {state.at ? ` ${dayLong(state.at)}` : ''}
        </Eyebrow>
        {fromFeature && <Meta>This work follows the {PAPER_NAMES[kind].name} of <TextLink href={href.featurePaper(book, work.feature, kind)}>{titleOf(now, work.feature)}</TextLink>. You answer it there.</Meta>}
        <NumberedPaper text={text} gaps={agents && !fromFeature ? coverage(text, String(agents.body.text)).gaps : []} />
        {state.words && <Quote text={state.words} who="You, with your answer" />}
        <Pager book={book} now={now} workId={workId} on={kind} />
        <AgentsVersion
          editorText={text}
          agentsText={agents ? String(agents.body.text) : undefined}
          stale={!!(agents?.body.against && agents.body.against !== paper.at)}
          approved={state.status === 'approved'}
          partial={fromFeature}
          here={href.paper(book, workId, kind)}
        />
      </Sheet>
      {!fromFeature && <AnswerBar
        book={book}
        paperId={paperId}
        paperAt={paper.at}
        here={href.paper(book, workId, kind)}
        state={state}
        editor={editor}
        hasNext={!!next}
        reopen={query.answer === '1'}
        needWords={query.need === 'words'}
        changed={query.changed === '1'}
      />}
    </Frame>
  );
}
