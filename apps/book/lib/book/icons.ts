// The icons an agent may give a chapter, a feature, a section or a document: any icon of Phosphor (phosphoricons.com),
// named as Phosphor names it ("book-open", "rocket-launch"), in one of six weights and one of the book's icon tones.
// Tones name things, never a state. The server draws them (lib/book never sends an icon to the browser as script).
import * as phosphor from '@phosphor-icons/react/ssr';

export const ICON_TONES = ['ink', 'slate', 'orange', 'pink', 'purple', 'teal', 'brown'] as const;
export type IconTone = (typeof ICON_TONES)[number];
export const ICON_WEIGHTS = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as const;
export type IconWeight = (typeof ICON_WEIGHTS)[number];
export type Icon = { name: string; tone?: IconTone; weight?: IconWeight };

/** Phosphor's component for an icon name: "book-open" is BookOpenIcon. */
export const componentName = (name: string) => `${name.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}Icon`;

const kebab = (component: string) =>
  component.slice(0, -'Icon'.length).replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

/** Every icon name, as agents write them. */
export const ICON_NAMES: string[] = Object.keys(phosphor)
  .filter((k) => k.endsWith('Icon') && k !== 'IconBase')
  .map(kebab)
  .filter((n) => componentName(n) in phosphor)
  .sort();
const known = new Set(ICON_NAMES);

export const isIconName = (name: string) => known.has(name);

/** Icon names containing every word asked for, best first: the exact name, then names that start with the words. */
export function findIcons(query: string, limit = 40): string[] {
  const words = query.toLowerCase().split(/[\s,-]+/).filter(Boolean);
  if (!words.length) return [];
  const q = words.join('-');
  const rank = (n: string) => (n === q ? 0 : n.startsWith(q) ? 1 : n.startsWith(words[0]) ? 2 : 3);
  return ICON_NAMES.filter((n) => words.every((w) => n.includes(w)))
    .sort((a, b) => rank(a) - rank(b) || a.length - b.length || a.localeCompare(b))
    .slice(0, limit);
}
