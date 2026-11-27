// On a feature's page: its slides and documents, for the team to read and present, the documents that led to it, and for
// the editor, a form to attach one.
import { assetsOn, informedBy } from '../../../lib/book/assets';
import type { Current } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { Section } from '../parts/section';
import { Meta } from '../parts/text';
import { AssetList } from './asset-list';
import { AttachForm } from './attach-form';
import { Disclosure } from './disclosure';
import { WriteForm } from './write-form';

export function FeatureAssets({ book, now, featureId, editor, refused, writeRefused }: {
  book: string; now: Current; featureId: string; editor: boolean; refused?: string; writeRefused?: string;
}) {
  const here = `${href.feature(book, featureId)}#slides`;
  const assets = assetsOn(now, featureId);
  const behind = informedBy(now, featureId);
  return (
    <>
      {(assets.length > 0 || editor) && (
        <Section title="Slides and documents" id="slides">
          {assets.length > 0 ? <AssetList book={book} assets={assets} /> : <Meta>Nothing here yet. Write a document, or attach slides to walk the team through it.</Meta>}
          {editor && <Disclosure label="Write a document" open={Boolean(writeRefused)}><WriteForm book={book} here={here} feature={featureId} refused={writeRefused} /></Disclosure>}
          {editor && <Disclosure label="Attach a file" open={Boolean(refused)}><AttachForm book={book} here={here} feature={featureId} refused={refused} /></Disclosure>}
        </Section>
      )}
      {behind.length > 0 && <Section title="What led to it"><AssetList book={book} assets={behind} /></Section>}
    </>
  );
}
