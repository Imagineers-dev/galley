// The answer a message needs, as the editor gives it: approve or ask for changes to a paper, choose among a
// decision's options, or say whether a thing to try works. A note needs no answer.
import type { Message } from '../../../lib/book/inbox';
import { approve, reply } from '../../[book]/inbox/actions';
import { Button, ButtonLink, Buttons } from '../parts/button';
import { Label } from '../parts/section';
import { Hidden } from './hidden';
import styles from './answer.module.css';

function Options({ m }: { m: Message }) {
  return (
    <fieldset className={styles.ask}>
      <legend className={styles.legend}><Label as="span" gap="none">Your answer</Label></legend>
      {m.options.map((o, i) => (
        <label key={o.option} className={styles.opt}>
          <input className={styles.radio} type="radio" name="choice" value={o.option} defaultChecked={i === m.recommend} />
          <span>
            {o.option}
            {i === m.recommend && <b className={styles.rec}>recommended</b>}
            {o.detail && <small className={styles.detail}>{o.detail}</small>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function Answer({ m, here, next, needWords, changed }: { m: Message; here: string; next?: string; needWords: boolean; changed: boolean }) {
  const words = (placeholder: string) => (
    <textarea className={styles.words} name="words" rows={2} placeholder={needWords ? 'Say it in a line, so it can be acted on.' : placeholder} aria-invalid={needWords || undefined} />
  );
  if (m.answerOn) return <ButtonLink kind="main" href={m.answerOn.href}>{m.answerOn.label}</ButtonLink>;
  if (m.needs === 'approval') {
    return (
      <form action={approve} className={styles.form}>
        {changed && <p className={styles.changed} role="status">This paper changed after you opened it. The words above are the new ones: read them, then answer.</p>}
        <Hidden m={m} here={here} next={next} />
        <input type="hidden" name="paperAt" value={m.version} />
        {words('Your words: needed to ask for changes, optional to approve.')}
        <Buttons><Button kind="main" name="verdict" value="approved">Approve</Button><Button name="verdict" value="changes">Ask for changes</Button></Buttons>
      </form>
    );
  }
  if (m.needs === 'decision') {
    return (
      <form action={reply} className={styles.form}>
        <Hidden m={m} here={here} next={next} />
        {m.options.length > 0 && <Options m={m} />}
        {words(m.options.length ? 'Add a line in your own words (optional).' : 'Your answer, in your own words.')}
        <Buttons><Button kind="main">Send answer</Button><span className={styles.kbd}>⌘↵ sends</span></Buttons>
      </form>
    );
  }
  if (m.needs === 'try') {
    return (
      <form action={reply} className={styles.form}>
        <Hidden m={m} here={here} next={next} />
        {words('What you saw (needed if something is wrong).')}
        <Buttons><Button kind="main" name="tried" value="works">It works</Button><Button name="tried" value="wrong">Something is wrong</Button></Buttons>
      </form>
    );
  }
  return null;
}
