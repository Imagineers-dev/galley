// The words a reworded promise had before, when they never answered them and so no approval holds them.
import type { FeaturePromise } from '../book/promises';
import type { BookPromise } from '../book/promise-types';
import { readHistory } from '../store/records';

export function withEarlierWords(book: string, promises: FeaturePromise[]): Promise<FeaturePromise[]> {
  return Promise.all(promises.map(async (p) => {
    if (p.was) return p;
    const earlier = (await readHistory(book, p.id)).filter((v) => v.at < p.at).at(-1);
    if (!earlier) return p;
    const { text, mustHoldIn, serverReason } = earlier.body as BookPromise;
    return { ...p, was: { text, mustHoldIn, ...(serverReason ? { serverReason } : {}) } };
  }));
}
