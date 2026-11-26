// The shape of what a study book adds: a step's pointers and the editor's ticks.
import { z } from 'zod';
import { linkTarget } from '../book/links';
import { MAX_POINTERS, POINTER_ACTS } from '../book/study-types';

const text = z.string().trim().min(1);
const key = z.string().min(1, 'give this pointer a key: its title has no Latin letters to make one from').max(60).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, 'a key is lower-case words joined by hyphens');

const pointer = z.object({
  key,
  act: z.enum(POINTER_ACTS),
  title: text.max(200),
  by: text.max(120).optional(),
  minutes: z.number().int().min(1).max(1_000).optional(),
  why: text.max(600).optional(),
  link: text.refine((l) => linkTarget(l) !== null, 'a link is a path in the book (/…) or an http(s) address').optional(),
}).strict();

export const pointers = z.array(pointer).max(MAX_POINTERS, `a step holds at most ${MAX_POINTERS} pointers`);
export const haveItWhen = text.max(600);
export const startedBy = text;

export const studyBodies = {
  tick: z.object({ work: text, pointer: key, done: z.boolean() }).strict(),
} as const;
