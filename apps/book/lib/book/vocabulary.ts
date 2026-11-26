// Every word that differs between a product book and a study book. Pages ask here and never test the kind for wording.
import { isStudy } from './study';
import type { WorkState } from './types';
import type { Current } from './views';

export type Words = {
  /** The eyebrow on the book's front page. */
  bookIs: string;
  /** The sidebar's heading over the book's features. */
  features: string;
  /** The heading over the features on the front page. */
  featuresTitle: string;
  /** The page of what is moving. */
  inMotion: string;
  /** How many pieces of work, counted. */
  pieces: (n: number) => string;
  /** How many pieces of work a feature holds. */
  works: (n: number) => string;
  /** The count beside a feature's title. */
  storyCount: (works: number, events: number) => string;
  /** The eyebrow on a feature's page. */
  featureIs: (parent?: string) => string;
  story: string;
  noWork: string;
  noneInProgress: string;
  lastTaught: string;
  nothingTaught: string;
  leftOff: string;
  nothingSince: string;
  /** How the diary names a step on the day it was added: a study step is planned then, whatever it has become. */
  addedOn: (state: WorkState) => string;
  /** What to do when the diary names nothing next. */
  noFirstStep: string;
  /** The first step after reading new answers, when the diary names none. */
  pickNext: string;
  nothingMoving: string;
  /** The line over the diary's year. */
  yearLine: (y: { commits: number; commitDays: number; began: string; recordedDays: number }) => string;
};

const count = (one: string, many: string) => (n: number) => `${n} ${n === 1 ? one : many}`;

const days = count('day', 'days');

const PRODUCT: Words = {
  bookIs: 'Project', features: 'The product', featuresTitle: 'Features', inMotion: 'Work in motion', pieces: count('piece', 'pieces'),
  works: count('piece of work', 'pieces of work'),
  storyCount: (works, events) => `${count('piece of work', 'pieces of work')(works)} · ${count('event', 'events')(events)}`,
  featureIs: (parent) => (parent ? `Feature of ${parent}` : 'Feature'),
  story: 'Its story', noWork: 'No work here yet.', noneInProgress: 'No story has a step in progress.',
  lastTaught: 'What the last story taught', nothingTaught: 'Nothing yet. A story teaches something once it is finished.',
  leftOff: 'Where the book left off', nothingSince: 'No commits and no answers.',
  addedOn: (state) => (state === 'next' ? 'Planned' : 'Began'),
  pickNext: 'pick the next work',
  noFirstStep: 'The diary names nothing next. Read the work in motion and write today’s plan in the diary.',
  nothingMoving: "Nothing is under way, and the diary names nothing as next. Write the next step in today's diary.",
  yearLine: (y) => `${y.commits} commits on ${y.commitDays} days · the book began ${y.began} and has recorded ${days(y.recordedDays)}`,
};
const STUDY_WORDS: Words = {
  bookIs: 'Study', features: 'The journey', featuresTitle: 'The journey', inMotion: 'Steps in motion', pieces: count('step', 'steps'),
  works: count('step', 'steps'),
  storyCount: (works) => count('step', 'steps')(works),
  featureIs: (parent) => (parent ? `Part of ${parent}` : 'Part of the journey'),
  story: 'Every step in this part', noWork: 'No steps here yet.', noneInProgress: 'Nothing is in progress yet.',
  lastTaught: 'What you learned last', nothingTaught: 'Nothing yet. What you learn appears here once a part is finished.',
  leftOff: 'Where you left off', nothingSince: 'Nothing new.',
  addedOn: () => 'Planned',
  pickNext: 'open the next step',
  noFirstStep: 'Open the next step of the journey.',
  nothingMoving: 'Nothing is under way. Open the next step of the journey.',
  yearLine: (y) => `You began on ${y.began} and have recorded ${days(y.recordedDays)}`,
};

export const wordsOf = (now: Current): Words => (isStudy(now) ? STUDY_WORDS : PRODUCT);
