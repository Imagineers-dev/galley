import { LEVEL_WORDS } from '../../../lib/book/format';
import { risks, weight } from '../../../lib/book/risks';
import { href } from '../../../lib/routes';
import { Card, type CardTone } from '../parts/card';
import { Label } from '../parts/section';
import { Flow } from '../parts/sheet';
import { Empty, TextLink } from '../parts/text';
import styles from './watch.module.css';
import { WatchSection } from './watch-section';

import type { Current } from '../../../lib/book/views';

const STATE = { open: 'Open', accepted: 'Accepted', paid: 'Paid' } as const;
const TONE: Record<keyof typeof STATE, CardTone> = { open: 'plain', accepted: 'plain', paid: 'plain' };

/** Risks and debts: what each costs, how likely and how bad, and how to pay it down, the weightiest open ones first. */
export function RisksSection({ book, now }: { book: string; now: Current }) {
  const list = risks(now);
  return (
    <WatchSection id="risks" title="Risks and debts" lede="Known weaknesses with what they cost, so you choose when to pay them down." count={`${list.filter((r) => r.body.state === 'open').length} open`}>
      {list.length === 0 && <Empty>No risks recorded yet.</Empty>}
      <Flow>
        {list.map((r) => (
          <Card key={r.id} tone={r.body.state === 'open' && weight(r.body) >= 6 ? 'event' : TONE[r.body.state]} flat={r.body.state === 'paid'}>
            <div className={r.body.state === 'paid' ? styles.paid : undefined}>
              <Label>{r.body.kind === 'debt' ? 'Debt' : 'Risk'} · {STATE[r.body.state]}</Label>
              <h3 className={styles.nameSmall}>{r.body.title}</h3>
              <p className={styles.note}>{r.body.cost}</p>
              <p className={styles.fact}>Likelihood <b>{LEVEL_WORDS[r.body.likelihood]}</b> · Impact <b>{LEVEL_WORDS[r.body.impact]}</b></p>
              <Label>To pay it down</Label>
              <p className={styles.note}>{r.body.payDown}</p>
              {r.body.work && <TextLink href={href.work(book, r.body.work)}>The work that pays it →</TextLink>}
            </div>
          </Card>
        ))}
      </Flow>
    </WatchSection>
  );
}
