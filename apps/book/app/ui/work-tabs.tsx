// The tabs every page of a piece of work shares, and the way forward at the end of each paper.
import { PAPER_KINDS, PAPER_NAMES, type PaperKind } from '../../lib/book/types';
import { governingPaper } from '../../lib/book/governing';
import type { Current } from '../../lib/book/views';
import { href } from '../../lib/routes';
import { Card } from './parts/card';
import { TabNav } from './tab-nav';
import styles from './work-tabs.module.css';

type Tab = { key: 'overview' | PaperKind | 'tests' | 'review'; name: string; to: string; status?: string };

function tabsOf(book: string, now: Current, workId: string): Tab[] {
  return [
    { key: 'overview', name: 'Overview', to: href.work(book, workId) },
    ...PAPER_KINDS.map((kind) => ({ key: kind, name: PAPER_NAMES[kind].name, to: href.paper(book, workId, kind), status: governingPaper(now, workId, kind).editorStatus })),
    { key: 'tests', name: 'Tests', to: href.workTab(book, workId, 'tests') },
    { key: 'review', name: 'Review', to: href.workTab(book, workId, 'review') },
  ];
}

export function WorkTabs({ book, now, workId, on }: { book: string; now: Current; workId: string; on: Tab['key'] }) {
  const tabs = tabsOf(book, now, workId).map((t) => ({ key: t.key, label: t.name, to: t.to, status: t.status === 'missing' ? undefined : t.status, missing: t.status === 'missing' }));
  return <TabNav label="This piece of work" tabs={tabs} on={on} />;
}

export function Pager({ book, now, workId, on }: { book: string; now: Current; workId: string; on: Tab['key'] }) {
  const tabs = tabsOf(book, now, workId).filter((t) => t.status !== 'missing');
  const at = tabs.findIndex((t) => t.key === on);
  return <PagerCards before={tabs[at - 1]} next={tabs[at + 1]} />;
}

/** The one before and the one next, a card each; the next is marked when it waits on the editor. */
export function PagerCards({ before, next }: { before?: { name: string; to: string }; next?: { name: string; to: string; status?: string } }) {
  return (
    <div className={styles.pager}>
      {before && (
        <div className={styles.slot}>
          <Card href={before.to} flat><span className={styles.hint}>← Before</span><b className={styles.name}>{before.name}</b></Card>
        </div>
      )}
      {next && (
        <div className={styles.slotNext}>
          <Card href={next.to} tone={next.status === 'waiting' ? 'waiting' : 'plain'} flat>
            <span className={next.status === 'waiting' ? styles.hintWaiting : styles.hint}>{next.status === 'waiting' ? 'Next · waiting on you' : 'Next'}</span>
            <b className={styles.name}>{next.name} →</b>
          </Card>
        </div>
      )}
    </div>
  );
}
