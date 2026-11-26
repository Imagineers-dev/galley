'use client';
// A sidebar link that knows when you are on its page: it is marked, and announced as the current page.
// `primary` items (Now) carry an icon and a count; `top` items are a feature at the head of the tree; the rest
// (a feature's parts, the watch pages) are plain.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './nav-item.module.css';

export type NavKind = 'primary' | 'top' | 'plain';

/** `exact`: only this address. `within`: this address or anything under it (a feature and its works). */
export function NavItem({ to, match = 'exact', kind = 'plain', children }: { to: string; match?: 'exact' | 'within'; kind?: NavKind; children: ReactNode }) {
  const path = usePathname();
  const on = path === to || (match === 'within' && path.startsWith(`${to}/`));
  const variant = kind === 'primary' ? styles.primary : kind === 'top' ? styles.top : '';
  return (
    <Link href={to} className={`${styles.item} ${variant} ${on ? styles.on : ''}`} aria-current={on ? 'page' : undefined}>
      {children}
    </Link>
  );
}
