import { notFound } from 'next/navigation';
import { diaryDays, yearStrip, type DayView } from '../../../lib/book/diary';
import { needed } from '../../../lib/book/diary-now';
import { monthYear } from '../../../lib/book/format';
import { wordsOf } from '../../../lib/book/vocabulary';
import { loadBook } from '../../../lib/load';
import { href } from '../../../lib/routes';
import { getAttention } from '../../../lib/server/attention';
import { today } from '../../../lib/server/clock';
import { DiaryColumns } from '../../ui/diary/columns';
import { DayFull, DayLine, Month } from '../../ui/diary/day';
import { DayIndex } from '../../ui/diary/day-index';
import { YearHeat } from '../../ui/diary/year';
import { Frame } from '../../ui/frame';
import { PageHead, Sheet } from '../../ui/parts/sheet';
import { StateLine } from '../../ui/parts/status';
import { Empty } from '../../ui/parts/text';

export const dynamic = 'force-dynamic';

const FULL_DAYS = 7;

function byMonth(days: DayView[]) {
  const months: { month: string; days: DayView[] }[] = [];
  for (const d of days) {
    const month = monthYear(d.day);
    if (months.at(-1)?.month !== month) months.push({ month, days: [] });
    months.at(-1)?.days.push(d);
  }
  return months;
}

/**
 * The diary is days. In the order a reader takes it in:
 * 1. the title, and one line saying whether you are needed (the inbox holds what waits on you);
 * 2. the days, newest first: the last week in full, older days as one line each, then the year;
 * 3. beside them on a wide screen, the index of days, to jump to a day (a narrow screen shows the days alone).
 * The work in motion has its own page (Work in motion), not here.
 */
export default async function DiaryPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const { now, asOf } = await loadBook(book);
  if (!now.get('project')) notFound();
  const days = diaryDays(now);
  const months = byMonth(days);
  const queue = (await getAttention(book)).count;
  const shown = new Set(days.slice(0, FULL_DAYS).map((d) => d.day));

  return (
    <Frame book={book} now={now} trail={[{ label: 'Diary' }]} aside={`${days.length} ${days.length === 1 ? 'day' : 'days'}`}>
      <Sheet>
        <PageHead
          eyebrow={String(now.get('project')?.body.title)}
          title="Diary"
          aside={<StateLine tone={queue ? 'waiting' : 'done'} href={queue ? href.inbox(book) : undefined}>{needed(queue)}</StateLine>}
        />
        <DiaryColumns
          index={days.length > 0 && <DayIndex months={months} />}
          days={<>
            {days.length === 0 && <Empty>No days yet. Each day the book records work, it appears here.</Empty>}
            {months.map((m) => (
              <Month key={m.month} month={m.month}>
                {m.days.map((d) => (shown.has(d.day) ? <DayFull key={d.day} book={book} day={d} /> : <DayLine key={d.day} day={d} />))}
              </Month>
            ))}
            <YearHeat year={yearStrip(now, days, asOf ?? today())} line={wordsOf(now).yearLine} />
          </>}
        />
      </Sheet>
    </Frame>
  );
}
