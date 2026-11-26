// An address the book does not have.
import { ButtonLink } from './ui/parts/button';
import { Notice } from './ui/parts/notice';

export default function NotFound() {
  return (
    <Notice title="Not in the book" lede="This page isn't in the book, or its name has changed.">
      <ButtonLink kind="main" href="/">Back to the books</ButtonLink>
    </Notice>
  );
}
