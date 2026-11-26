// The books. With one book there is nothing to choose, so it opens; with several, each shows what waits on you in it.
import { redirect } from 'next/navigation';
import { href } from '../lib/routes';
import { bookCounts } from '../lib/server/attention';
import { Card, CardTitle } from './ui/parts/card';
import { Flow, PageHead, Sheet } from './ui/parts/sheet';
import { StatusPill } from './ui/parts/status';
import { Meta, Row } from './ui/parts/text';

export const dynamic = 'force-dynamic';

export default async function Books() {
  const books = await bookCounts();
  if (books.length === 1) redirect(href.book(books[0].book));
  return (
    <main>
      <Sheet>
        <PageHead eyebrow="Galley" title="Your books" />
        {books.length === 0 && <Meta>No books yet. An agent starts one with the book_start tool.</Meta>}
        <Flow>
          {books.map((b) => (
            <Card key={b.book} href={href.book(b.book)}>
              <Row><CardTitle>{b.title}</CardTitle>{b.waiting > 0 && <StatusPill status="waiting">{b.waiting} waiting on you</StatusPill>}</Row>
            </Card>
          ))}
        </Flow>
      </Sheet>
    </main>
  );
}
