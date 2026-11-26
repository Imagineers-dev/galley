// A number in a badge, coloured by what it counts. Nothing is shown for zero.
import styles from './count.module.css';

export type CountTone = 'waiting' | 'event' | 'muted';
const TONE: Record<CountTone, string> = { waiting: styles.waiting, event: styles.event, muted: '' };

export function Count({ n, tone = 'muted', label }: { n: number; tone?: CountTone; label?: string }) {
  if (!n) return null;
  return <span className={`${styles.count} ${TONE[tone]}`} title={label}>{n}</span>;
}
