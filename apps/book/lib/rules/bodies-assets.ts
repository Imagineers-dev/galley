// The shapes of an asset record (lib/book/asset-types.ts) and a section record (lib/book/sections.ts), and the rules
// for writing them. Refusals are read by agents.
import { z } from 'zod';
import { type Asset, MAX_FILE_BYTES, folderPath, sectionOf, tagOf } from '../book/asset-types';
import { documentsIn } from '../book/assets';
import { RESERVED_SECTIONS, SECTION_SLUG, type Section, sectionNamed } from '../book/sections';
import { ids } from '../book/types';
import type { Current } from '../book/views';

const text = z.string().trim().min(1);
const withdrawn = z.object({ reason: text.max(300).regex(/^[^\r\n]*$/, 'a reason is one line') }).strict();
const mediaType = z.string().regex(/^[a-z0-9.+-]+\/[a-z0-9.+-]+(;.*)?$/i, 'a media type, e.g. text/html or application/pdf');

export const assetBodies = {
  asset: z
    .object({
      title: text.max(200),
      slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/, 'a slug: lower-case letters, digits and hyphens'),
      about: text.max(2_000).optional(),
      feature: text.optional(),
      section: z.string().regex(SECTION_SLUG, 'a section slug: lower-case letters, digits and hyphens').optional(),
      // "" is the library itself, outside any folder.
      folder: z.string().max(300).refine((f) => folderPath(f) === f, 'a folder path: lower-case parts joined by "/", e.g. market/competitors').optional(),
      tags: z.array(text.max(40).refine((t) => tagOf(t) === t, 'a tag: lower-case words joined by hyphens')).max(20).optional(),
      informs: z.array(text).max(50).optional(),
      slides: z.literal(true).optional(),
      file: z
        .object({
          name: text.max(200),
          type: mediaType,
          size: z.number().int().min(1, 'a file holds at least one byte').max(MAX_FILE_BYTES, 'a file is at most 20 MB'),
          hash: z.string().regex(/^[0-9a-f]{64}$/, 'the SHA-256 of the bytes, in hex'),
        })
        .strict(),
      withdrawn: withdrawn.optional(),
    })
    .strict(),
  section: z
    .object({
      title: text.max(60),
      slug: z.string().regex(SECTION_SLUG, 'a section slug: lower-case letters, digits and hyphens, at most 40'),
      about: text.max(300).optional(),
      withdrawn: withdrawn.optional(),
    })
    .strict(),
} as const;

const isFeature = (now: Current, id: string) => now.get(id)?.kind === 'feature';

/** Where an asset sits, that its features exist, and that a withdrawn asset stays withdrawn. */
export function assetRefusals(now: Current, id: string, body: Asset): string[] {
  const out: string[] = [];
  if (id !== ids.asset(body.slug)) out.push(`An asset's id is asset:<its slug>, here "${ids.asset(body.slug)}".`);
  const section = sectionOf(body);
  if ((body.feature === undefined) === (section === undefined)) {
    out.push('An asset sits in one place: on a feature (feature) or in a section (section, with a folder).');
  }
  if (section !== undefined && !sectionNamed(now, section)) out.push(`"${section}" is not a section of this book. Define it with book_section first.`);
  if (body.feature !== undefined && !isFeature(now, body.feature)) out.push(`Feature "${body.feature}" is not a feature in this book.`);
  if (body.feature !== undefined && (body.tags || body.informs)) out.push('Tags and informs are for documents filed in a section.');
  for (const f of body.informs ?? []) if (!isFeature(now, f)) out.push(`Feature "${f}" is not a feature in this book.`);
  if (body.slides && body.file.type.split(';')[0].trim().toLowerCase() !== 'text/html') out.push('Slides are an HTML file (text/html).');
  if (now.get(id)?.body.withdrawn && !body.withdrawn) out.push('A withdrawn asset stays withdrawn; attach the file again under a new slug.');
  return out;
}

/** A section's id is its slug's; "product" is the book's own; one that still holds documents is not taken away. */
export function sectionRefusals(now: Current, id: string, body: Section): string[] {
  const out: string[] = [];
  if (id !== `section:${body.slug}`) out.push(`A section's id is section:<its slug>, here "section:${body.slug}".`);
  if (RESERVED_SECTIONS.has(body.slug)) out.push(`"${body.slug}" names the book's own features; choose another slug.`);
  const held = documentsIn(now, body.slug).length;
  if (body.withdrawn && held) out.push(`This section holds ${held} document${held === 1 ? '' : 's'}: move or withdraw them first.`);
  return out;
}
