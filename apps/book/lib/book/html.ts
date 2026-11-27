// HTML a person or an agent wrote as a document, made safe to read as a page of the book. Only the structure of
// writing is kept (headings, paragraphs, lists, tables, quotes, code, figures, links); scripts, styles, frames, forms
// and every event handler are dropped, so a document can never act for the reader. Links and pictures follow the same
// rule as Markdown (lib/book/markdown.ts): a link leads only where an agent's link may, or to an anchor, else it is
// plain text; one that leaves the book opens in a new tab and shows its domain. Pure.
import sanitizeHtml from 'sanitize-html';
import { linkTarget } from './links';

const TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'blockquote', 'pre', 'code', 'kbd', 'samp',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
  'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'details', 'summary', 'abbr', 'cite', 'q', 'span', 'div', 'section', 'article', 'aside', 'header', 'footer',
];

const pictureAllowed = (src: string) => /^data:image\/(png|jpeg|gif|webp);/i.test(src) || linkTarget(src) !== null;

/** A written document's HTML, as the book draws it. */
export function readableHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: TAGS,
    allowedAttributes: { a: ['href', 'target', 'rel', 'data-domain'], img: ['src', 'alt', 'title'], th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'], '*': ['id', 'title'] },
    allowedSchemes: ['http', 'https', 'data'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'], a: ['http', 'https'] },
    allowProtocolRelative: false,
    // A whole document (<html><body>…) reads as its body; its head (title, styles, scripts) is dropped with its text.
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'head', 'title', 'template', 'iframe', 'object'],
    transformTags: {
      a: (_tag, attribs): sanitizeHtml.Tag => {
        const href = attribs.href ?? '';
        if (href.startsWith('#')) return { tagName: 'a', attribs: { href } };
        const target = linkTarget(href);
        if (!target) return { tagName: 'span', attribs: {} };
        return target.inside
          ? { tagName: 'a', attribs: { href: target.to } }
          : { tagName: 'a', attribs: { href: target.to, target: '_blank', rel: 'noreferrer', 'data-domain': target.domain } };
      },
      img: (_tag, attribs): sanitizeHtml.Tag => (pictureAllowed(attribs.src ?? '') ? { tagName: 'img', attribs } : { tagName: 'span', attribs: {}, text: attribs.alt ?? '' }),
    },
    exclusiveFilter: (frame) => frame.tag === 'span' && !frame.text.trim() && !frame.mediaChildren.length,
  }).replace(/(<a [^>]*data-domain="([^"]+)"[^>]*>[\s\S]*?<\/a>)/g, '$1 <span class="link-domain">($2)</span>');
}

/** A whole document's title, when its HTML names one in <title> or a first <h1>; for writing without a title given. */
export function htmlTitle(html: string): string | undefined {
  const raw = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
  const text = raw ? sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim() : '';
  return text || undefined;
}

/** The document without a first heading that only repeats its title, which the page already shows. */
export function withoutTitle(html: string, title: string): string {
  const first = /^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const text = first ? sanitizeHtml(first[1], { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim() : '';
  return first && text.toLowerCase() === title.trim().toLowerCase() ? html.slice(first[0].length) : html;
}
