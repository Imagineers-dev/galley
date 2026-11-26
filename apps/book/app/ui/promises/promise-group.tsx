// One state's promises: a mark, the promise in plain words, why it stands there and, when Proven, on which code. On its
// own page each state is a section; nested under a feature on the feature's page (`nested`), a labelled group.
import { dayShort } from '../../../lib/book/format';
import type { FeaturePromise } from '../../../lib/book/promises';
import type { PromiseState } from '../../../lib/book/promise-status';
import { Item } from '../parts/list';
import { Label, Section } from '../parts/section';
import { StatusDot, type Status } from '../parts/status';
import styles from './promises.module.css';

const MARK: Record<PromiseState, Status> = { broken: 'event', proven: 'done', claimed: 'waiting', 'server-only': 'underway', 'not-rechecked': 'waiting', 'not-proven': 'next' };

export function PromiseGroup({ state, title, promises, nested = false }: { state: PromiseState; title: string; promises: FeaturePromise[]; nested?: boolean }) {
  const tone = state === 'broken' ? 'event' : 'plain';
  const items = promises.map((p) => (
    <Item key={p.id} side={p.status.proof ? `${p.status.proof.sha.slice(0, 9)} · ${dayShort(p.status.proof.committedAt)}` : undefined}
      note={<span className={styles.evidence}>{[...p.status.reasons, ...(p.serverReason ? [`Holds on the server: ${p.serverReason}`] : [])].join(' ')}</span>}>
      <span className={styles.promise}><StatusDot status={MARK[state]} label={title} />{p.text}</span>
    </Item>
  ));
  if (nested) return <div className={styles.nested}><Label as="h4" tone={tone}>{title} · {promises.length}</Label>{items}</div>;
  return <Section title={title} tone={tone} count={promises.length}>{items}</Section>;
}
