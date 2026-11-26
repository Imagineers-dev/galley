// What a feature promises, and what each feature under it promises: the counts across them all, then each feature's
// promises under its name, in their states, with a link to read and answer them on that feature's promises page.
import { countsAcross, promisesNested } from '../../../lib/book/promises';
import type { Current } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { Section } from '../parts/section';
import { Meta, TextLink } from '../parts/text';
import { PromiseCounts } from './promise-counts';
import { PromiseGroup } from './promise-group';
import styles from './promises.module.css';

export function NestedPromises({ book, now, featureId }: { book: string; now: Current; featureId: string }) {
  const list = promisesNested(now, featureId);
  return (
    <Section title="What it promises">
      {list.length === 0 ? <Meta>No promises written for this feature or its parts yet.</Meta> : <PromiseCounts counts={countsAcross(list)} />}
      {list.map((p) => (
        <div key={p.feature.id} className={styles.feature}>
          <h3 className={styles.featureTitle}>{p.feature.title}</h3>
          {p.groups.filter((g) => g.promises.length > 0).map((g) => <PromiseGroup key={g.state} {...g} nested />)}
          <TextLink href={href.promises(book, p.feature.id)}>Read every promise of {p.feature.title}</TextLink>
        </div>
      ))}
    </Section>
  );
}
