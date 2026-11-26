// The research library: how the product's features came to be. Documents are filed in folders, made by naming them,
// and tagged; the page shows one folder (and what is beneath it) and one tag at a time, newest first.
import { filterResearch, folderTree, researchOf, tagCounts } from '../../../lib/book/assets';
import { folderPath, tagOf } from '../../../lib/book/asset-types';
import { loadBook } from '../../../lib/load';
import { href } from '../../../lib/routes';
import { isEditor } from '../../../lib/server/session';
import { AssetList } from '../../ui/asset/asset-list';
import { AssetTags } from '../../ui/asset/asset-tags';
import { AttachForm } from '../../ui/asset/attach-form';
import { FolderTree } from '../../ui/asset/folder-tree';
import { Frame } from '../../ui/frame';
import { Section } from '../../ui/parts/section';
import { PageHead, Sheet, Split } from '../../ui/parts/sheet';
import { Meta, TextLink } from '../../ui/parts/text';

export const dynamic = 'force-dynamic';

export default async function ResearchPage({ params, searchParams }: { params: Promise<{ book: string }>; searchParams: Promise<{ folder?: string; tag?: string; attach?: string }> }) {
  const { book } = await params;
  const query = await searchParams;
  const folder = query.folder ? folderPath(query.folder) || undefined : undefined;
  const tag = query.tag ? tagOf(query.tag) || undefined : undefined;
  const { now, asOf } = await loadBook(book);
  const docs = researchOf(now);
  const shown = filterResearch(docs, folder, tag);
  const tags = tagCounts(docs);
  const editor = !asOf && (await isEditor());
  const here = href.research(book, { folder, tag });

  const main = (
    <>
      {tag && <Meta>Tagged {tag} · <TextLink href={href.research(book, { folder })}>every tag</TextLink></Meta>}
      {shown.length > 0 ? <AssetList book={book} assets={shown} tagged={tag ?? ''} /> : (
        <Meta>{docs.length ? 'No document here.' : 'No research yet. Attach the documents the product came from: interviews, studies, comparisons.'}</Meta>
      )}
      {editor && (
        <Section title="Attach research">
          <AttachForm book={book} here={here} research refused={query.attach} />
        </Section>
      )}
    </>
  );
  const side = (
    <>
      <Section title="Folders"><FolderTree book={book} folders={folderTree(docs)} total={docs.length} on={folder} tag={tag} /></Section>
      {tags.length > 0 && <Section title="Tags"><AssetTags book={book} tags={tags.map((t) => t.tag)} on={tag} /></Section>}
    </>
  );
  return (
    <Frame book={book} now={now} trail={[{ label: 'Research', to: folder || tag ? href.research(book) : undefined }, ...(folder ? [{ label: folder }] : [])]}>
      <Sheet>
        <PageHead eyebrow="Research" title={folder ? folder.split('/').at(-1) ?? 'Research' : 'How the product came to be'}
          lede="The studies, interviews and comparisons behind the features. Filed in folders, tagged, and linked to the features they informed." />
        <Split main={main} side={side} sideLabel="Folders and tags" />
      </Sheet>
    </Frame>
  );
}
