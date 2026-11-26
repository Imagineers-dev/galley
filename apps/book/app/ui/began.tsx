// How a piece of work began: the editor's own words, quoted, or the earlier work or event it came from.
import { dayLong } from '../../lib/book/format';
import type { Origin } from '../../lib/book/types';
import { type Current, titleOf } from '../../lib/book/views';
import { href } from '../../lib/routes';
import styles from './began.module.css';
import { Quote } from './parts/quote';
import { TextLink } from './parts/text';

export function Began({ origin, now, book }: { origin: Origin; now: Current; book: string }) {
  if ('words' in origin) return <Quote text={origin.words} who={`You, ${dayLong(origin.saidOn)}`} />;
  const id = 'work' in origin ? origin.work : origin.event;
  const target = now.get(id);
  const to = target?.kind === 'event' ? href.feature(book, String(target.body.feature)) : href.any(book, id);
  return (
    <p className={styles.from}>
      Began from {'event' in origin ? 'what happened: ' : ''}
      {to ? <TextLink href={to}>{titleOf(now, id)}</TextLink> : titleOf(now, id)}
    </p>
  );
}
