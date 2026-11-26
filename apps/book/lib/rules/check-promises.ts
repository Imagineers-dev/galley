// The write rules for promises and what proves them. Agents propose; only the editor approves. Nothing here refuses
// a record that does not use these fields. The done gate lives in check-switched.ts.
import type { Ask, Reply } from '../book/inbox-types';
import { buildForReply, builtAbout } from '../book/promise-ask';
import { isPerItem } from '../book/governing';
import { mayVouch, writersOf } from '../book/promise-authors';
import type { AskAbout, BookPromise, LinkAccept, PromiseApproval, PromiseBreak, Witness } from '../book/promise-types';
import { YES_TO, subjectKey } from '../book/promise-types';
import type { Run, Test } from '../book/record-types';
import { isStudy } from '../book/study';
import type { Event, Feature, Link, Work } from '../book/types';
import { slugOf } from '../book/types';
import type { Current } from '../book/views';
import type { Proposed } from './check';
import { same } from './check-shape';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const once = (now: Current, r: Proposed) => [...(now.has(r.id) ? [`${r.id} is already in the book; it is written once.`] : []), ...(r.replaces ? [`A ${r.kind} replaces nothing.`] : [])];
const uuidId = (r: Proposed) => (new RegExp(`^${r.kind}:${UUID}$`, 'i').test(r.id) ? [] : [`A ${r.kind}'s id is ${r.kind}:<uuid>.`]);
const notA = (now: Current, id: string, kind: string, what: string) => (now.get(id)?.kind === kind ? [] : [`${what} "${id}" is not a ${kind} in this book.`]);

function ancestors(now: Current, featureId: string): Set<string> {
  const seen = new Set<string>();
  for (let at = (now.get(featureId)?.body as Feature | undefined)?.parent; at && !seen.has(at); at = (now.get(at)?.body as Feature | undefined)?.parent) seen.add(at);
  return seen;
}

function servesRefusals(now: Current, id: string, promise: BookPromise): string[] {
  if (!promise.serves) return [];
  const target = now.get(promise.serves);
  if (target?.kind !== 'promise') return [`"${promise.serves}" is not a promise in this book.`];
  if (!ancestors(now, promise.feature).has((target.body as BookPromise).feature)) return ['A promise serves only a promise on a feature above its own.'];
  const seen = new Set([id]);
  for (let at: string | undefined = promise.serves; at; at = (now.get(at)?.body as BookPromise | undefined)?.serves) {
    if (seen.has(at)) return ['A promise cannot end up serving itself.'];
    seen.add(at);
  }
  return [];
}

function promiseRules(now: Current, r: Proposed, p: BookPromise): string[] {
  const out = notA(now, p.feature, 'feature', 'Feature');
  const expected = new RegExp(`^promise:${slugOf(p.feature).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${UUID}$`, 'i');
  if (!expected.test(r.id)) out.push(`A promise's id is promise:${slugOf(p.feature)}/<uuid>.`);
  if (r.replaces) out.push('A promise keeps its id when reworded; it replaces nothing.');
  if (isStudy(now)) out.push('A study book holds no promises.');
  if (isPerItem(now, p.feature)) out.push(`"${p.feature}" is a list: its items carry their own promises.`);
  if (p.mustHoldIn === 'server' && !p.serverReason) out.push('A promise that holds on the server says why, in plain words (serverReason).');
  if (p.mustHoldIn === 'app' && p.serverReason) out.push('Only a promise that holds on the server carries a serverReason.');
  const old = now.get(r.id);
  if (old?.kind === 'promise') {
    const was = old.body as BookPromise;
    if (was.feature !== p.feature) out.push('A promise stays on its feature.');
    if (was.text === p.text && was.mustHoldIn === p.mustHoldIn && was.serverReason === p.serverReason && was.serves === p.serves) out.push('These are the same words: nothing to approve again.');
  }
  return [...out, ...servesRefusals(now, r.id, p)];
}

function approvalRules(now: Current, r: Proposed, a: PromiseApproval): string[] {
  const out = [...uuidId(r), ...once(now, r), ...notA(now, a.feature, 'feature', 'Feature')];
  if (r.by !== 'editor') out.push('Only the editor approves promises, signed in on the website.');
  if (a.verdict === 'changes' && !a.words) out.push('Asking for changes says what to change.');
  if (new Set(a.items.map((i) => i.promise)).size !== a.items.length) out.push('An approval names each promise once.');
  for (const item of a.items) {
    const p = now.get(item.promise);
    if (p?.kind !== 'promise' || (p.body as BookPromise).feature !== a.feature) { out.push(`"${item.promise}" is not a promise on this feature.`); continue; }
    const body = p.body as BookPromise;
    if (p.at !== item.at) out.push(`"${body.text}" changed after you opened it. Read the new words, then answer.`);
    if (item.snapshot.text !== body.text || item.snapshot.mustHoldIn !== body.mustHoldIn || item.snapshot.serverReason !== body.serverReason) out.push(`The words approved must be the words of "${item.promise}".`);
  }
  return out;
}

function witnessRules(now: Current, r: Proposed, w: Witness): string[] {
  const out = [...uuidId(r), ...once(now, r), ...notA(now, w.run, 'run', 'Run')];
  const test = now.get(String((now.get(w.run)?.body as Run | undefined)?.of));
  if (test?.kind !== 'test') return [...out, 'A witness vouches for a run of a test.'];
  if (!mayVouch(now, r.by, test.id)) out.push('You wrote a paper, test or run on this work or around its promise, so you cannot vouch for it. Another agent can, or the editor can try it themselves.');
  return out;
}

function acceptRules(now: Current, r: Proposed, a: LinkAccept): string[] {
  const out = [...uuidId(r), ...once(now, r)];
  const link = now.get(a.link);
  if (link?.kind !== 'link' || (link.body as Link).kind !== 'proves-promise') return [...out, `"${a.link}" is not a link from a test to a promise.`];
  const test = now.get((link.body as Link).from);
  if (test?.kind !== 'test') return [...out, 'That link does not start at a test.'];
  if (writersOf(test).includes(r.by)) out.push('The agent that wrote a test does not accept its link.');
  if (test.at !== a.testAt) out.push('This test changed after you read it. Read it again, then accept.');
  if (JSON.stringify((test.body as Test).command?.argv ?? []) !== JSON.stringify(a.argv)) out.push("The command accepted must be the test's command.");
  return out;
}

function linkRules(now: Current, r: Proposed, l: Link): string[] {
  if (l.kind !== 'proves-promise') return [];
  return [...once(now, r), ...notA(now, l.from, 'test', 'Test'), ...notA(now, l.to, 'promise', 'Promise')];
}

const inFuture = (t?: string) => !!t && Date.parse(t) > Date.now();

function runRules(now: Current, r: Proposed, run: Run): string[] {
  if (inFuture(run.committedAt)) return ['A run cannot name a commit dated in the future.'];
  if (r.by !== 'repo') return [];
  const test = now.get(run.of);
  const command = test?.kind === 'test' ? (test.body as Test).command : undefined;
  if (!command) return ['The runner records runs only of a test with a command.'];
  const out: string[] = [];
  if (!run.sha || !run.committedAt) out.push('A runner\'s run names its commit and when it was made.');
  if (run.surface !== command.surface || subjectKey(run.subject) !== subjectKey(command.subject) || !run.subject) out.push("A runner's run is on the surface and subject its test's command names.");
  return out;
}

const namesPromise = (e: Event) => !!e.breaks || !!e.noPromiseYet;

function eventRules(now: Current, r: Proposed, e: Event): string[] {
  const out = e.breaks && e.noPromiseYet ? ['A bug names the promises it broke, or says no promise covered it; not both.'] : [];
  const held = now.get(r.id);
  if (held?.kind === 'event' && (namesPromise(held.body as Event) || namesPromise(e))) out.push(`"${r.id}" records a bug against a promise, so it is never rewritten. Give this event another title.`);
  return [...out, ...(e.breaks ?? []).flatMap((b: PromiseBreak) => notA(now, b.promise, 'promise', 'Promise'))];
}

function aboutRules(now: Current, r: Proposed, ask: Ask): string[] {
  const held = now.get(r.id)?.body as Ask | undefined;
  if (held && JSON.stringify(held.about ?? null) !== JSON.stringify(ask.about ?? null)) return ['What an ask is about never changes: ask again.'];
  const a: AskAbout | undefined = ask.about;
  if (!a || held) return [];
  const built = same(a, builtAbout(now, a)) ? [] : ['The book fills in the proof on an ask: name only the act, test, promise, event or run.'];
  return [...built, ...aboutShape(now, ask, a)];
}

function aboutShape(now: Current, ask: Ask, a: AskAbout): string[] {
  const yes = (act: 'retract' | 'accept-gap') => (ask.options?.some((o) => o.option === YES_TO[act]) ? [] : [`This ask must offer the option "${YES_TO[act]}".`]);
  if (a.act === 'pass') {
    if (!a.test || !a.promise) return ['A "did it pass" ask names its test and its promise.'];
    const out = [...notA(now, a.test, 'test', 'Test'), ...notA(now, a.promise, 'promise', 'Promise')];
    if (ask.needs !== 'try') out.push('A "did it pass" ask asks them to try it (needs: try).');
    if (![...now.values()].some((r) => r.kind === 'link' && (r.body as Link).kind === 'proves-promise' && (r.body as Link).from === a.test && (r.body as Link).to === a.promise)) out.push('That test is not linked to that promise.');
    if (a.event && !(now.get(a.event)?.body as Event | undefined)?.breaks?.some((b) => b.promise === a.promise)) out.push('That event does not break that promise.');
    return out;
  }
  if (a.act === 'retract') {
    if (!a.event === !a.run) return ['A retraction names one event or one failed run.'];
    const failed = a.run && (now.get(a.run)?.kind !== 'run' || (now.get(a.run)?.body as Run).result !== 'fail') ? [`"${a.run}" is not a failed run in this book.`] : [];
    return [...(a.event ? notA(now, a.event, 'event', 'Event') : failed), ...yes('retract')];
  }
  const out = [...(a.promise ? notA(now, a.promise, 'promise', 'Promise') : ['An accepted gap names the promise.']), ...yes('accept-gap')];
  if (a.promise && a.version !== now.get(a.promise)?.at) out.push('An accepted gap names the current version of the promise.');
  return out;
}

const workRules = (now: Current, w: Work) => (w.serves ?? []).flatMap((p) => notA(now, p, 'promise', 'Promise'));

export function promiseRefusals(now: Current, record: Proposed, body: Record<string, unknown>): string[] {
  const as = <T>() => body as unknown as T;
  switch (record.kind) {
    case 'promise': return promiseRules(now, record, as<BookPromise>());
    case 'promise-approval': return approvalRules(now, record, as<PromiseApproval>());
    case 'witness': return witnessRules(now, record, as<Witness>());
    case 'link-accept': return acceptRules(now, record, as<LinkAccept>());
    case 'link': return linkRules(now, record, as<Link>());
    case 'run': return runRules(now, record, as<Run>());
    case 'event': return eventRules(now, record, as<Event>());
    case 'ask': return aboutRules(now, record, as<Ask>());
    case 'reply': return as<Reply>().build && !same(as<Reply>().build, buildForReply(now, as<Reply>().to).build) ? ['A reply carries only the installed build the book last read.'] : [];
    case 'work': return workRules(now, as<Work>());
    default: return [];
  }
}
