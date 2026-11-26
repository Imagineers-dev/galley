// Every address in the book, built in one place. Everything lives under one book: /<book>/…. Features live under
// /f/ so a feature's name can never take a page's address. Pure: pages, components and views all build links here.
import type { PaperKind, PaperOwner } from './book/types';
import { paperOwner } from './book/types';

export const PAPER_SLUGS: Record<PaperKind, string> = { intent: 'why', spec: 'what-you-get', plan: 'how-it-gets-built' };
export const kindFromSlug = (slug: string) => (Object.entries(PAPER_SLUGS).find(([, s]) => s === slug)?.[0] as PaperKind | undefined);

/** The tabs of "The agents": how good they are, their proof, lessons, permissions, goals, and any part explained. */
export const AGENT_TABS = ['quality', 'proof', 'lessons', 'permissions', 'goals', 'explain'] as const;
export type AgentTab = (typeof AGENT_TABS)[number];
/** The sections of Production. */
export type ProductionSection = 'live' | 'risks' | 'pulse';

/** Addresses at the top of the site that are pages, not books: a book can never take one of these names. */
const RESERVED = new Set(['api', 'signin', 'inbox', 'f', '_next', 'favicon.ico', 'robots.txt']);

/** A book's name as it appears in an address: lowercase letters, digits and hyphens, at most 60, and not a page. */
export const isBookName = (name: string) => /^[a-z0-9][a-z0-9-]{0,59}$/.test(name) && !RESERVED.has(name);

const after = (id: string) => id.slice(id.indexOf(':') + 1);
const query = (q: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => Boolean(e[1]))).toString();
  return s ? `?${s}` : '';
};

export const href = {
  books: () => '/',
  /** Sign in, then come back to `back`. */
  signIn: (back: string) => `/signin?back=${encodeURIComponent(back)}`,
  book: (book: string) => `/${book}`,
  /** What waits on the editor in a book; `m` opens one message (its id), the rest are the inbox's own views. */
  inbox: (book: string, q: Record<string, string | undefined> = {}) => `/${book}/inbox${query(q)}`,
  message: (book: string, id: string) => `/${book}/inbox${query({ m: id })}`,
  diary: (book: string) => `/${book}/diary`,
  inMotion: (book: string) => `/${book}/in-motion`,
  read: (book: string) => `/${book}/read`,
  production: (book: string, section?: ProductionSection) => `/${book}/production${section ? `#${section}` : ''}`,
  agents: (book: string, tab?: AgentTab) => `/${book}/agents${tab && tab !== 'quality' ? `/${tab}` : ''}`,
  feature: (book: string, featureId: string) => `/${book}/f/${after(featureId)}`,
  work: (book: string, workId: string) => `/${book}/f/${after(workId)}`,
  workTab: (book: string, workId: string, tab: 'tests' | 'review') => `/${book}/f/${after(workId)}/${tab}`,
  paper: (book: string, workId: string, kind: PaperKind) => `/${book}/f/${after(workId)}/${PAPER_SLUGS[kind]}`,
  featurePaper: (book: string, featureId: string, kind: PaperKind) => `/${book}/paper/${after(featureId)}/${PAPER_SLUGS[kind]}`,
  /** A paper's page, whichever kind of owner it has. */
  paperOf: (book: string, paper: PaperOwner & { kind: PaperKind }) =>
    (paper.work !== undefined ? href.paper(book, paperOwner(paper), paper.kind) : href.featurePaper(book, paperOwner(paper), paper.kind)),
  promises: (book: string, featureId: string) => `/${book}/promises/${after(featureId)}`,
  decision: (book: string, id: string) => `/${book}/decision/${id.slice('decision:'.length)}`,
  any: (book: string, id: string) => (id.startsWith('feature:') || id.startsWith('work:') ? `/${book}/f/${after(id)}` : undefined),
};
