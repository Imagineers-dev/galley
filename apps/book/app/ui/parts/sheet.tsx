// The parts every page is made of: the sheet it sits on, its head (eyebrow, title, lede, and one card of what to do
// at the right), and the two layouts for its content. STYLE_GUIDE.md "Widths": a page picks these and invents none.
import type { ReactNode } from 'react';
import styles from './sheet.module.css';

export const Sheet = ({ children }: { children: ReactNode }) => <div className={styles.sheet}>{children}</div>;

export function PageHead({ eyebrow, title, lede, aside }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; aside?: ReactNode }) {
  return (
    <header className={styles.head}>
      <div className={styles.headText}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {lede && <p className={styles.lede}>{lede}</p>}
      </div>
      {aside && <div className={styles.headAside}>{aside}</div>}
    </header>
  );
}

/** A small line above a title or a paper: what it belongs to, what it is, where it stands. As `h1` it names the page
 * quietly (a work's name over its paper, tests and review). */
export const Eyebrow = ({ children, as: Tag = 'p' }: { children: ReactNode; as?: 'p' | 'h1' }) => <Tag className={styles.eyebrow}>{children}</Tag>;

/** Words for screen readers only: a page's heading when its visible parts carry no title, or a column's name. */
export const ReaderOnly = ({ children, as: Tag = 'span' }: { children: ReactNode; as?: 'span' | 'h1' }) => <Tag className={styles.hidden}>{children}</Tag>;

/** The page's opening paragraph in the reading face, when it stands below the title rather than in the head. */
export const Lede = ({ children }: { children: ReactNode }) => <p className={styles.lede}>{children}</p>;

/** Cards in columns of at least 380px, as many as fit, stretched so no empty column is left at the edge. */
export const Flow = ({ children }: { children: ReactNode }) => <div className={styles.flow}>{children}</div>;

/** What you read (at most 760px) beside what you act with (300–380px), side by side when the split is 1040px wide. */
export function Split({ main, side, sideLabel = 'Beside it' }: { main: ReactNode; side?: ReactNode; sideLabel?: string }) {
  return (
    <div className={styles.split}>
      <div className={styles.splitIn}>
        <div className={styles.splitMain}>{main}</div>
        {side && <aside className={styles.splitSide} aria-label={sideLabel}>{side}</aside>}
      </div>
    </div>
  );
}
