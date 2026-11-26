// Attaching files on a throwaway database: the bytes are kept in chunks and read back a range at a time, the same
// bytes are kept once, a new version keeps the asset's place, a refused asset is not written, a withdrawn one is gone
// from every list, and the pages listening to a book hear each write.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { throwawayDatabase } from './helpers/db';

let db: Awaited<ReturnType<typeof throwawayDatabase>>;
let attachAs: typeof import('../lib/attach');
let files: typeof import('../lib/store/files');
let records: typeof import('../lib/store/records');
let writer: typeof import('../lib/write');
let changes: typeof import('../lib/changes');

const agent = 'agent:claude';
const deck = new TextEncoder().encode('<!doctype html><section>Pricing review</section>');

beforeAll(async () => {
  db = await throwawayDatabase('book_assets');
  attachAs = await import('../lib/attach');
  files = await import('../lib/store/files');
  records = await import('../lib/store/records');
  writer = await import('../lib/write');
  changes = await import('../lib/changes');
  await writer.write('shop', { id: 'project', kind: 'project', by: agent, replaces: null, body: { title: 'Shop', forWriter: 'x' } });
  await writer.write('shop', { id: 'feature:pricing', kind: 'feature', by: agent, replaces: null, body: { title: 'Pricing', slug: 'pricing', forWriter: 'f' } });
}, 60_000);
afterAll(async () => db?.drop());

const asset = async (id: string) => (await records.readCurrent('shop')).find((r) => r.id === id);

describe('attaching files', () => {
  it('keeps slides on a feature, with the type and hash the book worked out from the bytes', async () => {
    const record = await attachAs.attach('shop', agent, { title: 'Pricing review', slides: true, place: { feature: 'feature:pricing' }, file: { name: 'review.html', bytes: deck } });
    expect(record.id).toBe('asset:pricing-review');
    expect(record.body.file).toEqual({ name: 'review.html', type: 'text/html', size: deck.length, hash: files.hashOf(deck) });
    expect((await files.readRange('shop', files.hashOf(deck), deck.length))?.toString()).toBe(new TextDecoder().decode(deck));
  });

  it('reads any range of a large file across its chunks, and keeps the same bytes once', async () => {
    const big = new Uint8Array(files.CHUNK * 2 + 500).map((_, i) => i % 251);
    big.set(new TextEncoder().encode('%PDF'), 0);
    const one = await attachAs.attach('shop', agent, { title: 'Market study', place: { folder: 'market', tags: ['pricing'] }, file: { name: 'study.pdf', bytes: big } });
    await attachAs.attach('shop', agent, { title: 'Same study', place: { folder: 'market' }, file: { name: 'copy.pdf', bytes: big } });
    const hash = String((one.body.file as { hash: string }).hash);
    const start = files.CHUNK - 10;
    const part = await files.readRange('shop', hash, big.length, start, files.CHUNK * 2 + 9);
    expect(part && Buffer.compare(part, Buffer.from(big.subarray(start, files.CHUNK * 2 + 10)))).toBe(0);
    const { client } = await import('../lib/store/client');
    const rows = await (await client.query({ query: 'SELECT count() AS n FROM files FINAL WHERE hash = {hash:String}', query_params: { hash }, format: 'JSONEachRow' })).json<{ n: string }>();
    expect(Number(rows[0].n)).toBe(3);
  });

  it('attaches a new version in place: the file changes, the place and title stay', async () => {
    const v2 = new TextEncoder().encode('<!doctype html><section>Pricing review, take two</section>');
    await attachAs.attach('shop', agent, { asset: 'asset:pricing-review', file: { name: 'review-2.html', bytes: v2 } });
    const now = await asset('asset:pricing-review');
    expect(now?.body).toMatchObject({ title: 'Pricing review', feature: 'feature:pricing', slides: true, file: { name: 'review-2.html', hash: files.hashOf(v2) } });
    expect((await records.readHistory('shop', 'asset:pricing-review')).length).toBe(2);
  });

  it('moves research between folders and retags it, and refuses an asset with nowhere to sit', async () => {
    await attachAs.attach('shop', agent, { asset: 'asset:market-study', place: { folder: 'Market/Rivals', tags: ['B2B', 'pricing'], informs: ['feature:pricing'] } });
    expect((await asset('asset:market-study'))?.body).toMatchObject({ folder: 'market/rivals', tags: ['b2b', 'pricing'], informs: ['feature:pricing'] });
    await expect(attachAs.attach('shop', agent, { title: 'Loose', file: { name: 'a.md', bytes: deck } })).rejects.toThrow(/sits in one place/);
    await expect(attachAs.attach('shop', agent, { title: 'Pricing review', place: { folder: 'x' }, file: { name: 'a.md', bytes: deck } })).rejects.toThrow(/already in this book/);
    expect(await asset('asset:loose')).toBeUndefined();
  });

  it('withdraws an asset once, with why, and never quietly brings it back', async () => {
    await attachAs.withdrawAsset('shop', agent, 'asset:same-study', 'A copy of the market study.');
    expect((await asset('asset:same-study'))?.body.withdrawn).toEqual({ reason: 'A copy of the market study.' });
    await expect(attachAs.withdrawAsset('shop', agent, 'asset:same-study', 'again')).rejects.toThrow(/already withdrawn/);
    await expect(attachAs.attach('shop', agent, { asset: 'asset:same-study', title: 'Back' })).rejects.toThrow(/under a new slug/);
  });

  it('stops being slides when its new file is not HTML, and refuses tags on a feature\'s slides', async () => {
    const pdf = new TextEncoder().encode('%PDF-1.4 deck as pdf');
    await attachAs.attach('shop', agent, { asset: 'asset:pricing-review', file: { name: 'review.pdf', bytes: pdf } });
    expect((await asset('asset:pricing-review'))?.body).not.toHaveProperty('slides');
    await expect(attachAs.attach('shop', agent, { asset: 'asset:pricing-review', place: { tags: ['x'] } })).rejects.toThrow(/Tags and informs are for research/);
  });

  it('tells the pages listening to a book about each write to it', async () => {
    const heard: string[] = [];
    const stop = changes.onChange('shop', (at) => heard.push(at));
    const record = await attachAs.attach('shop', agent, { title: 'Notes', place: { folder: '' }, file: { name: 'notes.md', bytes: deck } });
    stop();
    expect(heard).toEqual([record.at]);
  });
});
