// Beside a feature's story: what is still open, its parts, its risks and the lessons learnt in it.
import type { ReactNode } from 'react';
import type { explain } from '../../../lib/book/explain';
import { href } from '../../../lib/routes';
import { Card } from '../parts/card';
import { Label } from '../parts/section';
import { Meta, TextLink } from '../parts/text';
import watch from './watch.module.css';

type Explained = NonNullable<ReturnType<typeof explain>>;

function Side({ label, none, children }: { label: string; none?: string; children: ReactNode[] }) {
  return (
    <Card>
      <Label>{label}</Label>
      {children.length ? <ul className={watch.list}>{children}</ul> : <Meta>{none}</Meta>}
    </Card>
  );
}

export function ExplainSide({ book, e }: { book: string; e: Explained }) {
  const about = (slug: string) => `${href.agents(book, 'explain')}?f=${slug}`;
  return (
    <>
      <Side label="Still open" none="Nothing open.">{e.open.map((o) => <li key={o.id}><TextLink href={href.message(book, o.id)}>{o.text}</TextLink></li>)}</Side>
      {e.parts.length > 0 && <Side label="Its parts">{e.parts.map((p) => <li key={p.id}><TextLink href={about(p.body.slug)}>{p.body.title}</TextLink></li>)}</Side>}
      <Side label="Risks" none="None recorded.">{e.risks.map((r) => <li key={r.id}>{r.body.title}</li>)}</Side>
      <Side label="Lessons here" none="None recorded.">{e.lessons.map((l) => <li key={l.lesson.id}>{l.lesson.body.rule}</li>)}</Side>
      <TextLink href={href.feature(book, e.feature.id)}>The feature's full story →</TextLink>
    </>
  );
}
