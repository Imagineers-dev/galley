import { notFound, permanentRedirect } from 'next/navigation';
import { loadBook } from '../../../../lib/load';
import { productOnly } from '../../../../lib/server/product-only';
import { AGENT_TABS, type AgentTab, href } from '../../../../lib/routes';
import { Frame } from '../../../ui/frame';
import { PageHead, Sheet } from '../../../ui/parts/sheet';
import { TabNav } from '../../../ui/tab-nav';
import { ExplainSection } from '../../../ui/watch/explain';
import { GoalsSection } from '../../../ui/watch/goals';
import { LessonsSection } from '../../../ui/watch/lessons';
import { PermissionsSection } from '../../../ui/watch/permissions';
import { ProofSection } from '../../../ui/watch/proof';
import { QualitySection } from '../../../ui/watch/quality';

export const dynamic = 'force-dynamic';

const LABELS: Record<AgentTab, string> = {
  quality: 'How good they are', proof: 'Proof', lessons: 'Lessons', permissions: 'Who may do what', goals: 'Goals and results', explain: 'Explain it to me',
};

/** The agents, one tab at a time: how good they are, the proof behind done work, lessons, permissions, goals, explain. */
export default async function AgentsPage({ params, searchParams }: {
  params: Promise<{ book: string; tab?: string[] }>; searchParams: Promise<{ f?: string }>;
}) {
  const { book, tab } = await params;
  if (tab?.[0] === 'quality') permanentRedirect(href.agents(book));
  const on = (tab?.[0] ?? 'quality') as AgentTab;
  if (!AGENT_TABS.includes(on) || (tab?.length ?? 0) > 1) notFound();
  const { now } = await loadBook(book);
  productOnly(now, book);
  if (!now.get('project')) notFound();
  const section = {
    quality: <QualitySection now={now} />, proof: <ProofSection book={book} now={now} />, lessons: <LessonsSection now={now} />,
    permissions: <PermissionsSection now={now} />, goals: <GoalsSection book={book} now={now} />,
    explain: <ExplainSection book={book} now={now} feature={(await searchParams).f} />,
  }[on];
  return (
    <Frame book={book} now={now} trail={[{ label: 'The agents' }]}>
      <Sheet>
        <PageHead eyebrow="Keeping watch" title="The agents" lede="How well the agents work, the proof behind what they call done, what they have learnt, and what they may do alone." />
        <TabNav label="The agents" on={on} tabs={AGENT_TABS.map((t) => ({ key: t, label: LABELS[t], to: href.agents(book, t) }))} />
        {section}
      </Sheet>
    </Frame>
  );
}
