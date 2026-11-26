// A top-level feature as a card on a book's overview, carrying its parts inside it, so the overview fills the window
// in columns rather than one strip. Each says where it stands and whether work in it is under way.
import Link from 'next/link';
import { type Current, type FeatureNode, storyOf } from '../../../lib/book/views';
import { wordsOf } from '../../../lib/book/vocabulary';
import { href } from '../../../lib/routes';
import { Card } from '../parts/card';
import { StatusPill } from '../parts/status';
import styles from './feature-card.module.css';

const worksOf = (now: Current, id: string) => storyOf(now, id).filter((s) => s.type === 'work');

function Line({ now, node, part }: { now: Current; node: FeatureNode; part: boolean }) {
  const works = worksOf(now, node.id);
  return (
    <>
      <div className={styles.top}>
        <span className={part ? styles.partTitle : styles.title}>{node.body.title}</span>
        {works.some((s) => s.item.body.state === 'now') && <StatusPill status="underway">under way</StatusPill>}
      </div>
      <p className={part ? styles.standingSmall : styles.standing}>{node.body.standing ?? node.body.forWriter}</p>
      {works.length > 0 && <p className={styles.count}>{wordsOf(now).works(works.length)}</p>}
    </>
  );
}

export function FeatureCard({ book, now, node }: { book: string; now: Current; node: FeatureNode }) {
  return (
    <Card flush>
      <Link href={href.feature(book, node.id)} className={styles.head}><Line now={now} node={node} part={false} /></Link>
      {node.children.length > 0 && (
        <div className={styles.parts}>
          {node.children.map((c) => <Link key={c.id} href={href.feature(book, c.id)} className={styles.part}><Line now={now} node={c} part /></Link>)}
        </div>
      )}
    </Card>
  );
}
