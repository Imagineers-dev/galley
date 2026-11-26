// Attaching a file to the book, the one way for agents' tools, repositories and the editor alike: the book decides
// the file's type and hash from its bytes, keeps the bytes, then writes the asset record through the book's queue.
// The bytes are kept first, outside the queue, so a large file never holds up other writes to the book; bytes whose
// record is refused stay unreferenced and harmless (the same bytes are one file).
import { type Asset, MAX_FILE_BYTES, RESEARCH, folderPath, sectionOf, tagOf } from './book/asset-types';
import { typeOf } from './book/file-types';
import { type BookRecord, ids, slugify } from './book/types';
import { putFile } from './store/files';
import { Refused, writeFrom } from './write';

/** Where an asset sits: on a feature, or in a section's folder with its tags and the features it informs. */
export type Placing = { feature?: string; section?: string; folder?: string; tags?: string[]; informs?: string[] };

export type Attaching = {
  /** To change an asset already in the book: its id. Without it, a new asset is added. */
  asset?: string;
  title?: string;
  slug?: string;
  about?: string;
  slides?: boolean;
  place?: Placing;
  file?: { name: string; bytes: Uint8Array };
};

/** True when the asset will sit in a section: it is moved into one, or it is in one and not moved onto a feature. */
const inSection = (old: Partial<Asset>, place: Placing | undefined) =>
  place?.section !== undefined || place?.folder !== undefined || (!place?.feature && sectionOf(old) !== undefined);

const placed = (old: Partial<Asset>, place: Placing | undefined): Partial<Asset> => {
  if (!place) return {};
  if (place.feature) return { feature: place.feature, section: undefined, folder: undefined, tags: undefined, informs: undefined };
  const moving = place.section !== undefined || place.folder !== undefined;
  return {
    ...(moving ? { feature: undefined, section: place.section ?? sectionOf(old) ?? RESEARCH, folder: folderPath(place.folder ?? old.folder ?? '') } : {}),
    ...(place.tags ? { tags: [...new Set(place.tags.map(tagOf).filter(Boolean))] } : {}),
    ...(place.informs ? { informs: place.informs } : {}),
  };
};

const defined = (body: Record<string, unknown>) => Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));

export async function attach(book: string, by: string, a: Attaching): Promise<BookRecord> {
  let file: Asset['file'] | undefined;
  if (a.file) {
    const { name, bytes } = a.file;
    if (!bytes.length) throw new Refused(['The file is empty.']);
    if (bytes.length > MAX_FILE_BYTES) throw new Refused(['A file is at most 20 MB.']);
    file = { name, type: typeOf(name, bytes), size: bytes.length, hash: await putFile(book, bytes) };
  }
  return writeFrom(book, (now) => {
    const old = a.asset ? now.get(a.asset) : undefined;
    if (a.asset && old?.kind !== 'asset') throw new Refused([`No asset "${a.asset}" in this book.`]);
    const was = (old?.body ?? {}) as Partial<Asset>;
    if (was.withdrawn) throw new Refused(['This asset was withdrawn; attach the file again under a new slug.']);
    if ((a.place?.tags || a.place?.informs) && !inSection(was, a.place)) throw new Refused(['Tags and informs are for documents filed in a section.']);
    const title = a.title ?? was.title;
    if (!title) throw new Refused(['An asset has a title.']);
    const slug = was.slug ?? a.slug ?? slugify(title);
    if (!old && now.get(ids.asset(slug))) throw new Refused([`"${ids.asset(slug)}" is already in this book. To change it, name it as the asset.`]);
    const kept = file ?? was.file;
    if (!kept) throw new Refused(['Attach a file.']);
    // A new file that is not HTML cannot be slides, so it stops being slides; otherwise the choice holds until changed.
    const slides = a.slides === true ? true : kept.type !== 'text/html' ? undefined : a.slides === undefined ? was.slides : undefined;
    const body = defined({ ...was, title, slug, ...(a.about !== undefined ? { about: a.about || undefined } : {}), slides, ...placed(was, a.place), file: kept });
    return { id: ids.asset(slug), kind: 'asset', by, replaces: null, body };
  });
}

/** Takes an asset out of the book, with why. It stays in the store; every list reads on without it. */
export const withdrawAsset = (book: string, by: string, asset: string, reason: string) =>
  writeFrom(book, (now) => {
    const old = now.get(asset);
    if (old?.kind !== 'asset') throw new Refused([`No asset "${asset}" in this book.`]);
    if (old.body.withdrawn) throw new Refused(['This asset is already withdrawn.']);
    return { id: asset, kind: 'asset', by, replaces: null, body: { ...old.body, withdrawn: { reason } } };
  });
