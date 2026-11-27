# Adopting Galley in a project

A project adopts Galley in four steps. An agent can take all four for you; [the prompt](#the-prompt) below asks it
to. The steps are here so you know what it does, and so you can take them yourself.

1. **Galley runs.** In the Galley checkout: `pnpm install`, `pnpm galley:setup`, then `pnpm dev` (or
   `pnpm build && pnpm start`). It answers at http://127.0.0.1:3300.
2. **The repository is connected.** In the Galley checkout: `pnpm galley:adopt <path> --book <name> --agent <name>`.
   - `--book` is the book's name, lower case with hyphens, and becomes its address.
   - `--agent` names the agent, as in `claude` or `codex`, and defaults to `claude`. Each agent has its own key.
   It adds the repository to your settings and issues the keys. It installs a post-commit hook and writes a short
   Galley section into `AGENTS.md` and `CLAUDE.md`. Run it again whenever you like: it keeps what already works.
3. **The agent is connected.** Galley's tools are served over MCP at http://127.0.0.1:3300/api/mcp, with the
   agent's key as `Authorization: Bearer <key>`. The key is in `~/.config/galley/agents/<agent>.token`. For Claude
   Code, from the repository:

   ```bash
   claude mcp add --transport http galley http://127.0.0.1:3300/api/mcp --header "Authorization: Bearer $(cat ~/.config/galley/agents/claude.token)"
   ```

   The key stays in your local Claude Code settings, not in the repository. Restart the session so the tools load.
4. **The book is started.** The agent calls `book_guide`, then `book_start` if the book does not exist yet. It then
   adds the product's features with `book_add_feature`. From then on, every session begins with `book_guide` and
   `book_pickup`.

What stays in the repository is the Galley section of `AGENTS.md` and `CLAUDE.md`, a few lines between
`<!-- galley:start -->` and `<!-- galley:end -->`. Everything else lives in Galley and in `~/.config/galley`.

## The prompt

Paste this into a session of your agent, opened in the repository you want to adopt Galley.

```text
Set this repository up with Galley, the local book where our work is planned, followed and proven. If Galley is
already running, connect to it; if not, set it up. Ask me before you install anything, and stop to tell me if a
step fails.

1. Check whether Galley answers at http://127.0.0.1:3300.
   - If it answers, its checkout is named on the second line of ~/.config/galley/bin/galley. Use that checkout
     and go to step 3.
   - If it does not answer and that file exists, start Galley in its checkout with `pnpm dev`, running in the
     background, and go to step 3.
2. Otherwise, set Galley up. Clone https://github.com/Imagineers-dev/galley.git into ~/galley, unless I name another folder. In it, run
   `pnpm install` and `pnpm galley:setup`. If setup says ClickHouse is not answering, show me the commands it
   prints and run them once I agree, then run `pnpm galley:setup` again. Start Galley with `pnpm dev` in the
   background. Tell me Galley is at http://127.0.0.1:3300; there is no sign-in unless I turn it on.
3. In the Galley checkout, run `pnpm galley:adopt <this repository's full path> --book <name> --agent <you>`.
   For <name>, use a short lower-case name for this project, with hyphens. For <you>, use claude, codex or
   whichever agent you are.
4. Connect yourself to Galley's MCP endpoint with the command adopt printed. If your tools need a new session to
   load, say so and stop here; I will start one and ask you to continue from step 5.
5. Call book_guide and follow the method it returns. Call book_contents. If the book is not listed, start it
   with book_start: give the product's title and one sentence on what it does for the people who use it. Then
   read the repository and add its main features with book_add_feature, each named as a noun for what it is.
6. Call book_pickup and tell me what it says. Commit the AGENTS.md and CLAUDE.md changes in one commit that
   says this project now uses Galley.
```

## When Galley changes

Update Galley with `git pull && pnpm install && pnpm migrate` in its checkout, then restart it. Adopted
repositories need nothing:

- The method lives in the running server. `book_guide` returns it, and the MCP instructions tell every agent to
  call it first.
- Repositories hold only a pointer to the guide, never a copy of it, so a pointer never goes stale.
- When an agent names the version it last read (`book_guide` with `since`), it gets the changes after it.
- The pick-up, run through `galley pickup`, warns when the running server is older than its checkout. That is
  the case where you pulled but did not restart.
