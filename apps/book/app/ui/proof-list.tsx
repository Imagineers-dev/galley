// A piece of work's evidence, shown as itself: output as text, screenshots as pictures, links as links.
import type { Proof } from '../../lib/book/oversight-types';
import type { Entry } from '../../lib/book/views';
import { AgentLink } from './agent-link';
import { StatusPill } from './parts/status';
import { Meta } from './parts/text';
import styles from './proof-list.module.css';
import { CodeBlock } from './watch/code-block';

const KIND = { output: 'Output', screenshot: 'Screenshot', eval: 'Eval run', link: 'Link' } as const;

export function ProofList({ proofs }: { proofs: Entry<Proof>[] }) {
  if (proofs.length === 0) return null;
  return (
    <div className={styles.proofs}>
      {proofs.map((p) => (
        <figure key={p.id} className={styles.proof}>
          <figcaption className={styles.caption}><StatusPill status="plain">{KIND[p.body.kind]}</StatusPill> {p.body.title}{p.body.part ? <Meta as="span"> · {p.body.part}</Meta> : null}</figcaption>
          {p.body.kind === 'screenshot' && p.body.evidence.startsWith('data:image/') && <img className={styles.image} src={p.body.evidence} alt={p.body.title} />}
          {p.body.kind === 'link' && <AgentLink href={p.body.evidence}>{p.body.evidence}</AgentLink>}
          {(p.body.kind === 'output' || p.body.kind === 'eval') && <CodeBlock>{p.body.evidence}</CodeBlock>}
        </figure>
      ))}
    </div>
  );
}
