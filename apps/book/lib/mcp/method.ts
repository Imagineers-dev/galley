// How an agent works with Galley, served by the running server (book_guide and the MCP instructions), so every
// repository that adopts Galley follows the method of the version it runs without copying it. A change to the
// method is a change here, with a line in CHANGES naming the version it arrived in.

/** What the server tells every agent when it connects, before any tool is called. */
export const INSTRUCTIONS = [
  'Galley is the book where this project\'s work is planned, followed and proven. The editor (the person the book belongs to) reads it instead of managing tickets.',
  'At the start of every session, call book_guide once and follow the method it returns: it is the current method for this Galley, and it replaces anything older written in the repository.',
  'Then call book_pickup with the book\'s name before any other work.',
].join(' ');

/** What changed in the method, newest first: an agent that last read an older version reads these first. */
export const CHANGES: ReadonlyArray<{ version: string; change: string }> = [
  { version: '0.5.0', change: 'Written documents: write research, notes and studies with book_write, as HTML or Markdown; they read as pages of the book, with no why, what or how. book_attach is for slides and files.' },
  { version: '0.4.0', change: 'Icons: give a chapter or feature, a section or a document a Phosphor icon, in a weight and a tone, with book_icon; find one with book_find_icon.' },
  { version: '0.3.0', change: 'Sections: beside the product, a book has Research and any section the team asks for (book_section, book_sections); documents are filed into a section with book_attach section, and read with book_browse, which replaces book_research.' },
  { version: '0.2.0', change: 'Slides and research: attach decks and documents to a feature, and file research in folders with tags (book_attach, galley attach); read the research behind a feature before changing it (book_research).' },
  { version: '0.1.0', change: 'The first published method.' },
];

export const METHOD = `# How we work in Galley

Galley is a book of the work on one product. Agents are its authors. The editor, the person the book belongs to,
reads it, answers in the inbox and signs off at the gates. Everything you do on this project is written here as you
do it, so the editor can follow it without asking and the next agent can pick it up cold.

## Every session

1. Call \`book_pickup\` (or run the repository's pick-up script, which also reports the checkout). Read what it
   prints: where the book left off beside what is true now, where they disagree, and the first step.
2. Settle each disagreement it names, or say why not, before starting new work.
3. Read \`book_answers\` for what the editor said since the diary.
4. At the end of the day, write \`book_write_diary\`: what was done, what is next and what waits on the editor.

## Before you touch code

- Find the work in \`book_contents\`. Reuse a piece of work that covers the request; otherwise add one with
  \`book_add_work\` under the feature it serves (\`book_add_feature\` when none fits), titled for what it gives the
  people who use the product.
- Read it with \`book_brief\` (everything it is built from) and \`book_neighbourhood\` (how it began, decisions,
  findings, open questions). Read \`book_lessons\` for the areas you will touch, and \`book_explain\` for a part you
  do not know. Read what led to the feature (\`book_browse\`, \`book_read_asset\`): its research and any other section.
- Check \`book_may\` before an action whose band you do not know: alone, reviewed, or editor.

## How much of the method a change needs

- **Small:** a repair whose correct behaviour is not in question, with no new contract, table, tool or screen. It
  needs the work, the change with its test, and proof.
- **Substantive:** anything that changes what people see or can do, adds a contract, table, migration or agent
  tool, or takes more than one slice. It needs every stage below. When unsure, it is substantive.

## The stages

| Stage | What you write | Where | The gate |
|---|---|---|---|
| Why | The problem, the outcome wanted, who it touches, open questions | \`book_write_paper\` kind intent | The editor approves it |
| What you'll get | Behaviour, acceptance criteria, the promises it keeps, the picture for screen work | \`book_write_paper\` kind spec | The editor approves it |
| How it gets built | Files, order, tests, slices | \`book_write_paper\` kind plan | The editor approves it |
| Build | The diff and its tests | Commits that name the work | Tests pass |
| Review | Findings and how each was settled | \`book_review\`, by an agent that did not write it | Every question answered |
| Release | What went live, from which commit, how to undo it | \`book_release\` | Only on paths the editor allowed |

A feature's three papers govern every piece of work under it; each piece writes the agents' version against them
with \`book_translate_paper\`, citing the editor's lines it serves. Work that does something its feature's papers
neither ask for nor allow says so with \`book_beyond\` and needs its own What you'll get approved.

## Promises and proof

- A feature holds promises: plain sentences that must always stay true for its users. When you open a feature with
  none, propose them with \`book_propose_promise\`. Only the editor approves a promise.
- Add tests with \`book_add_test\` and link each to the promise it proves with \`book_link\` (\`proves-promise\`, with
  what would make it fail). An agent that did not write the test accepts the link with \`book_accept_link\`.
- A promise is Proven only by the runner on a clean copy (\`prove.mjs\`, through the repository's prove script), the
  editor's own try, or another agent's \`book_witness\`. Your own word shows as Claimed.
- Work cannot be marked done without proof (\`book_prove\`) or while a promise it serves is not Proven.

## As it happens

- \`book_decide\` for a decision, with the alternatives and why they lost. To change one, decide again with
  \`replaces\`.
- \`book_note\` for a finding or an open question; close a question by recording the finding with \`replaces\`.
- \`book_add_event\` for something that went wrong in use; \`book_lesson\` when the editor corrects you.
- \`book_ask\` to ask the editor: a subject that says what to do, the why, and for a decision the options and the
  one you recommend. Never wait silently on something only the editor can settle.

## Slides, research and sections

- When the team will discuss a feature, attach the deck to it: an HTML file with \`book_attach\` (\`slides: true\`)
  and the feature's id. It shows on the feature's page and under its chapter, with a Present button.
- Write research where the product came from (interviews, studies, comparisons) as documents with \`book_write\`,
  in HTML or Markdown: they read as pages of the book, with no why, what or how. File each with a \`folder\` such as \`market/competitors\` (a new folder is made by naming it), \`tags\`, and
  \`informs\`: the features it led to.
- Beside the product and Research, the book has the sections the team asks for (meeting notes, design, pitch
  decks). Define one with \`book_section\` only when asked, list them with \`book_sections\`, and file into one with
  \`book_attach\` \`section\`. Read any section with \`book_browse\`.
- Give a chapter, a feature, a section or a document an icon when the team asks, or when one makes the sidebar
  easier to scan: find a Phosphor icon with \`book_find_icon\` and set it, with its weight and tone, with
  \`book_icon\`. Tones name things; they never stand for a state.
- Any other file (a PDF, an image, a video, up to 20 MB) goes through \`galley attach <file>\` in the repository,
  so its bytes never pass through your context. A new version keeps the same asset: name it with \`asset\`.

## Commits

Name the work in the last paragraph of every commit message: \`Work: <feature>/<work>\`, or
\`Work: <book>:<feature>/<work>\` for another book. The repository's post-commit hook sends it to the book, and the
work's story lists it.

## Writing

Everything in the book is read by a person first. Write plain English: a title says the whole thing in a few
words, what happens and to whom; people and things are the subjects and what they do is the verb; short
sentences and everyday words; no ids or code names where a plain word works.

## Keeping up

This method comes from the running Galley. When \`book_guide\` reports changes since the version you last read,
read them before you start. When the pick-up says the running server is older than its checkout, ask the editor
to restart Galley.
`;
