// Where a link written by an agent may lead. Inside the book: a path on this site. Outside: an http(s) address,
// always shown with its domain so the editor sees where it goes. Anything else (javascript:, data:, file:,
// protocol-relative "//host", backslash tricks) is not a link: the write is refused and an old one shows as text.
export type LinkTarget = { inside: true; to: string } | { inside: false; to: string; domain: string };

const CONTROL = /[\u0000-\u001f\u007f\\]/;

export function linkTarget(href: string): LinkTarget | null {
  const value = String(href ?? '').trim();
  if (!value || CONTROL.test(value)) return null;
  if (value.startsWith('/')) return value.startsWith('//') ? null : { inside: true, to: value };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  return { inside: false, to: url.toString(), domain: url.hostname };
}

/** For a redirect after a form: a path on this site, or the fallback. Never another site. */
export function safeBack(value: unknown, fallback = '/'): string {
  const target = linkTarget(String(value ?? ''));
  return target?.inside ? target.to : fallback;
}
