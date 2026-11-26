// A decision as the book records it.
export type Option = { option: string; whyNot: string };
/** A decision, recorded so it can be understood long after: the question, what was true then, the options. */
export type Decision = {
  work: string;
  question: string;
  chosen: string;
  means: string; // what it means for its users
  shapes: string; // the part of the feature it shapes, e.g. "How it looks"
  context: string; // what was true when it was made
  turnedDown: Option[];
  why: string;
  words?: { text: string; saidAt: string }; // the editor's own words, when given
  madeAt: string; // ISO time it was made
  revisitIf?: string;
};
