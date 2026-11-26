// Where the book stands, on its overview: the first step, where the book and the world disagree, where the book left
// off beside what is true now (each repository and what each live part says it runs), and what happened since.
import Link from 'next/link';
import { dateTime } from '../../lib/book/format';
import type { Pickup } from '../../lib/book/pickup';
import type { Words } from '../../lib/book/vocabulary';
import { href } from '../../lib/routes';
import { Card } from './parts/card';
import { Label, Section } from './parts/section';
import { StateLine } from './parts/status';
import { Empty } from './parts/text';
import styles from './where-we-stand.module.css';

const short = (sha: string | null) => (sha ? sha.slice(0, 9) : 'does not say');
const Sha = ({ sha }: { sha: string | null }) => <code className={styles.code}>{short(sha)}</code>;

function TrueNow({ repos }: { repos: Pickup['repos'] }) {
  if (repos.length === 0) return <Empty>No repository has reported. Run <code className={styles.code}>pnpm book:pickup</code> in it.</Empty>;
  return repos.map((r, i) => (
    <section key={r.repo} className={i > 0 ? styles.repoNext : undefined}>
      <h3 className={styles.repo}>{r.repo}</h3>
      <p className={styles.fact}>checked {dateTime(r.checkedAt)}{r.stale ? ', before the diary' : ''} · {r.branch} at <Sha sha={r.head.sha} /> {r.head.subject}</p>
      <ul className={styles.list}>
        <li>{r.unpushed.length ? `${r.unpushed.length} not on the remote` : 'Everything is on the remote'}</li>
        <li>
          {r.uncommitted.count ? `${r.uncommitted.count} uncommitted files: ` : 'Nothing uncommitted'}
          {r.uncommitted.areas.slice(0, 5).map((a) => `${a.area} (${a.files})`).join(', ')}
          {r.uncommitted.areas.length > 5 ? ', …' : ''}
        </li>
        {r.live.map((l) => (
          <li key={l.part} className={l.agrees === false ? styles.wrong : undefined}>
            {l.says ? <>{l.part} runs <Sha sha={l.says} /></> : <>{l.part} does not say which commit it runs (not stamped yet)</>}
            {l.agrees === true ? ', as the book says' : l.agrees === false ? `; the book says ${short(l.bookSays)}` : ''}
          </li>
        ))}
      </ul>
    </section>
  ));
}

export function WhereWeStand({ book, p, words, delivers }: { book: string; p: Pickup; words: Words; delivers: boolean }) {
  const n = p.disagreements.length;
  return (
    <Section title="Where we stand" id="where-we-stand">
      <div className={styles.stand}>
        <p className={styles.first}><b>Next:</b> {p.first}</p>
        {delivers && <StateLine tone={n ? 'event' : 'done'}>{n ? `${n} ${n === 1 ? 'thing' : 'things'} the book and the world disagree on.` : 'The book and the world agree.'}</StateLine>}
        {n > 0 && (
          <Card tone="event">
            <Label gap="none">Where they disagree</Label>
            <ul className={styles.list}>{p.disagreements.map((d) => <li key={d}>{d}</li>)}</ul>
          </Card>
        )}
        <div className={styles.two}>
          <Card>
            <Label gap="none">{words.leftOff}{p.leftOff ? ` · written ${dateTime(p.leftOff.wroteAt)}` : ''}</Label>
            {!p.leftOff && <Empty>No diary yet.</Empty>}
            {p.leftOff?.headline && <p className={styles.note}>{p.leftOff.headline}</p>}
            {p.leftOff && p.leftOff.next.length > 0 && (<><Label gap="none">Next, it said</Label><ol className={styles.list}>{p.leftOff.next.map((l) => <li key={l.text}>{l.text}</li>)}</ol></>)}
            {p.leftOff && p.leftOff.motion.length > 0 && (
              <>
                <Label gap="none">Under way</Label>
                <ul className={styles.list}>{p.leftOff.motion.map((m) => <li key={m.id}><Link href={href.work(book, m.id)}>{m.title}</Link> · {m.progress ?? m.steps.find((s) => s.state === 'current')?.name ?? m.state}</li>)}</ul>
              </>
            )}
          </Card>
          {delivers && <Card><Label gap="none">What is true now</Label><TrueNow repos={p.repos} /></Card>}
        </div>
        <Card>
          <Label gap="none">Since the diary was written</Label>
          {p.since.commits.length + p.since.answers.length === 0 && <p className={styles.fact}>{words.nothingSince}</p>}
          {p.since.answers.length > 0 && (<><Label gap="none">Your answers</Label><ul className={styles.list}>{p.since.answers.map((a) => <li key={a.at}>{a.text} · {dateTime(a.at)}</li>)}</ul></>)}
          {p.since.commits.length > 0 && (<><Label gap="none">Commits</Label><ul className={styles.list}>{p.since.commits.map((c) => <li key={c.sha}><Sha sha={c.sha} /> {c.subject}</li>)}</ul></>)}
        </Card>
      </div>
    </Section>
  );
}
