// A form folded under what it adds to (attach a file, write a document, edit this one), opened by a quiet line.
// Native <details>: it opens with no script, and opens by itself when it has something to say (a refusal).
import type { ReactNode } from 'react';
import styles from './disclosure.module.css';

export const Disclosure = ({ label, open = false, children }: { label: string; open?: boolean; children: ReactNode }) => (
  <details className={styles.disclosure} open={open}>
    <summary className={styles.summary}>{label}</summary>
    {children}
  </details>
);
