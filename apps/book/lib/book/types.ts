import type { OrderOf } from './order';
import type { PromiseBreak } from './promise-types';
import type { BookKind, StudyStep } from './study-types';

// The shapes the book is made of. A record is one append-only row; everything else is derived.
//
// A project has features (nouns: what the product is), nested to any depth. A feature's story is its
// pieces of work and the events between them. A piece of work or a feature carries three papers, each written for
// the editor first and for agents after the editor approves.

export type Kind =
  | 'project'
  | 'feature'
  | 'work'
  | 'event'
  | 'paper'
  | 'decision'
  | 'finding'
  | 'question'
  | 'link'
  | 'approval'
  | 'test'
  | 'guard'
  | 'run'
  | 'review'
  | 'commit'
  | 'diary'
  | 'history'
  | 'checkout'
  | 'beyond'
  | 'receipt'
  | 'watch'
  | 'promise'
  | 'promise-approval'
  | 'witness'
  | 'link-accept'
  | 'ask'
  | 'reply'
  | 'mark'
  | 'order'
  | 'tick'
  // Keeping on top of the product (types in ./oversight-types)
  | 'release'
  | 'proof'
  | 'lesson'
  | 'slip'
  | 'eval'
  | 'risk'
  | 'pulse'
  | 'band'
  | 'goal'
  | 'result'
  // Files: slides on a feature, documents in a section (types in ./asset-types), and the sections (./sections)
  | 'asset'
  | 'section';

export type BookRecord = {
  book: string;
  id: string;
  kind: Kind;
  at: string; // ISO time the record was written, UTC
  by: string; // 'editor' or 'agent:<name>'
  replaces: string | null;
  body: Record<string, unknown>;
};

/** How a piece of work began: the editor's words, an earlier piece of work, or something that happened. */
export type Origin = { words: string; saidOn: string } | { work: string } | { event: string };

export type WorkState = 'done' | 'now' | 'next';
export type Served = 'yes' | 'partly' | 'no';

export type Project = { title: string; forWriter: string; kind?: BookKind };
/** Why something was taken out of the book, in one line. The book reads on without it; the store keeps it. */
export type Withdrawn = { reason: string };
/** The order of one list: the book's top features (no feature), the features under a feature, or a feature's work. */
export type Order = { of: OrderOf; feature?: string; items: string[] };
export type Feature = {
  title: string;
  slug: string;
  parent?: string;
  forWriter: string;
  standing?: string;
  about?: string; // markdown: what it is, how its users meet it, what it is made of
  lanes?: string[]; // the parts its decisions shape, in reading order
  view?: FeatureView; // how its page shows its children; absent, they are cards
  approval?: 'per-item'; // a list: each item carries its own papers, and the feature holds none
  perItemReply?: string; // the editor's reply that made it a list
  withdrawn?: Withdrawn;
};
/**
 * How a feature's page shows the features under it. `grid`: one row per child, one column per piece of work, in order;
 * `noun` names the rows ("stories"), `target` is how many the chapter aims for, `groups` head runs of columns in order.
 */
export type FeatureView = { kind: 'grid'; noun?: string; target?: number; groups?: { title: string; size: number }[] };
export type Work = {
  feature: string;
  title: string;
  slug: string;
  on: string; // YYYY-MM-DD it began
  state: WorkState;
  summary: string;
  origin: Origin;
  verdict?: { served: Served; words?: string };
  withdrawn?: Withdrawn;
  serves?: string[]; // the promises this work answers for, on any feature
  provenAtStart?: string[]; // set by the book: what was Proven around it when it began
} & StudyStep;
/** Something that happened. A bug names the promises it broke, or says no promise covered it. */
export type Event = { feature: string; title: string; on: string; text: string; breaks?: PromiseBreak[]; noPromiseYet?: true };
export type PaperKind = 'intent' | 'spec' | 'plan';
export type Reader = 'editor' | 'agents';
/** What a paper belongs to: one piece of work, or one feature. */
export type PaperOwner = { work: string; feature?: never } | { feature: string; work?: never };
/** A paper. An agents' paper records the version of the editor's paper it was written from (against). */
export type Paper = PaperOwner & { kind: PaperKind; for: Reader; text: string; against?: string };
export type { Decision, Option } from './decision-types';
/** A finding or an open question on a piece of work. `withdrawn`: taken off its work, with why; the book keeps it. */
export type Note = { work: string; text: string; withdrawn?: Withdrawn };
export type LinkKind = 'came-from' | 'depends-on' | 'leads-to' | 'touches' | 'serves' | 'proves-promise';
/** `failsWhen`, on `proves-promise` only: in plain words, what would make the test fail if the promise broke. */
export type Link = { from: string; to: string; kind: LinkKind; label?: string; failsWhen?: string };
/** An answer to a editor paper. paperAt is the version read (its time); answers given before 19 Nov 2026 have none. */
export type Approval = { paper: string; verdict: 'approved' | 'changes'; words?: string; paperAt?: string };

export const PAPER_KINDS: PaperKind[] = ['intent', 'spec', 'plan'];

/** The papers' names, written for a person. */
export const PAPER_NAMES: Record<PaperKind, { name: string; what: string }> = {
  intent: { name: 'Why', what: 'The intent: the problem, your words, and what done looks like' },
  spec: { name: "What you'll get", what: 'The spec: what you will see and do once it is done' },
  plan: { name: 'How it gets built', what: 'The plan: the parts in order, and what you can try after each' },
};

export const ids = {
  feature: (slug: string) => `feature:${slug}`,
  asset: (slug: string) => `asset:${slug}`,
  work: (featureSlug: string, slug: string) => `work:${featureSlug}/${slug}`,
  event: (featureSlug: string, slug: string) => `event:${featureSlug}/${slug}`,
  paper: (workId: string, kind: PaperKind, reader: Reader) => `paper:${workId.slice('work:'.length)}/${kind}/${reader}`,
  featurePaper: (featureId: string, kind: PaperKind, reader: Reader) => `paper:${featureId.slice('feature:'.length)}/${kind}/${reader}`,
  /** A paper's id from its owner's id, whichever kind of owner that is. */
  paperOf: (owner: string, kind: PaperKind, reader: Reader): string =>
    (owner.startsWith('feature:') ? ids.featurePaper(owner, kind, reader) : ids.paper(owner, kind, reader)),
};

/** The id of the work or feature a paper belongs to. */
export const paperOwner = (paper: PaperOwner): string => (paper.work !== undefined ? paper.work : paper.feature);

export const slugOf = (id: string) => id.slice(id.indexOf(':') + 1);

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/, '');
}
