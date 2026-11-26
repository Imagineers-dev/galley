import { livePart } from '../../../lib/book/live';
import { dayShort } from '../../../lib/book/format';
import { Card } from '../parts/card';
import { Label } from '../parts/section';
import { Flow } from '../parts/sheet';
import { StatusPill } from '../parts/status';
import { Empty } from '../parts/text';
import { CodeBlock } from './code-block';
import styles from './watch.module.css';
import { WatchSection } from './watch-section';

import type { Current } from '../../../lib/book/views';

/** What is live: each running part, the commit it came from, whether the book knows that commit, and how to undo it. */
export function LiveSection({ now }: { now: Current }) {
  const parts = livePart(now);
  return (
    <WatchSection id="live" title="What is live" lede="Every running part, the commit it was built from (confirmed, or the best guess when the part cannot say), and the one command that undoes it.">
      {parts.length === 0 && <Empty>No release recorded yet. Agents record each one with <code>book_release</code> as they deploy.</Empty>}
      <Flow>
        {parts.map((p) => (
          <Card key={p.part} tone={p.confirmed ? 'plain' : 'event'}>
            <Label>{p.now.body.where}</Label>
            <h3 className={styles.name}>{p.part}</h3>
            <p className={styles.fact}><code>{p.now.body.sha.slice(0, 9)}</code> · {p.now.body.repo} · deployed {dayShort(p.now.body.deployedAt)} · recorded by {p.now.body.by.replace('agent:', '')}</p>
            <p className={styles.chips}>
              <StatusPill status={p.confirmed ? 'done' : 'event'}>{p.confirmed ? 'Commit confirmed from the deployment' : 'Commit inferred, not confirmed'}</StatusPill>
              {p.recorded && <StatusPill status="plain">A commit the book recorded</StatusPill>}
            </p>
            {p.now.body.note && <p className={styles.note}>{p.now.body.note}</p>}
            <Label>To undo</Label>
            <CodeBlock>{p.now.body.undo}</CodeBlock>
            {p.history.length > 0 && (
              <details className={styles.more}><summary className={styles.moreSummary}>{p.history.length} earlier {p.history.length === 1 ? 'release' : 'releases'}</summary>
                <ul className={styles.list}>{p.history.map((h) => <li key={h.id}><code>{h.body.sha.slice(0, 9)}</code> · {dayShort(h.body.deployedAt)}{h.body.note ? ` · ${h.body.note}` : ''}</li>)}</ul>
              </details>
            )}
          </Card>
        ))}
      </Flow>
    </WatchSection>
  );
}
