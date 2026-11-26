// What the book knows about the code a promise rests on: which commits touch it and whether a pass names a real one. Pure.
import type { Sample } from './promise-evidence';
import { INSTALLED_APPS } from './installed-apps';
import type { InstalledBuild } from './promise-types';
import type { Checkout, Commit, LiveReading } from './record-types';
import type { Feature, Link } from './types';
import { type Current, type Entry, entries } from './views';

export const when = (t?: string) => (t ? Date.parse(t) : NaN);

/** A feature, what sits under it and what it depends on: work on any of them can change whether its promises hold. */
export function featuresReaching(now: Current, featureId: string): Set<string> {
  const seen = new Set([featureId]);
  const features = entries<Feature>(now, 'feature');
  const deps = entries<Link>(now, 'link').filter((l) => l.body.kind === 'depends-on');
  for (const at of seen) {
    for (const f of features) if (f.body.parent === at) seen.add(f.id);
    for (const l of deps) if (l.body.from === at && now.get(l.body.to)?.kind === 'feature') seen.add(l.body.to);
  }
  return seen;
}

/** A work's id names its feature, even once that work is withdrawn. */
export const featureOfWork = (workId: string) => `feature:${workId.slice('work:'.length).split('/')[0]}`;

export function commitsReaching(now: Current, featureId: string): Entry<Commit>[] {
  const features = featuresReaching(now, featureId);
  return entries<Commit>(now, 'commit').filter((c) => features.has(featureOfWork(c.body.work)));
}

export const sameSha = (a: string, b: string) => a.startsWith(b) || b.startsWith(a);

/**
 * What the installed app last reported, through its repository's pick-up from the app's own Info.plist. Only the
 * repositories and apps in INSTALLED_APPS count, so a worktree or another path names nothing, and neither can an agent.
 */
export function installedReading(now: Current): (LiveReading & { readAt: string }) | undefined {
  const readings = Object.entries(INSTALLED_APPS).flatMap(([repo, { part, where }]) => {
    const checkout = now.get(`checkout:${repo}`);
    if (checkout?.kind !== 'checkout' || checkout.by !== 'repo') return [];
    return (checkout.body as Checkout).live.filter((l) => l.part === part && l.where === where).map((live) => ({ ...live, readAt: checkout.at }));
  });
  return readings.length === 1 ? readings[0] : undefined;
}

/** The installed build a try can count for: a reading that names its commit and has no uncommitted files. */
export function installedBuild(now: Current): InstalledBuild | undefined {
  const reading = installedReading(now);
  return reading?.commit && reading.uncommittedFiles === 0 ? { sha: reading.commit, readAt: reading.readAt } : undefined;
}

/** Another commit on this code, dated at or after the pass's, or recorded after it ran (a parallel branch can be dated earlier). */
export const codeMoved = (reaching: Entry<Commit>[], pass: Sample) =>
  reaching.some((c) => c.body.sha !== pass.sha && (when(c.body.committedAt) >= when(pass.committedAt) || c.firstAt > pass.at));

/** The commit a result names is real and on this code: the runner read it from git, or the book recorded that sha with that date here. */
export const anchored = (reaching: Entry<Commit>[], p: Sample) =>
  !!p.sha && !!p.committedAt && when(p.committedAt) <= when(p.at)
  && (p.runner || reaching.some((c) => c.body.sha === p.sha && when(c.body.committedAt) === when(p.committedAt)));
