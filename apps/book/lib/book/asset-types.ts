// Files kept in the book: slides and documents attached to a feature (a chapter's material for the team), and the
// documents of a section (Research, or any section the book defines), filed in folders and tagged. Both are one kind
// of record, an asset; the bytes live apart, named by their hash (lib/store/files.ts).
import type { Withdrawn } from './types';

/** The file an asset holds: its name, its media type, its size in bytes and the SHA-256 of its bytes. */
export type AssetFile = { name: string; type: string; size: number; hash: string };

/**
 * An asset sits in exactly one place: on a feature (`feature`), or in a section (`section`, its slug; Research when
 * only a folder is named) at a folder path such as "market/competitors", made by naming it ("" is the section
 * itself). A section's documents may carry tags and name the features they inform.
 */
export type Asset = {
  title: string;
  slug: string;
  about?: string;
  feature?: string;
  section?: string;
  folder?: string;
  tags?: string[];
  informs?: string[];
  /** An HTML file meant to be presented: shown with a Present button. */
  slides?: true;
  file: AssetFile;
  withdrawn?: Withdrawn;
};

/** The section every book has, unless it is taken away: where a product's research is filed. */
export const RESEARCH = 'research';

/** The section an asset is filed in, or undefined for an asset on a feature. */
export const sectionOf = (asset: Pick<Asset, 'section' | 'folder'>): string | undefined =>
  asset.section ?? (asset.folder !== undefined ? RESEARCH : undefined);

/** The largest file the book keeps. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** How a file is shown, from its media type. */
export type AssetForm = 'slides' | 'page' | 'markdown' | 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'file';

export function formOf(asset: Pick<Asset, 'file' | 'slides'>): AssetForm {
  const type = asset.file.type.split(';')[0].trim().toLowerCase();
  if (type === 'text/html') return asset.slides ? 'slides' : 'page';
  if (type === 'text/markdown') return 'markdown';
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('text/') || type === 'application/json') return 'text';
  return 'file';
}

/** The words for each form, as the book shows them. */
export const FORM_NAMES: Record<AssetForm, string> = {
  slides: 'Slides', page: 'Page', markdown: 'Document', image: 'Image', pdf: 'PDF', video: 'Video', audio: 'Audio', text: 'Text', file: 'File',
};

/** A folder path written the one way: lower-case parts joined by "/", no empty parts. */
export const folderPath = (raw: string) =>
  raw.split('/').map((p) => p.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')).filter(Boolean).join('/');

export const tagOf = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, '-');

/** A file's size in plain words. */
export const sizeInWords = (bytes: number) =>
  bytes < 1024 ? `${bytes} bytes` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Who attached a file, as the book says it. */
export const attachedBy = (by: string) => (by === 'editor' ? 'you' : by === 'repo' ? 'a repository' : by.replace(/^agent:/, ''));
