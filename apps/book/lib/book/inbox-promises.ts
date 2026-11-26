// One inbox message per feature with promises waiting on the editor. Pure.
import { href } from '../routes';
import type { Draft } from './inbox';
import { approvalOf } from './promise-evidence';
import type { BookPromise } from './promise-types';
import { type Current, type Entry, entries, titleOf } from './views';

export function promiseDrafts(book: string, now: Current): Draft[] {
  const waiting = new Map<string, Entry<BookPromise>[]>();
  for (const p of entries<BookPromise>(now, 'promise')) {
    if (now.get(p.body.feature)?.kind !== 'feature' || approvalOf(now, p.id).current) continue;
    waiting.set(p.body.feature, [...(waiting.get(p.body.feature) ?? []), p]);
  }
  return [...waiting].map(([feature, list]) => {
    const newest = [...list].sort((a, b) => a.at.localeCompare(b.at)).at(-1) as Entry<BookPromise>;
    const title = titleOf(now, feature);
    const to = href.promises(book, feature);
    return {
      id: `${newest.id}@${newest.at}`, needs: 'approval' as const, subject: `Approve: ${list.length === 1 ? 'a promise' : `${list.length} promises`} for “${title}”`,
      text: list.map((p) => `- ${p.body.text}`).join('\n'), from: { agent: 'The book', feature: title }, at: newest.at, options: [],
      links: [{ label: 'The promises', href: to }], answerOn: { label: 'Read and answer', href: to }, answered: false,
    };
  });
}
