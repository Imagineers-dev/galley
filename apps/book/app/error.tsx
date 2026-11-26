'use client';
// When a page cannot be read: says whether the database is down, and offers to try again.
import { Button } from './ui/parts/button';
import { Notice } from './ui/parts/notice';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const offline = /ECONNREFUSED|fetch failed|8123/.test(error.message);
  const lede = offline ? 'Its database is not answering. Start ClickHouse (see apps/book/README.md) and try again.' : 'Something went wrong while reading it.';
  return (
    <Notice title="The book couldn't be read" lede={lede}>
      <Button kind="main" type="button" onClick={reset}>Try again</Button>
    </Notice>
  );
}
