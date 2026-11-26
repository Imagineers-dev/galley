// A card, its title, and a list of cards. A card given `href` is a link.
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './card.module.css';

export type CardTone = 'plain' | 'waiting' | 'done' | 'event';
const TONE: Record<CardTone, string> = { plain: '', waiting: styles.waiting, done: styles.done, event: styles.event };

/**
 * `flush` gives the card no padding, for a card made of linked bands that fill it edge to edge; `flat` takes away its
 * shadow, for a card that is a step in a row rather than a sheet on the page.
 */
export function Card({ href, tone = 'plain', flush = false, flat = false, children }: { href?: string; tone?: CardTone; flush?: boolean; flat?: boolean; children: ReactNode }) {
  const className = `${styles.card} ${flush ? styles.flush : styles.padded} ${TONE[tone]} ${flat ? styles.flat : ''}`;
  return href ? <Link href={href} className={`${className} ${styles.link}`}>{children}</Link> : <div className={className}>{children}</div>;
}

export const CardTitle = ({ children }: { children: ReactNode }) => <span className={styles.title}>{children}</span>;

export const Cards = ({ children }: { children: ReactNode }) => <div className={styles.list}>{children}</div>;
