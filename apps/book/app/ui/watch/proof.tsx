import Link from 'next/link';
import { dayShort } from '../../../lib/book/format';
import { doneWork } from '../../../lib/book/proof';
import { href } from '../../../lib/routes';
import { StatusPill } from '../parts/status';
import { Empty, Meta } from '../parts/text';
import { ProofList } from '../proof-list';
import styles from './proof.module.css';
import watch from './watch.module.css';
import { WatchSection } from './watch-section';

import type { Current } from '../../../lib/book/views';

/** Proof for every done: each finished piece of work with its evidence; work done without any is marked. */
export function ProofSection({ book, now }: { book: string; now: Current }) {
  const done = doneWork(now);
  const bare = done.filter((d) => d.proofs.length === 0).length;
  return (
    <WatchSection id="proof" title="Proof for every done" lede="Nothing is done on an agent's word. Each finished piece of work carries evidence you can look at yourself." count={bare ? `${bare} done without proof` : undefined}>
      {done.length === 0 && <Empty>No finished work yet.</Empty>}
      {done.map(({ work, proofs }) => (
        <section key={work.id} className={styles.row}>
          <div className={`${styles.head} ${proofs.length ? '' : styles.bare}`}>
            <Link className={watch.nameSmall} href={href.work(book, work.id)}>{work.body.title}</Link>
            <Meta as="span">done {dayShort(work.at)}</Meta>
            {!proofs.length && <StatusPill status="event">No proof: done before the rule</StatusPill>}
          </div>
          <ProofList proofs={proofs} />
        </section>
      ))}
    </WatchSection>
  );
}
