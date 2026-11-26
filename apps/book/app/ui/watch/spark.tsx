// A small line of values over time, with the limit or target as a dashed line.
import styles from './spark.module.css';

export function Spark({ values, line, bad = false }: { values: number[]; line?: number; bad?: boolean }) {
  if (values.length === 0) return null;
  const all = line === undefined ? values : [...values, line];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const y = (v: number) => (hi === lo ? 20 : 36 - ((v - lo) / (hi - lo)) * 32);
  const x = (i: number) => (values.length === 1 ? 110 : (i / (values.length - 1)) * 216 + 2);
  return (
    <svg className={`${styles.spark} ${bad ? styles.bad : styles.plain}`} viewBox="0 0 220 40" preserveAspectRatio="none" aria-hidden>
      {line !== undefined && <line x1="0" x2="220" y1={y(line)} y2={y(line)} className={styles.line} />}
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3" />
    </svg>
  );
}
