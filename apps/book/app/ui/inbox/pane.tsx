// The open message: the toolbar, then the subject, sender and work, the why in reading type, and beside it the answer
// it needs, where its work stands and the links behind it.
import Link from 'next/link';
import { dayTime } from '../../../lib/book/format';
import type { Message } from '../../../lib/book/inbox';
import { href } from '../../../lib/routes';
import { InboxKeys } from '../inbox-keys';
import { Prose } from '../parts/prose';
import { Split } from '../parts/sheet';
import { NeedChip } from './chip';
import { Side } from './side';
import { Tools } from './tools';
import styles from './pane.module.css';

function Head({ m }: { m: Message }) {
  const on = m.from.workTitle
    ? <>, on <Link className={styles.workLink} href={href.work(m.book, m.from.work ?? '')}>{m.from.feature} › {m.from.workTitle}</Link></>
    : m.from.feature ? `, on ${m.from.feature}` : '';
  return (
    <>
      <h1 className={styles.subject}>{m.subject}</h1>
      <div className={styles.meta}>
        <span className={styles.av}>{m.from.agent.slice(0, 1)}</span>
        <span><b className={styles.who}>{m.from.agent}</b>{on}</span>
        <span className={styles.when}>{dayTime(m.at)} · {m.bookTitle} · <NeedChip needs={m.needs} /></span>
      </div>
      <div className={styles.body}><Prose text={m.text} dropTitle /></div>
    </>
  );
}

/** `base` is the book's inbox address; `here` the inbox's view as a query (folder, filter, tab), without the message. */
export function InboxPane({ message: m, editor, here, next, needWords, changed, keys, base }: {
  message: Message; editor: boolean; here: string; next?: string; needWords: boolean; changed: boolean; keys: string[]; base: string;
}) {
  const withMessage = `${base}${here}${here.length > 1 ? '&' : '?'}m=${encodeURIComponent(m.id)}`;
  return (
    <article>
      <InboxKeys keys={keys} current={m.key} base={`${base}${here}`} markRead={editor && !m.read} />
      <Tools m={m} editor={editor} here={here} next={next} back={`${base}${here}`} />
      <Split
        main={<Head m={m} />}
        side={<Side m={m} editor={editor} here={here} next={next} needWords={needWords} changed={changed} signIn={href.signIn(withMessage)} />}
      />
    </article>
  );
}
