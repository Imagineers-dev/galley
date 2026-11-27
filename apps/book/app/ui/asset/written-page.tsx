// A document written in the book, read as a page of it: its text in the book's reading type (HTML made safe by
// lib/book/html.ts, Markdown by lib/book/markdown.ts), the features it led to and its tags, a quiet line of who wrote
// it and when, and for the editor the same document to edit. No file card, no frame: it is writing, not an attachment.
import type { Asset } from '../../../lib/book/asset-types';
import { attachedBy } from '../../../lib/book/asset-types';
import { dayFull } from '../../../lib/book/format';
import { readableHtml, withoutTitle } from '../../../lib/book/html';
import { type Current, type Latest, titleOf } from '../../../lib/book/views';
import { href } from '../../../lib/routes';
import { readRange } from '../../../lib/store/files';
import { Prose } from '../parts/prose';
import { Section } from '../parts/section';
import { Meta, TextLink } from '../parts/text';
import { AssetTags } from './asset-tags';
import { Disclosure } from './disclosure';
import styles from './written-page.module.css';
import { WriteForm } from './write-form';

export async function WrittenPage({ book, now, record, section, editor, refused }: {
  book: string; now: Current; record: Latest; section?: string; editor: boolean; refused?: string;
}) {
  const doc = record.body as Asset;
  const text = (await readRange(book, doc.file.hash, doc.file.size))?.toString('utf8') ?? '';
  const format = doc.file.type === 'text/html' ? 'html' : 'markdown';
  const changed = record.at !== record.firstAt ? `, changed ${dayFull(record.at.slice(0, 10))}` : '';
  return (
    <>
      <div className={styles.reading}>
        {format === 'html' ? <Prose html={withoutTitle(readableHtml(text), doc.title)} /> : <Prose text={text} dropTitle />}
      </div>
      {doc.informs?.length ? (
        <Section title="It led to">
          {doc.informs.map((f) => <p key={f} className={styles.led}><TextLink href={href.feature(book, f)}>{titleOf(now, f)}</TextLink></p>)}
        </Section>
      ) : null}
      <AssetTags book={book} section={section} tags={doc.tags} />
      <Meta>Written {dayFull(record.firstAt.slice(0, 10))}{changed} by {attachedBy(record.by)}</Meta>
      {editor && (
        <Disclosure label="Edit this document" open={Boolean(refused)}>
          <WriteForm book={book} here={href.asset(book, record.id)} document={record.id} format={format} text={text} refused={refused} />
        </Disclosure>
      )}
    </>
  );
}
