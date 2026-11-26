// Lessons that stick: each lesson with the times it was broken. Broken twice is flagged.
import type { Lesson, Slip } from './oversight-types';
import { type Current, type Entry, entries } from './views';

export type LessonView = { lesson: Entry<Lesson>; slips: Entry<Slip>[]; flagged: boolean };

export function lessons(now: Current): LessonView[] {
  const slips = entries<Slip>(now, 'slip');
  return entries<Lesson>(now, 'lesson')
    .map((lesson) => {
      const own = slips.filter((s) => s.body.lesson === lesson.id);
      return { lesson, slips: own, flagged: own.length >= 2 };
    })
    .sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.slips.length - a.slips.length || b.lesson.firstAt.localeCompare(a.lesson.firstAt));
}

/** Lessons for the given areas, for an agent about to work there. */
export const lessonsFor = (now: Current, areas: string[]) =>
  lessons(now).filter((l) => areas.length === 0 || l.lesson.body.areas.some((a) => areas.includes(a)));
