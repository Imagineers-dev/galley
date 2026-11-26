// The signal that a book changed, for the pages open on it. Every write in this server process says so at once
// (lib/write.ts calls `changed` after each append); while anyone listens to a book, one poll of its latest time
// also catches a write made by another process (a script). Kept on globalThis so every route shares it.
import { latestAt } from './store/records';

type Listener = (at: string) => void;
type Watch = { listeners: Set<Listener>; last: string | null; timer: ReturnType<typeof setInterval> };

const POLL_MS = 10_000;
const watches: Map<string, Watch> = ((globalThis as { __bookWatches?: Map<string, Watch> }).__bookWatches ??= new Map());

function tell(book: string, at: string) {
  const watch = watches.get(book);
  if (!watch || (watch.last && at <= watch.last)) return;
  watch.last = at;
  for (const listen of watch.listeners) listen(at);
}

/** Tells everyone listening to `book` that it changed, as of `at` (the time of its latest record). */
export const changed = (book: string, at: string): void => tell(book, at);

/** Listens for changes to `book`; returns the call that stops listening. The poll runs only while someone listens. */
export function onChange(book: string, listen: Listener): () => void {
  let watch = watches.get(book);
  if (!watch) {
    const timer = setInterval(() => void latestAt(book).then((at) => at && tell(book, at)).catch(() => undefined), POLL_MS);
    timer.unref?.();
    watch = { listeners: new Set(), last: null, timer };
    watches.set(book, watch);
    const started = watch;
    void latestAt(book).then((at) => { if (!started.last) started.last = at; }).catch(() => undefined);
  }
  watch.listeners.add(listen);
  return () => {
    const w = watches.get(book);
    if (!w) return;
    w.listeners.delete(listen);
    if (!w.listeners.size) {
      clearInterval(w.timer);
      watches.delete(book);
    }
  };
}
