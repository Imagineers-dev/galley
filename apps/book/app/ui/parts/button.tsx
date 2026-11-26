// Buttons and links styled as buttons. `main` is the one primary action of a screen; `quiet` sits in a toolbar.
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './button.module.css';

export type ButtonKind = 'plain' | 'main' | 'quiet' | 'small';
const KIND: Record<ButtonKind, string> = { plain: '', main: styles.main, quiet: styles.quiet, small: styles.small };

/** The look of a button, for a link drawn by another part (an agent's link in the inbox). */
export const buttonLook = (kind: ButtonKind = 'plain') => `${styles.button} ${KIND[kind]}`;

export function Button({ kind = 'plain', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind }) {
  return <button type="submit" {...rest} className={`${styles.button} ${KIND[kind]} ${className}`} />;
}

export function ButtonLink({ href, kind = 'plain', children }: { href: string; kind?: ButtonKind; children: ReactNode }) {
  return <Link href={href} className={`${styles.button} ${KIND[kind]}`}>{children}</Link>;
}

/** Buttons side by side, together at the start: controls never spread across a column. */
export const Buttons = ({ children }: { children: ReactNode }) => <div className={styles.group}>{children}</div>;
