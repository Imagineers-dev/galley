// The inbox, as a pure view: everything in one book that waits on a person, shaped like mail. Asks from agents,
// papers waiting for approval, open questions and what went wrong each become a message with a subject, a sender,
// where it is filed (inbox, snoozed, answered, archived) and whether it has been read. No store, no I/O.
import type { Event, Note } from './types';
import type { Ask, Mark, Needs, Person, Reply } from './inbox-types';
import { href } from '../routes';
import { PAPER_NAMES } from './types';
import { markId } from './inbox-types';
import type { Motion } from './diary-now';
import { workStages } from './work-stages';
import { beyondDrafts, rewrittenNote } from './inbox-governing';
import { promiseDrafts } from './inbox-promises';
import { aboutNote } from './promise-ask';
import { lessons } from './lessons';
import { livePart } from './live';
import { breaches } from './pulse';
import type { Work } from './types';
import { type Current, entries, entry, readingList, replacedBy, titleOf } from './views';

export type Folder = 'inbox' | 'snoozed' | 'answered' | 'archived';
export type Message = {
  key: string; // `${book}~${id}`: unique across books, used in URLs
  book: string;
  bookTitle: string;
  id: string;
  needs: Needs;
  subject: string;
  text: string; // markdown
  from: { agent: string; feature: string; work?: string; workTitle?: string; steps?: Motion['steps'] };
  at: string;
  options: NonNullable<Ask['options']>;
  recommend?: number;
  links: { label: string; href: string }[];
  answer?: { text: string; at: string };
  folder: Folder;
  read: boolean;
  until?: string;
  /** For a paper: the version shown (its time), which an answer names. */
  version?: string;
  /** Answered on another page, not here: where to go. */
  answerOn?: { label: string; href: string };
};

const agentName = (by: string) => (by.startsWith('agent:') ? by.slice(6).replace(/^\w/, (c) => c.toUpperCase()) : by);

/** The open question, when a note holds one ("…?"); otherwise its first sentence. Used as a subject. */
export function subjectOf(text: string, prefix: string): string {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const line = (sentences.find((s) => s.trim().endsWith('?')) ?? sentences[0]).trim();
  const short = line.length > 96 ? `${line.slice(0, 95).replace(/\s+\S*$/, '')}…` : line;
  return `${prefix}: ${short.replace(/^\w/, (c) => c.toLowerCase())}`;
}

export type Draft = Omit<Message, 'key' | 'book' | 'bookTitle' | 'folder' | 'read' | 'until'> & { answered: boolean };

function fromWork(now: Current, workId: string, by: string) {
  const work = now.get(workId);
  const feature = work ? titleOf(now, String(work.body.feature)) : '';
  const steps = work ? workStages(now, entry<Work>(work)) : undefined;
  return { agent: agentName(by), feature, work: workId, workTitle: work ? String(work.body.title) : undefined, steps };
}

function drafts(book: string, now: Current): Draft[] {
  const replies = entries<Reply>(now, 'reply');
  const answerTo = (id: string) => {
    const r = replies.filter((x) => x.body.to === id).at(-1);
    if (!r) return undefined;
    const tried = r.body.tried === 'works' ? 'It works.' : r.body.tried === 'wrong' ? 'Something is wrong.' : '';
    return { text: [r.body.choice, tried, r.body.words].filter(Boolean).join(' · '), at: r.at };
  };
  const workLinks = (workId: string) => [{ label: 'The work and its papers', href: href.work(book, workId) }, { label: 'Diary', href: href.diary(book) }];
  const out: Draft[] = [];

  for (const a of entries<Ask>(now, 'ask')) {
    const answer = answerTo(a.id);
    out.push({
      id: a.id, needs: a.body.needs, subject: a.body.subject, text: `${aboutNote(now, a.body.about, a.at)}${a.body.text}`, from: fromWork(now, a.body.work, a.by), at: a.firstAt,
      options: a.body.options ?? [], recommend: a.body.recommend, links: [...(a.body.links ?? []), ...workLinks(a.body.work)], answer, answered: !!answer,
    });
  }

  const replaced = replacedBy(now);
  for (const q of entries<Note>(now, 'question')) {
    if (q.body.withdrawn) continue; // taken off its work: nothing for them to answer
    if (now.get(replaced.get(q.id) ?? '')?.kind === 'ask') continue; // asked again, properly, as a message of its own
    const answer = answerTo(q.id);
    const closed = replaced.has(q.id);
    out.push({
      id: q.id, needs: 'decision', subject: subjectOf(q.body.text, 'Decide'), text: q.body.text, from: fromWork(now, q.body.work, q.by), at: q.firstAt,
      options: [], links: workLinks(q.body.work),
      answer: answer ?? (closed ? { text: 'Settled in the book.', at: now.get(replaced.get(q.id) as string)?.at ?? q.at } : undefined),
      answered: !!answer || closed,
    });
  }

  for (const r of readingList(now)) {
    const { kind } = r.paper.body;
    const waiting = r.state.status === 'waiting';
    out.push({
      id: r.paper.id, needs: 'approval', subject: `Approve: ${PAPER_NAMES[kind].name} for “${r.title}”`, text: `${waiting ? rewrittenNote(now, r) : ''}${r.paper.body.text}`,
      from: r.work ? fromWork(now, r.work.id, r.paper.by) : { agent: agentName(r.paper.by), feature: r.title }, at: waiting ? r.paper.at : (r.state.at ?? r.paper.at), options: [],
      links: r.work ? workLinks(r.work.id) : [{ label: 'The paper', href: href.featurePaper(book, r.feature.id, kind) }, { label: 'The feature’s story', href: href.feature(book, r.feature.id) }],
      version: r.paper.at,
      answer: waiting ? undefined : { text: r.state.status === 'approved' ? `Approved${r.state.words ? ` · ${r.state.words}` : ''}` : `Changes asked · ${r.state.words ?? ''}`, at: r.state.at ?? r.paper.at },
      answered: !waiting,
    });
  }

  for (const e of entries<Event>(now, 'event')) {
    out.push({
      id: e.id, needs: 'wrong', subject: `Went wrong: ${e.body.title}`, text: e.body.text, from: { agent: agentName(e.by), feature: titleOf(now, e.body.feature) },
      at: e.firstAt, options: [], links: [{ label: 'The feature’s story', href: href.feature(book, e.body.feature) }], answered: false,
    });
  }
  out.push(...beyondDrafts(book, now, (work, by) => fromWork(now, work, by)));
  out.push(...promiseDrafts(book, now));
  out.push(...oversightDrafts(book, now));
  return out;
}

/** What the oversight records send: a lesson broken twice, a reading over its limit, a live part from an unrecorded commit. */
function oversightDrafts(book: string, now: Current): Draft[] {
  const base = { options: [] as Draft['options'], answered: false, from: { agent: 'The book', feature: 'Oversight' } };
  return [
    ...lessons(now).filter((l) => l.flagged).map((l) => {
      const slip = l.slips[l.slips.length - 1];
      return { ...base, id: slip.id, needs: 'wrong' as const, at: slip.firstAt, subject: `Lesson broken ${l.slips.length} times: ${l.lesson.body.rule}`,
        text: `${slip.body.text}\n\nThe lesson: **${l.lesson.body.rule}** ${l.lesson.body.why}`, links: [{ label: 'Lessons', href: href.agents(book, 'lessons') }] };
    }),
    ...breaches(now).map((p) => ({ ...base, id: p.id, needs: 'wrong' as const, at: p.firstAt, subject: `Over its limit: ${p.body.part} ${p.body.measure}`,
      text: `${p.body.measure} read **${p.body.value} ${p.body.unit}** against a limit of ${p.body.limit}.${p.body.note ? ` ${p.body.note}` : ''}`, links: [{ label: 'The pulse', href: href.production(book, 'pulse') }] })),
    ...livePart(now).filter((l) => !l.confirmed).map((l) => ({ ...base, id: l.now.id, needs: 'wrong' as const, at: l.now.firstAt, subject: `Not sure which commit is live: ${l.part}`,
      text: `${l.part} on ${l.now.body.where} does not say which commit it runs. The book's best guess is \`${l.now.body.sha.slice(0, 9)}\`, inferred from when it was deployed; it may hold uncommitted work.\n\nTo undo: \`${l.now.body.undo}\``, links: [{ label: 'What is live', href: href.production(book, 'live') }] })),
  ];
}

/** Every message in one book for one person, newest first, filed as of `today` (YYYY-MM-DD). */
export function messagesOf(book: string, now: Current, person: Person, today: string): Message[] {
  const bookTitle = String(now.get('project')?.body.title ?? book);
  return drafts(book, now)
    .map(({ answered, ...d }) => {
      const markRecord = now.get(markId(person, d.id));
      const mark = markRecord ? entry<Mark>(markRecord).body : undefined;
      const snoozed = mark?.state === 'snoozed' && (mark.until ?? '') > today;
      const folder: Folder = mark?.state === 'archived' ? 'archived' : snoozed ? 'snoozed' : answered ? 'answered' : 'inbox';
      const read = answered || (!!mark && mark.state !== 'inbox');
      return { ...d, key: `${book}~${d.id}`, book, bookTitle, folder, read, until: snoozed ? mark?.until : undefined };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** What still waits on the person: in the inbox and asking something of them (what went wrong is told, not asked). */
export const waitingOn = (messages: Message[]) => messages.filter((m) => m.folder === 'inbox' && m.needs !== 'wrong' && m.needs !== 'fyi');

export const NEEDS_WORDS: Record<Needs, { tag: string; label: string }> = {
  decision: { tag: 'Decision', label: 'A decision' },
  approval: { tag: 'Approval', label: 'Your approval' },
  try: { tag: 'Try it', label: 'You to try it' },
  fyi: { tag: 'Just so you know', label: 'Just so you know' },
  wrong: { tag: 'Went wrong', label: 'Went wrong' },
};
