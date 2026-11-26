// A review receipt: which part was reviewed, by whom (never the agent that wrote it), and each of the seven questions
// answered with evidence. And the seven questions themselves, so the editor knows what a review asks.
import { dayLong } from '../../../lib/book/format';
import { REVIEW_QUESTIONS, type Review } from '../../../lib/book/record-types';
import type { Entry } from '../../../lib/book/views';
import { Card } from '../parts/card';
import { Label } from '../parts/section';
import { type Status, StatusPill } from '../parts/status';
import { Meta } from '../parts/text';
import styles from './review.module.css';

const VERDICT: Record<Review['verdict'], { word: string; whole: string; status: Status }> = {
  passes: { word: 'passes', whole: 'Passes', status: 'done' },
  concern: { word: 'concern', whole: 'Passes, with a concern', status: 'plain' },
  fails: { word: 'fails', whole: 'Fails', status: 'event' },
};

export function Receipt({ review }: { review: Entry<Review> }) {
  const r = review.body;
  return (
    <div className={styles.receipt}>
      <Card>
        <div className={styles.head}>
          <div><Label gap="none">Review of {r.part}</Label><div className={styles.verdict}>{VERDICT[r.verdict].whole}</div></div>
          <Meta as="span">by {review.by.replace('agent:', '')} · written by {r.writtenBy} · {dayLong(review.at)}</Meta>
        </div>
        {[...r.answers].sort((a, b) => a.q - b.q).map((a) => (
          <div key={a.q} className={styles.question}>
            <span className={styles.n}>{a.q}</span>
            <b className={styles.title}>{REVIEW_QUESTIONS[a.q - 1].title}</b>
            <span className={styles.text}>{a.evidence}</span>
            <StatusPill status={VERDICT[a.verdict].status}>{VERDICT[a.verdict].word}</StatusPill>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function Questions() {
  return REVIEW_QUESTIONS.map((q) => (
    <div key={q.q} className={styles.question}>
      <span className={styles.n}>{q.q}</span>
      <div><b className={styles.title}>{q.title}</b><Meta>{q.sub}</Meta></div>
      <span className={styles.text}>{q.asks}</span>
    </div>
  ));
}
