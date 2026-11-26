// Where a piece of work stands on its eight stages: done green, the current stage grey, the rest a hairline, and a
// dashed hairline where the book holds no record. Every state is also said in words, never by colour alone.
import { STAGE_WORDS, type Stage, type StageState } from '../../lib/book/work-stages';
import { ReaderOnly } from './parts/sheet';
import styles from './stage-track.module.css';

const STEP: Record<StageState, string> = { done: styles.stepDone, current: styles.stepCurrent, todo: styles.stepTodo, unrecorded: styles.stepTodo };
const BAR: Record<StageState, string> = { done: styles.barDone, current: styles.barCurrent, todo: styles.barTodo, unrecorded: styles.barUnrecorded };

/** Spans throughout, so the track can sit inside a card that is itself a link. */
export function StageTrack({ stages }: { stages: Stage[] }) {
  return (
    <span className={styles.track} role="list" aria-label="Where it stands">
      {stages.map((s) => (
        <span key={s.name} role="listitem" className={`${styles.step} ${STEP[s.state]}`} title={`${s.name}: ${STAGE_WORDS[s.state]}`}>
          <i className={BAR[s.state]} />
          <span aria-hidden>{s.short}</span><ReaderOnly>{s.name}: {STAGE_WORDS[s.state]}</ReaderOnly>
        </span>
      ))}
    </span>
  );
}
