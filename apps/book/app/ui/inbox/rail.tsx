// The inbox's rail: its folders with their counts, then the needs a message can have, each a filter.
import Link from 'next/link';
import type { Needs } from '../../../lib/book/inbox-types';
import { Label } from '../parts/section';
import { StatusDot } from '../parts/status';
import { NEED_STATUS } from './needs';
import styles from './rail.module.css';

export type RailItem = { label: string; href: string; on: boolean; n: number };

function Item({ item, need }: { item: RailItem; need?: Exclude<Needs, 'wrong'> }) {
  return (
    <Link href={item.href} className={`${styles.item} ${item.on ? styles.on : styles.off}`}>
      {need && <StatusDot status={NEED_STATUS[need]} />}
      {item.label}
      {item.n > 0 && <span className={`${styles.count} ${item.on ? styles.countOn : styles.countOff}`}>{item.n}</span>}
    </Link>
  );
}

export function Rail({ folders, needs }: { folders: RailItem[]; needs: (RailItem & { need: Exclude<Needs, 'wrong'> })[] }) {
  return (
    <>
      {folders.map((f) => <Item key={f.label} item={f} />)}
      <div className={styles.needs}>
        <div className={styles.head}><Label gap="none">Needs</Label></div>
        {needs.map((n) => <Item key={n.need} item={n} need={n.need} />)}
      </div>
    </>
  );
}
