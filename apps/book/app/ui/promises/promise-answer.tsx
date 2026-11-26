// The editor's answer to waiting promises: Approve all for new ones, and each rewording on its own, old words beside new.
import type { FeaturePromise } from '../../../lib/book/promises';
import { answerPromisesForm } from '../../actions';
import { Button, Buttons } from '../parts/button';
import { Item } from '../parts/list';
import { Section } from '../parts/section';
import { Meta } from '../parts/text';
import styles from './promises.module.css';

type Where = { book: string; feature: string; here: string };
const Hidden = ({ book, feature, here }: Where) => (
  <><input type="hidden" name="book" value={book} /><input type="hidden" name="feature" value={feature} /><input type="hidden" name="here" value={here} /></>
);
/** Where a promise must hold, and why, is part of what they approve. */
const place = (p: { mustHoldIn: FeaturePromise['mustHoldIn']; serverReason?: string }) =>
  (p.mustHoldIn === 'server' ? `Must hold on the server: ${p.serverReason}` : 'Must hold in the app.');
const itemValue = (p: FeaturePromise) => `${p.id}|${p.at}`;

function ChangeThisOne({ where, promise }: { where: Where; promise: FeaturePromise }) {
  return (
    <form action={answerPromisesForm} className={styles.answer}>
      <Hidden {...where} />
      <input type="hidden" name="item" value={itemValue(promise)} />
      <textarea name="words" rows={1} required aria-label="What to change" className={styles.words} placeholder="Say what to change." />
      <Button name="verdict" value="changes">Change this one</Button>
    </form>
  );
}

export function PromiseAnswer({ where, waiting, reworded }: { where: Where; waiting: FeaturePromise[]; reworded: FeaturePromise[] }) {
  return (
    <>
      {waiting.length > 0 && (
        <Section title="Waiting for your approval" tone="waiting" count={waiting.length}>
          {waiting.map((p) => <Item key={p.id} note={<><Meta>{place(p)}</Meta><ChangeThisOne where={where} promise={p} /></>}>{p.text}</Item>)}
          <form action={answerPromisesForm}>
            <Hidden {...where} />
            <input type="hidden" name="all" value="1" />
            {waiting.map((p) => <input key={p.id} type="hidden" name="item" value={itemValue(p)} />)}
            <Buttons><Button kind="main" name="verdict" value="approved">Approve all {waiting.length}</Button></Buttons>
          </form>
        </Section>
      )}
      {reworded.length > 0 && (
        <Section title="New words to read" tone="waiting" count={reworded.length}>
          {reworded.map((p) => (
            <Item key={p.id} note={
              <>
                <Meta>{place(p)}</Meta>
                {p.was && <Meta>Before: “{p.was.text}” {place(p.was)}</Meta>}
                <form action={answerPromisesForm}>
                  <Hidden {...where} />
                  <input type="hidden" name="item" value={itemValue(p)} />
                  <Buttons><Button name="verdict" value="approved">Approve the new words</Button></Buttons>
                </form>
                <ChangeThisOne where={where} promise={p} />
              </>
            }>{p.text}</Item>
          ))}
        </Section>
      )}
    </>
  );
}
