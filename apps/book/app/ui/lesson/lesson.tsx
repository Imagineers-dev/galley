// A step of a study book, read as a lesson: where it sits, what to watch, read and do in order, how you know you have
// it, the editor's mark, and the way to the step before and after.
import { lessonOf } from '../../../lib/book/lesson';
import { STATE_WORDS } from '../../../lib/book/format';
import type { Work } from '../../../lib/book/types';
import { type Current, titleOf } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { haveIt } from '../../study-actions';
import { Frame } from '../frame';
import { Button, ButtonLink, Buttons } from '../parts/button';
import { Label } from '../parts/section';
import { PageHead, Sheet, Split } from '../parts/sheet';
import { StatusPill, statusOf } from '../parts/status';
import { Meta, TextLink } from '../parts/text';
import { PagerCards } from '../work-tabs';
import { LessonStop, type Marking } from './lesson-pointer';
import styles from './lesson.module.css';

function StepMark({ state, marking }: { state: Work['state']; marking: Marking }) {
  const done = state === 'done';
  if (marking.past) return <StatusPill status={statusOf(state)}>{done ? 'You have it' : STATE_WORDS[state]}</StatusPill>;
  if (!marking.editor) return <Buttons>{done && <StatusPill status="done">Done</StatusPill>}<ButtonLink kind="main" href={href.signIn(marking.here)}>Sign in to mark done</ButtonLink></Buttons>;
  return (
    <form action={haveIt}>
      <input type="hidden" name="book" value={marking.book} />
      <input type="hidden" name="work" value={marking.work} />
      <input type="hidden" name="here" value={marking.here} />
      <input type="hidden" name="have" value={done ? 'no' : 'yes'} />
      <Buttons>
        {done && <StatusPill status="done">You have it</StatusPill>}
        <Button kind={done ? 'quiet' : 'main'}>{done ? 'Take it back' : 'I have it'}</Button>
      </Buttons>
    </form>
  );
}

export function LessonPage({ book, now, id, work, editor, past, changed }: { book: string; now: Current; id: string; work: Work; editor: boolean; past: boolean; changed: boolean }) {
  const lesson = lessonOf(now, id, work);
  const marking: Marking = { book, work: id, here: href.work(book, id), editor, past: past || !!lesson.replacedBy };
  const trail = [{ label: titleOf(now, work.feature), to: href.feature(book, work.feature) }, { label: work.title }];
  const stepLink = (s: { id: string; title: string } | null) => (s ? { name: s.title, to: href.work(book, s.id) } : undefined);
  return (
    <Frame book={book} now={now} trail={trail} aside={<StatusPill status={statusOf(work.state)}>{STATE_WORDS[work.state]}</StatusPill>}>
      <Sheet>
        <PageHead eyebrow={lesson.eyebrow} title={work.title} lede={work.summary} />
        <Split main={(
          <>
            {lesson.totals && <Meta>{lesson.totals}</Meta>}
            {lesson.pointers.length > 0 && (
              <ol className={styles.path}>{lesson.pointers.map((p, i) => <LessonStop key={p.key} p={p} n={i + 1} marking={marking} />)}</ol>
            )}
            {lesson.haveItWhen && (
              <section className={styles.haveIt}>
                <Label as="h2">You have it when</Label>
                <p className={styles.haveItText}>{lesson.haveItWhen}</p>
              </section>
            )}
            {changed && <div role="status"><Meta>This step changed after you opened it. Look again, then mark it.</Meta></div>}
            <div className={styles.mark}>
              {lesson.progress && <Meta as="span">{lesson.progress}</Meta>}
              {lesson.replacedBy
                ? <Meta as="span">A newer step took this one's place: <TextLink href={href.work(book, lesson.replacedBy.id)}>{lesson.replacedBy.title}</TextLink></Meta>
                : <StepMark state={work.state} marking={marking} />}
            </div>
            <PagerCards before={stepLink(lesson.previous)} next={stepLink(lesson.next)} />
          </>
        )} />
      </Sheet>
    </Frame>
  );
}
