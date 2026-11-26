// What a feature promises, in plain words, and whether each promise holds. The editor approves them here.
import { notFound } from 'next/navigation';
import { promisesOf, type FeatureRef } from '../../../../lib/book/promises';
import type { Feature } from '../../../../lib/book/types';
import { ids } from '../../../../lib/book/types';
import { loadBook } from '../../../../lib/load';
import { href } from '../../../../lib/routes';
import { productOnly } from '../../../../lib/server/product-only';
import { withEarlierWords } from '../../../../lib/server/promise-history';
import { isEditor } from '../../../../lib/server/session';
import { Frame } from '../../../ui/frame';
import { Item } from '../../../ui/parts/list';
import { Section } from '../../../ui/parts/section';
import { PageHead, Sheet } from '../../../ui/parts/sheet';
import { Empty, Meta, TextLink } from '../../../ui/parts/text';
import { PromiseAnswer } from '../../../ui/promises/promise-answer';
import { PromiseCounts } from '../../../ui/promises/promise-counts';
import { PromiseGroup } from '../../../ui/promises/promise-group';

export const dynamic = 'force-dynamic';

function Related({ book, title, features }: { book: string; title: string; features: FeatureRef[] }) {
  if (features.length === 0) return null;
  return <Section title={title}>{features.map((f) => <Item key={f.id}><TextLink href={href.promises(book, f.id)}>{f.title}</TextLink></Item>)}</Section>;
}

export default async function PromisesPage({ params, searchParams }: {
  params: Promise<{ book: string; feature: string }>;
  searchParams: Promise<{ changed?: string; need?: string }>;
}) {
  const { book, feature: slug } = await params;
  const query = await searchParams;
  const { now } = await loadBook(book);
  const id = ids.feature(slug);
  productOnly(now, book, href.feature(book, id));
  const promises = promisesOf(now, id);
  if (!promises) notFound();
  const feature = now.get(id)!.body as Feature;
  const here = href.promises(book, id);
  const trail = [{ label: feature.title, to: href.feature(book, id) }, { label: 'Promises' }];
  const editor = await isEditor();

  return (
    <Frame book={book} now={now} trail={trail} aside={`${promises.total} ${promises.total === 1 ? 'promise' : 'promises'}`}>
      <Sheet>
        <PageHead eyebrow="What it promises" title={feature.title} lede={feature.forWriter} />
        {query.changed === '1' && <Meta>A promise changed after you opened it. The words below are the new ones.</Meta>}
        {query.need === 'words' && <Meta>Say what to change, so it can be done.</Meta>}
        {promises.total === 0 ? <Empty>No promises written yet.</Empty> : <PromiseCounts counts={promises.counts} />}
        {editor
          ? <PromiseAnswer where={{ book, feature: id, here }} waiting={promises.waiting} reworded={await withEarlierWords(book, promises.reworded)} />
          : promises.waiting.length + promises.reworded.length > 0 && <TextLink href={href.signIn(here)}>Sign in to answer</TextLink>}
        {promises.groups.filter((g) => g.promises.length > 0).map((g) => <PromiseGroup key={g.state} {...g} />)}
        <Related book={book} title="Depends on" features={promises.dependsOn} />
        <Related book={book} title="Used by" features={promises.usedBy} />
      </Sheet>
    </Frame>
  );
}
