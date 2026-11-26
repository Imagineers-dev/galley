// Decisions told as how the work works: grouped by the part of the feature they shape, each saying what it means.
import Link from 'next/link';
import { dayLong } from '../../lib/book/format';
import type { Decision } from '../../lib/book/types';
import type { Entry } from '../../lib/book/views';
import { href } from '../../lib/routes';
import styles from './decisions-told.module.css';
import { Meta } from './parts/text';

export function DecisionsTold({ book, list, replaced, lanes }: { book: string; list: Entry<Decision>[]; replaced: Map<string, string>; lanes: string[] }) {
  if (list.length === 0) return <Meta>Nothing decided yet.</Meta>;
  return (
    <>
      {lanes.map((lane) => (
        <section key={lane} className={styles.lane}>
          <h3 className={styles.laneTitle}>{lane}</h3>
          {list
            .filter((d) => d.body.shapes === lane)
            .sort((a, b) => a.body.madeAt.localeCompare(b.body.madeAt))
            .map((d) => (
              <Link key={d.id} href={href.decision(book, d.id)} className={styles.decision}>
                <div className={replaced.has(d.id) ? styles.chosenReplaced : styles.chosen}>{d.body.chosen}</div>
                {d.body.means && <div className={styles.means}>{d.body.means}</div>}
                <div className={styles.why}>
                  {d.body.words ? <span className={styles.words}>“{d.body.words.text}”</span> : d.body.why}
                  {' · '}
                  {dayLong(d.body.madeAt)}
                  {replaced.has(d.id) && ' · replaced'}
                </div>
              </Link>
            ))}
        </section>
      ))}
    </>
  );
}
