// The editor's form for attaching a file: slides or a document to a feature, a document to the research library
// (with its folder and tags), or a new version of an asset. A plain form posted to the book's attach route, so it
// works without script and carries a file of up to 20 MB.
import { href } from '../../../lib/routes';
import { Button } from '../parts/button';
import { Problem } from '../parts/notice';
import styles from './attach-form.module.css';

export function AttachForm({ book, here, feature, research = false, asset, refused }: {
  book: string; here: string; feature?: string; research?: boolean; asset?: string; refused?: string;
}) {
  return (
    <form className={styles.form} action={href.attach(book)} method="post" encType="multipart/form-data">
      <input type="hidden" name="here" value={here} />
      {feature && <input type="hidden" name="feature" value={feature} />}
      {asset && <input type="hidden" name="asset" value={asset} />}
      <label className={styles.label}>File <input className={styles.file} type="file" name="file" required /></label>
      {!asset && <label className={styles.label}>Title <input className={styles.field} name="title" placeholder="The file's name, if you leave it" /></label>}
      {!asset && <label className={styles.label}>What it is <input className={styles.field} name="about" placeholder="One line, for whoever opens it" /></label>}
      {research && (
        <>
          <label className={styles.label}>Folder <input className={styles.field} name="folder" placeholder="e.g. market/competitors; a new one is made" /></label>
          <label className={styles.label}>Tags <input className={styles.field} name="tags" placeholder="Separated by commas" /></label>
        </>
      )}
      {!asset && !research && <label className={styles.check}><input type="checkbox" name="slides" /> These are slides (an HTML deck) to present</label>}
      {refused && <Problem>{refused}</Problem>}
      <div className={styles.actions}><Button kind="small">{asset ? 'Attach the new version' : 'Attach'}</Button></div>
    </form>
  );
}
