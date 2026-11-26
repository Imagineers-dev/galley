// A feature: what it is for its users, where it stands, what it is, and the parts it is made of; then its papers, what
// it promises, its work stage by stage and what went wrong, and the decisions that shaped it over time. A chapter shown
// as a grid, a story in one and a study keep their own view: the grid, the story's steps and its story.
import { notFound } from 'next/navigation';
import { decisionMap } from '../../../../lib/book/decisions';
import { gridOf } from '../../../../lib/book/grid';
import { stagesIn, stagesOf, underWay } from '../../../../lib/book/stages';
import { isStudy } from '../../../../lib/book/study';
import type { Feature } from '../../../../lib/book/types';
import { ids } from '../../../../lib/book/types';
import { featureTree, flatten, storyOf } from '../../../../lib/book/views';
import { wordsOf } from '../../../../lib/book/vocabulary';
import { loadBook } from '../../../../lib/load';
import { href } from '../../../../lib/routes';
import { isEditor } from '../../../../lib/server/session';
import { FeatureAssets } from '../../../ui/asset/feature-assets';
import { DecisionMap } from '../../../ui/decision-map';
import { FeaturePapers } from '../../../ui/feature/feature-papers';
import { WentWrong } from '../../../ui/feature/went-wrong';
import { WorkStageRows } from '../../../ui/feature/work-stage-rows';
import { Frame } from '../../../ui/frame';
import { GridLesson } from '../../../ui/grid/grid-lesson';
import { StoriesGrid } from '../../../ui/grid/stories-grid';
import { StoryStages } from '../../../ui/grid/story-stages';
import { StorySteps } from '../../../ui/grid/story-steps';
import { Card, CardTitle, Cards } from '../../../ui/parts/card';
import { Prose } from '../../../ui/parts/prose';
import { NestedPromises } from '../../../ui/promises/nested-promises';
import { Section } from '../../../ui/parts/section';
import { PageHead, Sheet, Split } from '../../../ui/parts/sheet';
import { Meta } from '../../../ui/parts/text';
import { Story } from '../../../ui/work/story';
import styles from './feature.module.css';

export const dynamic = 'force-dynamic';

export default async function FeaturePage({ params, searchParams }: {
  params: Promise<{ book: string; feature: string }>;
  searchParams: Promise<{ show?: string; attach?: string }>;
}) {
  const { book, feature: slug } = await params;
  const query = await searchParams;
  const showAll = query.show !== 'in-force';
  const { now, asOf } = await loadBook(book);
  const id = ids.feature(slug);
  const record = now.get(id);
  if (!record || record.kind !== 'feature') notFound();
  const feature = record.body as Feature;
  const parent = feature.parent ? now.get(feature.parent) : undefined;
  const children = flatten(featureTree(now)).filter((f) => f.body.parent === id);
  const story = storyOf(now, id);
  const map = decisionMap(now, id, showAll);
  const grid = gridOf(now, id);
  // A story in a chapter shown as a grid shows where it stands; the chapter shows the stories under way the same way.
  const stages = grid ? underWay(grid).map((r) => stagesIn(now, grid, r)) : [stagesOf(now, id)].filter((s) => s !== null);
  const trail = [...(parent ? [{ label: String(parent.body.title), to: href.feature(book, parent.id) }] : []), { label: feature.title }];
  const words = wordsOf(now);
  const counts = words.storyCount(story.filter((s) => s.type === 'work').length, story.filter((s) => s.type === 'event').length);
  // An ordinary feature shows its work stage by stage and what went wrong in place of its story.
  const ordinary = !grid && stages.length === 0 && !isStudy(now);

  const main = (
    <>
      {feature.standing && <Section title="Where it stands"><p className={styles.standing}>{feature.standing}</p></Section>}
      {feature.about && <Section title="What it is"><Prose text={feature.about} /></Section>}
      {!ordinary && story.length > 0 && <Section title={words.story}><Story book={book} now={now} featureId={id} /></Section>}
      {!ordinary && story.length === 0 && children.length === 0 && !grid && <Meta>{words.noWork}</Meta>}
    </>
  );
  const side = !grid && children.length > 0 && (
    <Section title="What it's made of">
      <Cards>
        {children.map((c) => (
          <Card key={c.id} href={href.feature(book, c.id)}>
            <CardTitle>{c.body.title}</CardTitle>
            <p className={styles.summary}>{c.body.standing ?? c.body.forWriter}</p>
          </Card>
        ))}
      </Cards>
    </Section>
  );

  return (
    <Frame book={book} now={now} trail={trail} aside={counts}>
      <Sheet>
        <PageHead eyebrow={words.featureIs(parent ? String(parent.body.title) : undefined)} title={feature.title} lede={feature.forWriter} />
        {grid && <StoriesGrid book={book} title={feature.title} grid={grid} />}
        {(grid || stages.length > 0) && (
          <Section title={grid ? 'In progress' : 'Its steps'}>
            {grid && stages.length === 0 && <Meta>{words.noneInProgress}</Meta>}
            {stages.map((s) => (
              <div key={s.feature}>
                <StoryStages stages={s} />
                <StorySteps book={book} stages={s} />
              </div>
            ))}
          </Section>
        )}
        {grid && <Section title={words.lastTaught}><GridLesson book={book} grid={grid} empty={words.nothingTaught} /></Section>}
        {side ? <Split main={main} side={side} /> : main}
        <FeatureAssets book={book} now={now} featureId={id} editor={!asOf && (await isEditor())} refused={query.attach} />
        {ordinary && (
          <>
            <FeaturePapers book={book} now={now} featureId={id} />
            <NestedPromises book={book} now={now} featureId={id} />
            <WorkStageRows book={book} now={now} featureId={id} />
            <WentWrong book={book} now={now} featureId={id} />
          </>
        )}
        {map.points.some((p) => p.type === 'decision') && (
          <Section title="Decisions, over time">
            <DecisionMap book={book} points={map.points} lanes={map.lanes} all={showAll}
              toggleHref={{ all: href.feature(book, id), inForce: `${href.feature(book, id)}?show=in-force` }} />
          </Section>
        )}
      </Sheet>
    </Frame>
  );
}
