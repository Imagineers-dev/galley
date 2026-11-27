// The editor's form for writing a document in the book: a title, HTML or Markdown, and the text, filed in a section's
// folder with tags, or on a feature; or, given a document, a new version of it with its text filled in. A plain form
// posted to the book's write route, so it works without script.
import { href } from '../../../lib/routes';
import { Button } from '../parts/button';
import { Problem } from '../parts/notice';
import styles from './attach-form.module.css';

export function WriteForm({ book, here, feature, section, folder, document, format = 'markdown', text = '', refused }: {
  book: string; here: string; feature?: string; section?: string; folder?: string;
  document?: string; format?: 'html' | 'markdown'; text?: string; refused?: string;
}) {
  return (
    <form className={styles.form} action={href.write(book)} method="post">
      <input type="hidden" name="here" value={here} />
      {feature && <input type="hidden" name="feature" value={feature} />}
      {section && <input type="hidden" name="section" value={section} />}
      {document && <input type="hidden" name="document" value={document} />}
      {!document && <label className={styles.label}>Title <input className={styles.field} name="title" placeholder="Taken from the document's first heading, if you leave it" /></label>}
      {section && !document && (
        <>
          <label className={styles.label}>Folder <input className={styles.field} name="folder" defaultValue={folder} placeholder="e.g. market/competitors; a new one is made" /></label>
          <label className={styles.label}>Tags <input className={styles.field} name="tags" placeholder="Separated by commas" /></label>
        </>
      )}
      <label className={styles.label}>Written in
        <select className={styles.field} name="format" defaultValue={format}>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
        </select>
      </label>
      <label className={styles.label}>The document <textarea className={styles.text} name="text" defaultValue={text} required rows={18} /></label>
      {refused && <Problem>{refused}</Problem>}
      <div className={styles.actions}><Button kind="small">{document ? 'Save this version' : 'Save the document'}</Button></div>
    </form>
  );
}
