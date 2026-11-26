// Slides and research, without a database: what a file is (from its bytes, never its sender), how each is shown and
// served, where an asset may sit, the research library's folders and tags, and which sidebar chapter is open.
import { describe, expect, it } from 'vitest';
import { formOf, folderPath } from '../lib/book/asset-types';
import { documentsIn, filterDocuments, folderTree, informedBy, tagCounts } from '../lib/book/assets';
import { openChapter } from '../lib/book/chapters';
import { sectionsOf } from '../lib/book/sections';
import { DOWNLOAD, typeOf } from '../lib/book/file-types';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { refusals } from '../lib/rules/check';
import { fileHeaders, rangeOf } from '../lib/server/file-response';

let tick = 0;
const rec = (id: string, kind: BookRecord['kind'], body: object): BookRecord =>
  ({ book: 'b', id, kind, by: 'agent:claude', at: new Date(Date.UTC(2026, 10, 26, 9, 0, tick++)).toISOString(), replaces: null, body: body as Record<string, unknown> });
const file = (type = 'text/html', name = 'deck.html') => ({ name, type, size: 10, hash: 'a'.repeat(64) });
const now = current([
  rec('project', 'project', { title: 'P', forWriter: 'x' }),
  rec('feature:pricing', 'feature', { title: 'Pricing', slug: 'pricing', forWriter: 'f' }),
  rec('asset:review', 'asset', { title: 'Review', slug: 'review', feature: 'feature:pricing', slides: true, file: file() }),
  rec('asset:interviews', 'asset', { title: 'Interviews', slug: 'interviews', folder: 'users/interviews', tags: ['pricing', 'b2b'], informs: ['feature:pricing'], file: file('text/markdown', 'i.md') }),
  rec('asset:rivals', 'asset', { title: 'Rivals', slug: 'rivals', folder: 'market', tags: ['pricing'], file: file('application/pdf', 'r.pdf') }),
  rec('section:meetings', 'section', { title: 'Meeting notes', slug: 'meetings' }),
  rec('section:research', 'section', { title: 'Discovery', slug: 'research', about: 'What we learned first.' }),
  rec('section:empty', 'section', { title: 'Gone', slug: 'empty', withdrawn: { reason: 'not used' } }),
  rec('asset:standup', 'asset', { title: 'Standup', slug: 'standup', section: 'meetings', folder: '2026/nov', file: file('text/markdown', 's.md') }),
  rec('asset:old', 'asset', { title: 'Old', slug: 'old', folder: 'market', file: file('text/plain', 'o.txt'), withdrawn: { reason: 'wrong' } }),
]);
const propose = (body: object, id = 'asset:new', by = 'agent:claude') => refusals(now, { id, kind: 'asset', by, replaces: null, body: body as Record<string, unknown> });

describe('what a file is', () => {
  it('is decided from its name and checked against its bytes, so a renamed file is only ever downloaded', () => {
    expect(typeOf('a.pdf', new TextEncoder().encode('%PDF-1.7'))).toBe('application/pdf');
    expect(typeOf('a.pdf', new TextEncoder().encode('<script>'))).toBe(DOWNLOAD);
    expect(typeOf('a.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png');
    expect(typeOf('deck.HTML', new TextEncoder().encode('<h1>'))).toBe('text/html');
    expect(typeOf('tool.exe', new Uint8Array([1]))).toBe(DOWNLOAD);
  });

  it('is shown by its form: an HTML deck as slides, an HTML page as a page, anything unknown as a file', () => {
    expect(formOf({ file: file(), slides: true })).toBe('slides');
    expect(formOf({ file: file() })).toBe('page');
    expect(formOf({ file: file('text/markdown') })).toBe('markdown');
    expect(formOf({ file: file(DOWNLOAD) })).toBe('file');
  });

  it('runs inside a sandbox when it can run script, and is downloaded when the browser cannot show it', () => {
    expect(fileHeaders(file(), null).get('Content-Security-Policy')).toMatch(/^sandbox allow-scripts/);
    expect(fileHeaders(file('image/svg+xml', 'a.svg'), null).get('Content-Security-Policy')).toMatch(/^sandbox/);
    expect(fileHeaders(file('application/pdf'), null).get('Content-Security-Policy')).not.toMatch(/sandbox/);
    expect(fileHeaders(file(DOWNLOAD, 'x.bin'), null).get('Content-Disposition')).toMatch(/^attachment/);
    expect(fileHeaders(file(), null).get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('is served a range at a time for video, and refuses a range outside it', () => {
    expect(rangeOf('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 });
    expect(rangeOf('bytes=900-', 1000)).toEqual({ start: 900, end: 999 });
    expect(rangeOf('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
    expect(rangeOf('bytes=2000-', 1000)).toBe('unsatisfiable');
    expect(rangeOf(null, 1000)).toBeNull();
    expect(fileHeaders(file(), { start: 0, end: 4 }).get('Content-Range')).toBe('bytes 0-4/10');
  });
});

describe('where an asset may sit', () => {
  it('sits on a feature or in a folder, never both or neither', () => {
    expect(propose({ title: 'N', slug: 'new', file: file() })).toContain('An asset sits in one place: on a feature (feature) or in a section (section, with a folder).');
    expect(propose({ title: 'N', slug: 'new', feature: 'feature:pricing', folder: 'x', file: file() }).length).toBeGreaterThan(0);
    expect(propose({ title: 'N', slug: 'new', feature: 'feature:pricing', file: file() })).toEqual([]);
    expect(propose({ title: 'N', slug: 'new', folder: '', file: file() })).toEqual([]);
  });

  it('names features that exist, takes its id from its slug, and calls only HTML slides', () => {
    expect(propose({ title: 'N', slug: 'new', feature: 'feature:nope', file: file() })).toContain('Feature "feature:nope" is not a feature in this book.');
    expect(propose({ title: 'N', slug: 'other', folder: 'a', file: file() })[0]).toMatch(/id is asset:<its slug>/);
    expect(propose({ title: 'N', slug: 'new', folder: 'a', slides: true, file: file('text/markdown') })).toContain('Slides are an HTML file (text/html).');
    expect(propose({ title: 'N', slug: 'new', folder: 'Market/Big Rivals', file: file() })[0]).toMatch(/folder path/);
  });

  it('may be attached by the editor and by a repository, and a withdrawn asset stays withdrawn', () => {
    expect(propose({ title: 'N', slug: 'new', folder: 'a', file: file() }, 'asset:new', 'editor')).toEqual([]);
    expect(propose({ title: 'N', slug: 'new', folder: 'a', file: file() }, 'asset:new', 'repo')).toEqual([]);
    expect(propose({ title: 'Old', slug: 'old', folder: 'market', file: file() }, 'asset:old')).toContain('A withdrawn asset stays withdrawn; attach the file again under a new slug.');
  });
});

describe('the research library', () => {
  const docs = documentsIn(now, 'research');

  it('makes its folders from the paths its documents name, counting what is beneath each', () => {
    expect(folderTree(docs)).toEqual([
      { path: 'market', name: 'market', count: 1, children: [] },
      { path: 'users', name: 'users', count: 1, children: [{ path: 'users/interviews', name: 'interviews', count: 1, children: [] }] },
    ]);
    expect(folderPath(' Users / Big Interviews/ ')).toBe('users/big-interviews');
  });

  it('counts tags and filters by folder (with what is beneath it) and by tag', () => {
    expect(tagCounts(docs)).toEqual([{ tag: 'pricing', count: 2 }, { tag: 'b2b', count: 1 }]);
    expect(filterDocuments(docs, 'users').map((d) => d.id)).toEqual(['asset:interviews']);
    expect(filterDocuments(docs, undefined, 'b2b').map((d) => d.id)).toEqual(['asset:interviews']);
  });

  it('shows on a feature the research that informed it', () => {
    expect(informedBy(now, 'feature:pricing').map((d) => d.id)).toEqual(['asset:interviews']);
  });
});

describe('sections beside the product', () => {
  const section = (body: object, id = 'section:design') => refusals(now, { id, kind: 'section', by: 'agent:claude', replaces: null, body: body as Record<string, unknown> });

  it('lists Research first, under the name the book gave it, then the sections defined, and never one taken away', () => {
    expect(sectionsOf(now).map((s) => [s.slug, s.title])).toEqual([['research', 'Discovery'], ['meetings', 'Meeting notes']]);
    expect(sectionsOf(current([rec('project', 'project', { title: 'P', forWriter: 'x' })]))[0]).toMatchObject({ slug: 'research', title: 'Research' });
  });

  it('files a document only in a section the book has, and keeps "product" for the features', () => {
    expect(propose({ title: 'N', slug: 'new', section: 'meetings', folder: '', file: file() })).toEqual([]);
    expect(propose({ title: 'N', slug: 'new', section: 'nowhere', folder: '', file: file() })[0]).toMatch(/not a section of this book/);
    expect(propose({ title: 'N', slug: 'new', section: 'empty', folder: '', file: file() })[0]).toMatch(/not a section of this book/);
    expect(section({ title: 'Design', slug: 'design' })).toEqual([]);
    expect(section({ title: 'Product', slug: 'product' }, 'section:product')[0]).toMatch(/book's own features/);
  });

  it('is not taken away while it holds documents', () => {
    expect(section({ title: 'Meeting notes', slug: 'meetings', withdrawn: { reason: 'x' } }, 'section:meetings')).toEqual(['This section holds 1 document: move or withdraw them first.']);
  });
});

describe('the open chapter', () => {
  it('is the first by default, the kept one while it is a chapter, and none once all were closed', () => {
    expect(openChapter(['feature:a', 'feature:b'], undefined)).toBe('feature:a');
    expect(openChapter(['feature:a', 'feature:b'], 'feature:b')).toBe('feature:b');
    expect(openChapter(['feature:a', 'feature:b'], 'feature:gone')).toBe('feature:a');
    expect(openChapter(['feature:a'], '')).toBeNull();
  });
});
