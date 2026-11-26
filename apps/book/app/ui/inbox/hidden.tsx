// What every inbox form sends with it: the message, the view to return to, and the message to open next.
import type { Message } from '../../../lib/book/inbox';

export function Hidden({ m, here, next }: { m: Message; here: string; next?: string }) {
  return (
    <>
      <input type="hidden" name="key" value={m.key} />
      <input type="hidden" name="here" value={here} />
      {next && <input type="hidden" name="next" value={next} />}
    </>
  );
}
