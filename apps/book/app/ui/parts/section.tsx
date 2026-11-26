// A section of a page, and the small capital label that names a group anywhere (a card's kicker, a rail's heading).
import type { ReactNode } from 'react';
import styles from './section.module.css';

/** `canvas` is a label on the dark sidebar. */
export type LabelTone = 'plain' | 'waiting' | 'event' | 'words' | 'canvas';
const TONE: Record<LabelTone, string> = { plain: '', waiting: styles.waiting, event: styles.event, words: styles.words, canvas: styles.canvas };

/** The space under a label: none (inline beside something), small (above a short list), or a section's. */
export type LabelGap = 'none' | 'small' | 'section';
const GAP: Record<LabelGap, string> = { none: '', small: styles.gapSmall, section: styles.gapSection };

export function Label({ children, tone = 'plain', gap = 'small', as: Tag = 'p' }: { children: ReactNode; tone?: LabelTone; gap?: LabelGap; as?: 'p' | 'span' | 'h2' | 'h3' | 'h4' }) {
  return <Tag className={`${styles.label} ${TONE[tone]} ${GAP[gap]}`}>{children}</Tag>;
}

export function Section({ title, lede, count, tone, variant = 'label', id, children }: {
  title: ReactNode; lede?: ReactNode; count?: ReactNode; tone?: LabelTone; variant?: 'label' | 'title'; id?: string; children?: ReactNode;
}) {
  return (
    <section className={styles.section} id={id}>
      {variant === 'title' ? <h2 className={styles.title}>{title}</h2> : <Label as="h2" tone={tone} gap="section">{title}</Label>}
      {lede && <p className={variant === 'title' ? styles.ledeLarge : styles.lede}>{lede}</p>}
      {count && <p className={styles.count}>{count}</p>}
      {children}
    </section>
  );
}
