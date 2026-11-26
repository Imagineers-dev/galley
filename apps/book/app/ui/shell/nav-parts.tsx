// The pieces inside a sidebar item: its line icon, its label, and the dot that says something there waits on you.
// Server-side, so the sidebar can draw them inside the (client) NavItem. Icons are inline: no icon library.
import styles from './nav-item.module.css';

const paths = {
  inbox: 'M4 13h4l1.5 2.5h5L16 13h4M5.5 5h13l1.5 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z',
  stand: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M15.5 8.5l-2 5-5 2 2-5z',
  motion: 'M3 12h4l2-5 4 10 2-5h6',
  diary: 'M6 4h11a1 1 0 0 1 1 1v15H7a1 1 0 0 1-1-1zM6 17h12M10 8h5',
} as const;

export function NavIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

export const NavLabel = ({ children }: { children: string }) => <span className={styles.label}>{children}</span>;

export const WaitsDot = () => <span className={styles.dot} title="Something here waits on you" />;
