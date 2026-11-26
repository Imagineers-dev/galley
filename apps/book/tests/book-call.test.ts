// A script's call to the book says which of three things happened: answered, refused (with the book's reasons), or
// nothing answered. It brings the repository's key when there is one.
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callBook } from '../bin/book-call.mjs';

let url = '';
let seen: string | undefined;
const server = createServer((req, res) => {
  seen = req.headers.authorization;
  if (req.url?.startsWith('/fault')) {
    res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ refused: ['The book could not do that (error 1a2b3c4d).'] }));
  } else if (req.url?.startsWith('/refuse')) {
    res.writeHead(403, { 'content-type': 'application/json' }).end(JSON.stringify({ refused: ['This key is not for the "x" book.'] }));
  } else {
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ written: 1 }));
  }
});
beforeAll(async () => {
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.BOOK_KEY = 'the-key';
});
afterAll(() => {
  delete process.env.BOOK_KEY;
  server.close();
});

describe('callBook', () => {
  it('answers with the data, and sends the key', async () => {
    expect(await callBook(url, '/ok', { repo: 'r', body: { a: 1 } })).toEqual({ ok: true, data: { written: 1 } });
    expect(seen).toBe('Bearer the-key');
  });
  it('tells a refusal, with its reasons', async () => {
    expect(await callBook(url, '/refuse', { repo: 'r' })).toMatchObject({ ok: false, status: 403, refused: ['This key is not for the "x" book.'] });
  });
  it('tells a fault on the book\'s side from a refusal', async () => {
    expect(await callBook(url, '/fault', { repo: 'r' })).toEqual({ ok: false, status: 500, fault: ['The book could not do that (error 1a2b3c4d).'] });
  });
  it('tells a book that is not answering', async () => {
    expect(await callBook('http://127.0.0.1:1', '/ok', { repo: 'r', timeoutMs: 500 })).toEqual({ ok: false, unreachable: true });
  });
});
