// Writing the book through MCP. Every write appends; none of these tools can approve.
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { keyed, tickKeysOf } from '../book/study';
import type { Pointer } from '../book/study-types';
import { POINTER_ACTS, STUDY } from '../book/study-types';
import { ids, slugOf, slugify } from '../book/types';
import { stampedAtStart } from '../book/promise-gaps';
import { featureView } from '../rules/bodies';
import { promiseBreaks } from '../rules/bodies-promises';
import { Refused, create, start, writeFrom } from '../write';
import { add, revise } from './add';
import { changedFeature, changed } from './changes';
import { as, book, day, origin, run, starting, verdict } from './run';

const item = z.object({ text: z.string(), work: z.string().optional().describe('The work id this line belongs to') });
const pointers = z.array(z.object({
  key: z.string().optional().describe('Unique within the step and kept for good, so ticks survive; made from the title when left out'),
  act: z.enum(POINTER_ACTS), title: z.string(), by: z.string().optional(), minutes: z.number().optional(),
  why: z.string().optional().describe('One or two plain sentences'), link: z.string().optional(),
})).describe('A study step: what to watch, read or do, in order, at most 12. Sending this replaces the whole list.');
const haveItWhen = z.string().describe('A study step: how the editor knows they have it');
const serves = z.array(z.string()).describe('The promises this work answers for, by id, on any feature');

export function registerWriteTools(server: McpServer) {
  server.registerTool('book_start', {
    description: 'Start a book for a project.',
    inputSchema: { book, title: z.string(), forWriter: z.string().describe('What the product does for the people who use it'), kind: z.literal(STUDY).optional().describe('study: a book of study steps; leave out for a product') },
  }, ({ book: n, title, forWriter, kind }, x) => run(() => start(n, { id: 'project', kind: 'project', by: starting(x, n), replaces: null, body: { title, forWriter, ...(kind ? { kind } : {}) } })));

  server.registerTool('book_add_feature', {
    description: 'Add a feature, named as a noun for what it is (e.g. "Conflict", not "Publish conflict"). parent: the feature it belongs to.',
    inputSchema: { book, title: z.string(), forWriter: z.string().describe('One sentence: what it does for its users'), parent: z.string().optional() },
  }, ({ book: n, title, forWriter, parent }, x) =>
    run(() => create(n, { id: ids.feature(slugify(title)), kind: 'feature', by: as(x, n), replaces: null, body: { title, slug: slugify(title), forWriter, ...(parent ? { parent } : {}) } }, 'book_update_feature')));

  server.registerTool('book_update_feature', {
    description: 'Write a new version of a feature: its title (its id and address stay as they are), what it does for its users, where it stands (two sentences), its account (about: what it is, how its users meet it, what it is made of; markdown, written for its users), the feature it sits under (parent), or how its page shows the features under it (view). The old version is kept.',
    inputSchema: {
      book, feature: z.string(), title: z.string().optional().describe('A new name; the id and address do not change'), forWriter: z.string().optional(), standing: z.string().optional(), about: z.string().optional(),
      lanes: z.array(z.string()).optional().describe('The parts its decisions shape, in reading order'),
      parent: z.string().optional().describe('The feature it moves under, by id'),
      view: featureView.nullable().optional().describe('null takes the view away. grid: its children side by side, one row each and one column per piece of work, in order. noun names the rows ("stories"); target is how many it aims for; groups head runs of columns, e.g. [{"title":"Foundation","size":4}]'),
      approval: z.literal('per-item').nullable().optional().describe('per-item marks a list: each item carries its own papers and the feature holds none. null takes the mark away. Refused while the feature holds a editor paper.'),
      perItemReply: z.string().optional().describe('The editor reply that made it a list, by id'),
    },
  }, ({ book: n, feature, ...change }, x) =>
    run(() => revise(n, 'feature', feature, as(x, n), (old) => changedFeature(old, change))));

  server.registerTool('book_add_work', {
    description: "Add a piece of work to a feature's story, titled for what it gives its users. replaces: a piece of work this one replaces (it stays readable).",
    inputSchema: {
      book, feature: z.string(), title: z.string(), on: day.describe('The day it began'), state: z.enum(['done', 'now', 'next']),
      summary: z.string().describe('One or two sentences for the feature page'), origin, verdict: verdict.optional(), replaces: z.string().optional(),
      pointers: pointers.optional(), haveItWhen: haveItWhen.optional(), serves: serves.optional(),
    },
  }, ({ book: n, feature, title, on, state, summary, origin: from, verdict: v, replaces, pointers: list, haveItWhen: have, serves: promises }, x) =>
    run(() => {
      const by = as(x, n);
      const id = ids.work(slugOf(feature), slugify(title));
      return create(n, (now) => ({ id, kind: 'work', by, replaces: replaces ?? null, // a step added again must not inherit its old pointers' ticks
        body: stampedAtStart(now, undefined, { feature, title, slug: slugify(title), on, state, summary, origin: from, ...(v ? { verdict: v } : {}), ...(list ? { pointers: keyed(list, [], tickKeysOf(now, id)) } : {}), ...(have ? { haveItWhen: have } : {}), ...(promises ? { serves: promises } : {}) }) }), 'book_update_work');
    }));

  server.registerTool('book_update_work', {
    description: 'Write a new version of a piece of work: its title (its id and address stay as they are), state, summary and, once done, whether it served its users. The old version is kept.',
    inputSchema: {
      book, work: z.string(), title: z.string().optional().describe('A new name; the id and address do not change'),
      state: z.enum(['done', 'now', 'next']).optional(), summary: z.string().optional(), verdict: verdict.optional(),
      pointers: pointers.optional(), haveItWhen: haveItWhen.optional(), serves: serves.optional(),
    },
  }, ({ book: n, work, pointers: list, ...change }, x) => run(() => revise(n, 'work', work, as(x, n), (old, now) =>
    stampedAtStart(now, old, changed(old, { ...change, ...(list ? { pointers: keyed(list, old.pointers as Pointer[] | undefined, tickKeysOf(now, work)) } : {}) })))));

  server.registerTool('book_add_event', {
    description: "Record something that happened in a feature's story (a failure, a finding in use) that is not itself a piece of work. A bug names the promises it broke and on what (breaks), or says no promise covered it (noPromiseYet).",
    inputSchema: { book, feature: z.string(), title: z.string(), on: day, text: z.string(), breaks: promiseBreaks.optional(), noPromiseYet: z.literal(true).optional() },
  }, ({ book: n, feature, title, on, text, breaks, noPromiseYet }, x) =>
    run(() => {
      const id = ids.event(slugOf(feature), `${slugify(title)}-${randomUUID()}`); // every event is its own, even with a title seen before
      return add(n, 'event', id, as(x, n), { feature, title, on, text, ...(breaks ? { breaks } : {}), ...(noPromiseYet ? { noPromiseYet } : {}) });
    }));

  server.registerTool('book_write_paper', {
    description: "Write the Why (intent), What you'll get (spec) or How it gets built (plan) of one piece of work or one feature, for the editor, in plain words. Name work or feature, not both. A work's agents' version is written with book_translate_paper once the editor approves.",
    inputSchema: {
      book, work: z.string().optional().describe('The piece of work this paper belongs to'), feature: z.string().optional().describe('The feature this paper belongs to'),
      kind: z.enum(['intent', 'spec', 'plan']), for: z.enum(['editor']), text: z.string().describe('Markdown'),
    },
  }, ({ book: n, work, feature, kind, for: reader, text }, x) =>
    run(async () => {
      if (!work === !feature) throw new Refused(['A paper belongs to one piece of work or one feature: name exactly one.']);
      const id = work ? ids.paper(work, kind, reader) : ids.featurePaper(feature as string, kind, reader);
      return add(n, 'paper', id, as(x, n), { ...(work ? { work } : { feature }), kind, for: reader, text });
    }));

  const decisionFields = {
    question: z.string().describe('The question the decision answered, in plain words'),
    chosen: z.string().describe('What was chosen, in one line'),
    means: z.string().describe('What it means for its users, in a sentence or two'),
    shapes: z.string().describe('The part of the feature it shapes, as a short lane name, e.g. "How it looks". Reuse existing lane names.'),
    context: z.string().describe('What was true when it was made: enough for someone reading a year later'),
    turnedDown: z.array(z.object({ option: z.string(), whyNot: z.string() })).describe('Each option not chosen, and why it lost'),
    why: z.string().describe('Why this was chosen'),
    words: z.object({ text: z.string(), saidAt: z.string() }).optional().describe("The editor's own words behind it, and when (ISO time)"),
    madeAt: z.string().describe('When it was made (ISO time)'),
    revisitIf: z.string().optional().describe('When it would be right to change this decision'),
  };

  server.registerTool('book_decide', {
    description: 'Record a decision as it is made, so it can be understood a year later. replaces: the id of an earlier decision this one replaces (it stays on the map, linked).',
    inputSchema: { book, work: z.string(), ...decisionFields, replaces: z.string().optional() },
  }, ({ book: n, replaces, ...body }, x) => run(() => add(n, 'decision', `decision:${randomUUID()}`, as(x, n), body, replaces)));

  server.registerTool('book_update_decision', {
    description: 'Write a fuller version of the same decision (better wording, missing context). Not for changing the decision: for that, use book_decide with replaces.',
    inputSchema: { book, decision: z.string(), work: z.string(), ...decisionFields, replaces: z.string().optional().describe('Set only to record which earlier decision this one replaced, when that was missed') },
  }, ({ book: n, decision, replaces, ...body }, x) =>
    run(() => revise(n, 'decision', decision, as(x, n), () => body, replaces)));

  server.registerTool('book_note', {
    description: 'Record a finding or an open question on a piece of work. To close a question, record the finding that answers it with replaces: the question id.',
    inputSchema: { book, work: z.string(), kind: z.enum(['finding', 'question']), text: z.string(), replaces: z.string().optional() },
  }, ({ book: n, work, kind, text, replaces }, x) => run(() => add(n, kind, `${kind}:${randomUUID()}`, as(x, n), { work, text }, replaces)));

  server.registerTool('book_withdraw_note', {
    description: 'Take a finding or an open question off its piece of work, when it was recorded on the wrong work or no longer holds. '
      + 'The book keeps it and every version (book_read shows it with the reason); it leaves the work page, book_neighbourhood, book_explain, the inbox and what the last story taught. '
      + 'To move a note to the work it belongs on instead, record it there with book_note and replaces: its id.',
    inputSchema: { book, note: z.string().describe('The finding or question id, from book_neighbourhood'), reason: z.string().describe('Why, in one line') },
  }, ({ book: n, note, reason }, x) =>
    run(() => writeFrom(n, (now) => {
      const old = now.get(note);
      if (old?.kind !== 'finding' && old?.kind !== 'question') throw new Refused([`"${note}" is not a finding or an open question in this book.`]);
      // A new version of the same note, keeping what it replaced, so an answered question or a moved note stays closed.
      return { id: note, kind: old.kind, by: as(x, n), replaces: old.replaces, body: { ...old.body, withdrawn: { reason } } };
    })));

  server.registerTool('book_write_diary', {
    description: "Write the day's diary: a one-line headline, what was done, what is picked up next, and what waits on the editor. Link each line to its piece of work (work id) whenever it has one. Writing the same day again gives a new version of that day. Approvals, decisions, commits and new work are added to the day by the book itself; don't repeat them line by line.",
    inputSchema: {
      book,
      day: z.string().describe('YYYY-MM-DD'),
      headline: z.string().optional(),
      done: z.array(item),
      next: z.array(item),
      waiting: z.array(item),
    },
  }, ({ book: n, day: d, headline, done, next, waiting }, x) =>
    run(() => add(n, 'diary', `diary:${d}`, as(x, n), { day: d, ...(headline ? { headline } : {}), done, next, waiting })));

  server.registerTool('book_link', {
    description: 'Link work or an event to what it came from, depends on, leads to, or touches (work, a feature, a code path or a product area). proves-promise links a test to the promise it proves: say in failsWhen, in plain words, what would make it fail; another agent then accepts it with book_accept_link.',
    inputSchema: { book, from: z.string(), to: z.string(), kind: z.enum(['came-from', 'depends-on', 'leads-to', 'touches', 'proves-promise']), label: z.string().optional(), failsWhen: z.string().optional() },
  }, ({ book: n, from, to, kind, label, failsWhen }, x) =>
    run(() => add(n, 'link', `link:${randomUUID()}`, as(x, n), { from, to, kind, ...(label ? { label } : {}), ...(failsWhen ? { failsWhen } : {}) })));
}
