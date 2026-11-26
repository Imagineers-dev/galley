// What the book holds as evidence for one promise: the tests linked to it, their accepted links, and every result on
// them, each marked trusted or not. Pure. promise-status.ts decides what it all adds up to.
import type { Ask, Reply } from './inbox-types';
import { witnessedRuns } from './promise-authors';
import { sameSha, when } from './promise-code';
import type { AskAbout, BookPromise, LinkAccept, PromiseApproval, PromiseSnapshot, Surface } from './promise-types';
import { YES_TO, subjectKey } from './promise-types';
import type { Run, Test, TestLevel } from './record-types';
import type { Link } from './types';
import { type Current, type Entry, entries, entry, replacedBy } from './views';

/** One result on a test: a run, or the editor saying it worked or did not. */
export type Sample = {
  id: string; test: string; at: string; result: 'pass' | 'fail'; subject: string; trusted: boolean; runner: boolean;
  sha?: string; committedAt?: string; surface?: Surface; version?: string;
};
export type LinkedTest = { link: Entry<Link>; test: Entry<Test>; acceptedAt?: string; firstAcceptedAt?: string; samples: Sample[] };

const LEVELS: TestLevel[] = ['unit', 'integration', 'app', 'editor'];
export const levelRank = (level: TestLevel) => LEVELS.indexOf(level);

/** The editor's answers to asks about one test: "it works" is a pass, "something is wrong" a failure. */
function editorSamples(now: Current, testId: string, promiseId: string): Sample[] {
  const asks = new Map(entries<Ask>(now, 'ask').filter((a) => a.body.needs === 'try' && a.body.about?.act === 'pass' && a.body.about.test === testId && a.body.about.promise === promiseId).map((a) => [a.id, a]));
  if (!asks.size) return [];
  return entries<Reply>(now, 'reply').flatMap((r) => {
    const ask = asks.get(r.body.to);
    const about = ask?.body.about;
    if (!ask || !about || r.by !== 'editor' || !r.body.tried) return [];
    // The build named when they were asked counts only if the app reported it again after they were asked. Known limit: a
    // reinstall between that reading and their reply cannot be seen, because the book reads the app only at a pick-up.
    const seen = r.body.build;
    const build = about.sha && seen && sameSha(seen.sha, about.sha) && when(seen.readAt) >= when(ask.at) ? { sha: about.sha, committedAt: about.committedAt } : {};
    return [{
      id: r.id, test: testId, at: r.at, result: r.body.tried === 'works' ? 'pass' as const : 'fail' as const, subject: subjectKey(about.subject), trusted: true, runner: false,
      ...build, surface: about.surface, version: about.version,
    }];
  });
}

/** What the editor has said yes to retracting: a mistaken bug, or a failed run that should not have counted. */
export function retractions(now: Current): AskAbout[] {
  const asks = new Map(entries<Ask>(now, 'ask').filter((a) => a.body.about?.act === 'retract').map((a) => [a.id, a.body.about!]));
  if (!asks.size) return [];
  return entries<Reply>(now, 'reply').flatMap((r) => {
    const about = asks.get(r.body.to);
    return about && r.by === 'editor' && r.body.choice === YES_TO.retract ? [about] : [];
  });
}

/** Every result on a test but its baselines, oldest first. A run is trusted when the runner wrote it or a second agent vouched for it. */
export function samplesOf(now: Current, testId: string, promiseId: string): Sample[] {
  const witnessed = witnessedRuns(now, testId);
  const retracted = new Set(retractions(now).map((a) => a.run));
  const runs = entries<Run>(now, 'run').filter((r) => r.body.of === testId && r.body.stage !== 'baseline' && !retracted.has(r.id)).map((r): Sample => ({
    id: r.id, test: testId, at: r.at, result: r.body.result, subject: subjectKey(r.body.subject), trusted: r.by === 'repo' || witnessed.has(r.id), runner: r.by === 'repo',
    sha: r.body.sha, committedAt: r.body.committedAt, surface: r.body.surface,
  }));
  return [...runs, ...editorSamples(now, testId, promiseId)].sort((a, b) => a.at.localeCompare(b.at));
}

const acceptsOf = (now: Current, linkId: string) => entries<LinkAccept>(now, 'link-accept').filter((a) => a.body.link === linkId).sort((a, b) => a.at.localeCompare(b.at));

/** The tests linked to a promise. A link never goes away, so a failure on it cannot be hidden by changing the test. */
export function linkedTests(now: Current, promiseId: string): LinkedTest[] {
  return entries<Link>(now, 'link').filter((l) => l.body.kind === 'proves-promise' && l.body.to === promiseId).flatMap((link) => {
    const record = now.get(link.body.from);
    if (record?.kind !== 'test') return [];
    const test = entry<Test>(record);
    const accepts = acceptsOf(now, link.id);
    const argv = JSON.stringify(test.body.command?.argv ?? []);
    const valid = accepts.filter((a) => a.body.testAt === test.at && JSON.stringify(a.body.argv) === argv).at(-1);
    return [{ link, test, acceptedAt: valid?.at, firstAcceptedAt: accepts[0]?.at, samples: samplesOf(now, test.id, promiseId) }];
  });
}

/** The test that took this one's place, following the chain to the newest, if any. */
export function replacementOf(now: Current, testId: string): string | undefined {
  const replaced = replacedBy(now);
  const seen = new Set([testId]);
  let at = replaced.get(testId);
  while (at && !seen.has(at) && replaced.has(at)) { seen.add(at); at = replaced.get(at); }
  return at && now.get(at)?.kind === 'test' ? at : undefined;
}

/** The editor's standing answer: the words last approved, and whether the current version is the one they approved. */
export function approvalOf(now: Current, promiseId: string): { snapshot?: PromiseSnapshot; current: boolean; changesAsked?: string } {
  const version = now.get(promiseId)?.at;
  let snapshot: PromiseSnapshot | undefined;
  let current = false;
  let changesAsked: string | undefined;
  const answers = entries<PromiseApproval>(now, 'promise-approval').filter((a) => a.by === 'editor').sort((a, b) => a.at.localeCompare(b.at));
  for (const a of answers) {
    const item = a.body.items.find((i) => i.promise === promiseId);
    if (!item) continue;
    if (a.body.verdict === 'approved') snapshot = item.snapshot;
    if (item.at === version) { current = a.body.verdict === 'approved'; changesAsked = a.body.verdict === 'changes' ? a.body.words : undefined; }
  }
  return { snapshot, current, changesAsked };
}

/** The words they last answered, approved or not. */
export function lastAnswered(now: Current, promiseId: string): PromiseSnapshot | undefined {
  return entries<PromiseApproval>(now, 'promise-approval').filter((a) => a.by === 'editor').sort((a, b) => a.at.localeCompare(b.at))
    .flatMap((a) => a.body.items.filter((i) => i.promise === promiseId).map((i) => i.snapshot)).at(-1);
}

/** A promise with an earlier version or any answer is never covered by Approve all: they read it on its own. */
export function isReworded(now: Current, promiseId: string): boolean {
  const record = now.get(promiseId);
  return !!record && (record.at !== record.firstAt || !!lastAnswered(now, promiseId));
}

/** A feature's own promises. */
export const promisesOn = (now: Current, featureId: string) =>
  entries<BookPromise>(now, 'promise').filter((p) => p.body.feature === featureId);
