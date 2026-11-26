'use server';
// The editor's answers from the inbox: reply, approve, file. Each is a record in the message's own book.
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { markId } from '../../../lib/book/inbox-types';
import { EDITOR } from '../../../lib/book/people';
import { buildForReply } from '../../../lib/book/promise-ask';
import { asOf } from '../../../lib/load';
import { PaperChanged, answerPaper } from '../../../lib/server/answers';
import { isEditor } from '../../../lib/server/session';
import { href, isBookName } from '../../../lib/routes';
import { write, writeFrom } from '../../../lib/write';

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
const withQuery = (to: string, q: string) => `${to}${to.includes('?') ? '&' : '?'}${q}`;
const withNeedWords = (to: string) => withQuery(to, 'need=words');
/** A message's key is `<book>~<id>`. The book is checked to be a plain book name, so a redirect built from it stays in the book. */
const split = (key: string) => {
  const book = key.slice(0, key.indexOf('~'));
  if (!isBookName(book)) throw new Error('Not a message of a book.');
  return { book, id: key.slice(key.indexOf('~') + 1) };
};
/** Back to the book's inbox as the editor had it (folder, filter, tab), on `key`'s message or on none. */
const back = (form: FormData, key?: string) => {
  const here = field(form, 'here');
  const { need: _need, changed: _changed, ...query } = Object.fromEntries(new URLSearchParams(here.startsWith('?') ? here.slice(1) : here));
  const { book } = split(field(form, 'key'));
  return href.inbox(book, { ...query, m: key ? split(key).id : undefined });
};

/** Answers are given signed in, and today: never while the book is read as of an earlier day. */
async function signedIn(form: FormData) {
  if (!(await isEditor())) redirect(href.signIn(back(form, field(form, 'key'))));
  if (await asOf()) redirect(back(form, field(form, 'key')));
}

export async function reply(form: FormData) {
  await signedIn(form);
  const { book, id } = split(field(form, 'key'));
  const choice = field(form, 'choice');
  const words = field(form, 'words');
  const tried = field(form, 'tried');
  if (!choice && !words && !tried) redirect(withNeedWords(back(form, field(form, 'key'))));
  await writeFrom(book, (now) => ({
    id: `reply:${randomUUID()}`, kind: 'reply', by: 'editor', replaces: null,
    body: { to: id, ...(choice ? { choice } : {}), ...(words ? { words } : {}), ...(tried === 'works' || tried === 'wrong' ? { tried } : {}), ...buildForReply(now, id) },
  }));
  redirect(back(form, field(form, 'next') || undefined));
}

export async function approve(form: FormData) {
  await signedIn(form);
  const { book, id } = split(field(form, 'key'));
  const verdict = field(form, 'verdict') === 'approved' ? 'approved' : 'changes';
  const words = field(form, 'words');
  if (verdict === 'changes' && !words) redirect(withNeedWords(back(form, field(form, 'key'))));
  try {
    await answerPaper(book, { paper: id, verdict, words, paperAt: field(form, 'paperAt') });
  } catch (error) {
    if (error instanceof PaperChanged) redirect(withQuery(back(form, field(form, 'key')), 'changed=1'));
    throw error;
  }
  redirect(back(form, field(form, 'next') || undefined));
}

/** File a message: read, archived, snoozed until a day, or back in the inbox. */
export async function file(form: FormData) {
  await signedIn(form);
  const key = field(form, 'key');
  const { book, id } = split(key);
  const state = field(form, 'state') as 'read' | 'archived' | 'snoozed' | 'inbox';
  const until = field(form, 'until');
  await write(book, {
    id: markId(EDITOR, id), kind: 'mark', by: 'editor', replaces: null,
    body: { message: id, person: EDITOR, state, ...(state === 'snoozed' ? { until } : {}) },
  });
  redirect(back(form, state === 'read' || state === 'inbox' ? key : field(form, 'next') || undefined));
}

/** Marks a message read when the editor opens it, today only: opening it while reading an earlier day writes nothing. */
export async function opened(key: string) {
  if (!(await isEditor()) || (await asOf())) return;
  const { book, id } = split(key);
  await write(book, { id: markId(EDITOR, id), kind: 'mark', by: 'editor', replaces: null, body: { message: id, person: EDITOR, state: 'read' } });
}
