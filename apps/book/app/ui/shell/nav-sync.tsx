'use client';
// Around the sidebar's tree: it keeps which entries are open in the book's cookie, so the next page is drawn the same
// way, and opens the way down to the page you go to (every entry above its link, and the entry itself).
import { usePathname, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';
import { keptValue, navCookie } from '../../../lib/book/nav-open';

const YEAR = 365 * 86_400;

export function NavSync({ book, children }: { book: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const keep = () => {
      const open = [...root.querySelectorAll<HTMLDetailsElement>('details[data-node][open]')].map((d) => d.dataset.node ?? '');
      document.cookie = `${navCookie(book)}=${keptValue(open)}; path=/; max-age=${YEAR}; samesite=lax`;
    };
    root.addEventListener('toggle', keep, true); // toggle does not bubble: listen as it goes down
    return () => root.removeEventListener('toggle', keep, true);
  }, [book]);

  useEffect(() => {
    const here = search ? `${path}?${search}` : path;
    // The deepest link that is this page, or a page above it (a feature holds its works).
    const links = [...(box.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])].filter((a) => {
      const to = a.getAttribute('href') ?? '';
      return here === to || (!to.includes('?') && path.startsWith(`${to}/`));
    });
    const best = links.sort((a, b) => (b.getAttribute('href') ?? '').length - (a.getAttribute('href') ?? '').length)[0];
    for (let d = best?.closest<HTMLDetailsElement>('details[data-node]') ?? null; d; d = d.parentElement?.closest<HTMLDetailsElement>('details[data-node]') ?? null) {
      if (!d.open) d.open = true;
    }
  }, [path, search]);

  return <div ref={box}>{children}</div>;
}
