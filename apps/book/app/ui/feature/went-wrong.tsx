// What went wrong in a feature over time, newest first: the day, what happened, the promises it broke (or that no
// promise covered it yet), and the work it led to.
import { dayShort } from '../../../lib/book/format';
import type { Current } from '../../../lib/book/views';
import { wentWrong } from '../../../lib/book/went-wrong';
import { href } from '../../../lib/routes';
import { Item } from '../parts/list';
import { Section } from '../parts/section';
import { StatusDot } from '../parts/status';
import { Meta, TextLink } from '../parts/text';
import styles from './went-wrong.module.css';

export function WentWrong({ book, now, featureId }: { book: string; now: Current; featureId: string }) {
  const events = wentWrong(now, featureId);
  return (
    <Section title="What went wrong, over time" count={events.length > 0 ? `${events.length} ${events.length === 1 ? 'time' : 'times'}` : undefined}>
      {events.length === 0 && <Meta>Nothing has gone wrong here yet.</Meta>}
      {events.map((e) => (
        <Item key={e.id} side={dayShort(e.on)} note={
          <>
            <span className={styles.text}>{e.text}</span>
            {e.broke.map((p) => <span key={p.id} className={styles.broke}>Broke: {p.text}</span>)}
            {e.noPromiseYet && <span className={styles.line}>No promise covered this yet.</span>}
            {e.ledTo.map((w) => <span key={w.id} className={styles.line}>Led to <TextLink href={href.work(book, w.id)}>{w.title}</TextLink></span>)}
          </>
        }>
          <span className={styles.title}><StatusDot status="event" label="Went wrong" />{e.title}</span>
        </Item>
      ))}
    </Section>
  );
}
