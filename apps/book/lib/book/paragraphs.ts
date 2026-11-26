// Numbered paragraphs and citations: how an agents' paper is held to the editor's.
// Every paragraph of a editor paper gets a number (¶1, ¶2 …): body paragraphs and list items, not headings or pictures.
// Every paragraph of an agents' paper must cite at least one of them, as [¶2] or [¶2, ¶5].
import MarkdownIt from 'markdown-it';
import { md } from './markdown';

/** Reads a paper's paragraphs as written: no smart quotes or dashes, so the lines agents cite are the editor's own
 * characters. Its structure is the same as the renderer's, so ¶ numbers agree with what is drawn. */
const asWritten = new MarkdownIt({ html: false });

export type Paragraph = { n: number; text: string };

/** The editor paper's paragraphs in order, numbered from 1. A paragraph that is only a picture is skipped. */
export function paragraphs(text: string): Paragraph[] {
  const out: Paragraph[] = [];
  const tokens = asWritten.parse(text, {});
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'paragraph_open') continue;
    const inline = tokens[i + 1];
    const plain = (inline?.children ?? []).filter((c) => c.type !== 'image').map((c) => c.content).join('').trim();
    if (!plain) continue;
    out.push({ n: out.length + 1, text: plain });
  }
  return out;
}

const CITE = /\[¶\s*(\d+(?:\s*,\s*¶?\s*\d+)*)\]/g;

export function citesIn(text: string): number[] {
  const found: number[] = [];
  for (const m of text.matchAll(CITE)) for (const part of m[1].split(',')) found.push(Number(part.replace(/[^\d]/g, '')));
  return found;
}

export type Coverage = {
  total: number;
  covered: number[];
  gaps: number[];
  uncited: string[]; // agents' paragraphs that cite nothing
  unknown: number[]; // cited numbers the editor paper does not have
};

/** How fully an agents' paper covers the editor paper it was written from. */
export function coverage(editorText: string, agentsText: string): Coverage {
  const mine = paragraphs(editorText);
  const theirs = paragraphs(agentsText);
  const cited = new Set<number>();
  const uncited: string[] = [];
  const unknown = new Set<number>();
  for (const p of theirs) {
    const cites = citesIn(p.text);
    if (cites.length === 0) uncited.push(p.text.slice(0, 120));
    for (const c of cites) (c >= 1 && c <= mine.length ? cited : unknown).add(c);
  }
  const covered = [...cited].sort((a, b) => a - b);
  return { total: mine.length, covered, gaps: mine.map((p) => p.n).filter((n) => !cited.has(n)), uncited, unknown: [...unknown].sort((a, b) => a - b) };
}

/** Renders a editor paper with each numbered paragraph marked, so the reader can see ¶ numbers in the margin. */
export function renderNumbered(text: string, gaps: Set<number> = new Set()): string {
  const tokens = md.parse(text, {});
  let n = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'paragraph_open') continue;
    const inline = tokens[i + 1];
    const plain = (inline?.children ?? []).filter((c) => c.type !== 'image').map((c) => c.content).join('').trim();
    if (!plain) continue;
    n += 1;
    tokens[i].attrSet('data-p', `¶${n}`);
    tokens[i].attrSet('id', `p${n}`);
    if (gaps.has(n)) tokens[i].attrSet('class', 'gap');
  }
  return md.renderer.render(tokens, md.options, {});
}

/** Renders an agents' paper with its citations turned into small links to the editor's paragraphs. */
export function renderCited(text: string, editorHref: string): string {
  return md.render(text).replace(/\[¶\s*(\d+(?:\s*,\s*¶?\s*\d+)*)\]/g, (_all, list: string) =>
    list
      .split(',')
      .map((part) => part.replace(/[^\d]/g, ''))
      .map((num) => `<a class="cite" href="${editorHref}#p${num}">¶${num}</a>`)
      .join(''),
  );
}
