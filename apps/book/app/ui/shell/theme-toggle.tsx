// Day or night, as one icon button beside the brand: a moon by day, a sun by night. It follows the system until the
// reader picks one, and comes back to the page it was pressed on (the action reads where it was sent from).
import { setTheme } from '../../actions';
import styles from './theme-toggle.module.css';

const SUN = 'M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10';
const MOON = 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z';

const Glyph = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

export function ThemeToggle() {
  return (
    <form action={setTheme} className={styles.form}>
      <button type="submit" name="theme" value="dark" className={`${styles.button} ${styles.toNight}`} aria-label="Switch to night" title="Switch to night"><Glyph d={MOON} /></button>
      <button type="submit" name="theme" value="light" className={`${styles.button} ${styles.toDay}`} aria-label="Switch to day" title="Switch to day"><Glyph d={SUN} /></button>
    </form>
  );
}
