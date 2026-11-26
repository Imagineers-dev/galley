# Style guide: Feather

The book should feel light as air and be sharp to read:
- open white space and one-pixel hairlines;
- crisp near-black ink;
- thin, soft titles;
- pale tints that appear only when something has a state.

This page is the contract, and the book itself (http://127.0.0.1:3300) is the picture.

## Roles

Every role is a token in `apps/book/app/styles/tokens.css`, defined once as a day/night pair with `light-dark()`. Use the role names as CSS custom properties. Never put a raw colour in a component, and never borrow a role for its colour when its meaning doesn't fit. `tests/style.test.ts` refuses a raw colour outside the tokens.

| Role | Day | Night | Use |
|---|---|---|---|
| `--page` | `#F9FAFC` | `#0C0D11` | Behind everything |
| `--surface` | `#FFFFFF` | `#121419` | Sheets, cards |
| `--sunk` | `#F2F4F8` | `#181B21` | Quiet wells, hover |
| `--line` / `--line-strong` | `#E7EAF0` / `#D2D7E0` | `#232731` / `#2F3440` | One-pixel hairlines; control borders |
| `--ink` | `#0B0D12` | `#F6F7FA` | Reading text, titles, links |
| `--ink-2` | `#363B47` | `#C5CAD4` | Summaries |
| `--ink-3` | `#555C6A` | `#959CAA` | Dates, counts, labels only |
| `--waiting`, `-soft`, `-line`, `-solid` | `#2442C4`, `#EEF2FF`, `#C7D2FE`, `#3A57DD` | `#A9BBFF`, `#1B2340`, `#2F3C6E`, `#3A57DD` | Only what waits on the editor: the one cobalt |
| `--underway` | `--ink-3` | `--ink-3` | Under way: grey |
| `--done`, `-soft`, `-line` | `#0B6B43`, `#E8F7EF`, `#A9DEC2` | `#7FD8A9`, `#12291F`, `#24533C` | Approved, finished, served you |
| `--event`, `-soft`, `-solid` | `#A3203A`, `#FFEEF1`, `#B82E47` | `#FF9AAE`, `#2E161C`, `#B82E47` | Something that went wrong and changed the story |
| `--words`, `-soft`, `-line` | `#4E2DB8`, `#F3EFFF`, `#CFC3FA` | `#C4B5FF`, `#1F1A36`, `#3F3470` | The editor's own words, and nothing else |
| `--selected` | `#ECEFF4` | `#20242C` | Where you are, the option you picked: neutral |
| `--link`, `--link-line` | `--ink`, `--line-strong` | same | Links are ink with a hairline underline |
| `--focus` | `#0B0D12` | `#F6F7FA` | The keyboard focus ring |
| `--notice` | `#EEF0F4` | `#1D2028` | A quiet band across the page (reading an earlier day) |
| `--canvas`, `--canvas-ink`, `-2`, `-3` | `#12162B`, `#EEF1FA`, `#B4BBD3`, `#949DBA` | `#07080B`, same inks | The sidebar's dark canvas and its text |
| `--canvas-on`, `--canvas-on-ink`, `--canvas-focus` | white at 13%, `#FFFFFF`, `#EEF1FA` | same | Where you are in the sidebar, its text, and focus on the canvas |

Every text colour is at least 5.5:1 on the planes it sits on, by day and by night, and white on a solid badge too (checked 19 November 2026). Re-check any new pair before using it.

## Type

Three faces with two jobs: Literata to read, Fraunces (weight 350, `SOFT` 100) for titles, Inter for the interface. Two families of size: **Reading** (papers, the diary's days, titles) is the serif: Fraunces for titles, Literata for text, never under 20px in a paper. **The interface** (navigation, labels, controls, lists, metadata) is Inter on one scale, defined as tokens in `apps/book/app/styles/tokens.css`:

| Token | Size | For |
|---|---|---|
| `--ui-label` | 11px, 500, capitals, +0.12em (the `Label` part) | every small capital label, on the page and in the sidebar; counts in badges (600) |
| `--ui-meta` | 12px | metadata beside a row (book, date, chip) |
| `--ui-small` | 13px | breadcrumbs, secondary controls |
| `--ui-body` | 14px, 20px rows | every navigation item, list row and button |
| `--ui-title` | 15px, 600 | the brand, the book's name |
| `--ui-code` | 13px, monospace | commands, shas, code |

Rules:
- One size per role, everywhere: a sidebar item is 14px whether it is a feature, a page or a part of a feature.
- **Weight, not size, says what is primary:** 500 for the main items and what you can act on, 400 for the rest.
- Nothing in the interface uses the serif or a size off this scale.

**Reading**, set from the tokens `--read-*` and `--title-*`:

| Use | Face, weight | Size / line height |
|---|---|---|
| Page title | Fraunces soft, −1.5% tracking | 44 / 1.1 |
| A title that is a sentence (a decision, a day's headline) | Fraunces soft | 36 / 1.15 |
| Section and paper heading | Fraunces soft | 30 / 1.2 |
| A card's name in the title face | Fraunces soft | 26 or 21 / 1.2 |
| A paper's name beside its work | Fraunces soft | 19 |
| A big number | Fraunces soft, tabular | 40 / 1.1 |
| Lede | Literata 400, `--ink-2` | 21 / 1.6 |
| Reading | Literata 400, `--ink` | 20 / 1.7, at most 64ch |
| Reading at night | Literata 370, +0.01em tracking | 20 / 1.75 |
| Step or card title | Literata 500 | 19 / 1.35 |
| The editor's words | Literata italic, `--words` | 18 / 1.6 |
| A summary under a title, a list entry | Literata 400, `--ink-2` | 17 / 1.5 |
| Interface | Inter 400 / 500, `tabular-nums` for counts | 14–15 |
| Label | Inter 500, caps, +12% tracking, `--ink-3` | 11 |

Every title is Fraunces at the title weight, 350 by day and 330 by night, with `SOFT` 100. The face is defined once (`app/ui/parts/type.module.css`). A title composes it directly and sets only its size with `font-size` and `line-height`: the `font` shorthand would reset the soft axis, and a style composed through a second class is dropped by the bundler (the style test refuses both).

Rendering settings, always on:
- `font-optical-sizing: auto`;
- `text-rendering: optimizeLegibility`;
- `font-kerning: normal`;
- `text-wrap: pretty` on paragraphs and `balance` on titles;
- paragraph gap 0.9em, with no indents.

Night mode thins reading text slightly and adds a little air, because light text on dark looks heavier and glows.

## The shell

Every page of a book sits in one shell, built from small parts in `apps/book/app/ui/shell/`, each with its own CSS module:

- **The canvas** (`--canvas`) fills the window and never scrolls (`AppShell`). The sidebar sits directly on it in light ink, so the white page is the brightest thing on the screen.
- **One sidebar per book** (`Sidebar`, `NavItem`, `BookSwitcher`, `Count`). Every page of a book, its inbox included, sits in the book's one layout; another book is reached through the book switcher.
- **The panel** is the page: a rounded (18px) raised plane with `--panel-shadow`, inset 10px from the window. It scrolls inside itself, so the sidebar and the breadcrumb bar (`Breadcrumbs`, sticky at its top) stay put.
- **Where you are** is a lighter pill, with no state colour; hover is a faint light wash. Counts keep their state colours.
- **Day or night** (`ThemeToggle`) is one icon button beside the brand, drawn by the server: the page's colour scheme shows the moon or the sun, so nothing flickers.
- On a phone the window scrolls again: the sidebar on top, the panel below.

## Widths

Every page lays out by four window widths and one split, built once as the page parts in `apps/book/app/ui/parts/sheet.tsx`. A media query may use only these widths; `tests/widths.test.ts` refuses any other.

| Width | Window | What the frame does |
|---|---|---|
| **compact** | under 760 | One column. Lists and the thing you open take turns, with a way back. |
| **medium** | 760–1199 | The sidebar folds into a bar on top; two columns at most. |
| **wide** | 1200–1599 | Sidebar, list and content; the sidebar and lists narrow. |
| **vast** | 1600 and over | Everything open at its full width. |

**The page never limits the width.** A `Sheet` always spans the main column, and its padding grows with the window. Width is limited by content, never by the page:
- **Text** keeps its reading measure (`Lede`, `Prose`, `Quote`: 64ch).
- **Collections** use `Flow`: cards in columns of at least 380px, as many as fit, stretched so no empty column is left at the edge.
- **A page head** (`PageHead`) puts the title and lede on the left and one card of what to do at the right edge, aligned with the flow below.
- **Reading with context** uses the split.

**The split** is how a page puts what you read beside what you act with:
- its main column holds the reading, at most 760px wide;
- its side holds the answer, the controls and their context, 300–380px wide.

They sit side by side when the split itself is at least 1040px wide; the split measures its own width, not the window's. When it is narrower, the side follows the main at the same reading width.

Rules:
- Nothing is wider than the window. Every column can shrink, and the side shrinks before the reading does.
- Controls never spread across a column: buttons sit together, aligned to the start.
- Reading text keeps its 64ch measure at every width.
- A new page picks the frame, the flow, the page head and the split; it does not invent a breakpoint or a max-width for itself.

## The parts

Every page is built from the parts in `apps/book/app/ui/parts/`, each with its own CSS module. A page picks them and adds only what is its own, in a module beside it:

- **The page:** `Sheet`, `PageHead` (eyebrow, title, lede, and one card at the right), `Eyebrow`, `Lede`, `Flow`, `Split`, and `ReaderOnly` for words only a screen reader needs.
- **Sections and labels:** `Section` (a small capital label, or variant `title` with a lede) and `Label` (tones plain, waiting, event, words, canvas; gaps none, small, section).
- **Reading:** `Prose` (Markdown through `lib/book/markdown.ts`, which keeps agents' links honest; numbered for a editor paper) and `Quote` (the editor's words).
- **State:** `StatusPill` (with a `small` size for tags), `StatusDot` and `StateLine`, given a state; `statusOf` maps the book's states to the one colour each means.
- **Things to act on:** `Button`, `ButtonLink` and `Buttons` (kinds plain, main, quiet, small; `buttonLook` for a link another part draws), `Card` (tones plain, waiting, done, event; `flat` without its shadow, `flush` for a card of linked bands), `CardTitle`, `Cards`.
- **Small text:** `Meta`, `Row`, `TextLink`, `Empty`, and `Item` for an entry in a list.
- **Standalone pages:** `Notice`, `Field` and `Problem` (sign in, not found, an error).
- **Dates and words** come from `lib/book/format.ts`, in the book's time zone.

## Rules

- **Space before structure.** Separate things with air first, then a one-pixel hairline. Never use heavy borders or fills.
- **Titles are thin and soft; reading text is sturdy near-black.** Lightness never costs legibility.
- **Colour means state, and only state.** Waiting on you is cobalt, the one colour that says "your move". Under way is a quiet grey. Done is green, and went wrong is red. Each is a pale tint with dark text. No amber or yellow anywhere.
- **A selection is neutral** (`--selected`): a light pill for where you are or the option you picked. Links are ink, underlined. Neither is ever a state colour.
- **The editor's words are always set in the `--words` quote:** italic Literata, with who said it and when. Agents' text never uses it.
- **Reading text is never wider than 64ch and never smaller than 20px.**
- **One main button per screen:** a near-black pill (`--ink` fill, `--surface` text). Other buttons are hairline pills.
- **Radii**, only from the tokens (the style test refuses any other): marks and bars 3, rows 8, controls 12, cards 16, the panel 18, pills fully round, dots a circle.
- **Shadow:** the single soft shadow (`--shadow`), on cards only; a card that is a step in a row is `flat`.
- **Night follows the Mac's setting** (`color-scheme: light dark`) until the reader flips the sun/moon button beside the brand; the choice is kept (`data-theme` on `<html>`, which sets `color-scheme`).
- **Every page has quiet loading, empty and error states, in the same tones.**
- **No scrollbar is drawn.** Every area still scrolls by wheel, trackpad, touch and keyboard, but no bar cuts into the layout (`app/styles/base.css`); the bars Windows draws looked heavy and out of place.
- **The architecture is tested** (`tests/style.test.ts`): files under 200 lines; colours, sizes and corners from the tokens; no override stacks (a selector has one rule of its own, and each property is set once for it); inline styles only for custom properties; every module class used or composed, and composed from another file only directly; client components only where they must be.
