// A step of a study book as its lesson page shows it. Pure: records in, what to show out.
import { linkTarget } from './links';
import { stepProgress, stepsInBook, tickedKeys } from './study';
import type { Pointer, PointerAct } from './study-types';
import type { Feature, FeatureView, Work } from './types';
import { type YoutubeVideo, youtubeVideo } from './video';
import type { Current, Entry } from './views';
import { replacedBy, titleOf } from './views';

const ACT_WORDS: Record<PointerAct, string> = { watch: 'Watch', read: 'Read', do: 'Do' };

const inMinutes = (n: number) => `${n} ${n === 1 ? 'minute' : 'minutes'}`;

/** One pointer's length: "8 minutes", "1 hr", "2 hr 15 min". */
export function minutesWords(total: number): string {
  if (total < 60) return inMinutes(total);
  const left = total % 60;
  return `${Math.floor(total / 60)} hr${left ? ` ${left} min` : ''}`;
}

/** A step's whole time: exact under an hour, then to the nearest half hour: "about 1.5 hours", "about 9 hours". */
export function totalWords(total: number): string {
  if (total < 60) return inMinutes(total);
  const hours = Math.round(total / 30) / 2;
  return `about ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/** The quiet line of totals: time, then how many to watch, read and do. Null when there is nothing to total. */
export function totalsLine(pointers: Pointer[]): string | null {
  if (!pointers.length) return null;
  const minutes = pointers.reduce((n, p) => n + (p.minutes ?? 0), 0);
  const acts = (['watch', 'read', 'do'] as const)
    .map((act) => [act, pointers.filter((p) => p.act === act).length] as const)
    .filter(([, n]) => n > 0)
    .map(([act, n]) => `${n} to ${act}`);
  return [...(minutes ? [totalWords(minutes)] : []), ...acts].join(' · ');
}

export type LessonPointer = Pointer & { label: string; done: boolean; to: string | null; domain: string | null; video: YoutubeVideo | null };
export type StepLink = { id: string; title: string };
export type Lesson = {
  eyebrow: string;
  totals: string | null;
  pointers: LessonPointer[];
  /** "2 of 3 done", or null with no pointers. */
  progress: string | null;
  haveItWhen: string | null;
  previous: StepLink | null;
  next: StepLink | null;
  /** The step that took this one's place; a replaced step cannot be marked. */
  replacedBy: StepLink | null;
};

/** The title of the group the step's column falls in, from the parent's grid view. */
function groupAt(now: Current, feature: Feature | undefined, index: number): string | null {
  const view = feature?.parent ? (now.get(feature.parent)?.body.view as FeatureView | undefined) : undefined;
  let end = 0;
  for (const group of view?.groups ?? []) {
    end += group.size;
    if (index < end) return group.title;
  }
  return null;
}

const linkOf = (step: Entry<Work> | undefined): StepLink | null => (step ? { id: step.id, title: step.body.title } : null);

export function lessonOf(now: Current, id: string, work: Work): Lesson {
  const steps = stepsInBook(now);
  const at = steps.findIndex((s) => s.id === id);
  const inLayer = steps.filter((s) => s.body.feature === work.feature);
  const index = inLayer.findIndex((s) => s.id === id);
  const group = index >= 0 ? groupAt(now, now.get(work.feature)?.body as Feature | undefined, index) : null;
  const newer = replacedBy(now).get(id);
  const place = index >= 0 ? `step ${index + 1} of ${inLayer.length}` : null;
  const list = work.pointers ?? [];
  const ticked = tickedKeys(now, id);
  const pointers = list.map((p) => {
    const target = p.link ? linkTarget(p.link) : null;
    const label = [ACT_WORDS[p.act], ...(p.minutes ? [minutesWords(p.minutes)] : [])].join(' · ');
    return { ...p, label, done: ticked.has(p.key), to: target?.to ?? null, domain: target && !target.inside ? target.domain : null, video: youtubeVideo(target?.to) };
  });
  return {
    eyebrow: [titleOf(now, work.feature), place, group].filter(Boolean).join(' · '),
    totals: totalsLine(list),
    pointers,
    progress: stepProgress(now, id, list),
    haveItWhen: work.haveItWhen ?? null,
    previous: at > 0 ? linkOf(steps[at - 1]) : null,
    next: at >= 0 ? linkOf(steps[at + 1]) : null,
    replacedBy: newer ? { id: newer, title: titleOf(now, newer) } : null,
  };
}
