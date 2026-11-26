// The one Markdown renderer for everything agents write (papers, asks, explanations). It parses as Markdown always
// has, so a paper's structure (and its ¶ numbers) never depends on its links. Agents write it, so the link rule is
// applied when it is drawn: a link leads only where an agent's link may (lib/book/links.ts) or to an anchor on the
// page, else it is drawn as plain text; a picture shows only from the book or as an embedded raster figure
// (paper-figures), else its description is shown. A link that leaves the book opens in a new tab and shows its domain.
// Raw HTML is never rendered.
import MarkdownIt from 'markdown-it';
import { linkTarget } from './links';

export const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const linkAllowed = (href: string) => href.startsWith('#') || linkTarget(href) !== null;
const pictureAllowed = (src: string) => /^data:image\/(png|jpeg|gif|webp);/i.test(src) || linkTarget(src) !== null;

const own = (name: 'link_open' | 'link_close' | 'image') =>
  md.renderer.rules[name] ?? ((tokens, i, options, _env, self) => self.renderToken(tokens, i, options));
const linkOpen = own('link_open');
const linkClose = own('link_close');
const image = own('image');

md.renderer.rules.link_open = (tokens, i, options, env, self) => {
  const href = tokens[i].attrGet('href') ?? '';
  const close = tokens.slice(i).find((t) => t.type === 'link_close');
  if (!linkAllowed(href)) {
    if (close) close.meta = { blocked: true };
    return '<span>';
  }
  const target = linkTarget(href);
  if (target && !target.inside) {
    tokens[i].attrSet('rel', 'noreferrer');
    tokens[i].attrSet('target', '_blank');
    if (close) close.meta = { domain: target.domain };
  }
  return linkOpen(tokens, i, options, env, self);
};
md.renderer.rules.link_close = (tokens, i, options, env, self) => {
  const meta = (tokens[i].meta ?? {}) as { domain?: string; blocked?: boolean };
  if (meta.blocked) return '</span>';
  return `${linkClose(tokens, i, options, env, self)}${meta.domain ? ` <span class="link-domain">(${md.utils.escapeHtml(meta.domain)})</span>` : ''}`;
};
md.renderer.rules.image = (tokens, i, options, env, self) =>
  pictureAllowed(tokens[i].attrGet('src') ?? '') ? image(tokens, i, options, env, self) : md.utils.escapeHtml(tokens[i].content);

/** Paper text as HTML. The first heading is dropped when the page already shows the title. */
export const renderMarkdown = (text: string, dropTitle = false) => md.render(dropTitle ? text.replace(/^#\s+.*\n+/, '') : text);
