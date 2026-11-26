// The editor's answer bar under a paper. The buttons keep their place on every paper, asking for changes
// needs words, and an answer already given can be changed (a new answer on top; the old one stays in history).
import { dayLong } from '../../lib/book/format';
import type { PaperState } from '../../lib/book/views';
import { href } from '../../lib/routes';
import { answer } from '../actions';
import styles from './answer.module.css';
import { Button, ButtonLink } from './parts/button';
import { Meta } from './parts/text';

type Props = {
  book: string;
  paperId: string;
  /** The version on screen; the answer names it, so an answer to words since replaced is refused. */
  paperAt: string;
  here: string;
  state: PaperState;
  editor: boolean;
  hasNext: boolean;
  reopen: boolean;
  needWords: boolean;
  /** The paper changed between opening it and answering: the new words are on screen. */
  changed: boolean;
};

export function AnswerBar({ book, paperId, paperAt, here, state, editor, hasNext, reopen, needWords, changed }: Props) {
  if (state.status === 'missing') return null;
  if (!editor) {
    return (
      <div className={styles.bar}>
        <Meta as="span">{state.status === 'waiting' ? 'This waits on you.' : 'Answered.'}</Meta>
        <ButtonLink kind="main" href={href.signIn(here)}>Sign in to answer</ButtonLink>
      </div>
    );
  }
  if (state.status !== 'waiting' && !reopen && !changed) {
    const said = state.status === 'approved' ? 'You approved this' : 'You asked for changes';
    return (
      <div className={styles.bar}>
        <Meta as="span">{said}{state.at ? ` on ${dayLong(state.at)}` : ''}.</Meta>
        <ButtonLink href={`${here}?answer=1`}>Change my answer</ButtonLink>
      </div>
    );
  }
  return (
    <form action={answer} className={styles.bar}>
      {changed && <p className={styles.changed} role="status">This paper changed after you opened it. The words above are the new ones: read them, then answer.</p>}
      <input type="hidden" name="book" value={book} />
      <input type="hidden" name="paper" value={paperId} />
      <input type="hidden" name="paperAt" value={paperAt} />
      <input type="hidden" name="here" value={here} />
      <Button name="verdict" value="changes">Ask for changes</Button>
      <textarea
        name="words"
        rows={1}
        required
        aria-label="Your words"
        aria-invalid={needWords || undefined}
        className={styles.words}
        placeholder={needWords ? 'Say what to change, so it can be done.' : 'Your words. Needed to ask for changes; optional to approve.'}
      />
      <Button kind="main" className={styles.approve} name="verdict" value="approved" formNoValidate>
        {hasNext ? 'Approve and read next →' : 'Approve'}
      </Button>
    </form>
  );
}
