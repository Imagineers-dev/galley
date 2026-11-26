// Small text parts used across the pages.
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './text.module.css';

/** A quiet line of metadata: dates, counts, who and where. */
export const Meta = ({ children, as: Tag = 'p' }: { children: ReactNode; as?: 'p' | 'span' }) => <Tag className={styles.meta}>{children}</Tag>;

/** Two ends of a line, spread apart: a name and its state, a label and its action. */
export const Row = ({ children }: { children: ReactNode }) => <div className={styles.row}>{children}</div>;

/** A link inside text: ink, underlined. */
export const TextLink = ({ href, children }: { href: string; children: ReactNode }) => <Link className={styles.link} href={href}>{children}</Link>;

/** What a page shows when it has nothing yet: quiet, in the same tones, saying what will appear. */
export const Empty = ({ children }: { children: ReactNode }) => <div className={styles.empty}>{children}</div>;
