// A command to run or an output to read, kept as written.
import styles from './code-block.module.css';

export const CodeBlock = ({ children }: { children: string }) => <pre className={styles.code} tabIndex={0}>{children}</pre>;
