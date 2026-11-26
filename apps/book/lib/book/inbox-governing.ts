// What the inbox says about papers that govern other work: how much relies on a rewritten feature paper, and a piece
// of work someone says has gone beyond its papers. Pure.
import { href } from '../routes';
import { governingPaper, workRelyingOn } from './governing';
import type { Draft } from './inbox';
import type { Beyond } from './record-types';
import { ids } from './types';
import { type Current, type Reading, entries, paperState, titleOf } from './views';

/** The line above a rewritten feature paper; nothing for any other paper. */
export function rewrittenNote(now: Current, r: Reading): string {
  if (r.work || r.paper.at === r.paper.firstAt) return '';
  const n = workRelyingOn(now, r.feature.id, r.paper.body.kind).length;
  const relying = n === 0 ? 'No unfinished work relies on it.' : `${n} ${n === 1 ? 'piece of unfinished work relies' : 'pieces of unfinished work rely'} on it.`;
  return `**This paper has new words.** ${relying}\n\n`;
}

/** One message per work with a beyond: the latest one, answered once its own What is approved after it. */
export function beyondDrafts(book: string, now: Current, from: (work: string, by: string) => Draft['from']): Draft[] {
  const latest = new Map<string, ReturnType<typeof entries<Beyond>>[number]>();
  for (const b of entries<Beyond>(now, 'beyond').sort((x, y) => x.at.localeCompare(y.at))) latest.set(b.body.work, b);
  return [...latest.values()].filter((b) => now.get(b.body.work)?.kind === 'work').map((b) => {
    const { work } = b.body;
    const whatId = ids.paper(work, 'spec', 'editor');
    const hasWhat = now.has(whatId);
    const standing = governingPaper(now, work, 'spec').beyond;
    const who = b.body.raisedBy === 'reviewer' ? 'A reviewer says' : 'Its author says';
    const way = hasWhat ? 'Approve its What you’ll get again to let it go ahead.' : 'It needs a What you’ll get of its own for you to approve.';
    const answerOn = hasWhat
      ? { label: 'Open its What you’ll get', href: `${href.paper(book, work, 'spec')}?answer=1` }
      : { label: 'Open the work', href: href.work(book, work) };
    return {
      id: b.id, needs: 'decision' as const, subject: `Goes beyond its papers: ${titleOf(now, work)}`, text: `${who} this work goes beyond what you approved.\n\n${b.body.text}\n\n${way}`,
      from: from(work, b.by), at: b.firstAt, options: [], links: [{ label: 'The work and its papers', href: href.work(book, work) }], answerOn,
      answer: standing ? undefined : { text: 'Settled: you approved its What after this.', at: paperState(now, whatId).at ?? b.at },
      answered: !standing,
    };
  });
}
