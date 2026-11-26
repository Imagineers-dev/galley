// One stop on a step's path: what to do, who made it, why it is here, its video or source, and the editor's tick.
import type { LessonPointer } from '../../../lib/book/lesson';
import { minutesWords } from '../../../lib/book/lesson';
import { tick } from '../../study-actions';
import { Button } from '../parts/button';
import { Label } from '../parts/section';
import { StatusPill } from '../parts/status';
import styles from './lesson.module.css';
import { Video } from './video';

export type Marking = { book: string; work: string; here: string; editor: boolean; past: boolean };

function Tick({ p, marking }: { p: LessonPointer; marking: Marking }) {
  if (marking.past || !marking.editor) return p.done ? <StatusPill status="done" small>Done</StatusPill> : null;
  return (
    <form action={tick}>
      <input type="hidden" name="book" value={marking.book} />
      <input type="hidden" name="work" value={marking.work} />
      <input type="hidden" name="pointer" value={p.key} />
      <input type="hidden" name="here" value={marking.here} />
      <input type="hidden" name="done" value={p.done ? 'no' : 'yes'} />
      <Button kind="small" aria-pressed={p.done} aria-label={`${p.title}: ${p.done ? 'done, press to undo' : 'mark done'}`}>{p.done ? '✓ Done' : 'Mark done'}</Button>
    </form>
  );
}

function Media({ p }: { p: LessonPointer }) {
  if (!p.to) return null;
  if (p.video) {
    return (
      <>
        <Video id={p.video.id} start={p.video.start} title={p.title} length={p.minutes ? minutesWords(p.minutes) : undefined} />
        <a className={styles.open} href={p.to} target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>
      </>
    );
  }
  return (
    <a className={styles.source} href={p.to} {...(p.domain ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      <span className={styles.sourceTitle}>{p.title}</span>
      <span className={styles.sourceDomain}>{p.domain ?? 'In this book'}{p.domain ? ' ↗' : ''}</span>
    </a>
  );
}

export function LessonStop({ p, n, marking }: { p: LessonPointer; n: number; marking: Marking }) {
  return (
    <li id={p.key} className={styles.stop}>
      <span className={p.done ? styles.numberDone : styles.number} aria-hidden="true">{p.done ? '✓' : n}</span>
      <div className={styles.stopBody}>
        <div className={styles.stopHead}><Label as="span" gap="none">{p.label}</Label><Tick p={p} marking={marking} /></div>
        <h2 className={styles.stopTitle}>{p.title}</h2>
        {p.by && <p className={styles.by}>by {p.by}</p>}
        {p.why && <p className={styles.why}>{p.why}</p>}
        <Media p={p} />
      </div>
    </li>
  );
}
