// What a editor's reply to an ask would settle. The book fills in the proof from its own records, so an agent can name
// only which test, promise, bug or run the ask is about, and they see that on the message. Pure.
import { commitsReaching, installedBuild, installedReading, sameSha, when } from './promise-code';
import type { Ask } from './inbox-types';
import type { AskAbout, BookPromise, InstalledBuild, Subject } from './promise-types';
import type { Run, Test } from './record-types';
import type { Event } from './types';
import type { Current } from './views';

export type AboutInput = Pick<AskAbout, 'act' | 'test' | 'promise' | 'event' | 'run'>;

const named = ({ act, test, promise, event, run }: AboutInput): AskAbout =>
  ({ act, ...(test ? { test } : {}), ...(promise ? { promise } : {}), ...(event ? { event } : {}), ...(run ? { run } : {}) });

function subjectOf(now: Current, input: AboutInput, test: Test): Subject {
  const broke = input.event ? (now.get(input.event)?.body as Event | undefined)?.breaks?.find((b) => b.promise === input.promise) : undefined;
  return broke?.subject ?? test.command?.subject ?? 'synthetic';
}

/** The whole `about` for this ask, as the book stands now. */
export function builtAbout(now: Current, input: AboutInput): AskAbout {
  const about = named(input);
  const promise = input.promise ? now.get(input.promise) : undefined;
  if (promise?.kind !== 'promise') return about;
  if (input.act === 'accept-gap') return { ...about, version: promise.at };
  const test = input.test ? now.get(input.test) : undefined;
  if (input.act !== 'pass' || test?.kind !== 'test') return about;
  const body = test.body as Test;
  const surface = body.command?.surface ?? 'app';
  // A try counts only for the build they ran. With no clean reading on this code, it names none and stays Claimed.
  const live = surface === 'app' ? installedBuild(now) : undefined;
  const build = live && commitsReaching(now, (promise.body as BookPromise).feature).find((c) => sameSha(c.body.sha, live.sha));
  return {
    ...about, version: promise.at, surface, subject: subjectOf(now, input, body),
    ...(build ? { sha: build.body.sha, committedAt: build.body.committedAt } : {}),
  };
}

/** What the book stamps on their reply to a try: the build the app last reported. Neither an agent nor the form supplies it. */
export function buildForReply(now: Current, askId: string): { build?: InstalledBuild } {
  const ask = now.get(askId);
  if (ask?.kind !== 'ask' || (ask.body as Ask).about?.act !== 'pass') return {};
  const build = installedBuild(now);
  return build ? { build } : {};
}

const titled = (now: Current, id?: string) => String((id ? now.get(id)?.body : undefined)?.title ?? id ?? '');
const words = (now: Current, id?: string) => String((id ? now.get(id)?.body : undefined)?.text ?? id ?? '');
const onWhat = (s?: Subject) => (s && s !== 'synthetic' ? `the real story ${s.real}` : 'test data');

const OUTCOMES = 'If it works, this shows as Claimed. If it is wrong, the promise goes Broken.';
const short = (sha: string) => sha.slice(0, 9);

/** Which build their try is for, or the true reason it can only show as Claimed. */
function buildLine(now: Current, about: AskAbout, askedAt: string): string {
  if (about.surface === 'server') return `A try on the server has no installed build to check. ${OUTCOMES}`;
  const r = installedReading(now);
  if (!r?.commit) return `The book cannot tell which build you are running. ${OUTCOMES}`;
  if (r.uncommittedFiles === null || r.uncommittedFiles === undefined) return `The installed build does not say whether it has uncommitted files. ${OUTCOMES}`;
  if (r.uncommittedFiles > 0) return `The installed build has ${r.uncommittedFiles} uncommitted ${r.uncommittedFiles === 1 ? 'file' : 'files'}. ${OUTCOMES}`;
  if (!about.sha) return `The installed build, commit ${short(r.commit)}, was not a known commit on this work when you were asked. ${OUTCOMES}`;
  if (!sameSha(r.commit, about.sha)) return `The installed build is now commit ${short(r.commit)}, not commit ${short(about.sha)} as when you were asked. ${OUTCOMES}`;
  if (when(r.readAt) < when(askedAt)) return `The installed build, commit ${short(about.sha)}, was not re-read since this ask. ${OUTCOMES}`;
  return `Build: the installed build, commit ${short(about.sha)}`;
}

/** The line above an ask, written by the book and not by the agent, saying what their answer will settle. */
export function aboutNote(now: Current, about: AskAbout | undefined, askedAt: string): string {
  if (!about) return '';
  if (about.act === 'pass') {
    return `**Your answer counts as a result for a promise.**\n\n- Promise: “${words(now, about.promise)}”\n- Test: “${titled(now, about.test)}”\n- Tried on ${onWhat(about.subject)}, in the ${about.surface === 'server' ? 'server' : 'app'}\n- ${buildLine(now, about, askedAt)}\n\n`;
  }
  if (about.act === 'accept-gap') return `**Your yes accepts that this promise is not proven:** “${words(now, about.promise)}”\n\n`;
  if (about.event) return `**Your yes takes back this bug:** “${titled(now, about.event)}”\n\n`;
  const run = about.run ? (now.get(about.run)?.body as Run | undefined) : undefined;
  return `**Your yes takes back a failed run of:** “${titled(now, run?.of)}”\n\n`;
}
