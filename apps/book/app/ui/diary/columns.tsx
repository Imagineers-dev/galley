// The diary's two columns: the days, and the index of days beside them, kept in view. On a narrow screen the days
// stand alone: older days already fold to one line each.
import type { ReactNode } from 'react';
import styles from './columns.module.css';

export function DiaryColumns({ index, days }: { index: ReactNode; days: ReactNode }) {
  return (
    <div className={styles.columns}>
      <div className={styles.index}>{index}</div>
      <section className={styles.days} aria-label="The days">{days}</section>
    </div>
  );
}
