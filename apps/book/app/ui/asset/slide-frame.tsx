'use client';
// Slides and HTML pages, shown in a frame of their own: the file runs sandboxed in an origin of its own (no access to
// the book or the editor's sign-in), and Present fills the screen with it, so the team can be walked through a deck.
import { useRef } from 'react';
import { SANDBOX_TOKENS } from '../../../lib/book/file-types';
import styles from './slide-frame.module.css';

export function SlideFrame({ src, title, slides }: { src: string; title: string; slides: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const present = async () => {
    await box.current?.requestFullscreen().catch(() => undefined);
    frame.current?.focus();
  };
  return (
    <div className={styles.wrap}>
      <div ref={box} className={slides ? styles.deck : styles.page}>
        <iframe ref={frame} className={styles.frame} src={src} title={title} sandbox={SANDBOX_TOKENS} allow="fullscreen" />
      </div>
      <div className={styles.bar}>
        <button type="button" className={styles.present} onClick={present}>{slides ? 'Present' : 'Full screen'}</button>
        <a className={styles.open} href={src} target="_blank" rel="noopener">Open in a new tab</a>
      </div>
    </div>
  );
}
