// What a repository's gates are told: the old raw states, and beside them what the governing rule decides.
import { describe, expect, it } from 'vitest';
import { gateAnswer } from '../lib/book/gate-answer';
import type { BookRecord, PaperKind } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current } from '../lib/book/views';
import { WORK, book, rec } from './helpers/promise-book';

const featurePaper = (kind: PaperKind) => rec(ids.featurePaper('feature:scene', kind, 'editor'), 'paper', { feature: 'feature:scene', kind, for: 'editor', text: 'One line.\n\nTwo line.' });
const ownPaper = (kind: PaperKind) => rec(ids.paper(WORK, kind, 'editor'), 'paper', { work: WORK, kind, for: 'editor', text: 'Own line.' });
const approve = (p: BookRecord) => rec(`approval:${crypto.randomUUID()}`, 'approval', { paper: p.id, verdict: 'approved', paperAt: p.at }, 'editor');
const agents = (p: BookRecord, kind: PaperKind) => rec(ids.paper(WORK, kind, 'agents'), 'paper', { work: WORK, kind, for: 'agents', text: 'Do the second [¶2]', against: p.at });

describe('the answer the gates read', () => {
  it('says nothing exists for an unknown work', () => expect(gateAnswer(current(book().records), 'work:none/x', false)).toBeNull());

  it("keeps the old raw states and adds the governing rule's decision, source and version", () => {
    const [spec, plan] = [featurePaper('spec'), featurePaper('plan')];
    const a = gateAnswer(current([...book().records, spec, approve(spec), agents(spec, 'spec'), plan, approve(plan), agents(plan, 'plan')]), WORK, false)!;
    expect(a.papers.spec).toBe('missing');
    expect(a.effective.spec).toEqual({ status: 'approved', source: 'feature', version: spec.at, beyond: false });
    expect(a.effective.intent).toMatchObject({ status: 'missing', source: 'none', version: null });
    expect(a).not.toHaveProperty('texts');
  });

  it('a feature paper is not yet approved for this work until the agents translate its What and How', () => {
    const spec = featurePaper('spec');
    expect(gateAnswer(current([...book().records, spec, approve(spec)]), WORK, false)!.effective.spec.status).toBe('waiting');
  });

  it('a standing beyond holds back the What and says so', () => {
    const [spec, plan] = [featurePaper('spec'), featurePaper('plan')];
    const beyond = rec(`beyond:${crypto.randomUUID()}`, 'beyond', { work: WORK, raisedBy: 'author', text: 'More.' });
    expect(gateAnswer(current([...book().records, spec, approve(spec), agents(spec, 'spec'), plan, approve(plan), agents(plan, 'plan'), beyond]), WORK, false)!.effective.spec).toMatchObject({ status: 'waiting', beyond: true });
  });

  it('with text, gives the raw texts unchanged and the governing text, agents paper and cited lines', () => {
    const spec = featurePaper('spec');
    const plan = ownPaper('plan');
    const a = gateAnswer(current([...book().records, spec, approve(spec), agents(spec, 'spec'), plan, approve(plan)]), WORK, true)!;
    expect(a.texts).toEqual({ intent: null, spec: null, plan: 'Own line.' });
    expect(a.governing?.spec).toEqual({ text: 'One line.\n\nTwo line.', agents: 'Do the second [¶2]', cited: [2] });
    expect(a.governing?.plan).toEqual({ text: 'Own line.', agents: null, cited: null });
  });
});
