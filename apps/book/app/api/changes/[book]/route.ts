// A book's pages listen here for changes (server-sent events): each event carries the time of the book's latest
// record, sent when the page connects and whenever the book changes. A comment every 25 s keeps the line open.
import { onChange } from '../../../../lib/changes';
import { isBookName } from '../../../../lib/routes';
import { latestAt } from '../../../../lib/store/records';

export const dynamic = 'force-dynamic';

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

export async function GET(request: Request, { params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  if (!isBookName(book)) return new Response('Not found', { status: 404 });
  if (!LOOPBACK.has((request.headers.get('host') ?? '').replace(/:\d+$/, ''))) return new Response('Forbidden', { status: 403 });
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return new Response('Forbidden', { status: 403 });
  const encoder = new TextEncoder();
  let stop = () => {};
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          stop();
        }
      };
      const unlisten = onChange(book, (at) => send(`data: ${at}\n\n`));
      const beat = setInterval(() => send(': still here\n\n'), 25_000);
      stop = () => {
        unlisten();
        clearInterval(beat);
      };
      request.signal.addEventListener('abort', () => {
        stop();
        try { controller.close(); } catch { /* already closed */ }
      });
      send(`retry: 5000\ndata: ${(await latestAt(book)) ?? ''}\n\n`);
    },
    cancel() {
      stop();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
