// A link an agent wrote: inside the book it is an ordinary link; outside it opens in a new tab and shows its domain,
// so the editor sees where it goes. A link that fails the rule (lib/book/links.ts) is shown as plain text.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { linkTarget } from '../../lib/book/links';
import styles from './agent-link.module.css';

/** `className` gives the link another look (a pill in the inbox); without one it is a text link. */
export function AgentLink({ href, className = styles.link, children }: { href: string; className?: string; children: ReactNode }) {
  const target = linkTarget(href);
  if (!target) return <span className={className}>{children}</span>;
  if (target.inside) return <Link className={className} href={target.to}>{children}</Link>;
  return (
    <a className={className} href={target.to} target="_blank" rel="noreferrer">
      {children} <span className={styles.domain}>({target.domain})</span>
    </a>
  );
}
