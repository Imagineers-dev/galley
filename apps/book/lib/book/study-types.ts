// The shapes a study book adds: what a step points to, and the editor's tick on each.
import { slugOf } from './types';

/** A book is a product book unless it says it is a study book. */
export const STUDY = 'study';
export type BookKind = typeof STUDY;

export const POINTER_ACTS = ['watch', 'read', 'do'] as const;
export type PointerAct = (typeof POINTER_ACTS)[number];
export const MAX_POINTERS = 12;

/** One thing to watch, read or do. `key` is unique within the step and stays put, so ticks survive a reordering. */
export type Pointer = { key: string; act: PointerAct; title: string; by?: string; minutes?: number; why?: string; link?: string };
/** A pointer as an agent sends it: the key may be left out. */
export type PointerInput = Omit<Pointer, 'key'> & { key?: string };
/** What a piece of work holds when it is a step of study. `startedBy`: the step whose "I have it" put this one under way. */
export type StudyStep = { pointers?: Pointer[]; haveItWhen?: string; startedBy?: string };

/** The editor's tick on one pointer. Unticking writes a new version with `done: false`. */
export type Tick = { work: string; pointer: string; done: boolean };
export const tickId = (work: string, pointer: string) => `tick:${slugOf(work)}/${pointer}`;
