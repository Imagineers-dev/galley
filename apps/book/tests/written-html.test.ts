// A document written as HTML reads as a page of the book: its writing is kept, and nothing in it can act for the
// reader (no script, style, frame or handler), with links and pictures held to the book's link rule.
import { describe, expect, it } from 'vitest';
import { htmlTitle, readableHtml } from '../lib/book/html';

const doc = '<!doctype html><html><head><title>Rivals</title><style>h1{color:red}</style><script>alert(1)</script></head>'
  + '<body><h1 onclick="x()">How rivals price</h1><p style="color:red">See <a href="https://example.com/p" target="_self" data-domain="evil">this</a>, '
  + '<a href="javascript:alert(1)">bad</a>, <a href="/shop/f/pricing">Pricing</a> and <a href="#tiers">tiers</a>.</p>'
  + '<img src="x" onerror="alert(1)" alt="chart"><iframe src="https://e.com"></iframe><table><tr><td colspan="2">A</td></tr></table></body></html>';

describe('a written HTML document', () => {
  const html = readableHtml(doc);

  it('keeps its writing: headings, paragraphs, tables', () => {
    expect(html).toContain('<h1>How rivals price</h1>');
    expect(html).toContain('<td colspan="2">A</td>');
  });

  it('drops everything that could act: scripts, styles, frames, handlers, and the head', () => {
    for (const bad of ['<script', 'alert', 'style', 'onclick', 'onerror', '<iframe', 'Rivals']) expect(html).not.toContain(bad);
  });

  it('holds links to the book’s rule: outside ones open apart and show their domain, bad ones become text', () => {
    expect(html).toContain('<a href="https://example.com/p" target="_blank" rel="noreferrer" data-domain="example.com">this</a> <span class="link-domain">(example.com)</span>');
    expect(html).toContain('<span>bad</span>');
    expect(html).toContain('<a href="/shop/f/pricing">Pricing</a>');
    expect(html).toContain('<a href="#tiers">tiers</a>');
    expect(html).toContain('<span>chart</span>');
  });

  it('names itself from its <title>, else its first heading', () => {
    expect(htmlTitle(doc)).toBe('Rivals');
    expect(htmlTitle('<h1>Plain <b>notes</b></h1><p>x</p>')).toBe('Plain notes');
    expect(htmlTitle('<p>no title</p>')).toBeUndefined();
  });
});
