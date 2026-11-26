// One decision in full: what was chosen and what it means, the question and what was true then, the options, the
// editor's words and when to revisit; beside it, its history, what it shapes, where it came from and when it was kept.
import { notFound } from 'next/navigation';
import { decisions, featureOfWork, lineage } from '../../../../lib/book/decisions';
import { dayFull, dayLong, dayTime } from '../../../../lib/book/format';
import { replacedBy, titleOf } from '../../../../lib/book/views';
import { loadBook } from '../../../../lib/load';
import { href } from '../../../../lib/routes';
import { DecisionTitle, Fact, History, Options } from '../../../ui/decision/decision-parts';
import { Frame } from '../../../ui/frame';
import { Quote } from '../../../ui/parts/quote';
import { Eyebrow, Lede, Sheet, Split } from '../../../ui/parts/sheet';
import { StatusPill } from '../../../ui/parts/status';
import { Meta, TextLink } from '../../../ui/parts/text';

export const dynamic = 'force-dynamic';

/** A time when one was recorded; a day alone when only the day is known (stored as midnight UTC). */
const when = (iso: string) => (iso.endsWith('T00:00:00.000Z') ? dayFull(iso.slice(0, 10)) : dayTime(iso));

export default async function DecisionPage({ params }: { params: Promise<{ book: string; id: string }> }) {
  const { book, id: uuid } = await params;
  const { now } = await loadBook(book);
  const id = `decision:${uuid}`;
  const d = decisions(now).find((x) => x.id === id);
  if (!d) notFound();
  const feature = featureOfWork(now, d.body.work);
  const replaced = replacedBy(now);
  const by = replaced.get(id);
  const line = lineage(now, id);
  const trail = [
    ...(feature ? [{ label: String(feature.body.title), to: href.feature(book, feature.id) }] : []),
    { label: titleOf(now, d.body.work), to: href.work(book, d.body.work) },
    { label: 'Decision' },
  ];

  const main = (
    <>
      {d.body.question && <Fact label="The question">{d.body.question}</Fact>}
      {d.body.context && <Fact label="What was true then">{d.body.context}</Fact>}
      <Fact label="The options" size="free"><Options d={d.body} /></Fact>
      {d.body.words && <Fact label="In your words" size="free"><Quote text={d.body.words.text} who={`You, ${dayLong(d.body.words.saidAt)}`} /></Fact>}
      {d.body.revisitIf && <Fact label="Revisit if">{d.body.revisitIf}</Fact>}
    </>
  );
  const side = (
    <>
      {line.length > 1 && <Fact label="Its history" size="free"><History book={book} line={line} replaced={replaced} /></Fact>}
      <Fact label="It shapes" size="small">{d.body.shapes}{feature ? ` · ${feature.body.title}` : ''}</Fact>
      <Fact label="It came from" size="small"><TextLink href={href.work(book, d.body.work)}>{titleOf(now, d.body.work)}</TextLink></Fact>
      <Fact label="Recorded" size="free"><Meta>By {d.by.replace('agent:', '')}, {when(d.firstAt)}{d.at !== d.firstAt ? `; fuller version ${when(d.at)}` : ''}</Meta></Fact>
    </>
  );

  return (
    <Frame book={book} now={now} trail={trail} aside={d.body.shapes}>
      <Sheet>
        <Eyebrow>{by ? <StatusPill status="plain" struck>replaced</StatusPill> : <StatusPill status="done">in force</StatusPill>} · decided {when(d.body.madeAt)}</Eyebrow>
        <DecisionTitle>{d.body.chosen}</DecisionTitle>
        {d.body.means && <Lede>{d.body.means}</Lede>}
        {by && <Meta>Replaced by <TextLink href={href.decision(book, by)}>{String(now.get(by)?.body.chosen ?? by)}</TextLink></Meta>}
        <Split main={main} side={side} />
      </Sheet>
    </Frame>
  );
}
