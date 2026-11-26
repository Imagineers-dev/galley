// The book's write rules. One function decides whether a record may be added, for the website and MCP alike.
import type { Review, Test } from '../book/record-types';
import type { BookRecord, Order, Work } from '../book/types';
import type { Ask } from '../book/inbox-types';
import { ids, slugOf } from '../book/types';
import type { Current } from '../book/views';
import type { Asset } from '../book/asset-types';
import { assetRefusals } from './bodies-assets';
import { bodies } from './bodies';
import { governingRefusals } from './check-governing';
import { reviewRefusals, runRefusals, testRefusals } from './check-testing';
import { askRefusals, markRefusals, replyRefusals } from './check-inbox';
import { promiseRefusals } from './check-promises';
import { switchedRefusals } from './check-switched';
import { doneNeedsProof, oversightRefusals } from './check-oversight';
import { orderRefusals, withdrawRefusals } from './check-shape';
import { doneNeedsNoProof, editorStepRefusals, kindRefusals, pointerRefusals, tickRefusals } from './check-study';

export type Proposed = Omit<BookRecord, 'at' | 'book'>;

/** What a repository may write. A `beyond` from one must be a reviewer's (check-governing), a `run` the runner's (check-promises). */
const REPOSITORY_KINDS: string[] = ['commit', 'history', 'checkout', 'receipt', 'watch', 'beyond', 'run', 'asset'];

/** Each kind owns its ids: "project" for the book's one project record, "<kind>:…" for everything else. */
export const idFits = (kind: string, id: string) => (kind === 'project' ? id === 'project' : id.startsWith(`${kind}:`) && id.length > kind.length + 1);

/**
 * What may replace what: a record replaces one of its own kind; an open question is closed by the finding that
 * answers it (book_note) or turned into an ask for the editor.
 */
export const mayReplace = (kind: string, replaced: string) => kind === replaced || (replaced === 'question' && (kind === 'finding' || kind === 'ask'));

/**
 * A note is withdrawn once, as it was written: one already in the book, with the same words, work and what it
 * replaced, and never a question the editor has answered. A withdrawn note stays withdrawn.
 */
function noteRefusals(now: Current, record: Proposed): string[] {
  const old = now.get(record.id);
  if (old?.body.withdrawn && !record.body.withdrawn) return ['A withdrawn note stays withdrawn.'];
  if (!record.body.withdrawn) return [];
  if (!old) return ['Only a note already in the book can be withdrawn.'];
  if (old.body.withdrawn) return ['This note is already withdrawn.'];
  if (old.body.work !== record.body.work || old.body.text !== record.body.text || old.replaces !== record.replaces) {
    return ['Withdrawing a note keeps its words, the work it was written on and what it replaced.'];
  }
  const answered = [...now.values()].some((r) => r.kind === 'reply' && r.body.to === record.id);
  return answered ? ["This question has the editor's answer, so it stays; record a finding on the right work instead."] : [];
}

/** A feature may sit under another, but never under itself or anything that sits under it. */
function placeRefusals(now: Current, id: string, parent: string): string[] {
  const seen = new Set<string>();
  for (let at: string | undefined = parent; at && !seen.has(at); at = now.get(at)?.body.parent as string | undefined) {
    if (at === id) return [parent === id ? 'A feature cannot sit under itself.' : `A feature cannot sit under "${parent}", which sits under it.`];
    seen.add(at);
  }
  return [];
}

/** Returns the reasons a record is refused; an empty list means it may be written. */
export function refusals(now: Current, record: Proposed): string[] {
  const schema = bodies[record.kind];
  if (!schema) return [`"${record.kind}" is not a kind of record the book keeps.`];
  const parsed = schema.safeParse(record.body);
  if (!parsed.success) return parsed.error.issues.map((i) => `${record.kind}.${i.path.join('.') || '(body)'}: ${i.message}`);
  const body = parsed.data as Record<string, unknown>;
  const out: string[] = [];
  const existing = now.get(record.id);
  if (!idFits(record.kind, record.id)) out.push(`A ${record.kind}'s id is ${record.kind === 'project' ? '"project"' : `"${record.kind}:…"`}; "${record.id}" is not.`);
  if (existing && existing.kind !== record.kind) out.push(`${record.id} is a ${existing.kind}, not a ${record.kind}.`);

  if (record.kind === 'approval' && record.by !== 'editor') {
    out.push('Only the editor approves, signed in on the website. No agent can record an approval.');
  }
  const answers = record.kind === 'approval' || record.kind === 'reply' || record.kind === 'mark' || record.kind === 'tick' || record.kind === 'promise-approval'
    || record.kind === 'asset'; // the editor may attach slides and research for the team, like an agent
  if (record.kind === 'work' && record.by === 'editor') out.push(...editorStepRefusals(now, record));
  else if (!answers && record.by === 'editor') out.push('The editor answers papers and messages; agents write the book.');
  if ((record.kind === 'reply' || record.kind === 'mark') && record.by !== 'editor') out.push('Only the person a message is for answers or files it, signed in on the website.');
  if (record.by === 'repo' && !REPOSITORY_KINDS.includes(record.kind)) out.push('A repository records its commits, history, checkout, test runs, review receipts, watches, attached files and a reviewer\'s "goes beyond" only.');

  const mustBe = (id: unknown, kind: string, what: string) => {
    const found = now.get(String(id));
    if (!found || found.kind !== kind) out.push(`${what} "${String(id)}" is not a ${kind} in this book.`);
  };

  switch (record.kind) {
    // A project record on a book that exists is a new version of its title (book_update_book). Starting a book is
    // refused once it exists by start() in lib/write.ts, inside the book's queue: the one way a book is started.
    case 'project':
      out.push(...kindRefusals(now, body));
      break;
    case 'order':
      out.push(...orderRefusals(now, record.id, body as Order));
      break;
    case 'feature':
      if (body.parent) mustBe(body.parent, 'feature', 'Parent');
      if (body.parent) out.push(...placeRefusals(now, record.id, String(body.parent)));
      if (record.id !== ids.feature(String(body.slug))) out.push(`A feature's id is ${ids.feature(String(body.slug))}.`);
      out.push(...withdrawRefusals(now, record));
      break;
    case 'work': {
      const work = body as Work;
      mustBe(work.feature, 'feature', 'Feature');
      if (record.id !== ids.work(slugOf(work.feature), work.slug)) out.push(`This work's id is ${ids.work(slugOf(work.feature), work.slug)}.`);
      if ('work' in work.origin) mustBe(work.origin.work, 'work', 'Origin work');
      if ('event' in work.origin) mustBe(work.origin.event, 'event', 'Origin event');
      if (work.state === 'done' && !doneNeedsNoProof(now, record)) {
        if (!work.verdict) out.push('Work is done only once it says whether it served its users (verdict).');
        out.push(...doneNeedsProof(now, record.id));
      }
      out.push(...pointerRefusals(now, work));
      out.push(...withdrawRefusals(now, record));
      break;
    }
    case 'asset':
      out.push(...assetRefusals(now, record.id, body as Asset));
      break;
    case 'tick':
      out.push(...tickRefusals(now, record));
      break;
    case 'event':
      mustBe(body.feature, 'feature', 'Feature');
      break;
    case 'decision':
      mustBe(body.work, 'work', 'Work');
      if ((body.turnedDown as unknown[]).length === 0 && !String(body.why).trim()) {
        out.push('A decision names what was turned down, or says why there was no alternative.');
      }
      break;
    case 'finding':
    case 'question':
      mustBe(body.work, 'work', 'Work');
      out.push(...noteRefusals(now, record));
      break;
    case 'link':
      if (!now.get(String(body.from))) out.push(`Link from "${String(body.from)}": no such record.`);
      break;
    case 'test':
      mustBe(body.work, 'work', 'Work');
      out.push(...testRefusals(now, body as Test));
      break;
    case 'guard':
      mustBe(body.work, 'work', 'Work');
      break;
    case 'run':
      out.push(...runRefusals(now, String(body.of)));
      break;
    case 'review':
      mustBe(body.work, 'work', 'Work');
      out.push(...reviewRefusals(record.by, body as Review));
      break;
    case 'commit':
      mustBe(body.work, 'work', 'Work');
      if (record.by !== 'repo') out.push('Commits are recorded by a repository hook.');
      break;
    case 'history':
      if (record.by !== 'repo') out.push('History is read from a repository.');
      if (record.id !== `history:${String(body.repo)}:${String(body.day)}`) out.push(`A day of history's id is history:${String(body.repo)}:${String(body.day)}.`);
      break;
    case 'checkout':
      if (record.by !== 'repo') out.push('A checkout is reported by the repository itself.');
      if (record.id !== `checkout:${String(body.repo)}`) out.push(`A repository's checkout id is checkout:${String(body.repo)}.`);
      break;
    case 'diary':
      if (record.id !== `diary:${String(body.day)}`) out.push(`A day's diary id is diary:${String(body.day)}.`);
      break;
    case 'ask':
      mustBe(body.work, 'work', 'Work');
      out.push(...askRefusals(body as Ask));
      break;
    case 'reply':
      out.push(...replyRefusals(now, body));
      break;
    case 'mark':
      out.push(...markRefusals(now, record.id, body));
      break;
    case 'approval': {
      const paper = now.get(String(body.paper));
      if (paper?.body.for !== 'editor') out.push('Only a paper written for the editor is approved.');
      else if (!body.paperAt) out.push('An answer names the version of the paper that was read (paperAt).');
      else if (body.paperAt !== paper.at) out.push('This paper changed after you opened it. Read the new words, then answer.');
      break;
    }
  }
  out.push(...governingRefusals(now, record, body));
  out.push(...promiseRefusals(now, record, body));
  out.push(...switchedRefusals(now, record, body));
  out.push(...oversightRefusals(now, record.kind, record.id, body));
  const replaced = record.replaces ? now.get(record.replaces) : undefined;
  if (record.replaces && !replaced) out.push(`"${record.replaces}" cannot be replaced: no such record.`);
  if (replaced && !mayReplace(record.kind, replaced.kind)) out.push(`A ${record.kind} cannot replace a ${replaced.kind}.`);
  return out;
}
