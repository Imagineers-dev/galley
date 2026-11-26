// Reading text from Markdown an agent wrote (lib/book/markdown.ts keeps its links honest), or HTML the book rendered
// from it (a numbered paper, an agents' paper with its citations).
import { renderMarkdown } from '../../../lib/book/markdown';
import styles from './prose.module.css';

export function Prose({ text, html, dropTitle = false, numbered = false }: { text?: string; html?: string; dropTitle?: boolean; numbered?: boolean }) {
  const body = html ?? renderMarkdown(text ?? '', dropTitle);
  return <div className={`${styles.prose} ${numbered ? styles.numbered : ''}`} dangerouslySetInnerHTML={{ __html: body }} />;
}
