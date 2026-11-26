// A feature's promises nested by feature: its own first, then each feature under it, and none from beside or above it.
import { describe, expect, it } from 'vitest';
import { countsAcross, promisesNested } from '../lib/book/promises';
import { current } from '../lib/book/views';
import { book, promiseBody, rec } from './helpers/promise-book';

const onChild = rec('promise:child/22222222-2222-4222-8222-222222222222', 'promise', promiseBody('The child holds.', { feature: 'feature:child' }));
const onFar = rec('promise:far/33333333-3333-4333-8333-333333333333', 'promise', promiseBody('Far away.', { feature: 'feature:far' }));
const now = () => current([...book().records, onChild, onFar]);

describe('promises nested by feature', () => {
  it.each([
    { feature: 'feature:top', want: ['feature:scene', 'feature:child'] },
    { feature: 'feature:scene', want: ['feature:scene', 'feature:child'] },
    { feature: 'feature:child', want: ['feature:child'] },
    { feature: 'feature:dep', want: [] },
    { feature: 'feature:none', want: [] },
  ])('$feature holds $want', ({ feature, want }) => {
    expect(promisesNested(now(), feature).map((p) => p.feature.id)).toEqual(want);
  });

  it('counts each state across them', () => {
    const counts = countsAcross(promisesNested(now(), 'feature:scene'));
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(2);
  });
});
