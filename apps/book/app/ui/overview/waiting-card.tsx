// What waits on the editor in this book, at the top right of its overview: how many things, how many papers, and
// the one main button that opens them.
import { href } from '../../../lib/routes';
import { ButtonLink, Buttons } from '../parts/button';
import { Card, CardTitle } from '../parts/card';
import { Meta } from '../parts/text';
import styles from './waiting-card.module.css';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function WaitingCard({ book, waiting, papers, approved, total, delivers }: { book: string; waiting: number; papers: number; approved: number; total: number; delivers: boolean }) {
  return (
    <Card>
      <p className={styles.kicker}>Waiting on you</p>
      <CardTitle>{waiting ? `${count(waiting, 'thing waits', 'things wait')} on you` : 'Nothing waits on you'}</CardTitle>
      {delivers && <div className={styles.sub}><Meta>{papers ? `${count(papers, 'paper', 'papers')} to approve, in book order` : `${approved} of ${total} papers approved`}</Meta></div>}
      <Buttons>
        {waiting > 0 && <ButtonLink kind="main" href={href.inbox(book)}>Open what waits →</ButtonLink>}
        {papers > 0 && <ButtonLink href={href.read(book)}>Read the papers</ButtonLink>}
      </Buttons>
    </Card>
  );
}
