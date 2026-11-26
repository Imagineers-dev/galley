// A feature's story: its pieces of work and the events between them, in the order they happened. Each work says where
// it stands, how many of its papers wait on the editor, and whether it served them; each event, what it led to.
import Link from 'next/link';
import { SERVED_WORDS, STATE_WORDS, dayLong } from '../../../lib/book/format';
import { type Current, linksOf, papersOf, replacedBy, storyOf, titleOf } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { StatusPill, statusOf } from '../parts/status';
import { TextLink } from '../parts/text';
import styles from './story.module.css';

const MARK = { done: styles.markDone, now: styles.markNow, next: styles.markNext, replaced: styles.markPlain, event: styles.markEvent } as const;

export function Story({ book, now, featureId }: { book: string; now: Current; featureId: string }) {
  const replaced = replacedBy(now);
  return (
    <ol className={styles.story}>
      {storyOf(now, featureId).map((s) => {
        if (s.type === 'event') {
          const leads = linksOf(now, s.item.id).filter((l) => l.body.kind === 'leads-to' && l.body.from === s.item.id);
          return (
            <li key={s.item.id} className={styles.entry}>
              <i className={`${styles.mark} ${MARK.event}`} />
              <div className={styles.when}>{dayLong(s.item.body.on)} <StatusPill status="event">what happened</StatusPill></div>
              <div className={styles.title}>{s.item.body.title}</div>
              <p className={styles.text}>{s.item.body.text}</p>
              {leads.map((l) => (
                <div key={l.id} className={styles.meta}>Led to <TextLink href={href.any(book, l.body.to) ?? '#'}>{titleOf(now, l.body.to)}</TextLink></div>
              ))}
            </li>
          );
        }
        const w = s.item.body;
        const waiting = papersOf(now, s.item.id).filter((p) => p.editor && p.state.status === 'waiting').length;
        const isReplaced = replaced.has(s.item.id);
        return (
          <li key={s.item.id} className={styles.entry}>
            <i className={`${styles.mark} ${MARK[isReplaced ? 'replaced' : w.state]}`} />
            <div className={styles.when}>
              {dayLong(w.on)}{' '}
              <StatusPill status={isReplaced ? 'plain' : statusOf(w.state)} struck={isReplaced}>{isReplaced ? 'replaced' : STATE_WORDS[w.state]}</StatusPill>
              {waiting > 0 && <StatusPill status="waiting">{waiting} to read</StatusPill>}
            </div>
            <div className={styles.title}><Link href={href.work(book, s.item.id)}>{w.title}</Link></div>
            <p className={styles.text}>{w.summary}</p>
            {w.verdict && <div className={styles.meta}>For you: {SERVED_WORDS[w.verdict.served].toLowerCase()}{w.verdict.words ? `. ${w.verdict.words}` : ''}</div>}
          </li>
        );
      })}
    </ol>
  );
}
