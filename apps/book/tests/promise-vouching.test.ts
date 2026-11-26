// Nobody vouches for their own work: not on the run, the work, the feature or anything serving the same promise.
import { describe, expect, it } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { current } from '../lib/book/views';
import { type Proposed, refusals } from '../lib/rules/check';
import { P, WORK, book, linkTo, rec, run, testBody, workBody } from './helpers/promise-book';

const refused = (records: BookRecord[], r: BookRecord) => refusals(current(records), r as Proposed);
const witness = (runId: string, by: string) => rec(`witness:${crypto.randomUUID()}`, 'witness', { run: runId, evidence: 'read it' }, by);

describe('vouching', () => {
  const setup = () => {
    const { records } = book();
    const r = run({ by: 'agent:claude' });
    return { records: [...records, r], r };
  };
  it('refuses the agent that wrote the run', () => {
    const { records, r } = setup();
    expect(refused(records, witness(r.id, 'agent:claude')).length).toBe(1);
  });
  it('refuses anyone who wrote a test on the work, in any version', () => {
    const { records, r } = setup();
    const later = rec('test:t', 'test', testBody({ title: 'Reworded' }), 'agent:gemini');
    expect(refused([...records, later], witness(r.id, 'agent:claude')).length).toBe(1);
  });
  it('refuses anyone who wrote a paper on the work, in any version', () => {
    const { records, r } = setup();
    const v1 = rec('paper:scene/draft/spec/editor', 'paper', { work: WORK, kind: 'spec', for: 'editor', text: 'One.' }, 'agent:codex');
    const v2 = rec('paper:scene/draft/spec/editor', 'paper', { work: WORK, kind: 'spec', for: 'editor', text: 'Two.' }, 'agent:gemini');
    expect(refused([...records, v1, v2], witness(r.id, 'agent:codex')).length).toBe(1);
  });
  it('refuses anyone who ran another test on the work', () => {
    const { records, r } = setup();
    const other = rec('test:u', 'test', testBody(), 'agent:gemini');
    const theirs = run({ of: 'test:u', by: 'agent:codex' });
    expect(refused([...records, other, theirs], witness(r.id, 'agent:codex')).length).toBe(1);
  });
  it('refuses the author of other work on the same feature', () => {
    const { records, r } = setup();
    const other = 'work:scene/other';
    const paper = rec('paper:scene/other/spec/editor', 'paper', { work: other, kind: 'spec', for: 'editor', text: 'One.' }, 'agent:codex');
    expect(refused([...records, paper], witness(r.id, 'agent:codex')).length).toBe(1);
  });
  it('refuses the author of work elsewhere that serves the promise', () => {
    const { records, r } = setup();
    const far = rec('work:far/w', 'work', { ...workBody({ feature: 'feature:far', slug: 'w', serves: [P] }) });
    const paper = rec('paper:far/w/spec/editor', 'paper', { work: far.id, kind: 'spec', for: 'editor', text: 'One.' }, 'agent:codex');
    expect(refused([...records, far, paper], witness(r.id, 'agent:codex')).length).toBe(1);
  });
  it('refuses the author of another work whose test proves the same promise', () => {
    const { records } = book();
    const far = rec('work:far/w', 'work', workBody({ feature: 'feature:far', slug: 'w' }));
    const mine = rec('paper:far/w/spec/editor', 'paper', { work: far.id, kind: 'spec', for: 'editor', text: 'One.' }, 'agent:gemini');
    const theirs = rec('test:far', 'test', testBody({ work: far.id }), 'agent:codex');
    const l = linkTo('test:far');
    const r2 = run({ of: 'test:far', by: 'agent:codex' });
    expect(refused([...records, far, mine, theirs, l, r2], witness(r2.id, 'agent:gemini')).length).toBe(1);
  });
  it('refuses the author of work on a feature under the promise', () => {
    const { records, r } = setup();
    const paper = rec('paper:child/x/spec/editor', 'paper', { work: 'work:child/x', kind: 'spec', for: 'editor', text: 'One.' }, 'agent:codex');
    expect(refused([...records, paper], witness(r.id, 'agent:codex')).length).toBe(1);
  });
  it('refuses the author of work on a feature the promise depends on', () => {
    const { records, r } = setup();
    const dep = rec('link:dep', 'link', { from: 'feature:scene', to: 'feature:dep', kind: 'depends-on' });
    const paper = rec('paper:dep/x/spec/editor', 'paper', { work: 'work:dep/x', kind: 'spec', for: 'editor', text: 'One.' }, 'agent:codex');
    expect(refused([...records, dep, paper], witness(r.id, 'agent:codex')).length).toBe(1);
  });
  it('refuses an agent that only opened a piece of work on the feature', () => {
    const { records, r } = setup();
    const opened = rec('work:scene/opened', 'work', workBody({ slug: 'opened' }), 'agent:codex');
    expect(refused([...records, opened], witness(r.id, 'agent:codex')).length).toBe(1);
  });
  it('still accepts the author of work on an unrelated feature', () => {
    const { records, r } = setup();
    const far = rec('work:far/x', 'work', workBody({ feature: 'feature:far', slug: 'x' }), 'agent:codex');
    expect(refused([...records, far], witness(r.id, 'agent:codex'))).toEqual([]);
  });
  it('accepts a second agent that did none of it', () => {
    const { records, r } = setup();
    expect(refused(records, witness(r.id, 'agent:codex'))).toEqual([]);
  });
  it('a witness names a run of a test', () => {
    const { records } = setup();
    expect(refused(records, witness('run:nope', 'agent:codex')).length).toBeGreaterThan(0);
  });
});
