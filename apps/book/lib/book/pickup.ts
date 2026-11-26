// Picking up the work, for a person or for an agent starting cold: where the book left off (the latest diary,
// what it named as next, the work under way) beside what is true now (each repository's checkout as it last
// reported itself, commits and answers since the diary was written, what each live part says it runs). Where the
// two disagree, it says so; then it names one first step. A pure view: the repositories report, the book compares.
import { type Line, diaryDays } from './diary';
import { type Motion, workInMotion } from './diary-now';
import { attentionOf } from './attention';
import { livePart } from './live';
import type { Checkout, Commit } from './record-types';
import { deliversProduct } from './study';
import { wordsOf } from './vocabulary';
import type { Approval } from './types';
import type { Ask, Person, Reply } from './inbox-types';
import { type Current, entries, entry } from './views';

export type Pickup = {
  leftOff: { day: string; wroteAt: string; headline: string | null; next: Line[]; motion: Motion[] } | null;
  repos: {
    repo: string;
    checkedAt: string;
    stale: boolean; // checked before the diary was written: the book cannot vouch for it
    branch: string;
    head: Checkout['head'];
    unpushed: Checkout['unpushed'];
    uncommitted: { count: number; areas: { area: string; files: number }[] };
    live: { part: string; says: string | null; bookSays: string | null; agrees: boolean | null }[];
  }[];
  since: { commits: { sha: string; subject: string; at: string }[]; answers: { text: string; at: string }[] };
  disagreements: string[];
  waitingOnYou: number;
  first: string;
};

const same = (a: string, b: string) => a.startsWith(b) || b.startsWith(a);
const short = (sha: string) => sha.slice(0, 9);
/** Git writes local offsets (+05:30), the book writes UTC; compare instants, never strings. */
const after = (iso: string, than: string) => Date.parse(iso) > Date.parse(than);

/** Uncommitted paths grouped by the first two folders, largest first: where the unfinished work sits. */
export function areasOf(paths: string[]): { area: string; files: number }[] {
  const counts = new Map<string, number>();
  for (const p of paths) {
    const parts = p.replace(/\/$/, '').split('/');
    const area = parts.length > 2 ? parts.slice(0, 2).join('/') : parts.length === 2 ? parts[0] : '(top level)';
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return [...counts].map(([area, files]) => ({ area, files })).sort((a, b) => b.files - a.files || a.area.localeCompare(b.area));
}

function answersSince(now: Current, since: string) {
  const replies = entries<Reply>(now, 'reply')
    .filter((r) => after(r.at, since))
    .map((r) => {
      const asked = now.get(r.body.to);
      const subject = asked?.kind === 'ask' ? entry<Ask>(asked).body.subject : r.body.to;
      return { text: `${subject} → ${[r.body.choice, r.body.words].filter(Boolean).join(' · ') || r.body.tried || 'answered'}`, at: r.at };
    });
  const approvals = entries<Approval>(now, 'approval')
    .filter((a) => after(a.at, since))
    .map((a) => ({ text: `${a.body.verdict === 'approved' ? 'Approved' : 'Asked for changes to'} ${a.body.paper}${a.body.words ? ` · ${a.body.words}` : ''}`, at: a.at }));
  return [...replies, ...approvals].sort((a, b) => a.at.localeCompare(b.at));
}

export function pickup(book: string, now: Current, person: Person, today: string): Pickup {
  const days = diaryDays(now);
  const latest = days.find((d) => d.headline || d.next.length || d.waiting.length);
  const wroteAt = latest ? (now.get(`diary:${latest.day}`)?.at ?? `${latest.day}T00:00:00.000Z`) : '';
  const leftOff = latest ? { day: latest.day, wroteAt, headline: latest.headline, next: latest.next, motion: workInMotion(now, latest) } : null;

  const releases = livePart(now);
  const repos = entries<Checkout>(now, 'checkout').map((c) => ({
    repo: c.body.repo,
    checkedAt: c.body.checkedAt,
    stale: !!wroteAt && after(wroteAt, c.body.checkedAt),
    branch: c.body.branch,
    head: c.body.head,
    unpushed: c.body.unpushed,
    uncommitted: { count: c.body.uncommitted.length, areas: areasOf(c.body.uncommitted) },
    live: c.body.live.map((l) => {
      const bookSays = releases.find((r) => r.part === l.part)?.now.body.sha ?? null;
      return { part: l.part, says: l.commit, bookSays, agrees: l.commit && bookSays ? same(l.commit, bookSays) : null };
    }),
  }));

  const commits = entries<Commit>(now, 'commit')
    .filter((c) => wroteAt && after(c.body.committedAt, wroteAt))
    .map((c) => ({ sha: c.body.sha, subject: c.body.subject, at: c.body.committedAt }));
  const answers = wroteAt ? answersSince(now, wroteAt) : [];

  const disagreements: string[] = [];
  if (!repos.length && deliversProduct(now)) disagreements.push('No repository has reported its checkout, so the book cannot say what is true now. Run the pick-up from the repository.');
  for (const r of repos) {
    if (r.stale) disagreements.push(`${r.repo} last reported before the diary was written; run the pick-up there again.`);
    if (r.unpushed.length) disagreements.push(`${r.repo}: ${r.unpushed.length} ${r.unpushed.length === 1 ? 'commit is' : 'commits are'} not on the remote (${r.unpushed.map((u) => short(u.sha)).join(', ')}).`);
    for (const l of r.live) {
      if (l.agrees === false) disagreements.push(`${l.part} runs ${short(l.says as string)}, but the book says ${short(l.bookSays as string)} is live. Record the release.`);
      if (l.says && !l.bookSays) disagreements.push(`${l.part} runs ${short(l.says)}, and the book has no release for it.`);
    }
  }
  if (commits.length) disagreements.push(`${commits.length} ${commits.length === 1 ? 'commit was' : 'commits were'} made after the diary was written; the diary does not account for ${commits.length === 1 ? 'it' : 'them'}.`);

  const waitingOnYou = attentionOf(book, now, person, today).count;
  const firstNext = leftOff?.next[0]?.text.replace(/^first:\s*/i, '').replace(/^\w/, (c) => c.toUpperCase());
  const first = answers.length
    ? `Read what was answered since the diary (${answers.length}), then: ${firstNext ?? wordsOf(now).pickNext}`
    : (firstNext ?? wordsOf(now).noFirstStep);
  return { leftOff, repos, since: { commits, answers }, disagreements, waitingOnYou, first };
}
