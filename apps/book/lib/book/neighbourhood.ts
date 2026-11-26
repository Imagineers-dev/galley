// What an agent reads before working on a piece of work: where it came from, what it touches, what was decided and tried.
import { workPapers } from './governing';
import type { Origin, Work } from './types';
import { type Current, notesOf, titleOf } from './views';

export function neighbourhood(now: Current, workId: string) {
  const record = now.get(workId);
  if (!record || record.kind !== 'work') return undefined;
  const work = record.body as Work;

  const originChain: { id: string; title: string; origin: Origin | null }[] = [];
  let cursor: string | undefined = workId;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const found = now.get(cursor);
    const origin = found?.kind === 'work' ? (found.body as Work).origin : null;
    originChain.push({ id: cursor, title: titleOf(now, cursor), origin });
    cursor = origin && 'work' in origin ? origin.work : origin && 'event' in origin ? origin.event : undefined;
  }

  const notes = notesOf(now, workId);
  const earlier = [...notes.replaced.entries()].filter(([, by]) => by === workId).map(([id]) => ({ id, title: titleOf(now, id) }));

  return {
    work: { id: workId, ...work, feature: { id: work.feature, title: titleOf(now, work.feature) } },
    replacedBy: notes.replaced.get(workId) ?? null,
    replaces: earlier,
    originChain,
    papers: workPapers(now, workId)
      .filter((p) => p.editor || p.agents)
      .map((p) => ({ kind: p.kind, forEditor: p.editor?.body.text ?? null, forAgents: p.agents?.body.text ?? null, editor: p.state.status, ...(p.source === 'feature' ? { source: p.source } : {}) })),
    decisions: notes.decisions.map((d) => ({ id: d.id, ...d.body, replaced: notes.replaced.has(d.id) })),
    findings: notes.findings.map((f) => ({ id: f.id, text: f.body.text })),
    openQuestions: notes.questions.map((q) => ({ id: q.id, text: q.body.text })),
    links: notes.links.map((l) => ({ ...l.body, other: titleOf(now, l.body.from === workId ? l.body.to : l.body.from) })),
  };
}
