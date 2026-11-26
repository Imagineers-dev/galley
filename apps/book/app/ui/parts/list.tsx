// One entry in a list: reading text, with a note under it or a side at the right (a date, a sha, a relation).
import type { ReactNode } from 'react';
import styles from './list.module.css';

export function Item({ children, note, side, struck = false }: { children: ReactNode; note?: ReactNode; side?: ReactNode; struck?: boolean }) {
  const text = <span className={struck ? styles.struck : styles.text}>{children}</span>;
  return (
    <div className={`${styles.item} ${side ? styles.spread : ''}`}>
      {side ? <>{text}<span className={styles.side}>{side}</span></> : text}
      {note && <div className={styles.note}>{note}</div>}
    </div>
  );
}
