'use client';
// A video in the page: its picture and a play button. The real player loads only when the reader presses play, so until
// then the page fetches nothing from YouTube but the picture.
import { useState } from 'react';
import { clockWords, videoPicture, videoPlayer } from '../../../lib/book/video';
import styles from './video.module.css';

export function Video({ id, start, title, length }: { id: string; start: number | null; title: string; length?: string }) {
  const tag = [length, start ? `from ${clockWords(start)}` : null].filter(Boolean).join(' · ');
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <div className={styles.frame}>
        <iframe className={styles.player} src={videoPlayer(id, start)} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      </div>
    );
  }
  return (
    <button type="button" className={styles.poster} onClick={() => setPlaying(true)} aria-label={`Play ${title}`}>
      <img className={styles.picture} src={videoPicture(id)} alt="" loading="lazy" referrerPolicy="no-referrer" />
      <span className={styles.play} aria-hidden="true">▶</span>
      {tag && <span className={styles.length}>{tag}</span>}
    </button>
  );
}
