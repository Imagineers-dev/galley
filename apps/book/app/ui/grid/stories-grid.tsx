// A chapter's children side by side: one row per child, one cell per step, grouped under the chapter's own headings.
// A real table, so a screen reader can say where a cell sits; it scrolls sideways inside itself on a narrow window.
import Link from 'next/link';
import type { Grid, GridCell } from '../../../lib/book/grid';
import { NOT_PLANNED, STEP_WORDS, raise } from '../../../lib/book/format';
import { href } from '../../../lib/routes';
import { Label } from '../parts/section';
import { ReaderOnly } from '../parts/sheet';
import { Meta, TextLink } from '../parts/text';
import { StepMark, markOf } from './step-mark';
import styles from './stories-grid.module.css';

function Cell({ book, cell }: { book: string; cell: GridCell | null }) {
  if (!cell) return <td className={styles.slot}><span className={markOf(null)} title={NOT_PLANNED} /><ReaderOnly>{NOT_PLANNED}</ReaderOnly></td>;
  return (
    <td className={styles.slot}>
      <Link className={markOf(cell.state)} href={href.work(book, cell.work)} aria-label={cell.label} title={cell.label} />
    </td>
  );
}

export function StoriesGrid({ book, title, grid }: { book: string; title: string; grid: Grid }) {
  return (
    <div className={styles.grid}>
      <p className={styles.summary}>{grid.summary}</p>
      {grid.empty ? <Meta>{grid.empty}</Meta> : (
        <div className={styles.scroll} role="region" aria-label={`${title}, step by step`} tabIndex={0}>
          <table className={styles.table}>
            <caption><ReaderOnly>{`${title}: each row is one of the ${grid.noun}, each column a step`}</ReaderOnly></caption>
            <colgroup><col /></colgroup>
            {grid.groups.map((g, i) => <colgroup key={i} span={g.span} />)}
            <thead>
              <tr>
                <td className={styles.corner} />
                {grid.groups.map((g, i) => (
                  <th key={i} scope="colgroup" colSpan={g.span} className={styles.group}>
                    {g.title && <Label as="span" gap="none">{g.title}</Label>}
                  </th>
                ))}
              </tr>
              <tr>
                <td className={styles.corner} />
                {grid.columns.map((c, i) => <th key={i} scope="col" className={styles.step}><ReaderOnly>Step </ReaderOnly>{c.step}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((r) => (
                <tr key={r.feature}>
                  <th scope="row" className={styles.story}><TextLink href={href.feature(book, r.feature)}>{r.title}</TextLink></th>
                  {r.cells.map((c, i) => <Cell key={i} book={book} cell={c} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ul className={styles.legend} aria-label="What the marks mean">
        {(['done', 'now', 'next'] as const).map((s) => (
          <li key={s} className={styles.key}><StepMark state={s} small />{raise(STEP_WORDS[s])}</li>
        ))}
      </ul>
    </div>
  );
}
