// The feature page's four sections, drawn from a small book: its papers (none for a list), its promises nested by
// feature, its work stage by stage, and what went wrong; each says so in one line when it has nothing.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BookRecord } from '../lib/book/types';
import { ids } from '../lib/book/types';
import { current } from '../lib/book/views';
import { FeaturePapers } from '../app/ui/feature/feature-papers';
import { WentWrong } from '../app/ui/feature/went-wrong';
import { WorkStageRows } from '../app/ui/feature/work-stage-rows';
import { NestedPromises } from '../app/ui/promises/nested-promises';
import { book, promiseBody, rec } from './helpers/promise-book';

const why = rec(ids.featurePaper('feature:scene', 'intent', 'editor'), 'paper', { feature: 'feature:scene', kind: 'intent', for: 'editor', text: 'Why it matters.' });
const onChild = rec('promise:child/22222222-2222-4222-8222-222222222222', 'promise', promiseBody('The child holds.', { feature: 'feature:child' }));
const bug = rec('event:scene/lost', 'event', { feature: 'feature:scene', title: 'A draft was lost', on: '2026-11-21', text: 'It vanished.', noPromiseYet: true });
const draw = (more: BookRecord[], el: (now: ReturnType<typeof current>) => React.ReactElement) => renderToStaticMarkup(el(current([...book().records, ...more])));
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');
const list = rec('feature:list', 'feature', { title: 'List', slug: 'list', forWriter: 'x', approval: 'per-item' });
const listWhy = rec(ids.featurePaper('feature:list', 'intent', 'editor'), 'paper', { feature: 'feature:list', kind: 'intent', for: 'editor', text: 'Why.' });

describe('the feature page', () => {
  it('shows each of its papers with where it stands, opening its page', () => {
    const html = draw([why], (now) => <FeaturePapers book="b" now={now} featureId="feature:scene" />);
    expect(text(html)).toContain('Why Waiting on you');
    expect(html).toContain('href="/b/paper/scene/why"');
    expect(text(html)).toContain("What you'll get Not written yet");
  });

  it.each([
    { name: 'a feature with no papers', more: [] as BookRecord[], feature: 'feature:scene', want: 'No papers written for this feature yet.' },
    { name: 'a list, whose items carry their own', more: [list, listWhy], feature: 'feature:list', want: '' },
  ])('papers for $name', ({ more, feature, want }) => {
    expect(text(draw(more, (now) => <FeaturePapers book="b" now={now} featureId={feature} />)).trim()).toBe(want ? `Its papers ${want}` : '');
  });

  it('nests promises under each feature, with their state and a link to read them', () => {
    const html = draw([onChild], (now) => <NestedPromises book="b" now={now} featureId="feature:scene" />);
    expect(text(html)).toMatch(/scene .*Only your choice stops a draft\..*child .*The child holds\./);
    expect(html).toContain('href="/b/promises/child"');
  });

  it('draws one stage track per piece of work', () => {
    const html = draw([], (now) => <WorkStageRows book="b" now={now} featureId="feature:scene" />);
    expect(html.match(/aria-label="Where it stands"/g)).toHaveLength(1);
    expect(text(html)).toContain('Draft under way');
  });

  it('lists what went wrong with its day', () => {
    expect(text(draw([bug], (now) => <WentWrong book="b" now={now} featureId="feature:scene" />))).toContain('A draft was lost 21 Nov 2026 It vanished. No promise covered this yet.');
  });

  it.each([
    { name: 'promises', el: (now: ReturnType<typeof current>) => <NestedPromises book="b" now={now} featureId="feature:dep" />, want: 'No promises written for this feature or its parts yet.' },
    { name: 'work', el: (now: ReturnType<typeof current>) => <WorkStageRows book="b" now={now} featureId="feature:dep" />, want: 'No work in this feature yet.' },
    { name: 'events', el: (now: ReturnType<typeof current>) => <WentWrong book="b" now={now} featureId="feature:dep" />, want: 'Nothing has gone wrong here yet.' },
  ])('says so in one line when it has no $name', ({ el, want }) => {
    expect(text(draw([], el))).toContain(want);
  });
});
