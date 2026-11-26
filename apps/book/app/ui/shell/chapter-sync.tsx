'use client';
// Around the sidebar's chapters (native <details name>, so one is open at a time): it keeps which one is open in the
// book's cookie, so the next page is drawn the same way, and opens the chapter holding the page you go to.
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';
import { chapterCookie } from '../../../lib/book/chapters';

const YEAR = 365 * 86_400;

export function ChapterSync({ book, children }: { book: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const keep = () => {
      const open = root.querySelector<HTMLDetailsElement>('details[data-chapter][open]');
      document.cookie = `${chapterCookie(book)}=${encodeURIComponent(open?.dataset.chapter ?? '')}; path=/; max-age=${YEAR}; samesite=lax`;
    };
    root.addEventListener('toggle', keep, true); // toggle does not bubble: listen as it goes down
    return () => root.removeEventListener('toggle', keep, true);
  }, [book]);

  useEffect(() => {
    // The chapter holding the deepest link that is this page or a page above it (a feature holds its works).
    const links = [...(box.current?.querySelectorAll<HTMLAnchorElement>('details[data-chapter] a[href]') ?? [])];
    const within = links.filter((a) => { const to = a.getAttribute('href') ?? ''; return path === to || path.startsWith(`${to}/`); });
    const best = within.sort((a, b) => (b.getAttribute('href') ?? '').length - (a.getAttribute('href') ?? '').length)[0];
    const here = best?.closest<HTMLDetailsElement>('details[data-chapter]');
    if (here && !here.open) here.open = true;
  }, [path]);

  return <div ref={box}>{children}</div>;
}
