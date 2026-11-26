// What is live: the latest release of each part, whether its commit is confirmed from the deployment or only
// inferred, whether the book has seen that commit, and how to undo it.
import type { Release } from './oversight-types';
import { type Current, type Entry, entries } from './views';

export type LivePart = { part: string; now: Entry<Release>; recorded: boolean; confirmed: boolean; history: Entry<Release>[] };

export function livePart(now: Current): LivePart[] {
  const shas = [...now.values()].filter((r) => r.kind === 'commit').map((r) => String(r.body.sha));
  const known = (sha: string) => shas.some((s) => s.startsWith(sha) || sha.startsWith(s));
  const byPart = new Map<string, Entry<Release>[]>();
  for (const r of entries<Release>(now, 'release')) byPart.set(r.body.part, [...(byPart.get(r.body.part) ?? []), r]);
  return [...byPart.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => b.body.deployedAt.localeCompare(a.body.deployedAt));
      return { part: sorted[0].body.part, now: sorted[0], recorded: known(sorted[0].body.sha), confirmed: sorted[0].body.confirmed, history: sorted.slice(1) };
    })
    .sort((a, b) => a.part.localeCompare(b.part));
}

/** A part's latest release from one repository to one place, by when it went out: where a watch's result belongs. */
export function latestRelease(now: Current, part: string, repo: string, where: string): Entry<Release> | undefined {
  return entries<Release>(now, 'release')
    .filter((r) => r.body.part === part && r.body.repo === repo && r.body.where === where)
    .sort((a, b) => Date.parse(a.body.deployedAt) - Date.parse(b.body.deployedAt))
    .at(-1);
}
