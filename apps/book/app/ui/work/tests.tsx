// A work's tests: every line of What you'll get against the tests that prove it, the tests, and the guards.
import { dayLong } from '../../../lib/book/format';
import type { Guard, Run, Test } from '../../../lib/book/record-types';
import type { Entry } from '../../../lib/book/views';
import { Card, CardTitle } from '../parts/card';
import { Label } from '../parts/section';
import { StatusPill } from '../parts/status';
import { Meta } from '../parts/text';
import styles from './tests.module.css';

type Line = { ref: string; n: number; text: string; tests: string[] };
type Tested<T> = Entry<T> & { last?: Entry<Run> };
const LEVEL = { unit: 'Unit', integration: 'Integration', app: 'In the app', editor: 'You try it' } as const;

export const RunPill = ({ run }: { run?: { body: { result: string }; at: string } }) =>
  run ? <StatusPill status={run.body.result === 'pass' ? 'done' : 'event'}>{run.body.result === 'pass' ? 'passes' : 'fails'} · {dayLong(run.at)}</StatusPill> : <StatusPill status="plain">not run</StatusPill>;

export function Matrix({ lines, tests, label, specHref }: { lines: Line[]; tests: Entry<Test>[]; label: Map<string, string>; specHref: string }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.matrix}>
        <thead><tr><th className={`${styles.cell} ${styles.text}`}><Label as="span" gap="none">Your line in What you'll get</Label></th>{tests.map((t) => <th key={t.id} className={`${styles.cell} ${styles.mark}`}><Label as="span" gap="none">{label.get(t.id)}</Label></th>)}</tr></thead>
        <tbody>
          {lines.map((l) => {
            const gap = l.tests.length === 0;
            return (
              <tr key={l.ref}>
                <td className={`${styles.cell} ${styles.line} ${gap ? styles.gap : ''}`}><a className={styles.ref} href={`${specHref}#p${l.n}`}>¶{l.n}</a> {l.text.length > 110 ? `${l.text.slice(0, 109)}…` : l.text}</td>
                {tests.map((t) => <td key={t.id} className={`${styles.cell} ${styles.mark} ${gap ? styles.gap : ''}`}><i className={l.tests.includes(t.id) ? styles.proves : styles.unproven} /></td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TestRows({ tests, label }: { tests: Tested<Test>[]; label: Map<string, string> }) {
  if (tests.length === 0) return <Meta>No tests written yet.</Meta>;
  return tests.map((t) => (
    <div key={t.id} className={styles.test}>
      <span className={styles.ref}>{label.get(t.id)}</span>
      <div>
        <div className={styles.name}>{t.body.title}</div>
        <Meta>
          Proves {t.body.proves.map((p) => p.replace('spec', '').replace('intent', 'Why ').replace('plan', 'Plan ')).join(', ')} · {LEVEL[t.body.level]} · <code className={styles.code}>{t.body.runs}</code>
          {t.body.part ? ` · ${t.body.part}` : ''}
        </Meta>
      </div>
      <RunPill run={t.last} />
    </div>
  ));
}

export function Guards({ guards }: { guards: (Entry<Guard> & { baseline?: Entry<Run>; after?: Entry<Run> })[] }) {
  if (guards.length === 0) return <Meta>No guards named yet.</Meta>;
  return (
    <div className={styles.guards}>
      {guards.map((g) => (
        <Card key={g.id}>
          <CardTitle>{g.body.feature}</CardTitle>
          <Meta>{g.body.why}</Meta>
          <ul className={styles.checks}>{g.body.checks.map((c) => <li key={c}>{c}</li>)}</ul>
          <Meta><code className={styles.code}>{g.body.runs}</code></Meta>
          <div className={styles.runs}><Meta as="span">Before:</Meta> <RunPill run={g.baseline} /> <Meta as="span">After:</Meta> <RunPill run={g.after} /></div>
        </Card>
      ))}
    </div>
  );
}
