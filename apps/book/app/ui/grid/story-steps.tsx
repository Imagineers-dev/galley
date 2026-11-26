// Every step of a story by name, grouped under its stages. Each row opens its piece of work, and every state is said
// in words beside its mark, never by colour alone.
import Link from 'next/link';
import type { StageStep, StoryStages } from '../../../lib/book/stages';
import { href } from '../../../lib/routes';
import { Label } from '../parts/section';
import { StepMark } from './step-mark';
import styles from './story-steps.module.css';

function Step({ book, step }: { book: string; step: StageStep }) {
  const inner = (
    <>
      <span className={styles.number}>{step.step}</span>
      <span className={styles.text}>
        <span className={step.work ? styles.title : `${styles.title} ${styles.muted}`}>{step.title}</span>
        {step.proof && <span className={styles.proof}>{step.proof}</span>}
      </span>
      <span className={styles.state}><StepMark state={step.state} small />{step.when}</span>
    </>
  );
  const current = step.state === 'now';
  return (
    <li>
      {step.work
        ? <Link className={`${styles.row} ${current ? styles.current : ''}`} href={href.work(book, step.work)} aria-current={current ? 'step' : undefined}>{inner}</Link>
        : <div className={styles.row}>{inner}</div>}
    </li>
  );
}

export function StorySteps({ book, stages }: { book: string; stages: StoryStages }) {
  return (
    <div className={styles.steps}>
      {stages.stages.map((s, i) => (
        <div key={i}>
          <Label as="h4">{s.title}</Label>
          <ol className={styles.list}>
            {s.steps.map((step, j) => <Step key={j} book={book} step={step} />)}
          </ol>
        </div>
      ))}
    </div>
  );
}
