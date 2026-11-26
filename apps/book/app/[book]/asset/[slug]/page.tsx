// One asset: slides to present, a research document to read, or any file attached to the book. It says where it sits
// (its feature, or its folder in the research library), its tags and the features it informs, and who attached it.
import { notFound } from 'next/navigation';
import { type Asset, FORM_NAMES, attachedBy, formOf, sizeInWords } from '../../../../lib/book/asset-types';
import { dayFull } from '../../../../lib/book/format';
import { ids } from '../../../../lib/book/types';
import { titleOf } from '../../../../lib/book/views';
import { loadBook } from '../../../../lib/load';
import { href } from '../../../../lib/routes';
import { isEditor } from '../../../../lib/server/session';
import { AssetView } from '../../../ui/asset/asset-view';
import { AttachForm } from '../../../ui/asset/attach-form';
import { AssetTags } from '../../../ui/asset/asset-tags';
import { Frame } from '../../../ui/frame';
import { Section } from '../../../ui/parts/section';
import { PageHead, Sheet } from '../../../ui/parts/sheet';
import { Meta, TextLink } from '../../../ui/parts/text';

export const dynamic = 'force-dynamic';

export default async function AssetPage({ params, searchParams }: { params: Promise<{ book: string; slug: string }>; searchParams: Promise<{ attach?: string }> }) {
  const { book, slug } = await params;
  const { now, asOf } = await loadBook(book);
  const id = ids.asset(slug);
  const record = now.get(id);
  if (!record || record.kind !== 'asset' || record.body.withdrawn) notFound();
  const asset = record.body as Asset;
  const folders = (asset.folder ?? '').split('/').filter(Boolean);
  const trail = asset.feature
    ? [{ label: titleOf(now, asset.feature), to: href.feature(book, asset.feature) }, { label: asset.title }]
    : [{ label: 'Research', to: href.research(book) },
      ...folders.map((name, i) => ({ label: name, to: href.research(book, { folder: folders.slice(0, i + 1).join('/') }) })),
      { label: asset.title }];
  const here = href.asset(book, id);
  return (
    <Frame book={book} now={now} trail={trail}>
      <Sheet>
        <PageHead eyebrow={asset.feature ? FORM_NAMES[formOf(asset)] : `Research · ${FORM_NAMES[formOf(asset)]}`} title={asset.title} lede={asset.about} />
        <AssetView book={book} asset={asset} />
        <Meta>
          {asset.file.name} · {sizeInWords(asset.file.size)} · attached {dayFull(record.firstAt.slice(0, 10))}
          {record.at !== record.firstAt ? `, changed ${dayFull(record.at.slice(0, 10))}` : ''} by {attachedBy(record.by)}
          {' · '}<a href={href.file(book, asset.file.hash)} download={asset.file.name}>Download</a>
        </Meta>
        <AssetTags book={book} tags={asset.tags} />
        {asset.informs?.length ? (
          <Section title="It informs">
            {asset.informs.map((f) => <p key={f}><TextLink href={href.feature(book, f)}>{titleOf(now, f)}</TextLink></p>)}
          </Section>
        ) : null}
        {(await isEditor()) && !asOf && (
          <Section title="A new version">
            <AttachForm book={book} here={here} asset={id} refused={(await searchParams).attach} />
          </Section>
        )}
      </Sheet>
    </Frame>
  );
}
