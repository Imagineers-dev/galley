// What the book shows of its assets. Pure: the current records in, lists out. A withdrawn asset is gone from
// every list; the store keeps it.
import type { Asset } from './asset-types';
import { type Current, type Entry, entries } from './views';

const live = (now: Current) => entries<Asset>(now, 'asset').filter((a) => !a.body.withdrawn);

/** The slides and documents on one feature, oldest first. */
export const assetsOn = (now: Current, featureId: string): Entry<Asset>[] => live(now).filter((a) => a.body.feature === featureId);

/** Every research document, newest first. */
export const researchOf = (now: Current): Entry<Asset>[] =>
  live(now).filter((a) => a.body.folder !== undefined).sort((a, b) => b.firstAt.localeCompare(a.firstAt));

/** The research that informs one feature. */
export const researchBehind = (now: Current, featureId: string): Entry<Asset>[] =>
  researchOf(now).filter((a) => a.body.informs?.includes(featureId));

export type Folder = { path: string; name: string; count: number; children: Folder[] };

/**
 * The research library's folders, made from the paths its documents name: "market/competitors" makes "market" and
 * "market/competitors" under it. `count` is every document in the folder or beneath it. Sorted by name.
 */
export function folderTree(docs: Entry<Asset>[]): Folder[] {
  const root: Folder = { path: '', name: '', count: 0, children: [] };
  for (const doc of docs) {
    let at = root;
    for (const part of (doc.body.folder ?? '').split('/').filter(Boolean)) {
      const path = at.path ? `${at.path}/${part}` : part;
      let next = at.children.find((c) => c.path === path);
      if (!next) at.children.push((next = { path, name: part, count: 0, children: [] }));
      next.count += 1;
      at = next;
    }
  }
  const sort = (list: Folder[]): Folder[] => list.sort((a, b) => a.name.localeCompare(b.name)).map((f) => ({ ...f, children: sort(f.children) }));
  return sort(root.children);
}

/** Every tag used in the library, with how many documents carry it, most used first. */
export function tagCounts(docs: Entry<Asset>[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const doc of docs) for (const tag of doc.body.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** The documents in a folder (and beneath it) carrying a tag, when either is given. */
export const filterResearch = (docs: Entry<Asset>[], folder?: string, tag?: string) =>
  docs.filter((d) => (!folder || d.body.folder === folder || d.body.folder?.startsWith(`${folder}/`)) && (!tag || d.body.tags?.includes(tag)));
