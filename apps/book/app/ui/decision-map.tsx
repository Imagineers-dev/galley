// The decision map: time runs down the page, each part of the feature is a column, every decision sits in its column
// at the moment it was made. Replaced decisions stay, hollow and struck through, naming what replaced them. Events that
// led to decisions cross all columns. Vertical, so it stays readable however long the history grows.
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { MapPoint } from '../../lib/book/decisions';
import { BOOK_TIME_ZONE } from '../../lib/book/days';
import { dayShort, timeOfDay } from '../../lib/book/format';
import { href } from '../../lib/routes';
import styles from './decision-map.module.css';
import { Label } from './parts/section';
import { ReaderOnly } from './parts/sheet';
import { Meta } from './parts/text';

/** A decision recorded with a day only (midnight UTC) has no time of its own to show. */
const clock = (iso: string) => (iso.endsWith('T00:00:00.000Z') || iso.length === 10 ? '' : timeOfDay(iso));

export function DecisionMap({ book, points, lanes, all, toggleHref }: {
  book: string; points: MapPoint[]; lanes: string[]; all: boolean; toggleHref: { all: string; inForce: string };
}) {
  if (points.length === 0) return <Meta>No decisions recorded yet.</Meta>;
  const chosen = new Map(points.flatMap((p) => (p.type === 'decision' ? [[p.id, p.d.body.chosen] as const] : [])));
  const card = (id: string) => href.decision(book, id);

  return (
    <div>
      <div className={styles.bar}>
        <Meta as="span">Time runs down the page · times in {BOOK_TIME_ZONE}</Meta>
        <span className={styles.toggle}>
          <Link href={toggleHref.all} className={all ? styles.optionOn : styles.option} aria-current={all ? 'true' : undefined}>Everything ever decided</Link>
          <Link href={toggleHref.inForce} className={all ? styles.option : styles.optionOn} aria-current={all ? undefined : 'true'}>In force</Link>
        </span>
      </div>
      <div className={styles.scroll}>
      <div className={styles.grid} style={{ '--lanes': lanes.length } as CSSProperties} role="table" aria-label="Decisions by time and by the part of the feature they shape">
        <div className={styles.row} role="row">
          <span className={styles.lane} role="columnheader"><ReaderOnly>When</ReaderOnly></span>
          {lanes.map((lane) => <span key={lane} className={styles.lane} role="columnheader"><Label as="span" gap="none">{lane}</Label></span>)}
        </div>
        {points.map((p, i) => {
          const day = dayShort(p.when);
          const newDay = i === 0 || dayShort(points[i - 1].when) !== day;
          const time = (
            <span className={styles.when} role="cell">
              {newDay && <b className={styles.day}>{day}</b>}
              <span>{clock(p.when)}</span>
            </span>
          );
          if (p.type === 'event') {
            return (
              <div key={p.id} className={styles.row} role="row">
                {time}
                <span className={styles.event} role="cell">
                  <i className={styles.eventMark} /> {p.e.body.title}
                </span>
              </div>
            );
          }
          const replaced = !!p.replacedBy;
          return (
            <div key={p.id} className={styles.row} role="row">
              {time}
              {lanes.map((lane) =>
                lane === p.lane ? (
                  <span key={lane} className={styles.node} role="cell">
                    <Link href={card(p.id)} className={styles.nodeLink}>
                      <i className={replaced ? styles.dotReplaced : styles.dot} />
                      <span>
                        <span className={replaced ? styles.chosenReplaced : styles.chosen}>{p.d.body.chosen}</span>
                        {replaced && <span className={styles.by}>replaced by {chosen.get(String(p.replacedBy)) ?? 'a later decision'}</span>}
                      </span>
                    </Link>
                  </span>
                ) : (
                  <span key={lane} className={styles.cell} role="cell" />
                ),
              )}
            </div>
          );
        })}
      </div>
      </div>
      <div className={styles.legend}>
        <span><i className={`${styles.key} ${styles.keyIn}`} />In force</span>
        <span><i className={`${styles.key} ${styles.keyOut}`} />Replaced: still readable, naming what replaced it</span>
        <span><i className={`${styles.key} ${styles.keyEvent}`} />What happened</span>
        <span>Open any decision to read it in full</span>
      </div>
    </div>
  );
}
