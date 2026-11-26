# apps/book

Galley's website and MCP endpoint, one Next.js app served at http://127.0.0.1:3300. The repository's
[README](../../README.md) says how to start it; this page says what each part of a running install is.

- **ClickHouse.** The book's only store, reached over HTTP at `CLICKHOUSE_URL` (default http://127.0.0.1:8123).
  Credentials, when your server needs them, go in the URL: `http://user:password@127.0.0.1:8123`.
- **Tables.** `pnpm migrate` creates the database (`CLICKHOUSE_DATABASE`, default `book`) and its tables:
  `records` (the book), `keys` and `sessions`. Every migration is safe to apply again, and `pnpm migrate` applies
  them all on every run.
- **Secrets.** `.env.local`, never committed, holds `CLICKHOUSE_URL`, `CLICKHOUSE_DATABASE` and
  `BOOK_EDITOR_PASSCODE`, the passcode the editor signs in with. See `.env.example`.
- **Settings.** `~/.config/galley/config.json` (see `config.example.json`): the editor's time zone and the
  repositories whose tests the runner may run. Restart Galley after changing it.
- **Keys.** Repositories and agents call Galley with a key. Galley keeps only its hash, the books it may write,
  and whether it may start a book. `pnpm key list | issue | revoke`, and `pnpm key sign-out-everywhere` for the
  editor's sign-ins (see `scripts/key.ts`). A key is written once, to a file only you can read:
  `~/.config/galley/<repo>.token` for a repository and `~/.config/galley/agents/<name>.token` for an agent.
  Issuing a key again revokes the one it replaces. `pnpm galley:adopt` issues both for you.
- **MCP.** Agents connect to http://127.0.0.1:3300/api/mcp over streamable HTTP with `Authorization: Bearer <key>`.
  A key writes only its own books. The server's instructions and `book_guide` give every agent the current method.
- **Repository routes.** `/api/commits`, `/api/checkouts`, `/api/pickup` and the rest answer only on the loopback
  address, only to a repository's key. They are what `bin/pickup.mjs`, `bin/prove.mjs` and
  `bin/report-commit.mjs` call, through the `~/.config/galley/bin/galley` launcher.
- **Tests.** `pnpm test` reads fixed settings (`tests/fixtures/settings.json`), never yours. The store tests need
  ClickHouse and make a throwaway database for each run. `GALLEY_LIVE=<book>/<feature>/<work>` also runs the
  checks against your running Galley and its real books, read-only.
