// The shape of an icon on a feature, a section or a document (lib/book/icons.ts). Refusals are read by agents.
import { z } from 'zod';
import { ICON_TONES, ICON_WEIGHTS, isIconName } from '../book/icons';

export const icon = z
  .object({
    name: z.string().refine(isIconName, 'not a Phosphor icon; find one with book_find_icon (names like "book-open", "rocket-launch")'),
    tone: z.enum(ICON_TONES).optional(),
    weight: z.enum(ICON_WEIGHTS).optional(),
  })
  .strict();
