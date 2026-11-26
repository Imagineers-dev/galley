// The parts of a decision's page: a fact under its small label, the options with the chosen one marked, and the
// decision's history from the first version to the one in force.
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import type { Decision } from '../../../lib/book/types';
import type { Entry } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { Label } from '../parts/section';
import { StatusPill } from '../parts/status';
import styles from './decision.module.css';

export const DecisionTitle = ({ children }: { children: ReactNode }) => <h1 className={styles.title}>{children}</h1>;

/** One fact about the decision; `size` small for short facts beside the reading. */
export function Fact({ label, size = 'text', children }: { label: string; size?: 'text' | 'small' | 'free'; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <Label>{label}</Label>
      {size === 'free' ? children : <p className={size === 'small' ? styles.small : styles.text}>{children}</p>}
    </div>
  );
}

export function Options({ d }: { d: Decision }) {
  return (
    <div className={styles.options}>
      <div className={styles.chosen}><b className={styles.name}>{d.chosen}</b><span className={styles.why}>Chosen. {d.why}</span></div>
      {d.turnedDown.map((o) => (
        <div key={o.option} className={styles.option}><b className={styles.name}>{o.option}</b>{o.whyNot && <span className={styles.why}>Turned down: {o.whyNot}</span>}</div>
      ))}
    </div>
  );
}

export function History({ book, line, replaced }: { book: string; line: Entry<Decision>[]; replaced: Map<string, string> }) {
  return (
    <div className={styles.chain}>
      {line.map((x, i) => (
        <Fragment key={x.id}>
          {i > 0 && <span className={styles.arrow} aria-hidden>→</span>}
          <Link href={href.decision(book, x.id)}>
            <StatusPill status={replaced.has(x.id) ? 'plain' : 'done'} struck={replaced.has(x.id)}>{x.body.chosen}</StatusPill>
          </Link>
        </Fragment>
      ))}
    </div>
  );
}
