import Link from 'next/link';
import { explain } from '../../../lib/book/explain';
import { dayShort, STATE_WORDS } from '../../../lib/book/format';
import { type Current, featureTree, flatten } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { Prose } from '../parts/prose';
import { Section } from '../parts/section';
import { Split } from '../parts/sheet';
import { Empty, Meta } from '../parts/text';
import styles from './explain.module.css';
import { ExplainSide } from './explain-side';
import watch from './watch.module.css';
import { WatchSection } from './watch-section';

/** Explain any part to me: a feature told from the book's own records, each line linked to where it came from. */
export function ExplainSection({ book, now, feature }: { book: string; now: Current; feature?: string }) {
  const features = flatten(featureTree(now));
  const chosen = features.find((x) => x.body.slug === feature) ?? features[0];
  const e = chosen ? explain(now, chosen.id) : null;
  return (
    <WatchSection id="explain" title={e ? `Explain: ${e.feature.body.title}` : 'Explain it to me'} lede="Any part of the product, told only from what the book recorded: why it exists, how it came to be, what was decided, and what is still open.">
      <nav className={styles.pick}>
        {features.map((x) => <Link key={x.id} href={`${href.agents(book, 'explain')}?f=${x.body.slug}`} className={`${styles.choice} ${x.id === chosen?.id ? styles.chosen : ''}`}>{x.body.title}</Link>)}
      </nav>
      {!e && <Empty>No features yet.</Empty>}
      {e && (
        <Split
          main={<>
            <Section title="What it is"><Prose text={e.feature.body.about ?? e.feature.body.forWriter} dropTitle /></Section>
            <Section title="How it came to be">
              <ol className={styles.story}>
                {e.story.map((s) => (
                  <li key={s.work.id}>
                    <Link className={watch.nameSmall} href={href.work(book, s.work.id)}>{s.work.body.title}</Link>
                    <Meta>{STATE_WORDS[s.work.body.state]} · {dayShort(s.work.body.on)}{s.proofs.length ? ` · ${s.proofs.length} proof` : ''}</Meta>
                    <p className={watch.note}>{s.why ?? s.work.body.summary}</p>
                  </li>
                ))}
              </ol>
            </Section>
            {e.decisions.length > 0 && (
              <Section title="What was decided">
                {e.decisions.map((d) => (
                  <div key={d.id} className={styles.decision}>
                    <p className={watch.note}><b>{d.body.question}</b> {d.body.chosen}.</p>
                    {d.body.turnedDown.length > 0 && <Meta>Turned down: {d.body.turnedDown.map((t) => t.option).join('; ')}</Meta>}
                  </div>
                ))}
              </Section>
            )}
          </>}
          side={<ExplainSide book={book} e={e} />}
        />
      )}
    </WatchSection>
  );
}
