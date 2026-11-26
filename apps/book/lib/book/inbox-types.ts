// The shapes of the inbox's records: an ask, a reply to it, and where a message sits for a person (a mark).
import type { AskAbout, InstalledBuild } from './promise-types';

/** Who a message is for. Today the book has one person, the editor; an organisation's people join later as "person:<id>". */
export type Person = string;
/** What a message needs from the person it is addressed to. Approvals and what went wrong come from the book itself. */
export type Needs = 'decision' | 'approval' | 'try' | 'fyi' | 'wrong';
/** An agent asking a person something, written like a good email: a subject that says what to do, the why, the options. */
export type Ask = {
  work: string;
  to: Person;
  needs: Exclude<Needs, 'approval' | 'wrong'>;
  subject: string;
  text: string; // markdown
  options?: { option: string; detail?: string }[];
  recommend?: number; // index into options
  links?: { label: string; href: string }[];
  about?: AskAbout; // what the editor's reply settles, when it settles something about a promise
};
/** A person's answer to an ask or an open question: the option chosen, their words, or for "try it" whether it worked. */
export type Reply = { to: string; choice?: string; words?: string; tried?: 'works' | 'wrong'; build?: InstalledBuild };
/** Where a message sits for a person, like mail: read, archived, snoozed until a day, or back in the inbox. One mark id per person and message. */
export type Mark = { message: string; person: Person; state: 'read' | 'archived' | 'snoozed' | 'inbox'; until?: string };
export const markId = (person: Person, message: string) => `mark:${person}:${message}`;
