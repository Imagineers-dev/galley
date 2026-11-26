// A row of tabs between the pages of one place (a piece of work, the agents). The page you are on is marked; a tab
// may carry a status dot, and a tab with nothing behind it yet is shown but cannot be opened.
import Link from 'next/link';
import { StatusDot, statusOf } from './parts/status';
import styles from './tab-nav.module.css';

export type TabItem = { key: string; label: string; to: string; status?: string; missing?: boolean };

export function TabNav({ label, tabs, on }: { label: string; tabs: TabItem[]; on: string }) {
  return (
    <nav className={styles.tabs} aria-label={label}>
      {tabs.map((t) =>
        t.missing ? (
          <span key={t.key} className={styles.tab} title="Not written yet"><i className={styles.missing} />{t.label}</span>
        ) : (
          <Link key={t.key} href={t.to} className={`${styles.tab} ${on === t.key ? styles.on : ''}`} aria-current={on === t.key ? 'page' : undefined}>
            {t.status && <StatusDot status={statusOf(t.status)} />}
            {t.label}
          </Link>
        ),
      )}
    </nav>
  );
}
