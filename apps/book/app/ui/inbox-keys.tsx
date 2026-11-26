'use client';
// The inbox's keyboard, as in mail: j and k move, e archives, ⌘↵ sends. Opening an unread message marks it read.
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { opened } from '../[book]/inbox/actions';

/** `base` is the inbox's address with its view (folder, filter, tab); j and k open the next message in it. */
export function InboxKeys({ keys, current, base, markRead }: { keys: string[]; current: string; base: string; markRead: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (markRead) opened(current).then(() => router.refresh());
  }, [current, markRead, router]);
  useEffect(() => {
    const go = (key?: string) =>
      key && router.push(`${base}${base.includes('?') ? '&' : '?'}m=${encodeURIComponent(key.slice(key.indexOf('~') + 1))}`, { scroll: false });
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(TEXTAREA|INPUT|SELECT)$/.test(e.target.tagName);
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) return (e.target as HTMLElement).closest('form')?.requestSubmit();
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const at = keys.indexOf(current);
      if (e.key === 'j') go(keys[at + 1]);
      if (e.key === 'k') go(keys[at - 1]);
      if (e.key === 'e') document.getElementById('archive-btn')?.click();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, current, base, router]);
  return null;
}
