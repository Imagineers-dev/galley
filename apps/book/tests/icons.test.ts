// Icons an agent gives a feature, a section or a document: any Phosphor icon by its name, in a weight and an icon tone,
// found by words; anything else is refused in words an agent can act on.
import { describe, expect, it } from 'vitest';
import { ICON_NAMES, componentName, findIcons, isIconName } from '../lib/book/icons';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { refusals } from '../lib/rules/check';

const now = current([{ book: 'b', id: 'project', kind: 'project', by: 'agent:claude', at: '2026-11-26T09:00:00.000Z', replaces: null, body: { title: 'P', forWriter: 'x' } } as BookRecord]);
const feature = (icon: object) => refusals(now, { id: 'feature:pricing', kind: 'feature', by: 'agent:claude', replaces: null, body: { title: 'Pricing', slug: 'pricing', forWriter: 'f', icon } });

describe('icons', () => {
  it('knows every Phosphor icon by the name Phosphor gives it', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(1000);
    expect(isIconName('book-open')).toBe(true);
    expect(isIconName('film-script')).toBe(true);
    expect(isIconName('not-an-icon')).toBe(false);
    expect(componentName('rocket-launch')).toBe('RocketLaunchIcon');
  });

  it('finds icons by words, the exact name first', () => {
    expect(findIcons('rocket')).toEqual(['rocket', 'rocket-launch']);
    expect(findIcons('book open')[0]).toBe('book-open');
    expect(findIcons('')).toEqual([]);
  });

  it('takes a known icon in a weight and a tone, and refuses anything else', () => {
    expect(feature({ name: 'currency-inr', weight: 'duotone', tone: 'orange' })).toEqual([]);
    expect(feature({ name: 'rocket' })).toEqual([]);
    expect(feature({ name: 'rokcet' })[0]).toMatch(/not a Phosphor icon; find one with book_find_icon/);
    expect(feature({ name: 'rocket', tone: 'green' })[0]).toMatch(/feature\.icon\.tone/);
    expect(feature({ name: 'rocket', weight: 'heavy' })[0]).toMatch(/feature\.icon\.weight/);
  });
});
