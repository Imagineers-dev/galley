// The editor's answer to a paper, from the paper's page or the inbox: one path, so both record the same thing.
// The answer names the version read; if the paper changed since it was opened, nothing is written and the caller
// shows the new words.
import { randomUUID } from 'node:crypto';
import { isReworded } from '../book/promise-evidence';
import type { BookPromise, PromiseApproval } from '../book/promise-types';
import type { Approval } from '../book/types';
import { Refused, writeFrom } from '../write';

export class PaperChanged extends Refused {
  constructor() {
    super(['This paper changed after you opened it. Read the new words, then answer.']);
  }
}

export type PaperAnswer = { paper: string; verdict: Approval['verdict']; words?: string; paperAt: string };

export function answerPaper(book: string, answer: PaperAnswer) {
  return writeFrom(book, (now) => {
    if (now.get(answer.paper)?.at !== answer.paperAt) throw new PaperChanged();
    const body: Approval = { paper: answer.paper, verdict: answer.verdict, paperAt: answer.paperAt, ...(answer.words ? { words: answer.words } : {}) };
    return { id: `approval:${randomUUID()}`, kind: 'approval', by: 'editor', replaces: null, body };
  });
}

export class PromisesChanged extends Refused {
  constructor() {
    super(['A promise changed after you opened it. Read the new words, then answer.']);
  }
}

/** `all` is Approve all: it never covers a rewording, which is read and answered on its own. */
export type PromisesAnswer = { feature: string; items: { promise: string; at: string }[]; verdict: PromiseApproval['verdict']; words?: string; all?: boolean };

export function answerPromises(book: string, answer: PromisesAnswer) {
  return writeFrom(book, (now) => {
    const items = answer.items.map(({ promise, at }) => {
      const record = now.get(promise);
      if (record?.kind !== 'promise' || record.at !== at) throw new PromisesChanged();
      if (answer.all && isReworded(now, promise)) throw new Refused(['Approve all does not cover a reworded promise: read its old and new words and answer it on its own.']);
      const { text, mustHoldIn, serverReason } = record.body as BookPromise;
      return { promise, at, snapshot: { text, mustHoldIn, ...(serverReason ? { serverReason } : {}) } };
    });
    const body: PromiseApproval = { feature: answer.feature, items, verdict: answer.verdict, ...(answer.words ? { words: answer.words } : {}) };
    return { id: `promise-approval:${randomUUID()}`, kind: 'promise-approval', by: 'editor', replaces: null, body };
  });
}
