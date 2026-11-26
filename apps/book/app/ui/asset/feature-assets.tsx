// On a feature's page: its slides and documents, for the team to read and present, the documents that led to it, and for
// the editor, a form to attach one.
import { assetsOn, informedBy } from '../../../lib/book/assets';
import type { Current } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { Section } from '../parts/section';
import { Meta } from '../parts/text';
import { AssetList } from './asset-list';
import { AttachForm } from './attach-form';
import styles from './feature-assets.module.css';

export function FeatureAssets({ book, now, featureId, editor, refused }: { book: string; now: Current; featureId: string; editor: boolean; refused?: string }) {
  const assets = assetsOn(now, featureId);
  const behind = informedBy(now, featureId);
  return (
    <>
      {(assets.length > 0 || editor) && (
        <Section title="Slides and documents" id="slides">
          {assets.length > 0 ? <AssetList book={book} assets={assets} /> : <Meta>Nothing attached yet. Attach slides to walk the team through it.</Meta>}
          {editor && <details className={styles.attach}><summary className={styles.summary}>Attach a file</summary><AttachForm book={book} here={`${href.feature(book, featureId)}#slides`} feature={featureId} refused={refused} /></details>}
        </Section>
      )}
      {behind.length > 0 && <Section title="What led to it"><AssetList book={book} assets={behind} /></Section>}
    </>
  );
}
