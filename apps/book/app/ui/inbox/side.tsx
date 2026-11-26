// Beside the open message: the editor's answer once given (or the way to give it), where the work it came from
// stands, and the links behind it.
import { dayLong } from '../../../lib/book/format';
import type { Message } from '../../../lib/book/inbox';
import { STAGE_WORDS, type StageState } from '../../../lib/book/work-stages';
import { AgentLink } from '../agent-link';
import { ButtonLink, buttonLook } from '../parts/button';
import { Quote } from '../parts/quote';
import { Label } from '../parts/section';
import { Answer } from './answer';
import styles from './side.module.css';

const STEP: Record<StageState, string> = { done: styles.stepPlain, current: styles.stepCurrent, todo: styles.stepPlain, unrecorded: styles.stepPlain };
const MARK: Record<StageState, string> = { done: styles.markDone, current: styles.markCurrent, todo: styles.markTodo, unrecorded: styles.markUnrecorded };

function Work({ m }: { m: Message }) {
  return (
    <div className={styles.work}>
      <Label>Where this work stands</Label>
      <p className={styles.workName}>{m.from.feature} › {m.from.workTitle}</p>
      <ol className={styles.track}>
        {m.from.steps?.map((st) => (
          <li key={st.name} className={`${styles.step} ${STEP[st.state]}`}>
            <i className={`${styles.mark} ${MARK[st.state]}`} />{st.name}<span className={styles.stepWord}>{STAGE_WORDS[st.state]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Side({ m, editor, here, next, needWords, changed, signIn }: {
  m: Message; editor: boolean; here: string; next?: string; needWords: boolean; changed: boolean; signIn: string;
}) {
  return (
    <>
      {m.answer && (
        <Quote text={m.answer.text} who={`Your answer, ${dayLong(m.answer.at)}`} />
      )}
      {!m.answer && editor && <Answer m={m} here={here} next={next} needWords={needWords} changed={changed} />}
      {!m.answer && !editor && m.needs !== 'wrong' && m.needs !== 'fyi' && <div><ButtonLink kind="main" href={signIn}>Sign in to answer</ButtonLink></div>}
      {m.from.steps && <Work m={m} />}
      <div>
        <Label>Behind it</Label>
        <div className={styles.links}>
          {m.links.map((l) => <AgentLink key={l.href + l.label} className={buttonLook('small')} href={l.href}>{l.label} →</AgentLink>)}
        </div>
      </div>
    </>
  );
}
