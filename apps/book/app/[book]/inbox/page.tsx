import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Folder } from '../../../lib/book/inbox';
import { NEEDS_WORDS } from '../../../lib/book/inbox';
import type { Needs } from '../../../lib/book/inbox-types';
import { isEditor } from '../../../lib/server/session';
import { AsOfBanner } from '../../ui/as-of';
import { InboxList } from '../../ui/inbox/list';
import { Mail, MailNone } from '../../ui/inbox/mail';
import { InboxPane } from '../../ui/inbox/pane';
import { Rail } from '../../ui/inbox/rail';
import { loadBook } from '../../../lib/load';
import { href } from '../../../lib/routes';
import { getAttention } from '../../../lib/server/attention';

export const dynamic = 'force-dynamic';

type Query = { f?: string; n?: string; t?: string; m?: string; need?: string; changed?: string };
const FOLDERS: { f: Folder; label: string }[] = [
  { f: 'inbox', label: 'Inbox' }, { f: 'snoozed', label: 'Snoozed' }, { f: 'answered', label: 'Answered' }, { f: 'archived', label: 'Archived' },
];
const NEEDS: Exclude<Needs, 'wrong'>[] = ['decision', 'approval', 'try', 'fyi'];

/** The query string for a view, keeping the rest of what is set. */
function q(cur: Query, change: Partial<Query>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...cur, ...change, need: undefined })) if (v) next.set(k, v);
  return `?${next}`;
}

/**
 * The inbox of one book: what in this book waits on the editor, read and answered like mail. Nothing from another
 * book appears, and "next" stays in the book. Left, the folders and needs; middle, the messages; right, the open one.
 * `m` is the open message's id.
 */
export default async function InboxPage({ params, searchParams }: { params: Promise<{ book: string }>; searchParams: Promise<Query> }) {
  const { book } = await params;
  const query = await searchParams;
  const { asOf } = await loadBook(book);
  const attention = await getAttention(book);
  const all = attention.messages;
  const editor = await isEditor();
  const folder = (FOLDERS.find((x) => x.f === query.f)?.f ?? 'inbox') as Folder;
  const wrongTab = query.t === 'wrong';
  const shown = all.filter((m) =>
    m.folder === folder && (folder !== 'inbox' || (wrongTab ? m.needs === 'wrong' : m.needs !== 'wrong'))
    && (!query.n || m.needs === query.n));
  // In the waiting view the book's papers are one reading list (lib/book/attention.ts); the Approval filter lists each.
  const grouped = folder === 'inbox' && !wrongTab && !query.n;
  const listed = grouped ? shown.filter((m) => m.needs !== 'approval') : shown;
  const reading = grouped && attention.readingList ? { ...attention.readingList, href: href.read(book) } : undefined;
  const open = shown.find((m) => m.id === query.m) ?? all.find((m) => m.id === query.m);
  if (query.m && !open) notFound();
  // "Next" and j/k move through what the list shows, never to a paper folded into the reading list.
  const at = open ? listed.findIndex((m) => m.key === open.key) : -1;
  const next = at >= 0 ? (listed[at + 1] ?? listed[at - 1]) : undefined;
  const here = q(query, { m: undefined }).replace(/^\?$/, '');
  const rail = (
    <Rail
      folders={FOLDERS.map(({ f, label }) => ({
        label, href: q({}, { f: f === 'inbox' ? undefined : f }), on: folder === f && !query.n,
        n: f === 'inbox' ? attention.count : all.filter((m) => m.folder === f).length,
      }))}
      needs={NEEDS.map((n) => ({ need: n, label: NEEDS_WORDS[n].label, href: q({}, { n }), on: query.n === n, n: attention.byNeed[n] }))}
    />
  );

  return (
    <Mail
      open={!!open}
      banner={asOf && <Suspense fallback={null}><AsOfBanner asOf={asOf} /></Suspense>}
      rail={rail}
      list={(
        <InboxList
          messages={listed}
          openKey={open?.key}
          hrefOf={(key) => q(query, { m: key.slice(key.indexOf('~') + 1) })}
          reading={reading}
          tabs={folder === 'inbox' ? [
            { label: 'Waiting on you', href: q(query, { t: undefined, m: undefined }), on: !wrongTab },
            { label: 'Went wrong', href: q(query, { t: 'wrong', m: undefined }), on: wrongTab, n: attention.byNeed.wrong },
          ] : []}
          empty={folder === 'inbox' && !wrongTab ? 'Nothing waits on you.' : 'Nothing here.'}
        />
      )}
      pane={open
        ? <InboxPane message={open} editor={editor} here={here} next={next?.key} needWords={query.need === 'words'} changed={query.changed === '1'} keys={listed.map((m) => m.key)} base={href.inbox(book)} />
        : <MailNone any={shown.length > 0} />}
    />
  );
}
