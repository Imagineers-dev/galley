// The inbox's write rules: an ask reads like good mail, a reply answers something real, a mark files a real message.
import type { Ask, Mark, Reply } from '../book/inbox-types';
import { markId } from '../book/inbox-types';
import type { Current } from '../book/views';

/** Kinds a person can receive as a message. */
export const MESSAGE_KINDS = new Set(['ask', 'question', 'paper', 'event', 'slip', 'pulse', 'release', 'beyond', 'promise']);

export function askRefusals(ask: Ask): string[] {
  const out: string[] = [];
  const n = ask.options?.length ?? 0;
  if (ask.recommend !== undefined && ask.recommend >= n) out.push(`recommend is an index into options (0 to ${n - 1}).`);
  if (ask.needs === 'decision' && n === 1) out.push('A decision offers two options or more, or none for an open question.');
  if (ask.needs !== 'decision' && n > 0) out.push('Only a decision carries options.');
  return out;
}

export function replyRefusals(now: Current, body: Record<string, unknown>): string[] {
  const reply = body as Reply;
  const target = now.get(reply.to);
  if (!target || (target.kind !== 'ask' && target.kind !== 'question')) return [`"${reply.to}" is not an ask or an open question in this book.`];
  if (!reply.choice && !reply.words && !reply.tried) return ['A reply chooses an option, says whether it worked, or says something.'];
  const options = (target.body.options as Ask['options']) ?? [];
  if (reply.choice && !options.some((o) => o.option === reply.choice)) return [`"${reply.choice}" is not one of the options.`];
  return [];
}

export function markRefusals(now: Current, id: string, body: Record<string, unknown>): string[] {
  const mark = body as Mark;
  const out: string[] = [];
  // A message about waiting promises is named for the version it shows (<promise>@<time>), so new words arrive as new mail.
  const target = now.get(mark.message.startsWith('promise:') ? mark.message.split('@')[0] : mark.message);
  if (!target || !MESSAGE_KINDS.has(target.kind)) out.push(`"${mark.message}" is not a message in this book.`);
  if (id !== markId(mark.person, mark.message)) out.push(`A mark's id is ${markId(mark.person, mark.message)}.`);
  if (mark.state === 'snoozed' && !mark.until) out.push('Snoozing needs the day it comes back (until).');
  return out;
}
