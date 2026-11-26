// Every piece of work in a feature, one row each in the feature's own order: its title (opening it), where it stands,
// what it is, and its eight stages on the shared track.
import Link from 'next/link';
import { STATE_WORDS } from '../../../lib/book/format';
import { workStages } from '../../../lib/book/work-stages';
import { type Current, replacedBy, storyOf } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { Section } from '../parts/section';
import { StatusPill, statusOf } from '../parts/status';
import { Meta } from '../parts/text';
import { StageTrack } from '../stage-track';
import styles from './work-stage-rows.module.css';

export function WorkStageRows({ book, now, featureId }: { book: string; now: Current; featureId: string }) {
  const works = storyOf(now, featureId).flatMap((s) => (s.type === 'work' ? [s.item] : []));
  const replaced = replacedBy(now);
  return (
    <Section title="Its work, stage by stage">
      {works.length === 0 ? <Meta>No work in this feature yet.</Meta> : (
        <ol className={styles.rows}>
          {works.map((w) => {
            const gone = replaced.has(w.id);
            return (
              <li key={w.id} className={styles.row}>
                <div className={styles.about}>
                  <div className={styles.head}>
                    <Link className={styles.title} href={href.work(book, w.id)}>{w.body.title}</Link>
                    <StatusPill small status={gone ? 'plain' : statusOf(w.body.state)} struck={gone}>{gone ? 'replaced' : STATE_WORDS[w.body.state]}</StatusPill>
                  </div>
                  <p className={styles.summary}>{w.body.summary}</p>
                </div>
                <StageTrack stages={workStages(now, w)} />
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
