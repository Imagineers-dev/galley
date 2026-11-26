// Beneath a chapter's grid: what the last finished story taught.
import type { Grid } from '../../../lib/book/grid';
import { href } from '../../../lib/routes';
import { Card } from '../parts/card';
import { Meta, TextLink } from '../parts/text';
import styles from './grid-lesson.module.css';

export function GridLesson({ book, grid, empty }: { book: string; grid: Grid; empty: string }) {
  const finding = grid.latestFinding;
  return (
    <Card>
      {finding ? (
        <>
          <p className={styles.line}>{finding.text}</p>
          <Meta>From <TextLink href={href.feature(book, finding.feature)}>{finding.story}</TextLink></Meta>
        </>
      ) : <Meta>{empty}</Meta>}
    </Card>
  );
}
