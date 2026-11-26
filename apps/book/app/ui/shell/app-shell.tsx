// The window of every book page: the sidebar on the canvas, and the page in the rounded panel beside it.
import type { ReactNode } from 'react';
import styles from './app-shell.module.css';

export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.app}>
      {sidebar}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
