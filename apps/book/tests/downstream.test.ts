// Work can be written and tested against its feature's papers; work with its own papers behaves exactly as before.
import { describe, expect, it } from 'vitest';
import { messagesOf } from '../lib/book/inbox';
import { coverage, paragraphs } from '../lib/book/paragraphs';
import type { Test } from '../lib/book/record-types';
import { lineCoverage, testsOf, translations } from '../lib/book/testing';
import type { BookRecord, PaperKind } from '../lib/book/types';
import { PAPER_KINDS, ids } from '../lib/book/types';
import { type Current, current, entries, entry, paperState } from '../lib/book/views';
import { explain } from '../lib/book/explain';
import { MESSAGE_KINDS } from '../lib/rules/check-inbox';
import { refusals } from '../lib/rules/check';

let tick = 0;
const rec = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:claude', replaces: string | null = null): BookRecord =>
  ({ book: 'b', id, kind, by, at: new Date(Date.UTC(2026, 10, 23, 11, 0, tick++)).toISOString(), replaces, body: body as Record<string, unknown> });
const propose = (id: string, kind: BookRecord['kind'], body: object, by = 'agent:claude') => ({ id, kind, by, replaces: null, body: body as Record<string, unknown> });
const scene = 'feature:scene';
const work = ids.work('scene', 'draft');
const workBody = { feature: scene, title: 'Draft', slug: 'draft', on: '2026-11-23', state: 'now', summary: 's', origin: { words: 'w', saidOn: '2026-11-23' } };
const base = () => [rec('project', 'project', { title: 'P', forWriter: 'x' }), rec(scene, 'feature', { title: 'Scene', slug: 'scene', forWriter: 'x' }), rec(work, 'work', workBody)];
const onFeature = (kind: PaperKind, text = 'First line.\n\nSecond line.') => rec(ids.featurePaper(scene, kind, 'editor'), 'paper', { feature: scene, kind, for: 'editor', text });
const own = (kind: PaperKind, text = 'Own line.\n\nOwn second.') => rec(ids.paper(work, kind, 'editor'), 'paper', { work, kind, for: 'editor', text });
const approve = (p: BookRecord, verdict = 'approved') => rec(`approval:${tick}`, 'approval', { paper: p.id, verdict, paperAt: p.at }, 'editor');
const agents = (p: BookRecord, kind: PaperKind, text = 'Do it [¶1]') => rec(ids.paper(work, kind, 'agents'), 'paper', { work, kind, for: 'agents', text, against: p.at });
const agentsBody = (kind: PaperKind, against: string, text = 'Do it [¶1]') => ({ work, kind, for: 'agents', text, against });
const test = (proves: string[]) => rec(`test:${tick}`, 'test', { work, title: 'T', proves, level: 'unit', runs: 'r' });
const testBody = (proves: string[]) => ({ work, title: 'T', proves, level: 'unit', runs: 'r' });

// The rules as they stood before a feature could govern, kept here to compare against.
const oldTranslations = (now: Current) => PAPER_KINDS.map((kind) => {
  const get = (id: string) => (now.get(id) ? entry<{ text: string; against?: string }>(now.get(id)!) : undefined);
  const editor = get(ids.paper(work, kind, 'editor'));
  const agentsPaper = get(ids.paper(work, kind, 'agents'));
  const stale = !!(editor && agentsPaper && agentsPaper.body.against && agentsPaper.body.against !== editor.at);
  return { kind, editor, agents: agentsPaper, stale, coverage: editor && agentsPaper ? coverage(editor.body.text, agentsPaper.body.text) : undefined };
});
const oldLines = (now: Current, kinds: PaperKind[]) => kinds.flatMap((kind) => {
  const paper = now.get(ids.paper(work, kind, 'editor'));
  if (!paper) return [];
  const tests = entries<Test>(now, 'test').filter((t) => t.body.work === work);
  return paragraphs(String(paper.body.text)).map((p) => ({ ref: `${kind}¶${p.n}`, kind, n: p.n, text: p.text, tests: tests.filter((t) => t.body.proves.includes(`${kind}¶${p.n}`)).map((t) => t.id) }));
});
const oldMayTranslate = (now: Current, kind: PaperKind) => paperState(now, ids.paper(work, kind, 'editor')).status === 'approved';

const approvedWhat = () => { const p = own('spec'); return [p, approve(p)]; };
const ownCases: [string, () => BookRecord[]][] = [
  ['no papers', () => []],
  ['an own Why alone', () => [own('intent')]],
  ['an own How alone', () => [own('plan')]],
  ['an own What waiting', () => [own('spec')]],
  ['an own What with changes', () => { const p = own('spec'); return [p, approve(p, 'changes')]; }],
  ['an own What approved', approvedWhat],
  ['an own What approved, translated and tested', () => { const r = approvedWhat(); return [...r, agents(r[0], 'spec'), test(['spec¶1'])]; }],
  ['an own What rewritten after its translation', () => { const r = approvedWhat(); return [...r, agents(r[0], 'spec'), test(['spec¶1']), own('spec', 'New words.')]; }],
  ['an own What beside feature papers', () => { const r = approvedWhat(); const f = onFeature('spec'); return [f, approve(f), onFeature('plan'), onFeature('intent'), ...r]; }],
  ['replaced work with its own What', () => [...approvedWhat(), rec('work:scene/next', 'work', { ...workBody, slug: 'next' }, 'agent:claude', work)]],
];

describe('work with its own papers behaves as it did', () => {
  it.each(ownCases)('%s', (_name, more) => {
    const now = current([...base(), ...more()]);
    expect(translations(now, work).map(({ source: _s, ...t }) => t)).toEqual(oldTranslations(now));
    expect(lineCoverage(now, work, ['spec', 'plan'])).toEqual(oldLines(now, ['spec', 'plan']));
    for (const kind of PAPER_KINDS) {
      const refused = refusals(now, propose(ids.paper(work, kind, 'agents'), 'paper', agentsBody(kind, now.get(ids.paper(work, kind, 'editor'))?.at ?? '')));
      expect(refused.some((r) => r.includes('waits until the editor approves'))).toBe(!oldMayTranslate(now, kind));
      const tested = refusals(now, propose('test:new', 'test', testBody([`${kind}¶1`])));
      expect(tested.length === 0).toBe(now.has(ids.paper(work, kind, 'editor')));
    }
  });
});

describe('work that follows its feature', () => {
  it('may be translated first from an approved paper, though it is not yet covered', () => {
    const p = onFeature('spec');
    const id = ids.paper(work, 'spec', 'agents');
    expect(refusals(current([...base(), p]), propose(id, 'paper', agentsBody('spec', p.at))).join()).toMatch(/waits until the editor approves/);
    expect(refusals(current([...base(), p, approve(p)]), propose(id, 'paper', agentsBody('spec', p.at)))).toEqual([]);
  });

  it('refuses an against that is no longer current', () => {
    const p = onFeature('spec');
    const later = onFeature('spec', 'New words.');
    const records = [...base(), p, approve(p), later, approve(later)];
    expect(refusals(current(records), propose(ids.paper(work, 'spec', 'agents'), 'paper', agentsBody('spec', p.at))).join()).toMatch(/older version/);
  });

  it('may name a line of the feature paper in a test, and only a real one', () => {
    const records = [...base(), onFeature('spec')];
    expect(refusals(current(records), propose('test:1', 'test', testBody(['spec¶2'])))).toEqual([]);
    expect(refusals(current(records), propose('test:1', 'test', testBody(['spec¶3']))).join()).toMatch(/has ¶1 to ¶2/);
  });

  it('answers only for the lines it cites', () => {
    const p = onFeature('spec');
    const lines = lineCoverage(current([...base(), p, approve(p), agents(p, 'spec', 'Do it [¶2]')]), work);
    expect(lines.map((l) => l.ref)).toEqual(['spec¶2']);
  });

  it('counts no lines once its translation is out of date', () => {
    const p = onFeature('spec');
    expect(lineCoverage(current([...base(), p, agents(p, 'spec'), onFeature('spec', 'New.\n\nWords.')]), work)).toEqual([]);
  });

  it('marks a test written before the current version as out of date', () => {
    const p = onFeature('spec');
    const early = test(['spec¶1']);
    const later = onFeature('spec', 'New.\n\nWords.');
    const late = test(['spec¶1']);
    const [line] = lineCoverage(current([...base(), p, early, later, agents(later, 'spec'), late]), work);
    expect(line).toMatchObject({ tests: [late.id], staleTests: [early.id] });
    expect(testsOf(current([...base(), p, early]), work)).toHaveLength(1);
  });

  it('reads its feature paper in the brief and in the account of the feature', () => {
    const p = onFeature('intent', 'The reason.');
    const now = current([...base(), p]);
    expect(translations(now, work).find((t) => t.kind === 'intent')).toMatchObject({ source: 'feature', editor: { id: p.id } });
    expect(explain(now, scene)?.story[0].why).toBe('The reason.');
  });
});

describe('the inbox', () => {
  const inbox = (records: BookRecord[]) => messagesOf('b', current(records), 'editor', '2026-11-23');

  it('says how much unfinished work relies on a rewritten feature paper', () => {
    const p = onFeature('spec');
    const done = rec('work:scene/old', 'work', { ...workBody, slug: 'old', state: 'done', verdict: { served: 'yes' } });
    const records = [...base(), done, p, approve(p), onFeature('spec', 'New words.')];
    const m = inbox(records).find((x) => x.id === p.id);
    expect(m?.text).toMatch(/^\*\*This paper has new words\.\*\* 1 piece of unfinished work relies on it\./);
    expect(m?.folder).toBe('inbox');
  });

  it('adds nothing to a first version', () => {
    const p = onFeature('spec');
    expect(inbox([...base(), p]).find((x) => x.id === p.id)?.text).toBe(p.body.text);
  });

  const beyond = (id = 'beyond:1') => rec(id, 'beyond', { work, raisedBy: 'reviewer', text: 'It adds a new screen.' }, 'repo');

  it('gives a standing beyond its own message, linking the What to answer', () => {
    const r = approvedWhat();
    const m = inbox([...base(), ...r, beyond()]).find((x) => x.id === 'beyond:1');
    expect(m).toMatchObject({ needs: 'decision', folder: 'inbox', answerOn: { href: '/b/f/scene/draft/what-you-get?answer=1' } });
    expect(m?.text).toMatch(/A reviewer says/);
    expect(MESSAGE_KINDS.has('beyond')).toBe(true);
  });

  it('files the message as answered once the What is approved again', () => {
    const r = approvedWhat();
    const m = inbox([...base(), ...r, beyond(), approve(r[0])]).find((x) => x.id === 'beyond:1');
    expect(m).toMatchObject({ folder: 'answered', read: true });
  });

  it('sends work with no own What to the work', () => {
    const m = inbox([...base(), beyond()]).find((x) => x.id === 'beyond:1');
    expect(m?.answerOn?.href).toBe('/b/f/scene/draft');
  });

  it('shows only the latest beyond on a work', () => {
    const messages = inbox([...base(), ...approvedWhat(), beyond('beyond:1'), beyond('beyond:2')]);
    expect(messages.filter((m) => m.id.startsWith('beyond:')).map((m) => m.id)).toEqual(['beyond:2']);
  });
});
