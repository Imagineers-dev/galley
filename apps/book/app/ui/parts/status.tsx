// A state shown the one way the book shows states (STYLE_GUIDE.md "Rules"). Callers name the state; the colour follows.
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './status.module.css';

export type Status = 'done' | 'underway' | 'next' | 'waiting' | 'event' | 'plain';
const TONE: Record<Status, string> = { done: styles.done, underway: styles.underway, next: '', waiting: styles.waiting, event: styles.event, plain: '' };
const DOT: Record<Status, string> = { done: styles.dotDone, underway: styles.dotUnderway, next: styles.dotNext, waiting: styles.dotWaiting, event: styles.dotEvent, plain: styles.dotPlain };

/** The states the book's records carry, mapped to the one colour each means. */
export const statusOf = (state: string): Status =>
  ({ done: 'done', approved: 'done', now: 'underway', next: 'next', waiting: 'waiting', changes: 'event', event: 'event', wrong: 'event' } as Record<string, Status>)[state] ?? 'plain';

/** `small` is the tag beside a message or a row; the default sits beside a title. */
export function StatusPill({ status, struck = false, small = false, children }: { status: Status; struck?: boolean; small?: boolean; children: ReactNode }) {
  return <span className={`${styles.pill} ${TONE[status]} ${struck ? styles.struck : ''} ${small ? styles.small : ''}`}>{children}</span>;
}

export function StatusDot({ status, label }: { status: Status; label?: string }) {
  return <i className={`${styles.dot} ${DOT[status]}`} title={label} aria-label={label} role={label ? 'img' : undefined} />;
}

/** One line saying how things stand, with a dot in its colour: waiting on you, something wrong, or all is well. */
export type LineTone = 'waiting' | 'event' | 'done';
const LINE: Record<LineTone, string> = { waiting: styles.lineWaiting, event: styles.lineEvent, done: styles.lineDone };

export function StateLine({ tone, href, children }: { tone: LineTone; href?: string; children: ReactNode }) {
  return <p className={`${styles.line} ${LINE[tone]}`}>{href ? <Link href={href}>{children}</Link> : children}</p>;
}
