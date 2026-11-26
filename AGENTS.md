# Working on Galley

This is the guide for changing Galley itself, for people and agents alike. Galley is the book: the editor follows the work agents do on their products by reading it, not by managing tickets. The app is `apps/book` (Next.js, ClickHouse, MCP). Its look and type are in [STYLE_GUIDE.md](STYLE_GUIDE.md); read it before changing anything on screen.

The layers, top to bottom, each depending only on the ones below it:

1. **Pages** (`app/`) compose one job each.
2. **Components** (`app/ui/`) are shared and small. Every page is built from the parts in `app/ui/parts/` and the shell in `app/ui/shell/` (STYLE_GUIDE.md, "The parts"); a component adds only what is its own, in a CSS module beside it. Colours and sizes come only from `app/styles/tokens.css`, and `tests/style.test.ts` holds every file to the rules, with no exceptions.
3. **The server** (`lib/server/`) reads a book once per request and serves what pages need: its attention, its counts, the day.
4. **Book views** (`lib/book/`) are pure functions: records in, what to show out, no I/O. What waits on a person is worked out in one place, `lib/book/attention.ts`.
5. **The store** (`lib/store/`) is the only code that talks to ClickHouse, and every read names one book.
6. **Rules** (`lib/rules/`) decide what may be written; writes go through `lib/write.ts`, one queue per book.

Every address lives under one book (`/<book>/…`) and is built in one place, `lib/routes.ts`. Each book has one layout (`app/[book]/layout.tsx`) that reads the book once and draws its sidebar.

Who may do what is decided in one place each:
- **The editor** signs in with a passcode (`lib/server/session.ts`): a random session kept as a hash, revocable, with attempts limited.
- **Repositories and agents** bring a key (`lib/server/keys.ts`) that names the books it may write. Repository routes pass `lib/server/local-route.ts`; agent writes name their writer with `as(x, book)`.
- **A redirect** goes through `safeBack`, and **a link an agent wrote** through `linkTarget` (`lib/book/links.ts`).
- **A day** is a day in the editor's time zone, from Galley's settings (`lib/book/days.ts`, `bin/galley-config.mjs`).
- **The method agents follow** is served by the running server (`lib/mcp/method.ts`, through `book_guide`). A change to it bumps the version in `apps/book/package.json` and adds a line to `CHANGES`.
- **An error** reaches a caller as a refusal or an error id (`lib/server/errors.ts`), never its internals.

## How we work

Galley exists to delight the person reading the book. They tell us the taste of the work: what they like and don't, what helps them and what doesn't. Everything else is ours: how and why we reach that quality and that scale. This binds every contributor, agent and model equally, whoever picks the work up.

- **We promise the best code we can write:** correct, secure, fast, and clean. We have built products at the largest scale and we know what works; we act like it.
- **We don't rush to a solution.** Before building, we think from first principles: what the data is and where it lives, which layer each piece belongs in (store, domain, server, client, middleware), and how the interface flows from one job to the next. We never patch a symptom; we fix the design that produced it. If a request can't be built cleanly without a refactor, we stop and say so before writing code.
- **We work as a team.** Anything beyond a small fix gets other agents' views first: a design review, a second opinion, a reviewer who did not write it. We weigh them, settle on one design, write it down (in the issue or pull request), and only then build.
- **We challenge every decision before making it:** what could break, which bugs this could introduce, what it costs at scale and for security, who it is for, and whether it is the simplest thing that is right.
- **The code stays well built:**
  - modular and layered, with each concern in one place;
  - small, reusable components;
  - no file over 200 lines;
  - nothing defined twice, logic or style;
  - no override stacks;
  - no leftovers from what was removed.
- **Done means shown, not claimed:** tests pass, the real screen is checked with real data, and an independent reviewer has approved it.
- **We write for people.** Everything we write is read by a person first: titles, papers, findings, bug reports, commits, messages, and the words on screen. We write plain English, in the way of Joseph Williams' *Style* and William Zinsser's *On Writing Well*:
  - a title says the whole thing in a few plain words: what happens, and to whom. "Closing a chat no longer loses a task's answer", not "Partner task lifecycle hardening";
  - the people and things are the subjects, and what they do is the verb: "the Worker refuses the call", not "refusal handling occurs";
  - a sentence starts with what the reader already knows and ends with what is new;
  - short sentences and everyday words; no jargon, code names or ids where a plain word works;
  - every word does work; cut the rest.
