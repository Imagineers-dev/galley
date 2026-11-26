# Galley

**Galley by Imagineers.** Your coding agents write the book of your product. You read it.

Agents now write code faster than anyone can read it line by line. Galley moves the reading up a level. As your
agents work, they record why each piece of work began, what it will give, how it gets built, what they decided,
which tests prove which promises, what shipped and how to undo it. You read that as a book: features and their
stories, a diary of each day, and an inbox of what waits on you. You approve at the gates and answer questions. You
never manage a ticket.

Galley runs on your machine. The website and the MCP endpoint your agents call are one Next.js app, and the book
is kept in ClickHouse. Nothing leaves the machine, and nothing in the book is ever updated or deleted: every change
is a new record, so the history is always there to read.

## What you need

- Node 22.18 or later, and pnpm 10 (`corepack enable` gives you the version this repository pins).
- ClickHouse, run locally. `pnpm galley:setup` tells you how to start it if it is not running.
- An agent that speaks MCP over HTTP: Claude Code, Codex, or any other.

## Start Galley

```bash
git clone https://github.com/Imagineers-dev/galley.git
cd galley
pnpm install
pnpm galley:setup
pnpm dev
```

`pnpm galley:setup` writes `apps/book/.env.local` with a passcode it shows you once. It also writes your settings in
`~/.config/galley/config.json`, checks ClickHouse and applies the migrations. Open http://127.0.0.1:3300 and sign
in with the passcode to answer and approve; reading needs no sign-in, since Galley listens only on 127.0.0.1. You can run `pnpm galley:setup` again at any time: it creates only what is missing.

To keep Galley running without a dev server, run `pnpm build && pnpm start`.

## Connect a repository

```bash
pnpm galley:adopt ../my-app --book my-app
```

This adds the repository to your settings and gives it and its agent each a key. It installs a post-commit hook
that reports commits, and puts a short Galley section in the repository's `AGENTS.md` and `CLAUDE.md`. It then
prints the one command that connects your agent to the MCP endpoint.

Or let the agent do all of it: paste [the prompt in ADOPTING.md](ADOPTING.md#the-prompt) into a session in your
repository. It sets Galley up if it is not running, or connects to the one that is.

## Keeping up to date

```bash
git pull && pnpm install && pnpm migrate
```

Then restart Galley. Your repositories need no change. They carry only a pointer, and the method agents follow
comes from the running server: every session starts with `book_guide`, which returns the current method and what
changed since the version an agent last read. When a repository's pick-up finds the running server older than its
checkout, it says so. Migrations are safe to apply more than once.

## The settings

`~/.config/galley/config.json` holds two things the book cannot change, because no agent should be able to:

```json
{
  "timeZone": "Europe/London",
  "repositories": {
    "my-app": { "package": "my-app", "installedApp": { "part": "Desktop app", "where": "plist:/Applications/My App.app" } }
  }
}
```

- `timeZone` decides when "today" turns over for the diary, snoozes and deadlines. It defaults to this machine's.
- `repositories` are the ones whose tests Galley's runner may run. `package` is the `name` in the repository's
  `package.json`, so the runner knows it is in the tree it says it is. `installedApp` (macOS) names the installed
  build whose version an editor's try counts for.

`GALLEY_HOME` moves the whole folder; `GALLEY_CONFIG` names another settings file.

## Working on Galley

[AGENTS.md](AGENTS.md) is the guide for anyone changing Galley itself, person or agent. [STYLE_GUIDE.md](STYLE_GUIDE.md)
covers how it looks. `pnpm typecheck` and `pnpm test` must pass; the store tests need ClickHouse running.

## License

Apache License 2.0. See [LICENSE](LICENSE).
