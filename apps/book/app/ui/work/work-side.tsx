// What sits beside a piece of work: its papers and where each stands, what it touches and connects to, the commits
// that named it, and its proof.
import { workPapers } from '../../../lib/book/governing';
import { LINK_WORDS, dayLong } from '../../../lib/book/format';
import { proofsOf } from '../../../lib/book/proof';
import { commitsOf } from '../../../lib/book/testing';
import { PAPER_NAMES } from '../../../lib/book/types';
import { type Current, notesOf, titleOf } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { Item } from '../parts/list';
import { Section } from '../parts/section';
import { TextLink } from '../parts/text';
import { PaperCard, PaperCards } from '../paper-card';
import { ProofList } from '../proof-list';
import styles from './work-side.module.css';

function Papers({ book, now, id }: { book: string; now: Current; id: string }) {
  return (
    <PaperCards>
      {workPapers(now, id).map((p) => (
        <PaperCard key={p.kind} name={PAPER_NAMES[p.kind].name} paper={p.editor} state={p.state} to={href.paper(book, id, p.kind)}
          absent={p.kind === 'plan' ? 'Written after you approve the spec' : 'Not written yet'} />
      ))}
    </PaperCards>
  );
}

export function WorkSide({ book, now, id }: { book: string; now: Current; id: string }) {
  const links = notesOf(now, id).links;
  const touches = links.filter((l) => l.body.kind === 'touches');
  const connects = links.filter((l) => l.body.kind !== 'touches');
  const commits = commitsOf(now, id);
  const proofs = proofsOf(now, id);
  return (
    <>
      <Section title="Papers"><Papers book={book} now={now} id={id} /></Section>
      {(touches.length > 0 || connects.length > 0) && (
        <Section title="Touches and connects to">
          {touches.map((l) => <Item key={l.id}>{l.body.label ?? l.body.to}</Item>)}
          {connects.map((l) => {
            const other = l.body.from === id ? l.body.to : l.body.from;
            const to = href.any(book, other);
            return <Item key={l.id} side={LINK_WORDS[l.body.kind][l.body.from === id ? 0 : 1]}>{to ? <TextLink href={to}>{titleOf(now, other)}</TextLink> : titleOf(now, other)}</Item>;
          })}
        </Section>
      )}
      {commits.length > 0 && (
        <Section title={`Commits · ${commits.length}`}>
          {commits.map((c) => (
            <Item key={c.id} note={<><code className={styles.sha}>{c.body.sha.slice(0, 9)}</code> · {c.body.repo} · {dayLong(c.body.committedAt)}</>}>{c.body.subject}</Item>
          ))}
        </Section>
      )}
      {proofs.length > 0 && <Section title={`Proof · ${proofs.length}`}><ProofList proofs={proofs} /></Section>}
    </>
  );
}
