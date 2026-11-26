'use client';
// Keeps an open page of a book current: it listens for the book's changes and redraws the page from the server when
// one comes (router.refresh keeps what you typed and where you scrolled). At most one redraw every two seconds; none
// while you are typing in a field, while slides are presented full screen or while the tab is hidden (the page catches
// up when you are done or come back); and never
// on a past day, which does not change. A hidden tab lets go of its connection, so many tabs never starve the browser.
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const FLOOR_MS = 2000;

export function LiveRefresh({ book, past }: { book: string; past: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (past) return;
    let source: EventSource | null = null;
    let seen: string | null = null;
    let pending = false;
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const typing = () => document.activeElement instanceof HTMLElement && document.activeElement.matches('input, textarea, select, [contenteditable]');
    const idle = () => document.visibilityState === 'visible' && !document.fullscreenElement && !typing();
    const redraw = () => {
      if (!pending || !idle()) return;
      const wait = last + FLOOR_MS - Date.now();
      if (wait > 0) {
        clearTimeout(timer);
        timer = setTimeout(redraw, wait);
        return;
      }
      pending = false;
      last = Date.now();
      router.refresh();
    };
    // Focus has moved on once focusout is over: redraw then, unless it moved to another field.
    const afterFocus = () => setTimeout(redraw, 0);
    const open = () => {
      source?.close();
      source = new EventSource(`/api/changes/${book}`);
      source.onmessage = (e) => {
        if (seen !== null && e.data && e.data !== seen) pending = true;
        seen = e.data || seen;
        redraw();
      };
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') open();
      else { source?.close(); source = null; }
    };
    open();
    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('fullscreenchange', redraw);
    document.addEventListener('focusout', afterFocus);
    return () => {
      source?.close();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('fullscreenchange', redraw);
      document.removeEventListener('focusout', afterFocus);
    };
  }, [book, past, router]);
  return null;
}
