// A feature's own paper: its Why, What you'll get or How, read and answered the way a work's paper is.
import { notFound } from 'next/navigation';
import { PAPER_STATUS_WORDS, dayLong } from '../../../../../lib/book/format';
import type { Feature, Paper } from '../../../../../lib/book/types';
import { PAPER_NAMES, ids } from '../../../../../lib/book/types';
import { minutes, paperState, progress } from '../../../../../lib/book/views';
import { loadBook } from '../../../../../lib/load';
import { href, kindFromSlug } from '../../../../../lib/routes';
import { productOnly } from '../../../../../lib/server/product-only';
import { isEditor } from '../../../../../lib/server/session';
import { AnswerBar } from '../../../../ui/answer';
import { Frame } from '../../../../ui/frame';
import { Quote } from '../../../../ui/parts/quote';
import { Eyebrow, Sheet } from '../../../../ui/parts/sheet';
import { NumberedPaper } from '../../../../ui/translation';
import { ReadingRail } from '../../../../ui/work/reading-rail';

export const dynamic = 'force-dynamic';

export default async function FeaturePaperPage({ params, searchParams }: {
  params: Promise<{ book: string; feature: string; kind: string }>;
  searchParams: Promise<{ answer?: string; need?: string; changed?: string }>;
}) {
  const { book, feature: slug, kind: kindSlug } = await params;
  const query = await searchParams;
  const kind = kindFromSlug(kindSlug);
  const { now } = await loadBook(book);
  productOnly(now, book, href.feature(book, ids.feature(slug)));
  const featureId = ids.feature(slug);
  const owner = now.get(featureId);
  if (!kind || owner?.kind !== 'feature') notFound();
  const paperId = ids.featurePaper(featureId, kind, 'editor');
  const paper = now.get(paperId);
  if (paper?.kind !== 'paper' || (paper.body as Paper).feature !== featureId) notFound();
  const feature = owner.body as Feature;
  const state = paperState(now, paperId);
  const { list, toRead } = progress(now);
  const position = list.findIndex((r) => r.paper.id === paperId) + 1;
  const text = String(paper.body.text);
  const here = href.featurePaper(book, featureId, kind);
  const trail = [{ label: feature.title, to: href.feature(book, featureId) }, { label: PAPER_NAMES[kind].name }];

  return (
    <Frame book={book} now={now} trail={trail} aside={`${position} of ${list.length} · about ${minutes(text)} min`} rail={<ReadingRail book={book} list={list} open={paperId} />}>
      <Sheet>
        <Eyebrow as="h1">{feature.title}</Eyebrow>
        <Eyebrow>
          {PAPER_NAMES[kind].name} · {PAPER_NAMES[kind].what.toLowerCase()} · {PAPER_STATUS_WORDS[state.status].toLowerCase()}
          {state.at ? ` ${dayLong(state.at)}` : ''}
        </Eyebrow>
        <NumberedPaper text={text} gaps={[]} />
        {state.words && <Quote text={state.words} who="You, with your answer" />}
      </Sheet>
      <AnswerBar
        book={book}
        paperId={paperId}
        paperAt={paper.at}
        here={here}
        state={state}
        editor={await isEditor()}
        hasNext={toRead.some((r) => r.paper.id !== paperId)}
        reopen={query.answer === '1'}
        needWords={query.need === 'words'}
        changed={query.changed === '1'}
      />
    </Frame>
  );
}
