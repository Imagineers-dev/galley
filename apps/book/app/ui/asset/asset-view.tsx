// One asset, shown as what it is: slides and HTML pages in their sandboxed frame, markdown as reading text, images,
// PDFs, video and audio in place, other text as it is, and anything else as a download. The bytes come from the
// file's own address (by hash); markdown and text are read here, so they are shown through the book's own parts.
import type { Asset } from '../../../lib/book/asset-types';
import { formOf } from '../../../lib/book/asset-types';
import { href } from '../../../lib/routes';
import { readRange } from '../../../lib/store/files';
import { Prose } from '../parts/prose';
import styles from './asset-view.module.css';
import { SlideFrame } from './slide-frame';

const TEXT_SHOWN = 1024 * 1024;

export async function AssetView({ book, asset }: { book: string; asset: Asset }) {
  const src = href.file(book, asset.file.hash);
  const form = formOf(asset);
  const text = async () => (asset.file.size <= TEXT_SHOWN ? (await readRange(book, asset.file.hash, asset.file.size))?.toString('utf8') : undefined);
  switch (form) {
    case 'slides':
    case 'page':
      return <SlideFrame src={src} title={asset.title} slides={form === 'slides'} />;
    case 'markdown': {
      const words = await text();
      return words !== undefined ? <div className={styles.reading}><Prose text={words} dropTitle /></div> : <Download src={src} name={asset.file.name} />;
    }
    case 'text': {
      const words = await text();
      return words !== undefined ? <pre className={styles.text}>{words}</pre> : <Download src={src} name={asset.file.name} />;
    }
    case 'image':
      return <img className={styles.image} src={src} alt={asset.about ?? asset.title} />;
    case 'pdf':
      return <iframe className={styles.pdf} src={src} title={asset.title} />;
    case 'video':
      return <video className={styles.media} src={src} controls preload="metadata" />;
    case 'audio':
      return <audio className={styles.audio} src={src} controls preload="metadata" />;
    default:
      return <Download src={src} name={asset.file.name} />;
  }
}

const Download = ({ src, name }: { src: string; name: string }) => (
  <p className={styles.download}><a href={src} download={name}>Download {name}</a></p>
);
