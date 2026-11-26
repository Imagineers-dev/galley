// The open message's toolbar: back to the list (on a phone), then, for the editor, filing it away, snoozing it,
// marking it unread, and opening the work it came from.
import Link from 'next/link';
import { addDays, dayOf } from '../../../lib/book/days';
import type { Message } from '../../../lib/book/inbox';
import { href } from '../../../lib/routes';
import { file } from '../../[book]/inbox/actions';
import { Hidden } from './hidden';
import { Button, buttonLook } from '../parts/button';
import styles from './tools.module.css';

const plusDays = (n: number) => addDays(dayOf(Date.now()), n);

export function Tools({ m, editor, here, next, back }: { m: Message; editor: boolean; here: string; next?: string; back: string }) {
  const fileButton = (state: string, label: string, until?: string, id?: string) => (
    <form action={file}>
      <Hidden m={m} here={here} next={next} />
      <input type="hidden" name="state" value={state} />
      {until && <input type="hidden" name="until" value={until} />}
      <Button id={id} kind="small">{label}</Button>
    </form>
  );
  return (
    <div className={styles.tools}>
      <span className={styles.back}><Link className={buttonLook('small')} href={back}>← All messages</Link></span>
      {editor && (<>
        {m.folder === 'archived' || m.folder === 'snoozed' ? fileButton('inbox', 'Move to inbox') : fileButton('archived', 'Archive', undefined, 'archive-btn')}
        {m.folder === 'inbox' && fileButton('snoozed', 'Snooze to tomorrow', plusDays(1))}
        {m.folder === 'inbox' && fileButton('snoozed', 'Snooze a week', plusDays(7))}
        {m.read && m.folder === 'inbox' && fileButton('inbox', 'Mark unread')}
        {m.from.work && <Link className={buttonLook('small')} href={href.work(m.book, m.from.work)}>Open the work ↗</Link>}
      </>)}
    </div>
  );
}
