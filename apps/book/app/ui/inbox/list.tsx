// The middle of the inbox: messages newest first, grouped by day; bold until read, tagged by what each needs.
import { Label } from '../parts/section';
import Link from 'next/link';
import { addDays, dayOf } from '../../../lib/book/days';
import { dayBrief, dayNamed } from '../../../lib/book/format';
import type { Message } from '../../../lib/book/inbox';
import { type ReadingList, paperTitle } from '../../../lib/book/attention';
import { Chip, NeedChip } from './chip';
import { Row } from './row';
import styles from './list.module.css';

function dayLabel(day: string) {
  const today = dayOf(Date.now());
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return dayNamed(day);
}
const preview = (text: string) => text.replace(/[#>*_`[\]]/g, '').replace(/\(([^)]*)\)/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);

export type Tab = { label: string; href: string; on: boolean; n?: number };

/** The papers waiting for approval, shown as one row that opens them in reading order. */
export type Reading = ReadingList & { href: string };

function ReadingRow({ reading }: { reading: Reading }) {
  const n = reading.papers.length;
  return (
    <Row href={reading.href} keepScroll={false} unread selected={false} from="Your reading" at={reading.at}
      subject={`Read and approve ${n} ${n === 1 ? 'paper' : 'papers'}, in reading order`}
      snip={reading.papers.map(paperTitle).join(' · ')} chips={<NeedChip needs="approval" label="Reading" />} />
  );
}

export function InboxList({ messages, openKey, hrefOf, tabs, empty, reading }: {
  messages: Message[]; openKey?: string; hrefOf: (key: string) => string; tabs: Tab[]; empty: string; reading?: Reading;
}) {
  const groups: { day: string; items: Message[] }[] = [];
  for (const m of messages) {
    if (groups.at(-1)?.day !== dayOf(m.at)) groups.push({ day: dayOf(m.at), items: [] });
    groups.at(-1)?.items.push(m);
  }
  return (
    <>
      {tabs.length > 0 && (
        <div className={styles.tabs}>
          {tabs.map((t) => (
            <Link key={t.label} href={t.href} className={`${styles.tab} ${t.on ? styles.tabOn : styles.tabOff}`}>{t.label}{t.n ? ` · ${t.n}` : ''}</Link>
          ))}
        </div>
      )}
      {messages.length === 0 && !reading && <p className={styles.empty}>{empty}</p>}
      <div className={styles.scroll}>
        {reading && <ReadingRow reading={reading} />}
        {groups.map((g) => (
          <div key={g.day}>
            <div className={styles.day}><Label as="h2" gap="none">{dayLabel(g.day)}</Label></div>
            {g.items.map((m) => (
              <Row key={m.key} href={hrefOf(m.key)} unread={!m.read} selected={m.key === openKey} from={`${m.from.feature || m.bookTitle} · ${m.from.agent}`}
                at={m.at} subject={m.subject} snip={m.answer ? `You: ${m.answer.text}` : preview(m.text)}
                chips={<><NeedChip needs={m.needs} />{m.until && <Chip>Back {dayBrief(m.until)}</Chip>}</>} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
