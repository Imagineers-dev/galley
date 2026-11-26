import { bands } from '../../../lib/book/bands';
import { BAND_WORDS } from '../../../lib/book/oversight-types';
import { Empty, Meta } from '../parts/text';
import styles from './permissions.module.css';
import watch from './watch.module.css';
import { WatchSection } from './watch-section';

import type { Current } from '../../../lib/book/views';

const BANDS = ['alone', 'reviewed', 'editor'] as const;
const BAND: Record<(typeof BANDS)[number], string> = { alone: styles.alone, reviewed: styles.reviewed, editor: styles.editor };

/** Who may do what: every action in one of three bands, with why and where the rule is written. */
export function PermissionsSection({ now }: { now: Current }) {
  const all = bands(now);
  const total = all.alone.length + all.reviewed.length + all.editor.length;
  return (
    <WatchSection id="permissions" title="Who may do what" lede="What agents do alone, what another agent reviews first, and what only you decide. Agents ask the book before they act; anything not here is yours.">
      {total === 0 && <Empty>No actions recorded yet.</Empty>}
      <div className={styles.bands}>
        {BANDS.map((b) => (
          <section key={b} className={`${styles.band} ${BAND[b]}`}>
            <h3 className={watch.nameSmall}>{BAND_WORDS[b].title}</h3>
            <Meta>{BAND_WORDS[b].sub}</Meta>
            {all[b].map((a) => (
              <div key={a.id} className={styles.item}>
                <p className={styles.action}>{a.body.action}</p>
                <p className={watch.note}>{a.body.why}</p>
                {a.body.source && <Meta>{a.body.source}</Meta>}
              </div>
            ))}
          </section>
        ))}
      </div>
    </WatchSection>
  );
}
