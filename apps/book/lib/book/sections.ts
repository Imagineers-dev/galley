// The book's sections beside the product: Research, which every book has, and any section an agent defines (meeting
// notes, design, pitch decks). Each is a library of documents in folders, with tags. A section record renames or
// takes away Research the same way it defines a new one. Pure.
import { RESEARCH } from './asset-types';
import type { Withdrawn } from './types';
import { type Current, entries } from './views';

export type Section = { title: string; slug: string; about?: string; withdrawn?: Withdrawn };

const DEFAULT: Section = {
  title: 'Research', slug: RESEARCH,
  about: 'The studies, interviews and comparisons behind the features: how the product came to be.',
};

/** A section's slug: lower-case letters, digits and hyphens. "product" names the book's own features, so it is taken. */
export const SECTION_SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const RESERVED_SECTIONS = new Set(['product']);

/** Every section the book shows, in order: Research first (unless taken away), then the rest as they were defined. */
export function sectionsOf(now: Current): Section[] {
  const defined = entries<Section>(now, 'section');
  const research = defined.find((s) => s.body.slug === RESEARCH)?.body ?? DEFAULT;
  return [{ ...DEFAULT, ...research }, ...defined.filter((s) => s.body.slug !== RESEARCH).map((s) => s.body)].filter((s) => !s.withdrawn);
}

/** One section the book shows, by its slug. */
export const sectionNamed = (now: Current, slug: string) => sectionsOf(now).find((s) => s.slug === slug);
