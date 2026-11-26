// One section of documents beside the product: Research, or one the book defined (meeting notes, design, decks).
// Documents are filed in folders, made by naming them, and tagged; the page shows one folder (and what is beneath it)
// and one tag at a time, newest first.
import { notFound } from 'next/navigation';
import { folderPath, tagOf } from '../../../../lib/book/asset-types';
import { documentsIn, filterDocuments, folderTree, tagCounts } from '../../../../lib/book/assets';
import { sectionNamed } from '../../../../lib/book/sections';
import { loadBook } from '../../../../lib/load';
import { href } from '../../../../lib/routes';
import { isEditor } from '../../../../lib/server/session';
import { AssetList } from '../../../ui/asset/asset-list';
import { AssetTags } from '../../../ui/asset/asset-tags';
import { AttachForm } from '../../../ui/asset/attach-form';
import { FolderTree } from '../../../ui/asset/folder-tree';
import { BookIcon } from '../../../ui/book-icon';
import { Frame } from '../../../ui/frame';
import { Section } from '../../../ui/parts/section';
import { PageHead, Sheet, Split } from '../../../ui/parts/sheet';
import { Meta, TextLink } from '../../../ui/parts/text';

export const dynamic = 'force-dynamic';

export default async function SectionPage({ params, searchParams }: {
  params: Promise<{ book: string; section: string }>; searchParams: Promise<{ folder?: string; tag?: string; attach?: string }>;
}) {
  const { book, section: slug } = await params;
  const query = await searchParams;
  const folder = query.folder ? folderPath(query.folder) || undefined : undefined;
  const tag = query.tag ? tagOf(query.tag) || undefined : undefined;
  const { now, asOf } = await loadBook(book);
  const section = sectionNamed(now, slug);
  if (!section) notFound();
  const docs = documentsIn(now, slug);
  const shown = filterDocuments(docs, folder, tag);
  const tags = tagCounts(docs);
  const editor = !asOf && (await isEditor());
  const here = href.section(book, slug, { folder, tag });

  const main = (
    <>
      {tag && <Meta>Tagged {tag} · <TextLink href={href.section(book, slug, { folder })}>every tag</TextLink></Meta>}
      {shown.length > 0 ? <AssetList book={book} assets={shown} tagged={tag ?? ''} /> : (
        <Meta>{docs.length ? 'No document here.' : `Nothing in ${section.title} yet.`}</Meta>
      )}
      {editor && (
        <Section title={`Attach to ${section.title}`}>
          <AttachForm book={book} here={here} section={slug} folder={folder} refused={query.attach} />
        </Section>
      )}
    </>
  );
  const side = (
    <>
      {folderTree(docs).length > 0 && <Section title="Folders"><FolderTree book={book} section={slug} folders={folderTree(docs)} on={folder} tag={tag} /></Section>}
      {tags.length > 0 && <Section title="Tags"><AssetTags book={book} section={slug} tags={tags.map((t) => t.tag)} on={tag} /></Section>}
    </>
  );
  return (
    <Frame book={book} now={now} trail={[{ label: section.title, to: folder || tag ? href.section(book, slug) : undefined }, ...(folder ? [{ label: folder }] : [])]}>
      <Sheet>
        <PageHead eyebrow={section.title} title={folder ? folder.split('/').at(-1) ?? section.title : <><BookIcon icon={section.icon} place="page" />{section.title}</>} lede={section.about} />
        <Split main={main} side={side} sideLabel="Folders and tags" />
      </Sheet>
    </Frame>
  );
}
