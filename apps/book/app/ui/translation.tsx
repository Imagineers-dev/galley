// A editor paper with its lines numbered, and the agents' version beneath it: every item citing the lines it serves,
// a coverage meter, gaps named, and a warning when the editor's paper changed after the agents' version was written.
import type { CSSProperties } from 'react';
import { coverage, renderCited, renderNumbered } from '../../lib/book/paragraphs';
import { Prose } from './parts/prose';
import { Label } from './parts/section';
import { StatusPill } from './parts/status';
import { Meta, TextLink } from './parts/text';
import styles from './translation.module.css';

export const NumberedPaper = ({ text, gaps }: { text: string; gaps: number[] }) => <Prose html={renderNumbered(text, new Set(gaps))} numbered />;

export function AgentsVersion({ editorText, agentsText, stale, approved, here, partial = false }: {
  /** partial: a feature's paper, of which a piece of work takes on only some lines, so the others are not gaps. */
  editorText: string; agentsText?: string; stale: boolean; approved: boolean; here: string; partial?: boolean;
}) {
  if (!agentsText) {
    return (
      <section className={styles.panel}>
        <Label>For agents</Label>
        <Meta>{approved ? 'Due: approved, waiting for an agent to translate it, citing your lines.' : 'Written only after you approve the version for you.'}</Meta>
      </section>
    );
  }
  const c = coverage(editorText, agentsText);
  const share = c.total ? Math.round((c.covered.length / c.total) * 100) : 0;
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <Label gap="none">For agents</Label>
        {stale && <StatusPill status="event">out of date: your paper changed since</StatusPill>}
      </div>
      <div className={styles.meter}>
        <span>Covers</span>
        <div className={styles.bar}><span className={styles.fill} style={{ '--share': share } as CSSProperties} /></div>
        <span>{c.covered.length} of {c.total} of your lines</span>
      </div>
      {!partial && c.gaps.length > 0 && (
        <div className={styles.gaps}>
          <Meta as="span">Not covered yet:</Meta>
          {c.gaps.map((g) => <TextLink key={g} href={`#p${g}`}>¶{g}</TextLink>)}
        </div>
      )}
      <details>
        <summary className={styles.summary}>Read the agents’ version</summary>
        <Prose html={renderCited(agentsText, here)} />
      </details>
    </section>
  );
}
