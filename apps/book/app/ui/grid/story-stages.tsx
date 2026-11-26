// A story's stages side by side, so the editor sees at a glance which stage the story is in and what is finished.
import type { StageLook, StoryStages as Stages } from '../../../lib/book/stages';
import styles from './story-stages.module.css';

const LOOK: Record<StageLook, string> = { finished: styles.finished, here: styles.here, unfinished: '', ahead: '' };
const WORD: Record<StageLook, string> = { finished: 'Finished', here: 'Current stage', unfinished: 'Not finished', ahead: 'Ahead' };

export function StoryStages({ stages }: { stages: Stages }) {
  return (
    <div className={styles.stages}>
      <h3 className={styles.headline}>{stages.headline}</h3>
      <p className={styles.count}>{stages.count}</p>
      <ol className={styles.strip} aria-label={`The stages of ${stages.story}`}>
        {stages.stages.map((s, i) => (
          <li key={i} className={`${styles.stage} ${LOOK[s.look]}`} aria-current={s.look === 'here' ? 'step' : undefined}>
            <span className={styles.name}>{s.title}</span>
            <span>{s.done} of {s.total}</span>
            <span className={styles.word}>{WORD[s.look]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
