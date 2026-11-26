// Which entries of the sidebar's tree are open. Any entry with entries under it (a chapter, a feature at any depth, a
// folder at any depth) opens and closes; among siblings one is open at a time. What is open is kept in a cookie per
// book, so the next page is drawn the same way: the keys of every open entry, joined by "|". Pure.

/** The cookie that keeps a book's open entries; "" when everything was closed. */
export const navCookie = (book: string) => `galley_open_${book}`;

/** The sidebar key of a section's folder; a feature's key is its id. */
export const folderKey = (section: string, path: string) => `folder:${section}/${path}`;

/** The open entries: the ones kept; none once all were closed; at first, only `first` (the first chapter). */
export function openEntries(kept: string | undefined, first: string | undefined): Set<string> {
  if (kept === undefined) return new Set(first ? [first] : []);
  return new Set(kept.split('|').map((k) => { try { return decodeURIComponent(k); } catch { return ''; } }).filter(Boolean));
}

/** The cookie's value for a set of open entries. */
export const keptValue = (open: Iterable<string>) => [...open].map(encodeURIComponent).join('|');
