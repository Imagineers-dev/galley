// What a file is, decided by the book and never taken from whoever sent it: its name's extension, checked against
// its first bytes for every binary type. Anything unknown, or whose bytes do not match its name, is a plain file
// that is only ever downloaded. Pure.

type Known = { type: string; magic?: (b: Uint8Array) => boolean };

const starts = (b: Uint8Array, ...bytes: number[]) => bytes.every((x, i) => b[i] === x);
const ascii = (b: Uint8Array, at: number, s: string) => [...s].every((c, i) => b[at + i] === c.charCodeAt(0));

const KNOWN: Record<string, Known> = {
  html: { type: 'text/html' }, htm: { type: 'text/html' },
  svg: { type: 'image/svg+xml' },
  md: { type: 'text/markdown' }, markdown: { type: 'text/markdown' },
  txt: { type: 'text/plain' }, csv: { type: 'text/csv' }, json: { type: 'application/json' },
  png: { type: 'image/png', magic: (b) => starts(b, 0x89, 0x50, 0x4e, 0x47) },
  jpg: { type: 'image/jpeg', magic: (b) => starts(b, 0xff, 0xd8, 0xff) },
  jpeg: { type: 'image/jpeg', magic: (b) => starts(b, 0xff, 0xd8, 0xff) },
  gif: { type: 'image/gif', magic: (b) => ascii(b, 0, 'GIF8') },
  webp: { type: 'image/webp', magic: (b) => ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP') },
  pdf: { type: 'application/pdf', magic: (b) => ascii(b, 0, '%PDF') },
  mp4: { type: 'video/mp4', magic: (b) => ascii(b, 4, 'ftyp') },
  m4v: { type: 'video/mp4', magic: (b) => ascii(b, 4, 'ftyp') },
  mov: { type: 'video/quicktime', magic: (b) => ascii(b, 4, 'ftyp') || ascii(b, 4, 'moov') },
  webm: { type: 'video/webm', magic: (b) => starts(b, 0x1a, 0x45, 0xdf, 0xa3) },
  mp3: { type: 'audio/mpeg', magic: (b) => ascii(b, 0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  wav: { type: 'audio/wav', magic: (b) => ascii(b, 0, 'RIFF') && ascii(b, 8, 'WAVE') },
  ogg: { type: 'audio/ogg', magic: (b) => ascii(b, 0, 'OggS') },
};

export const DOWNLOAD = 'application/octet-stream';

/** The media type the book gives a file, from its name and its bytes. */
export function typeOf(name: string, bytes: Uint8Array): string {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase();
  const known = ext ? KNOWN[ext] : undefined;
  if (!known) return DOWNLOAD;
  return !known.magic || known.magic(bytes) ? known.type : DOWNLOAD;
}

/** The sandbox a page-like file runs in, as frame tokens: its scripts and presenting, never the book's origin. */
export const SANDBOX_TOKENS = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation allow-modals';

/** Types that can run script when opened as a page: they are served inside a sandbox, with no access to the book. */
export const runsScript = (type: string) => type === 'text/html' || type === 'image/svg+xml';

/** Types served as text, which carry their character set. */
export const isText = (type: string) => type.startsWith('text/') || type === 'application/json';
