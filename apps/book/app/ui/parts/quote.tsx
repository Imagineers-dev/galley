// The editor's own words, quoted, with who said them and when. Agents' text never uses this.
import styles from './quote.module.css';

export function Quote({ text, who }: { text: string; who: string }) {
  return (
    <blockquote className={styles.quote}>
      “{text}”<cite className={styles.who}>{who}</cite>
    </blockquote>
  );
}
