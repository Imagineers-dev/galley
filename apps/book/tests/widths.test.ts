// Every page lays out by the same four widths (app/layout.css, STYLE_GUIDE.md "Widths"). A media query that uses
// any other width is refused, in every stylesheet and module, so a new page cannot invent its own breakpoints.
import { describe, expect, it } from 'vitest';
import { read, stylesheets } from './helpers/source';

const ALLOWED = new Set(['max-width: 759px', 'min-width: 760px', 'max-width: 1199px', 'min-width: 1200px', 'max-width: 1599px', 'min-width: 1600px']);

describe('widths', () => {
  it('reads every stylesheet, modules included', () => {
    expect(stylesheets().filter((f) => f.endsWith('.module.css')).length).toBeGreaterThan(5);
  });
  it('media queries use only the four standard widths', () => {
    const strays: string[] = [];
    for (const file of stylesheets()) {
      for (const query of read(file).matchAll(/@media[^{]*/g)) {
        // Every width condition, in any form (min/max, em, range syntax), must be one of the named widths.
        for (const [, condition] of query[0].matchAll(/\(([^()]*width[^()]*)\)/g)) {
          if (!ALLOWED.has(condition.trim().replace(/\s+/, ' '))) strays.push(`${file}: ${condition}`);
        }
      }
    }
    expect(strays).toEqual([]);
  });
});
