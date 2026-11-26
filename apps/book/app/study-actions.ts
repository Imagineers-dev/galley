'use server';
// The editor's marks on a study book: a tick on a pointer, and "I have it" on a step. Only signed in, only today, and
// every redirect stays on this site (safeBack).
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { safeBack } from '../lib/book/links';
import { asOf } from '../lib/load';
import { href, isBookName } from '../lib/routes';
import { StepChanged, markStep, tickPointer } from '../lib/server/study';
import { isEditor } from '../lib/server/session';

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

async function allowed(form: FormData) {
  const book = field(form, 'book');
  if (!isBookName(book)) redirect('/');
  const here = safeBack(field(form, 'here'), href.book(book));
  if (!(await isEditor())) redirect(href.signIn(here));
  if (await asOf()) redirect(here);
  return { book, here, work: field(form, 'work') };
}

/** Runs a mark and returns to the page; a step that changed since the page was drawn says so there. */
async function markThen(book: string, here: string, anchor: string, mark: () => Promise<unknown>) {
  try {
    await mark();
  } catch (error) {
    if (!(error instanceof StepChanged)) throw error;
    revalidatePath(`/${book}`, 'layout');
    redirect(`${here}?changed=1`);
  }
  revalidatePath(`/${book}`, 'layout'); // the page returned to is the page pressed on: draw it afresh, sidebar included
  redirect(`${here}${anchor}`);
}

export async function tick(form: FormData) {
  const { book, here, work } = await allowed(form);
  const pointer = field(form, 'pointer');
  await markThen(book, here, `#${encodeURIComponent(pointer)}`, () => tickPointer(book, work, pointer, field(form, 'done') === 'yes'));
}

export async function haveIt(form: FormData) {
  const { book, here, work } = await allowed(form);
  await markThen(book, here, '', () => markStep(book, work, field(form, 'have') === 'yes'));
}
