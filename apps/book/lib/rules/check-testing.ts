// Write rules for what holds the work to the editor's papers: agents' citations, tests, guards, runs and reviews.
import { editorPaperOf } from '../book/governing';
import { coverage, paragraphs } from '../book/paragraphs';
import type { Review, Test } from '../book/record-types';
import type { Paper } from '../book/types';
import { paperOwner } from '../book/types';
import type { Current } from '../book/views';

/** An agents' paper must cite the editor's paragraphs on every paragraph of its own, and cite only ones that exist. */
export function agentsPaperRefusals(now: Current, paper: Paper): string[] {
  const mine = editorPaperOf(now, paperOwner(paper), paper.kind);
  if (!mine) return [`There is no ${paper.kind} written for the editor to translate.`];
  const out: string[] = [];
  const c = coverage(String(mine.body.text), paper.text);
  for (const text of c.uncited) out.push(`This paragraph cites no line of the editor's ${paper.kind}; cite one like [¶2], or leave it out: “${text}”`);
  if (c.unknown.length) out.push(`The editor's ${paper.kind} has no ${c.unknown.map((n) => `¶${n}`).join(', ')}; it has ¶1 to ¶${c.total}.`);
  if (paper.against !== undefined && paper.against !== mine.at) out.push(`This was written against an older version of the editor's ${paper.kind}; translate the current one.`);
  return out;
}

export function testRefusals(now: Current, test: Test): string[] {
  const out: string[] = [];
  for (const ref of test.proves) {
    const [kind, n] = ref.split('¶') as [Paper['kind'], string];
    const mine = editorPaperOf(now, test.work, kind);
    if (!mine) { out.push(`${ref}: there is no ${kind} written for the editor.`); continue; }
    const total = paragraphs(String(mine.body.text)).length;
    if (Number(n) < 1 || Number(n) > total) out.push(`${ref}: the editor's ${kind} has ¶1 to ¶${total}.`);
  }
  return out;
}

export function runRefusals(now: Current, of: string): string[] {
  const target = now.get(of);
  return target && (target.kind === 'test' || target.kind === 'guard') ? [] : [`"${of}" is not a test or a guard in this book.`];
}

/** A review is by an agent that did not write the change, answers each of the seven questions once, and its verdict follows. */
export function reviewRefusals(by: string, review: Review): string[] {
  const out: string[] = [];
  const reviewer = by.replace(/^agent:/, '');
  if (reviewer === review.writtenBy.replace(/^agent:/, '')) out.push('The agent that wrote a change does not review it.');
  const asked = new Set(review.answers.map((a) => a.q));
  if (asked.size !== 7) out.push('Answer each of the seven questions once.');
  const worst = review.answers.some((a) => a.verdict === 'fails') ? 'fails' : review.answers.some((a) => a.verdict === 'concern') ? 'concern' : 'passes';
  if (review.verdict !== worst) out.push(`The verdict follows the answers: it is "${worst}".`);
  return out;
}
