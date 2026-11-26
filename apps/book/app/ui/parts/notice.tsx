// A page that stands alone outside a book: sign in, not found, an error. A title, a line, then what you can do.
import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './notice.module.css';
import { PageHead } from './sheet';

export function Notice({ title, lede, children }: { title: string; lede: ReactNode; children?: ReactNode }) {
  return (
    <main className={styles.notice}>
      <PageHead eyebrow="Galley" title={title} lede={lede} />
      {children}
    </main>
  );
}

/** What went wrong with what you entered, said in red under it. */
export const Problem = ({ children }: { children: ReactNode }) => <p className={styles.problem} role="alert">{children}</p>;

/** A single text field in a notice's form. */
export const Field = (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={styles.field} />;
