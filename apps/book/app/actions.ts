'use server';
// The editor's answers and reading preferences. These are the only writes that come from the website: answers
// only when signed in, and every redirect stays on this site (safeBack).
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isDay } from '../lib/book/days';
import { safeBack } from '../lib/book/links';
import { currentOf, progress } from '../lib/book/views';
import { AS_OF_COOKIE, asOf } from '../lib/load';
import { href, isBookName } from '../lib/routes';
import { PaperChanged, PromisesChanged, answerPaper, answerPromises } from '../lib/server/answers';
import { isEditor, signIn, signOut } from '../lib/server/session';
import { readCurrent } from '../lib/store/records';
import { THEME_COOKIE, themeOf } from '../lib/theme';

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
const withQuery = (to: string, query: string) => `${to}${to.includes('?') ? '&' : '?'}${query}`;

/** The page a form was sent from, on this site only: for actions that return the reader to where they were. */
async function sentFrom(): Promise<string> {
  const jar = await headers();
  try {
    const from = new URL(jar.get('referer') ?? '');
    return from.host === jar.get('host') ? safeBack(`${from.pathname}${from.search}`) : '/';
  } catch {
    return '/';
  }
}

export async function answer(form: FormData) {
  const book = field(form, 'book');
  if (!isBookName(book)) redirect('/');
  const here = safeBack(field(form, 'here'), href.book(book));
  if (!(await isEditor())) redirect(href.signIn(here));
  if (await asOf()) redirect(here); // answers are given today, never into the past
  const verdict = field(form, 'verdict') === 'approved' ? 'approved' : 'changes';
  const words = field(form, 'words');
  // Asking for changes without saying what cannot be acted on: send the editor back to say it.
  if (verdict === 'changes' && !words) redirect(withQuery(here, 'answer=1&need=words'));
  try {
    await answerPaper(book, { paper: field(form, 'paper'), verdict, words, paperAt: field(form, 'paperAt') });
  } catch (error) {
    if (error instanceof PaperChanged) redirect(withQuery(here, 'changed=1'));
    throw error;
  }
  // After an answer, the next paper waiting on the editor, in book order; otherwise back to the book.
  const next = progress(currentOf(await readCurrent(book))).toRead[0];
  redirect(next ? href.paperOf(book, next.paper.body) : href.book(book));
}

/** The editor's answer to the promises on their screen: each form field `item` names one promise at the version shown. */
export async function answerPromisesForm(form: FormData) {
  const book = field(form, 'book');
  if (!isBookName(book)) redirect('/');
  const here = safeBack(field(form, 'here'), href.book(book));
  if (!(await isEditor())) redirect(href.signIn(here));
  if (await asOf()) redirect(here);
  const verdict = field(form, 'verdict') === 'approved' ? 'approved' : 'changes';
  const words = field(form, 'words');
  if (verdict === 'changes' && !words) redirect(withQuery(here, 'need=words'));
  const items = form.getAll('item').map(String).map((v) => { const [promise, at] = v.split('|'); return { promise, at }; });
  try {
    await answerPromises(book, { feature: field(form, 'feature'), items, verdict, words, all: field(form, 'all') === '1' });
  } catch (error) {
    if (error instanceof PromisesChanged) redirect(withQuery(here, 'changed=1'));
    throw error;
  }
  redirect(here);
}

/** Read the whole book as it stood at the end of a day, or (empty) as it is today. */
export async function readAsOf(form: FormData) {
  const day = field(form, 'day');
  const jar = await cookies();
  if (isDay(day)) jar.set(AS_OF_COOKIE, day, { httpOnly: true, sameSite: 'strict', path: '/' });
  else jar.delete(AS_OF_COOKIE);
  redirect(await sentFrom());
}

export async function enter(form: FormData) {
  const back = safeBack(form.get('back'));
  const result = await signIn(field(form, 'passcode'));
  redirect(result === 'in' ? back : `/signin?${result}=1&back=${encodeURIComponent(back)}`);
}

export async function leave() {
  await signOut();
  redirect('/');
}

/** Day, Night or the system's own setting, kept for a year. A reading preference only; it changes nothing in the book. */
export async function setTheme(form: FormData) {
  const theme = themeOf(field(form, 'theme'));
  const jar = await cookies();
  if (theme) jar.set(THEME_COOKIE, theme, { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
  else jar.delete(THEME_COOKIE);
  redirect(await sentFrom());
}
