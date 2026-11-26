// A small book for promise tests: one feature under a parent, one approved promise, one test with an accepted link.
import type { BookPromise, Subject, Surface } from '../../lib/book/promise-types';
import type { BookRecord } from '../../lib/book/types';
import { ids } from '../../lib/book/types';

let tick = 0;
export const stamp = () => new Date(Date.UTC(2026, 10, 23, 10, 0, tick++)).toISOString();
export const rec = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:claude', replaces: string | null = null): BookRecord =>
  ({ book: 'b', id, kind, by, at: stamp(), replaces, body: body as Record<string, unknown> });

export const P = 'promise:scene/11111111-1111-4111-8111-111111111111';
export const WORK = ids.work('scene', 'draft');
export const REAL: Subject = { real: 'story-temple' };
const feature = (slug: string, more: object = {}) => rec(`feature:${slug}`, 'feature', { title: slug, slug, forWriter: 'x', ...more });
export const workBody = (more: object = {}) => ({ feature: 'feature:scene', title: 'Draft', slug: 'draft', on: '2026-11-23', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-23' }, ...more });
export const promiseBody = (text = 'Only your choice stops a draft.', more: object = {}): BookPromise => ({ feature: 'feature:scene', text, mustHoldIn: 'app', ...more });

export const approve = (p: BookRecord, verdict: 'approved' | 'changes' = 'approved', feat = 'feature:scene') => {
  const { text, mustHoldIn, serverReason } = p.body as BookPromise;
  return rec(`promise-approval:${crypto.randomUUID()}`, 'promise-approval', { feature: feat, items: [{ promise: p.id, at: p.at, snapshot: { text, mustHoldIn, ...(serverReason ? { serverReason } : {}) } }], verdict, ...(verdict === 'changes' ? { words: 'no' } : {}) }, 'editor');
};
export const testBody = (more: object = {}) => ({ work: WORK, title: 'It holds', proves: ['spec¶1'], level: 'integration', runs: 'pnpm test', command: { repo: 'example-tools', argv: ['pnpm', 'test'], surface: 'app', subject: 'synthetic' }, ...more });
export const linkTo = (test: string, promise = P, id = `link:${crypto.randomUUID()}`) => rec(id, 'link', { from: test, to: promise, kind: 'proves-promise', failsWhen: 'a draft stops by itself' });
export const accept = (link: BookRecord, test: BookRecord, by = 'agent:codex') =>
  rec(`link-accept:${crypto.randomUUID()}`, 'link-accept', { link: link.id, testAt: test.at, argv: (test.body.command as { argv: string[] } | undefined)?.argv ?? [] }, by);

type RunOpts = { of?: string; result?: 'pass' | 'fail'; by?: string; sha?: string | null; committedAt?: string | null; surface?: Surface; subject?: Subject; stage?: string };
export const SHA = 'aaaaaaa1';
export const COMMITTED = '2026-11-23T12:00:00+05:30';
export const run = ({ of = 'test:t', result = 'pass', by = 'repo', sha = SHA, committedAt = COMMITTED, surface = 'app', subject = 'synthetic', stage = 'check' }: RunOpts = {}) =>
  rec(`run:${crypto.randomUUID()}`, 'run', { of, result, stage, evidence: 'e', ...(sha ? { sha } : {}), ...(committedAt ? { committedAt } : {}), surface, subject }, by);
/** Code committed just now, so a pass after it is on code newer than anything before it. */
export const newCode = () => ({ sha: `d${Math.random().toString(16).slice(2, 9).padEnd(7, '0')}`, committedAt: stamp() });
export const commit = (sha: string, committedAt: string, work = WORK) => rec(`commit:example-tools:${sha}`, 'commit', { work, repo: 'example-tools', sha, subject: 's', committedAt }, 'repo');

/** A release of the installed app, as a live part records it. */
export const release = (sha: string, confirmed = true, part = 'Studio') =>
  rec(`release:${crypto.randomUUID()}`, 'release', { part, where: 'this machine', sha, repo: 'example-tools', by: 'agent:claude', undo: 'x', deployedAt: stamp(), confirmed });

/** A repository's pick-up, with what the installed app's own Info.plist says it was built from. */
export const reading = (commitSha: string | null, more: object = {}, repo = 'example-app') =>
  rec(`checkout:${repo}`, 'checkout', {
    repo, checkedAt: stamp(), branch: 'main', head: { sha: 'abcdef12', subject: 's' }, unpushed: [], uncommitted: [],
    live: [{ part: 'Studio', where: 'plist:/Applications/Example.app', commit: commitSha, uncommittedFiles: 0, ...more }],
  }, 'repo');

/** The book up to an approved promise and a test whose link another agent accepted. */
export function book(promiseMore: object = {}) {
  const project = rec('project', 'project', { title: 'P', forWriter: 'x' });
  const features = [feature('top'), feature('scene', { parent: 'feature:top' }), feature('child', { parent: 'feature:scene' }), feature('dep'), feature('far')];
  const work = rec(WORK, 'work', workBody());
  const promise = rec(P, 'promise', promiseBody(undefined, promiseMore));
  const approval = approve(promise);
  const test = rec('test:t', 'test', testBody());
  const link = linkTo('test:t');
  const accepted = accept(link, test);
  return { records: [project, ...features, work, promise, approval, test, link, accepted], promise, test, link };
}
