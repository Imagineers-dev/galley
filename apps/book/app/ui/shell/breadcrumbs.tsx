// Where you are: from the book to this page. Each step but the last is a link; the last is bold. An aside (counts,
// a state) sits at the right.
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import styles from './breadcrumbs.module.css';

export type Crumb = { label: string; to?: string };

export function Breadcrumbs({ trail, aside }: { trail: Crumb[]; aside?: ReactNode }) {
  return (
    <nav className={styles.crumbs} aria-label="Where you are">
      <span className={styles.trail}>
        {trail.map((c, i) => (
          <Fragment key={`${i}-${c.label}`}>
            {i > 0 && <i className={styles.sep} aria-hidden>›</i>}
            {c.to && i < trail.length - 1 ? <Link href={c.to}>{c.label}</Link> : <b aria-current="page">{c.label}</b>}
          </Fragment>
        ))}
      </span>
      <span>{aside}</span>
    </nav>
  );
}
