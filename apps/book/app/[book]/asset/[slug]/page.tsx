// One asset: slides to present, a research document to read, or any file attached to the book. It says where it sits
// (its feature, or its folder in a section), its tags and the features it informs, and who attached it.
import { notFound } from 'next/navigation';
import { type Asset, FORM_NAMES, attachedBy, formOf, sectionOf, sizeInWords } from '../../../../lib/book/asset-types';
import { sectionNamed } from '../../../../lib/book/sections';
import { dayFull } from '../../../../lib/book/format';
import { ids } from '../../../../lib/book/types';
import { titleOf } from '../../../../lib/book/views';
import { loadBook } from '../../../../lib/load';
import { href } from '../../../../lib/routes';
import { isEditor } from '../../../../lib/server/session';
import { AssetView } from '../../../ui/asset/asset-view';
import { BookIcon } from '../../../ui/book-icon';
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
  const slugIn = sectionOf(asset) ?? '';
  const section = sectionNamed(now, slugIn);
  const trail = asset.feature
    ? [{ label: titleOf(now, asset.feature), to: href.feature(book, asset.feature) }, { label: asset.title }]
    : [{ label: section?.title ?? slugIn, to: href.section(book, slugIn) },
      ...folders.map((name, i) => ({ label: name, to: href.section(book, slugIn, { folder: folders.slice(0, i + 1).join('/') }) })),
      { label: asset.title }];
  const here = href.asset(book, id);
  return (
    <Frame book={book} now={now} trail={trail}>
      <Sheet>
        <PageHead eyebrow={asset.feature ? FORM_NAMES[formOf(asset)] : `${section?.title ?? slugIn} · ${FORM_NAMES[formOf(asset)]}`} title={<><BookIcon icon={asset.icon} place="page" />{asset.title}</>} lede={asset.about} />
        <AssetView book={book} asset={asset} />
        <Meta>
          {asset.file.name} · {sizeInWords(asset.file.size)} · attached {dayFull(record.firstAt.slice(0, 10))}
          {record.at !== record.firstAt ? `, changed ${dayFull(record.at.slice(0, 10))}` : ''} by {attachedBy(record.by)}
          {' · '}<a href={href.file(book, asset.file.hash)} download={asset.file.name}>Download</a>
        </Meta>
        <AssetTags book={book} section={slugIn} tags={asset.tags} />
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
