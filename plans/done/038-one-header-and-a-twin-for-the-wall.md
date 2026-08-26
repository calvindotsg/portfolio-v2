# Plan 038: Publish the chip, put one header on every page but the home page, and give the wall a markdown twin

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update the status row for this
> plan in `plans/README.md` — **except in this repository, where you must NOT.** That file's status
> table is the reviewer's alone; it says so in its own words, and it is gated in full, so an edit
> from you can redden a branch you cannot then make green. Report your status in the pull request
> body instead and leave the index untouched.
>
> **Drift check (run first)**:
> `git diff --stat f767cf2..HEAD -- src tests uno.config.ts CLAUDE.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts
> against the live code before proceeding; on a mismatch, treat it as a STOP condition.
>
> **Do not push, open a pull request, or merge unless the operator has instructed it.** Finish
> every step up to that point.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED — step 2 is the risky one: it extracts the wall's chip into a shortcut AND makes it
  taller, and it carries a line-by-line diff accounting rather than a neutrality claim
- **Depends on**: 036 and 037, both **DONE**. This plan assumes `src/content/design.ts`,
  `src/lib/design-doc.ts`, `src/pages/design.astro` and `src/pages/design.md.ts` all exist. If any
  is absent, STOP.
- **Category**: dx
- **Planned at**: commit `f767cf2`, 2026-08-26
- **Decided by the maintainer on 2026-08-26**, against measured alternatives. The decisions and what
  was rejected are in "The header, decided" below. Do not re-open them; do not substitute the plated
  control for the chip.
- **Related**: `plans/039-*.md` rebalances the home page's controls on top of this plan's chip. 039
  depends on this one and must not be executed first.

## Why this matters

Three things, and they land together because the first cannot be done well without the other two.

**The wall has no theme toggle.** `/patches`, `/patches/cycling` and `/patches/running` carry a way
back and nothing else. A reader who arrives on the wall from a search result cannot change the theme
without navigating to a different page first. That is a functional gap, and it is the reason to do
this at all.

**The site ships four kinds of pressable thing and publishes three.** `control`, `control-cta` and
`text-link` are shortcuts in `uno.config.ts`, named in `CONTROLS` in `src/content/design.ts`, drawn
on `/design`, carried into `DESIGN.md` and into the document a design agent is handed. The fourth —
the wall's filter chip — is spelled only as a descendant selector, `.patch-filter a`, is in none of
those places, and is invisible to `tests/control-geometry.test.ts`, which discovers controls by the
plate's signature in the shipped sheet. The build-wide "every link says it is one" gate already has
to name it as a special case, which is the tell: the gate knows about a kind the design system does
not. Anything drawn as a chip outside the wall today would be a fourth undocumented copy.

**And the wall has no markdown rendering.** Plan 037 established the convention — a page's markdown
twin lives at its own URL plus `.md`, announced with `rel="alternate"` and listed in `llms.txt` — and
applied it to one page. The wall is the site's most citable page. An agent asked "what races has
Calvin done" gets either a grid of absolutely-positioned bibs or the one-line-per-race summary in
`llms.txt`, which deliberately publishes only the rider's own figures and drops the results-sheet
account entirely. The twin is the document that can carry both, because it is the wall's own
rendering rather than a summary of the site.

## Current state

### The two conventions, measured

Computed on the built site at `f767cf2` through `pnpm preview`, at 1000x800, light theme. **These
are measurements, not derivations** — re-run them if you doubt one.

| | plate — `control` | chip — `.patch-filter a` | stub line — `.bib-stub-link` |
|---|---|---|---|
| Box | 64 x 48 | auto x 29.59 | auto x 24 |
| Corner | 8px | 2px (the bib's own) | — |
| Border | 1px `--accent` | 1px `--text` at 32% | none |
| Shadow | `2px 2px 0 var(--shadow)` | none | none |
| Type | 20px glyph, no words | 12px / 700 / +1.2px, caps | 10px / 800 / +1.4px, caps |
| Count on `/` | **9** | 0 | 0 |
| Count on `/patches` | **0** | 3 | one per destination |
| In `CONTROLS` | yes | **no** | no |

**The chip's 29.59px is a measurement of today, not a target.** The maintainer chose on 2026-08-26 to
floor every chip at **44px** so the whole control vocabulary clears SC 2.5.5 (enhanced target size),
which the plated controls already do and the chip never has. **That makes the wall's filter row taller
— 29.59px to 44px — and this plan owns that change**: it is a visible edit to three pages nobody asked
to redesign, and it is the price of publishing the chip as a real, gated kind rather than leaving it
as an undocumented descendant selector. Two things were measured before choosing: at 30px the greeting
line's rhythm on the home page stays even and the wall is untouched, but a whole class of control drops
from AAA to AA; at 44px every control clears AAA and rows that mix a labelled chip with a glyph chip
stay level. The second was chosen.

Two facts from that table decide this plan:

1. **The wall ships zero plated controls.** Putting three on it would introduce the plate to a page
   that has none, one rung above a filter row drawn deliberately in the bib's own two treatments
   "so the row and the wall cannot look like two unrelated components".
2. **The plate is the site's mark for a primary action, and `uno.config.ts` says so.** It was
   withheld from small text links because wearing it there "would either dilute the mark or claim a
   size these are not", and the goal card earned it because it is *the card's one action*. Going
   home, switching theme and fetching a markdown file are not primary actions.

### The header, decided

The maintainer chose, on 2026-08-26, after reviewing five specimens drawn in the site's own tokens:

```
[← HOME]  ..................................  [M↓ MARKDOWN]  [☀]
```

- **Every item in the header is a chip.** Not the plate. The chrome recedes so the bib stays the
  loudest thing on its own page, and the plate goes on meaning what the config says it means.
- **A chip carries a visible label**, so `MARKDOWN` is drawn rather than hidden — which is what the
  plated answer could not buy.
- **There is no copy-to-clipboard control.** The maintainer's words: *"skip copy button, as I can
  simply open the page as markdown and select all and copy myself."* This deletes the site's only
  clipboard code and one of its inline scripts.
- **"Copy as a prompt for Claude Code / Codex" is cut.** It would be a control aimed at another
  control's document, copying either a URL the markdown chip's `href` already is, or a sentence with
  no source of truth.
- **No dropdown or split button.** The documentation-platform pattern (Stripe, Mintlify, GitBook)
  needs an accessible menu-button contract — `aria-haspopup`, roving focus, Escape, focus return —
  which would be the largest piece of client code on a domain that ships zero external JavaScript
  files, and every "Open in ..." entry hard-codes a third-party origin into the page.
- **No skip link.** WCAG 2.4.1's own Understanding document says "small repeated sections such as
  individual words, phrases or single links are not considered blocks for the purposes of this
  provision". This header is three items. ARIA landmarks are a sufficient technique for 2.4.1 in
  their own right, and step 7 delivers exactly that.
- **No breadcrumb.** The site is two levels deep and the wall's filter row already does the sideways
  move between `/patches` and the two sport pages.

### What is on the four pages today

`src/pages/design.astro` — chrome in two rows inside the first child of `<main>`:

```astro
<!-- src/pages/design.astro:102-113 -->
<div class="design-head">
    <p class="m-0">
        <a href="/" class="text-link inline-flex items-center gap-2 min-h-6 text-sm">
            <span class={iconClass(PATCHES.home_icon)} aria-hidden="true"></span>{PATCHES.home_label}
        </a>
    </p>
    <ThemeSwitcher/>
</div>
```

and, under the lede, a `.design-takeaway` block (`:131-151`) holding a `text-link` to `/design.md`
and a `.md-copy control` button, wired by a `<script is:inline>` at `:287-314`, with four
`.md-copy*` rules in its `<style>`. **All of that is deleted in step 1.** It is entirely
self-contained: `grep -rn "md-copy\|data-copy" tests/` returns nothing, and `ri:file-copy-line` and
`ri:check-line` are named nowhere but `MARKDOWN_TWIN`.

`src/pages/patches/[...sport].astro` — chrome is one link (`:143-149`), no `ThemeSwitcher`, and no
`markdown` prop passed to the layout. Its `<style>` holds the chip:

```css
/* src/pages/patches/[...sport].astro */
.patch-filter a {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.3rem 0.7rem;
    border: 1px solid color-mix(in srgb, var(--text) 32%, transparent);
    border-radius: 2px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--text);
    transition: color 0.3s ease-in-out, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out;
}
```

plus **four state rules whose ORDER is load-bearing and measured**, each with a long comment saying
why:

1. `@media (hover: hover) { .patch-filter a:hover }` — guarded because a touch browser holds `:hover`
   after a tap, which would fake the very distinction the row exists to draw.
2. `.patch-filter a[data-leaving]` — **above** the current-page rule, because accent ink on the
   inverted fill measures 2.77:1 light and 1.37:1 dark, and holding that for a whole navigation
   (376–788ms measured) is not the ~100ms a press lasts.
3. `.patch-filter a[aria-current="page"]` — the inversion.
4. `.patch-filter a:active` — **below** the current-page rule, so the chip you are already on also
   answers a press; then `.patch-filter a[aria-current="page"]:active` restores its label, because
   snapping the accent takes it the whole way and in dark it effectively erases the word.

**Step 2 moves the base rule into a shortcut and leaves all four state rules exactly where they
are.** Read those comments before you touch that block.

`src/layouts/BasicLayout.astro` — `<body class="bg-[var(--background)] md:min-h-screen flex flex-col
justify-center items-center">` whose entire content is `<slot/>` (`:291-295`). It already takes a
`markdown` prop and emits `{markdown && <link href={markdown} rel="alternate" type="text/markdown"/>}`
at `:183`.

`src/components/ThemeSwitcher.astro` — `<button id="theme-toggle" type="button" aria-pressed="false"
class="theme-toggle control">` with two icon spans and an `sr-only` name, plus a global `<style>`
that swaps the glyphs off `:root[data-theme]`, plus a module `<script>`. Astro inlines that script;
`find dist -name '*.js'` returns nothing.

### Measurements taken for this plan

`<header>` as a sibling of `<main>`, probed on `/patches` at 1000x600 with a 64px placeholder
inserted before `<main>`:

```
headerTop 0   headerLeft 52   headerWidth 896
mainTop  64   mainLeft  52    mainWidth  896     scrollTop 0
```

Nothing clipped, both boxes on the same 896px column. `<body>` centres its column, and with the
content overflowing there is no free space for `justify-content` to distribute. **This probed a
placeholder, not the real component** — re-measure in step 12.

Other figures, on the built site: `/design`'s `.design-head` 48px and `.design-takeaway` 48px, its
first `<main>` child 252px, `<main>` with 5 children; `/patches`' first `<main>` child 171px with
`.patch-wall` starting at 244px and `<main>` with 2 children.

**Suite baseline at `f767cf2`: `pnpm test` → 628 passed, 7 skipped, 635 total; 20 files passed, 1
skipped.** Re-measure in your own worktree before you touch anything. **Do not write an absolute
suite total into any file** — plans here have collided over exactly that.

### Repo conventions this plan must honour

Each has bitten this repository at least once. Read them before typing code.

1. **A configurable value lives in a GitHub repository secret, a repository variable, or the
   repository's own content — `src/content/` and `src/data/`.** A route decides wire format and holds
   no values; `src/pages/llms.txt.ts` is the exemplar. Plan 035 shipped a mailbox and a URL in
   `src/pages/` and every gate stayed green, because this rule is prose.
2. **`src/content/` is split by KIND, not by page.** That is why the markdown-twin copy moves out of
   `src/content/design.ts` in step 1.
3. **Never restate a value the build already knows** — no hex, no rem, no class name, no count in any
   authored string a reader can see.
4. **A `.astro` comment is scanned by UnoCSS.** A utility class name — or a CSS property name such as
   `padding-block` — written in a comment emits a real rule nothing wears, and the orphan gate fails
   the build. Reword rather than naming a class in a comment.
5. **A hover style must need a pointer.** `hover:` utilities are wrapped by the
   `hover-needs-a-pointer` preset, which **must stay above `presetWind3`**; a hand-written `:hover`
   carries the guard itself and must be split from any `:focus-visible` sharing its selector list.
6. **A press must be drawn and must outlive the finger.** Anything painting ink on `:active` also
   needs `transition-none`, and a press on a same-tab link needs a `[data-leaving]` twin touching at
   least one of the same properties. `data-leaving` is an **attribute, never a class**.
7. **Exactly one rule may declare a control's box**, and `tests/control-geometry.test.ts` reads the
   whole shipped sheet to enforce it.
8. **Every length is font-relative.** No px in any box this plan adds.
9. **A new suite must say what it is for above its own first `describe(`** — a docblock of at least
   300 characters, or `tests/docs-drift.test.ts` fails.
10. **Do not edit `plans/README.md`.**

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, 0 errors 0 warnings 0 hints |
| Lint | `pnpm eslint` | exit 0 |
| Full gate | `pnpm test` | exit 0, all pass; it builds first |
| Iterate | `SKIP_BUILD=1 pnpm test <filter>` | reuses `dist/` — never for the run you trust |
| Build only | `pnpm build` | exit 0 |
| Local preview | `pnpm preview` | serves `dist/` on http://localhost:4321 |
| Regenerate the design docs | `pnpm test:update` | rewrites `DESIGN.md` and `.design-sync/conventions.md` |

**`pnpm test:update` rewrites two committed files.** Run it only after a deliberate `CONTROLS`
change, then READ the diff — never to silence a drift you did not intend.

There is no `lint` script and no `typecheck` script; do not invent one. `pnpm test` runs `pnpm build`
first through `globalSetup`, so the `dist/` assertions have real artifacts.

## Suggested executor toolkit

- **`cmux browser`** for every geometry claim: `cmux browser open <url>`, then
  `cmux browser <surface> viewport <w> <h>` and `cmux browser <surface> eval --script "..."`. Text
  zoom is `document.documentElement.style.fontSize`. If a command answers
  `Surface is not a browser`, the surface died — open a new one.
- **The `frontend-design` skill** before drawing anything. Its two lines that decide this plan:
  *spend your boldness in one place and keep everything around it quiet*, and *structure should
  encode something true about the content rather than decorate it*.
- **`src/pages/patches/[...sport].astro`** is the exemplar for the chip and for a page's scoped
  `<style>`; **`src/pages/llms.txt.ts`** for a route that renders derived text;
  **`src/lib/design-doc.ts`** for a renderer with an audience.

## Scope

**In scope** (the only files you may modify or create):

- `uno.config.ts` (modify — one new shortcut)
- `src/content/site.ts` (modify — gains the header's copy and a reduced `MARKDOWN_TWIN`)
- `src/content/design.ts` (modify — loses `MARKDOWN_TWIN`, gains two entries in `CONTROLS`)
- `src/content/races.ts` (modify — loses `home_label` and `home_icon`)
- `src/lib/icons.ts` (modify — census follows the moves)
- `src/lib/patch-doc.ts` (create)
- `src/components/PageHeader.astro` (create)
- `src/components/ThemeSwitcher.astro` (modify — one prop, no change to its ARIA or its script)
- `src/components/IntroCard.astro` (modify — **one comment reference only**)
- `src/pages/patches.md.ts`, `src/pages/patches/[sport].md.ts` (create)
- `src/pages/patches/[...sport].astro`, `src/pages/design.astro`, `src/pages/llms.txt.ts` (modify)
- `src/layouts/BasicLayout.astro` (modify — renders the header)
- `tests/build-output.test.ts`, `tests/content.test.ts`, `tests/control-geometry.test.ts`,
  `tests/design-system.test.ts`, `tests/patch-wall.test.ts` (modify)
- `tests/page-header.test.ts`, `tests/patch-doc.test.ts` (create)
- `CLAUDE.md` (modify — the shortcut count and one new paragraph)
- `DESIGN.md` (regenerate — the committed snapshot of `renderDesignDoc("full")`)
- `.design-sync/conventions.md` (regenerate — the committed snapshot of `renderDesignDoc("agent")`)
- `src/lib/design-doc.ts` (modify — ONLY to trim the agent audience if the budget is exceeded)
- `.design-sync/NOTES.md` (modify — record any trim)

**Out of scope** (do NOT touch, even though they look related):

- `src/pages/index.astro`. The home page keeps its chrome in the intro card and gets **no**
  `<header>`. Its `<main>` has a measured height budget with zero slack — the last link added to it
  cost 32px and the file records the arithmetic — so a header row there is a page that scrolls at the
  default text size.
- `src/pages/404.astro`. Its way back is its content, not its chrome, it has no markdown twin, and it
  carries two named exemptions from build-wide gates.
- **The wall's four chip state rules.** Step 2 moves the base rule only. Their ordering is measured,
  documented in place, and gated from three directions.
- **`ThemeSwitcher`'s ARIA contract, its two glyphs and its script.** `aria-pressed` with a
  state-independent name was chosen over a changing name on a measured screen-reader survey, and
  `THEME_TOGGLE.name` is written so the polarity cannot invert unnoticed. Three assertions in
  `tests/content.test.ts` pin it. The only permitted change is which box the button wears.
- `src/content/home.ts`, `src/data/`, `public/_headers`, `astro.config.mjs`, every workflow.

## Git workflow

- Branch: `advisor/038-one-header-and-a-twin-for-the-wall`
- Work in an isolated worktree. Read nothing by repo-root absolute path before you enter it, or you
  will edit the main tree by accident.
- Conventional commits, one per step or logical unit. Recent examples from `git log`:
  `feat(design): serve the design system as markdown, in the repo and on the web (#209)`.
- **Do NOT push or open a pull request unless the operator instructed it.**

## Steps

### Step 1: Move the chrome's copy into `src/content/site.ts`, and delete the copy control

The header is site chrome, so its words belong with the site's copy.

1. **Add `PAGE_HEADER` to `src/content/site.ts`**:

   ```ts
   export const PAGE_HEADER: {
       /** The words on the way back. */
       home_label: string
       /** The mark beside them. */
       home_icon: string
   } = {
       home_label: "Home",
       home_icon: "ri:arrow-left-line",
   }
   ```

   Write a docblock saying what it is for and **why it is no longer `PATCHES.home_label`**: the header
   goes on the design page too, and a page about colour tokens has no business reading the racing
   module for the word "Home". Do not restate the values in prose.

2. **Move `MARKDOWN_TWIN` from `src/content/design.ts` to `src/content/site.ts`, reduced to two
   fields**:

   ```ts
   export const MARKDOWN_TWIN: {
       /** The words on the chip that opens the markdown rendering of this page. */
       link_label: string
       /** The mark it wears. */
       link_icon: string
   } = {
       link_label: "Markdown",
       link_icon: "ri:markdown-line",
   }
   ```

   `link_label` shortens from "Read this page as markdown" because it is now **drawn** rather than
   hidden — a chip's label is visible and one word is what fits. `llms.txt` is the one other reader
   of this string and it wants a sentence, so give that entry its own words in step 11 rather than
   lengthening this one.

   **Delete `copy_name`, `copied`, `icon` and `copied_icon`**, and delete the WAI-ARIA paragraph from
   the docblock — it argued about a button that no longer exists. The identical rule still governs
   `THEME_TOGGLE`, where it is written out again; nothing is lost.

3. **Delete the copy control entirely** from `src/pages/design.astro`: the `<button class="md-copy
   control">`, the `role="status"` region beside it, the `<script is:inline>` at `:287-314` and its
   comment block, and the four `.md-copy*` rules in the `<style>`. This removes the site's only
   clipboard code.

4. **Delete `home_label` and `home_icon` from `PATCHES`** in `src/content/races.ts` — type fields and
   comments included — and repoint every reader:
   - `src/lib/icons.ts:32` — import `MARKDOWN_TWIN` from `../content/site`, not `../content/design`.
   - `src/lib/icons.ts:55` — `PATCHES.home_icon` becomes `PAGE_HEADER.home_icon`.
   - `src/lib/icons.ts:60-61` — replace both `MARKDOWN_TWIN.icon` and `MARKDOWN_TWIN.copied_icon`
     with the single `MARKDOWN_TWIN.link_icon`.
   - `src/lib/icons.ts:44-45` — the comment names `PATCHES.home_icon` as one of the pair resolving to
     the same class as `NOT_FOUND.home_icon`. Retarget the name; the point survives.
   - `src/pages/llms.txt.ts:2` and `:194` — import from `../content/site`; print
     `PAGE_HEADER.home_label`.
   - `src/pages/design.astro:108`, `:208-209`, `src/pages/patches/[...sport].astro:147` — markup
     rewritten in steps 8 and 9; retarget now so the tree stays green between steps.
   - `src/content/site.ts:184`, `src/content/races.ts:480`, `src/components/IntroCard.astro:129` —
     three comments naming `PATCHES.home_icon`. Retarget. **That is the only permitted change to
     `IntroCard.astro`.**
   - `tests/patch-wall.test.ts:1778` — `iconClass(PATCHES.home_icon)` becomes
     `iconClass(PAGE_HEADER.home_icon)`.

**Verify**:
- `grep -rn "PATCHES.home_\|MARKDOWN_TWIN.icon\b\|md-copy\|data-copy" src/ tests/` → no matches.
- `grep -rn "MARKDOWN_TWIN" src/content/design.ts` → no matches.
- `pnpm build`, then `grep -c "<script" dist/design/index.html` → **one fewer** than before this step.
- `pnpm test` → all pass. The safelist shrinks by one mark and the orphan gate must stay green; if it
  reddens, a rule for a mark nothing wears is still being emitted — that is the gate working.

### Step 2: Extract the chip as a shortcut, behaviour-neutral

**This is the risky step. It changes no drawing.**

1. In `uno.config.ts`, add a fifth shortcut expressing the chip's **base** rule — the box, the type,
   the resting border, and the shared hover/press/held-press behaviour that `control-surface` already
   expresses in the same vocabulary. **The kind has two boxes**, as the plate does:

   ```
   "chip-surface": "border border-[color-mix(in_srgb,var(--text)_32%,transparent)] rounded-[2px]
            text-[var(--text)] bg-[var(--background)] no-underline cursor-pointer
            hover:text-[var(--accent)] hover:border-[var(--accent)]
            active:text-[var(--accent)] active:border-[var(--accent)] active:transition-none
            data-[leaving]:text-[var(--accent)] data-[leaving]:border-[var(--accent)] data-[leaving]:transition-none
            transition-colors duration-300 ease-in-out"
   "chip":      "chip-surface inline-flex items-center gap-[0.4em] min-h-11 min-w-11 px-[0.7rem] py-[0.3rem]
            text-xs font-bold tracking-[0.1em] uppercase"
   "chip-icon": "chip-surface inline-flex items-center justify-center shrink-0 w-11 h-11"
   ```

   Treat that as a **specification of intent, not bytes to paste**. The emitted rules must produce: 2px
   corner, hairline at 32% of the ink, **no shadow**, 12px/700 with +1.2px tracking on the labelled
   box, and **44px on both axes as a floor for the labelled box and a pin for the glyph box**.

   Three things in there are deliberate and each has cost something already:
   - **`min-h-11` (2.75rem = 44px), not `min-h-6`.** This is the maintainer's decision above. It is a
     FLOOR on the labelled box because its label comes from data and must be allowed to grow, and a
     PIN on the glyph box because its content is one mark — the same distinction
     `tests/control-geometry.test.ts` already draws between `control-cta` and `control`.
   - **`bg-[var(--background)]` — the chip is OPAQUE.** `.patch-filter a` declares no background today
     and is transparent against the card it sits on. That is survivable on the wall and is NOT
     survivable in the intro card, where below `md` the portrait is painted behind the copy column; a
     transparent chip there puts a hairline box over a photograph. Plan 039 depends on this being in
     the surface rather than added locally. **Note what it changes on the wall**: a filter chip's ground
     goes from the card's colour to the page's. Measure it and report it; if the maintainer dislikes it,
     the fallback is `bg-[var(--card-background)]` on the wall's chips only, which reintroduces exactly
     the local override this plan exists to remove — so raise it rather than deciding it.
   - **A shared surface with two boxes**, rather than one shortcut with a modifier. This mirrors
     `control-surface` and is what lets `tests/control-geometry.test.ts` discover both boxes from one
     signature in step 4.

2. In `src/pages/patches/[...sport].astro`, put `class="chip"` on each filter anchor and **delete only
   the base `.patch-filter a` rule**. Keep `.patch-filter` itself (the wrapping row) and keep **all
   four state rules**, retargeted from `.patch-filter a` to `.patch-filter .chip` so their measured
   ordering relative to `[aria-current="page"]` is unchanged. Do not merge them, do not reorder them,
   do not move them into the shortcut.

3. **Prove that exactly ONE declaration changed, rather than asserting it.** This is no longer a
   behaviour-neutral extraction — the maintainer's 44px decision deliberately makes the wall's chips
   taller — so the property to hold is narrower and sharper: **the height changes and nothing else
   does.** Before the change:

   ```
   pnpm build
   node -e 'const{readFileSync,readdirSync}=require("fs");const css=readdirSync("dist/_astro").filter(f=>f.endsWith(".css")).map(f=>readFileSync("dist/_astro/"+f,"utf8")).join("")+readFileSync("dist/patches/index.html","utf8").match(/<style>[\s\S]*?<\/style>/g).join("");const want=css.split("}").filter(r=>/patch-filter|\.chip/.test(r)).map(r=>r.trim()+"}").sort().join("\n");require("fs").writeFileSync("/tmp/chip-before.css",want)'
   ```

   After the change, run the same command writing `/tmp/chip-after.css`, then `diff`. Read the diff
   yourself and account for **every** line. Five kinds of change are expected and permitted:

   1. **The selector text** — `.patch-filter a` becomes `.chip`.
   2. **The height** — a `min-height` of 2.75rem appears.
   3. **The background** — `var(--background)` appears.
   4. **Shorthand becoming longhand** — UnoCSS emits `border-width` / `border-color` and
      `transition-property` / `duration` / `timing-function` where the hand-written rule used the
      `border:` and `transition:` shorthands. The computed values must be the SAME.
   5. **The shortcut's own state rules** — `.chip` joins the merged `:hover`, `:active` and
      `[data-leaving]` selector lists UnoCSS already emits for `.control`. The wall's four
      hand-written state rules STAY and now duplicate part of this; that duplication is expected.

   **Anything else is a defect**: a changed colour value, a changed border width, a changed tracking
   value, or a state rule crossing to the wrong side of `[aria-current="page"]`.

   Write the accounted diff into the pull request body.

4. Then measure the rendered chip: `pnpm preview`, and with `cmux browser` on `/patches` at 1000x800
   read `getComputedStyle` on the first filter anchor. Expected: **height 44** (was 29.59), font-size
   12px, font-weight 700, letter-spacing 1.2px, border-radius 2px, box-shadow `none`. The four values
   after the height are the ones that must NOT have moved.

5. **Re-measure the wall.** The filter row is taller, so the page is taller. Record `/patches` document
   height and the top of `.patch-wall` before and after, at 1000x800 and at 430x932, and put both pairs
   in the pull request body. Measured before this plan: `.patch-wall` starts at 244px at 1000 wide.

**Verify**:
- The computed values above match to the pixel.
- `pnpm test` → all pass. In particular the snap gate, the hover-needs-a-pointer gate and the
  orphan-rule gate in `tests/build-output.test.ts`, all three of which reach these rules.
- `grep -c "patch-filter a" "src/pages/patches/[...sport].astro"` → `0`.
- The rendered filter chip measures 44px on both axes, and so does the header's theme toggle wearing
  `.chip-icon` — a row mixing a labelled chip with a glyph chip must be level, which is the whole
  reason 44 was chosen.

**If the shortcut cannot reproduce the measured chip** — because a UnoCSS arbitrary value will not
express `color-mix`, or because the emitted order puts a state rule on the wrong side of the
current-page rule — **STOP and report**. Do not approximate the drawing, and do not "simplify" the
wall's states to make a shortcut fit.

### Step 3: Publish the chip as a kind of control

1. Add **two** entries to `CONTROLS` in `src/content/design.ts` — `chip` and `chip-icon` — in the
   module's own voice, matching how the plate is already published as two entries rather than one.
   Say what each is FOR: the labelled box is a quiet control that names itself in a word, for
   navigation and preferences that are not a page's primary action; the glyph box is the same surface
   holding one mark, for a member of a set. **Name no box metric in either**, for the reason the
   block's own header gives — the box belongs to the shortcut and the page draws the real thing beside
   the entry. `chip-surface` is a base and is NOT published, exactly as `control-surface` is not.
1b. **Rewrite `SECTIONS.controls.lede` in the same file.** It currently opens "Three kinds" and says
   "All three share one surface: a hairline in --accent, a hard offset plate in --shadow" — a count in
   reader-visible prose, which the module's own header forbids, and a claim the chip falsifies: the
   chip's hairline is a fraction of the ink and it carries no plate at all. (`text-link` already
   falsified it; this makes it worse rather than creating it.) Write a replacement that states **no
   count**: that which kind to reach for is decided by what the control contains and how loud it is,
   that the surface belongs to the kind rather than to all of them, and keep the true last sentence
   about every specimen being a working link. **Nothing gates a lede beyond a non-empty check** — this
   one is on you.
2. Draw a live specimen of **each** on `/design` in the controls section, beside the three that are
   there. Both must be real links to real pages, like their neighbours — a build-wide gate fails a
   hover rule reaching an element that cannot be interacted with. `/patches/running` and
   `/patches/cycling` are the obvious destinations and neither is used by the other three.
3. `CLAUDE.md`'s Styling System section says **four shortcuts** and lists them. It becomes **seven** —
   the three that exist plus `chip-surface`, `chip` and `chip-icon`, with `control-surface` and
   `control` still present at this point; 039 is what retires `control`.
   `tests/docs-drift.test.ts` derives the number from `uno.config.ts` and requires the spelled-out
   word in the canonical phrase, so **reword around it and never edit the number by hand**. Re-derive
   it from the config after your edit rather than trusting this paragraph.
4. **`CONTROLS` is snapshotted into two committed files, and this step moves both.**
   `tests/design-system.test.ts` renders `renderDesignDoc("full")` against `DESIGN.md` and
   `renderDesignDoc("agent")` against `.design-sync/conventions.md`, both git-tracked, so adding two
   entries turns both snapshots red until they are regenerated with `pnpm test:update`. Then read the
   diff of each and confirm only the two new control lines and the derived "guaranteed present" line
   moved — that line is generated, so **never hand-edit either file**.

   **The agent rendering will overflow its budget, and that is arithmetic rather than a risk.**
   `AGENT_BUDGET` is 4096 characters; `.design-sync/conventions.md` measured **3941 characters at
   `f767cf2`, leaving 155**, and two control roles written to the standard of the three already there
   cost more than that. Print the current length and subtract it before you write the roles, so the
   headroom is a number you have seen rather than one you assumed. When the budget assertion goes red,
   **trim the AGENT audience in `src/lib/design-doc.ts` and never `src/content/design.ts`** — the
   module is what both surfaces share — and record the trade in `.design-sync/NOTES.md`, which is
   where the last such trim is recorded.

**Verify**:
- `pnpm test` → all pass, including the `CONTROLS`-vs-page assertions in
  `tests/design-system.test.ts`, the shortcut-vocabulary gate in `tests/docs-drift.test.ts`, and the
  agent-preamble budget.
- `grep -c "chip" DESIGN.md` → greater than 0, and `dist/design.md` is byte-identical to it.

### Step 4: Teach the geometry gate to see a control that has no plate

`tests/control-geometry.test.ts` discovers controls with `isControlRule` — a rule carrying
`--un-shadow: 2px 2px 0` **and** `border-color: var(--accent)`. The chip has neither. It reads
`dist/index.html`, where no chip exists today and one will not exist after this plan either.

1. Give the suite a **second discovery route** for the non-plated kind, keyed on the shortcut's own
   signature rather than on a hard-coded class name, and read a page that actually carries chips —
   `dist/patches/index.html` — so the assertions are not vacuous. Keep the existing plate route
   untouched; the two kinds have different contracts and must not be collapsed.
2. Hold the chip to the properties that are actually its contract: it declares its own box (a floor,
   not a cap — its label comes from data and must be allowed to grow); the box is font-relative; it
   meets the 24px minimum target on both axes; and **no other rule anywhere in the sheet caps or
   resizes it**, which is the rule the plate route already enforces and which the chip has never had.
3. Retire the special case in `tests/build-output.test.ts`'s "every link on every page says that it
   is one". It currently reads a border rule off `.patch-filter a` to decide whether the chip is
   drawn; with a real class it joins `.control`, `.control-cta` and `.text-link` in the allow-list.
   **Keep the "is it really drawn?" spirit** — the comment records that deleting the chips' permanent
   border once left the suite green at 264/264 — so the allow-list entry must still be conditional on
   a rule in the shipped sheet giving `.chip` an unconditional border.

**Verify**:
- `pnpm test` → all pass.
- **Mutation proof, and it is required rather than optional.** Delete the chip's `border` declaration
  from `uno.config.ts`, run `SKIP_BUILD=` `pnpm test`, and confirm the suite goes RED. Restore it and
  confirm green. Report both results in the pull request body. A gate that cannot fail on the
  mutation it was written for is the defect this repository names most often.

### Step 5: Render the patch wall as markdown

Create `src/lib/patch-doc.ts` exporting one function:

```ts
export function renderPatchWall(sport?: Sport): string
```

**It restates nothing.** Every string comes from `PATCHES` or `GOALS`; every figure comes from
`raceKm`, `recordingsOf`, `patchState` and the event's own fields. If you are typing a distance, a
time, a count or a state word, stop — it has a home and you are making a second one.

Shape, mirroring the page rather than inventing a document:

```markdown
# {heading}

{lede}

## {race name}

{date or date span} · {country} · {state word}

- {official_row} {distance} km, {clock word} {time} — [{official_link}]({url})
- {recorded_row} {distance} km, {time} — [{strava_name}]({url})
```

Rules, each with a source in the tree:

1. **The heading is the page's heading**, by the same expression `[...sport].astro` uses:
   `PATCHES.heading` for the all-sports document, `NEXT_RACE.control` with `{sport}` substituted for a
   sport document. Read that derivation and use it; do not write a parallel one.
2. **The order is the wall's order.** Call `patchWall(sport)` and render what it returns, in the order
   it returns it. Do not sort, group or filter.
3. **The state word is the bib's word**: `PATCHES.booked_label` for `booked`, `PATCHES.dnf_result` or
   `PATCHES.dnf_name` for `dnf` — pick one and say why in the file's docblock; `llms.txt.ts` chose
   `dnf_name` on the grounds that "DNF" is unambiguous only inside its own venue, and this document
   has no venue either. For `finished` there is **no constant naming an earned bib on its own**;
   `PATCHES.lede` contains the phrase inside a sentence. **Do not slice a substring out of a lede.**
   If a word is needed, add one field to `PATCHES` with a docblock saying why and flag it
   prominently in the pull request body — it is the site's name for its signature object and the
   maintainer will have an opinion.
4. **One bullet per source, and nothing a reader can divide crosses two of them.** A race can be known
   twice — a certified course and a GPS trace, a chip time and a watch — and each account keeps its
   own distance beside its own clock. Read `OfficialResult` in `src/lib/race.ts` and `.bib-ledger` in
   `src/components/Patch.astro` for the argument and the exact row set. A split race gets one bullet
   per recording, each carrying **that recording's own** figures; the race's summed distance and its
   first-start-to-last-stop elapsed belong to the race line and never to a part.
5. **A DNF with no recordings prints no distance.** `raceKm` falls back to the advertised distance
   when there are no metres, which is right for a booked race and the worst possible answer here — it
   would publish the whole of a route that was abandoned. Copy the condition from
   `src/pages/llms.txt.ts`: `patchState(event) === "dnf" && recordingsOf(event).length === 0`.
6. **Two decimals on every distance.** `raceKm` returns a number, so `130.03` prints itself while
   `158.10` does not, and one site must not describe one race two ways.
7. **The document names no path in this tree.** Its readers are fetching a URL.

**Verify**: `pnpm check` → exit 0; write the suite from step 10 as you go and run
`SKIP_BUILD=1 pnpm test patch-doc` → all pass.

### Step 6: Serve the three twins

Two endpoint files. **Two rather than one**, and this is not stylistic: a rest parameter can match
zero segments only when it is the whole path segment, and `[...sport].md` is not — so a single
`src/pages/patches/[...sport].md.ts` cannot produce `/patches.md`.

- `src/pages/patches.md.ts` → `/patches.md`:

  ```ts
  export const GET: APIRoute = () =>
      new Response(renderPatchWall(), {headers: {"content-type": "text/markdown; charset=utf-8"}})
  ```

- `src/pages/patches/[sport].md.ts` → `/patches/cycling.md` and `/patches/running.md`, with
  `getStaticPaths()` derived from `GOALS` exactly as `[...sport].astro` derives its own.

Both carry a docblock modelled on `src/pages/design.md.ts`, including its note that **the static
build discards the response header** — a measured fact about `output: "static"` with no adapter — and
that the header stays because it is the right answer the day this site gains one.

**Verify**:
- `pnpm build`, then `ls dist/patches.md dist/patches/cycling.md dist/patches/running.md` → all three.
- `head -5 dist/patches/cycling.md` → an H1 naming the cycling page's own heading.
- `wc -l dist/patches.md dist/patches/cycling.md` → the all-sports document is longer.

### Step 7: Build `src/components/PageHeader.astro`

One component, one `<header>`, one row, three items.

```astro
---
import ThemeSwitcher from "./ThemeSwitcher.astro";
import {MARKDOWN_TWIN, PAGE_HEADER} from "../content/site";
import {iconClass} from "../lib/icons";

interface Props {
    /** The markdown twin's URL, or undefined on a page that has none. */
    markdown?: string;
}

const {markdown} = Astro.props;
---

<header class="page-head w-full max-w-4xl px-2 pt-2 sm:px-4 sm:pt-4 md:px-6 md:pt-6">
    <a href="/" class="chip">
        <span class={`${iconClass(PAGE_HEADER.home_icon)} shrink-0`} aria-hidden="true"></span>{PAGE_HEADER.home_label}
    </a>
    <div class="page-head-actions">
        {markdown && (
                <a href={markdown} class="chip">
                    <span class={`${iconClass(MARKDOWN_TWIN.link_icon)} shrink-0`} aria-hidden="true"></span>{MARKDOWN_TWIN.link_label}
                </a>
        )}
        <ThemeSwitcher kind="chip-icon"/>
    </div>
</header>
```

and its own scoped `<style>`, layout only:

```css
.page-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.page-head-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}
```

**Nothing else.** No width, height, padding or border on any descendant — a control's box is the
shortcut's alone.

Then:

- **`ThemeSwitcher.astro` gains one prop** — `kind?: "control" | "chip-icon"`, defaulting to
  `"control"` — which decides **only** which box class the button wears. **It takes the GLYPH box, not
  the labelled one**: the toggle holds one mark and its name is `sr-only`, so the labelled `chip`
  would render it about 36px wide with its glyph shrunk to the label's text size. `chip` is for a
  control that names itself in a word; this one does not. Its `aria-pressed`, its
  `THEME_TOGGLE.name` `sr-only` span, its two glyphs, its glyph-swapping global style and its script
  are untouched. The file's own comment forbids reintroducing a box metric of its own; this
  introduces none — it selects between two shortcuts that each declare their own.
- **The toggle stays icon-only in the header**, and that is a decision rather than an oversight. A
  visible label would have to be the accessible name too (SC 2.5.3 Label in Name), and the accessible
  name here is `"Dark theme"` — deliberately naming the theme `aria-pressed` refers to, pinned by
  three assertions in `tests/content.test.ts`. A chip reading "DARK THEME" beside a sun glyph in
  light mode says two different things, and the alternatives all reopen a decision made on a measured
  screen-reader survey. Recorded in "Deferred" below with the idea worth revisiting.
- **`src/layouts/BasicLayout.astro` gains one prop**, `header?: boolean`, and renders
  `{header && <PageHeader markdown={markdown}/>}` immediately before `<slot/>` inside `<body>`. The
  layout already receives `markdown` for the head's `rel="alternate"`, so the chip's `href` and the
  head's announcement are **one value passed once** — there is no second address on the page.

**Verify**:
- `pnpm check` → exit 0; `pnpm eslint` → exit 0.
- `pnpm build`, then `grep -c "<header" dist/index.html dist/404.html dist/design/index.html` → `0`
  for all three. Nothing renders it yet.

### Step 8: Adopt the header on `/design`, and delete what it replaces

- Pass `header` to the layout beside `markdown`.
- Delete the `.design-head` block (`:102-113`) and the remains of `.design-takeaway` (`:131-151`), and
  their two rules from the `<style>`. Drop the now-unused `ThemeSwitcher` and `MARKDOWN_TWIN`
  imports.
- **Keep `const MARKDOWN = "/design.md"` and its comment**, amended: it is still the one place this
  page's twin address is written, and it is still passed to the layout — what changed is that the
  layout now hands it to the header as well as to the head.
- The first child of `<main>` keeps its `md:col-span-2` and now holds only the heading group. Read the
  comment above it first: that class exists because `Card` defaults to `md:col-span-2` and without a
  match the block is a half-width item in column one.
- The file's header comment has a paragraph beginning "THE THEME TOGGLE IS ON THIS PAGE ON PURPOSE"
  arguing the toggle is "the one piece of furniture here that is not on `/patches`". That becomes
  false in step 9. **Rewrite it now**, keeping the half that is still load-bearing — this page must be
  switchable because half of what it demonstrates is that several tokens swap rather than darken —
  and deleting the claim about `/patches`.

**Verify**:
- `pnpm build`, then:
  - `grep -c "<header" dist/design/index.html` → `1`
  - `grep -c "design-head\|design-takeaway" dist/design/index.html` → `0`
  - `grep -o 'rel="alternate" type="text/markdown"' dist/design/index.html | wc -l` → `1`
- `pnpm test` → all pass.

### Step 9: Adopt the header on the three wall routes

- Derive the twin's address from the route's own params, the way `design.astro` derives its own from
  its filename — `/patches.md` when `sport` is undefined, `/patches/${sport}.md` otherwise — with a
  comment saying this is the route's own name rather than a configured value looking for a home.
- Pass `header` and `markdown` to the layout.
- Delete the `<p>` holding the way back (`:143-149`). **The two comment blocks above it carry
  measurements and a rule** — the 1.5rem floor, the 60.25 x 20 figure, the spacing-exception finding,
  and the argument that the way out and the way back are one mirrored object. **Move them into
  `PageHeader.astro`** above the link they describe; do not delete them. Where a sentence describes
  the `text-link` treatment the way back no longer wears, correct it rather than transplanting it
  intact — the object is the same, its drawing is not.
- `<main>` still has two children.

**Verify**:
- `pnpm build`, then for each of `dist/patches/index.html`, `dist/patches/cycling/index.html`,
  `dist/patches/running/index.html`:
  - `grep -c "<header"` → `1`
  - `grep -c "theme-toggle"` → the same non-zero count `dist/design/index.html` reports
  - `grep -o 'rel="alternate" type="text/markdown"' | wc -l` → `1`
- `grep -o 'href="/patches/cycling.md"' dist/patches/cycling/index.html | wc -l` → `2` (the head's
  alternate and the header's chip).
- `pnpm test` → the twin-announcement gate is red until step 10. **That is the only failure permitted
  here**; if anything else is red, STOP.

### Step 10: Widen the gates the change outgrew, and write the two new suites

1. **`tests/build-output.test.ts`, "announces the markdown twin on the page that has one, and on no
   other"** hard-codes `const TWIN_PAGE = "dist/design/index.html"`. Replace it with a **derived
   set**: a page announces exactly one alternate if and only if the build emitted the `.md` file that
   alternate points at. Read the `href` off each page's link element, resolve it under `dist/`, and
   assert the file exists — which also closes a hole the current gate has, since it never checks that
   the link's target was built.

2. **`tests/page-header.test.ts` (new).** Docblock of at least 300 characters above the first
   `describe(`. Over the built pages:
   - Every page except `dist/index.html` and `dist/404.html` carries **exactly one** `<header>`, it is
     a **sibling of `<main>` and not a descendant** (`header.closest("main")` is null and its parent
     is the `<body>`), and it precedes `<main>` in document order. **This is the assertion that keeps
     the `banner` role** — a `<header>` inside `<main>` is demoted to a generic box and nothing else
     here would notice.
   - `dist/index.html` and `dist/404.html` carry **no** `<header>`, asserted as facts about those two
     pages so a third bare page fails.
   - Every page carrying a header carries exactly one theme toggle inside it, and that toggle's box
     is read from the **glyph chip's own signature in the shipped stylesheet** rather than by naming a
     plate class. Express it that way deliberately: plan 039 retires the plate's icon box entirely, so
     an assertion phrased as "wears the plate, not the chip" would name a class with no rule and force
     039 to loosen the one gate that stops the two toggles being swapped. The home page carries no
     `<header>` at all, and that is asserted separately above.
   - On every page carrying a header, the header's markdown chip `href` is byte-identical to the
     head's `rel="alternate"` href. One address per page is the design.
   - No rule reaching `.page-head` or `.page-head-actions` declares `width`, `height`, `min-width`,
     `min-height`, `max-width`, `max-height`, `padding` or `border` on a descendant. Note in a comment
     that `tests/control-geometry.test.ts` owns the general form and this is the local guard.
   - A non-vacuity floor: at least four pages were checked.

3. **`tests/patch-doc.test.ts` (new).** Docblock as above. Assert:
   - Every race `patchWall(sport)` returns appears in `renderPatchWall(sport)` by name — losing or
     duplicating a race is the defect a rendered document hides best.
   - The three documents partition the wall: every race in the all-sports document is in exactly one
     sport document, and the reverse.
   - **No figure crosses two sources.** For a fixture race carrying both an official result and a
     recording, assert the official distance and the official time appear in the same line, and that
     neither shares a line with the other source's figure. Model the fixture on
     `tests/llms-dnf-fixture.test.ts`, which already stubs an event shape for this kind of question.
   - **A DNF with no recordings prints no distance**, using that file's pattern.
   - Every distance carries two decimals.
   - The document names no path in this repository (grep its output for `src/`, `tests/`, `.ts`).
   - Each document's heading is the heading of the page it twins, compared against the same expression
     `[...sport].astro` uses rather than against a literal.

4. **`tests/content.test.ts`** — a `describe` for `PAGE_HEADER` and the reduced `MARKDOWN_TWIN`:
   every field non-empty; every icon id resolves in an installed collection (follow the existing
   `LINKS` icon assertion); and `MARKDOWN_TWIN.link_label` is short enough to be a chip's label —
   assert a bound and say in the comment that the bound is the chip's, not the sentence's, which is
   why `llms.txt` gets its own words.

**Verify**: `pnpm test` → all pass. Report the new total in the pull request body; **do not write an
absolute suite count into any file.**

### Step 11: List the twins in `llms.txt`

Under `## Pages`, add one line per wall twin immediately after the page it twins, following the shape
of the existing `/design.md` entry. The spec requires every list item under an H2 to be a markdown
link with optional notes after a colon.

The link text can no longer be `MARKDOWN_TWIN.link_label` — that is a chip's word now, and four list
entries all reading "Markdown" would be four links a crawler cannot tell apart. Give each its own
sentence naming the page it renders. Say what it is without a count; the wall grows every time a race
is entered, and this file has already had to delete one count for that reason.

**Verify**:
- `pnpm build`, then `grep -c "\.md)" dist/llms.txt` → `4`.
- `pnpm test` → all pass, including "keeps llms.txt to the spec" and the listed-exactly-once
  assertion.

### Step 12: The browser sweep, and the documentation

**Sweep** — `pnpm build && pnpm preview`, then with `cmux browser`, on `/design`, `/patches`,
`/patches/cycling` and `/patches/running`:

| Viewport | Root font-size | Assert |
|---|---|---|
| 320 x 700 | 16, 20, 24, 32, 40 | `document.documentElement.scrollWidth - clientWidth` is 0 |
| 1000 x 800 | 16 | the header's chips and the filter row's chips are the same height, to the pixel |
| 768 x 1024 | 16, 24 | the header's top is >= 0 and its left edge equals `<main>`'s |
| 1024 x 797 | 16 | the header's width equals `<main>`'s width |
| 1440 x 900 | 16, 20 | nothing above the header is clipped; `scrollTop` starts at 0 |

Also, in **both themes**: the header's chips are drawn identically to the wall's filter chips one rung
below (same border colour, same corner, same type), and the theme toggle's glyph still swaps. Report
the numbers in the pull request body beside the placeholder figures in "Measurements taken for this
plan".

**Documentation** — `CLAUDE.md`:
- The Styling System section: the shortcut count moves to **seven** and the list gains the chip's
  surface and its two boxes. Never hand-edit the number; derive it from `uno.config.ts` and reword
  the sentence around it.
- The Layout Hierarchy section: one paragraph naming the header, which pages carry it, which two do
  not and why, and the rule that keeps it correct — **the header is a sibling of `<main>`, never a
  descendant, because that is what makes it a `banner` landmark**.
- Do not add a count of anything else. Every path, script name and configured value written in
  backticks must exist; `tests/docs-drift.test.ts` gates this file for accuracy.

**Verify**: `pnpm check && pnpm eslint && pnpm test` → all three exit 0.

## Test plan

New suites: `tests/page-header.test.ts` and `tests/patch-doc.test.ts`, both specified in step 10,
both needing a >=300-character docblock above their first `describe(`.

Widened: the markdown-twin announcement gate and the `llms.txt` page-list assertions in
`tests/build-output.test.ts`; the signifier gate's chip special case retired there too; a second
discovery route in `tests/control-geometry.test.ts`; a new `describe` in `tests/content.test.ts`; the
`CONTROLS` assertions in `tests/design-system.test.ts` following the fourth entry; one identifier
rename in `tests/patch-wall.test.ts`.

Structural patterns to follow:
- `tests/build-output.test.ts` for anything walking `builtPages()`. Use `parseHTML` and query the DOM;
  **do not regex raw HTML for `href=`** — the file records what that cost, matching `<link>` elements
  in `<head>` for an assertion about what a reader can click.
- `tests/llms-dnf-fixture.test.ts` for stubbing an event shape the real calendar does not contain.
- `tests/design-system.test.ts` for holding a rendered document against the module it derives from.

Every new assertion needs a **non-vacuity floor** — a count that fails if the population it walks is
empty. And step 4's chip gate needs the **mutation proof** named there; it is a done criterion, not a
nicety.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0 with 0 errors, 0 warnings, 0 hints
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0; `tests/page-header.test.ts` and `tests/patch-doc.test.ts` exist and pass
- [ ] Deleting the chip's border declaration from `uno.config.ts` turns `pnpm test` RED, and restoring
      it turns it green — both runs reported in the pull request body
- [ ] `grep -c "<header" dist/design/index.html dist/patches/index.html dist/patches/cycling/index.html dist/patches/running/index.html` → `1` each
- [ ] `grep -c "<header" dist/index.html dist/404.html` → `0` each
- [ ] `ls dist/patches.md dist/patches/cycling.md dist/patches/running.md dist/design.md` → four files
- [ ] `grep -o 'rel="alternate" type="text/markdown"' dist/patches/running/index.html | wc -l` → `1`
- [ ] `grep -rn "PATCHES.home_\|md-copy\|data-copy\|patch-filter a" src/ tests/` → no matches
- [ ] `grep -rn "MARKDOWN_TWIN" src/content/design.ts` → no matches
- [ ] `grep -c "\.md)" dist/llms.txt` → `4`
- [ ] `find dist -name '*.js'` → no first-party JavaScript file, and `dist/design/index.html` carries
      one fewer `<script` than at `f767cf2`
- [ ] `CLAUDE.md`'s shortcut count equals `Object.keys(unoConfig.shortcuts).length` spelled out, and
      the document names the chip's surface and both of its boxes
- [ ] The built stylesheet floors `.chip` at 44px on both axes and pins `.chip-icon` at 44x44, and
      the wall's filter row measures 44px tall in the browser
- [ ] The step 2 diff is accounted line by line in the pull request body, and contains no change
      beyond the five kinds step 2 enumerates
- [ ] The step 12 sweep reports 0 horizontal document overflow at 320px out to a 40px root on all four
      pages
- [ ] No file outside the "In scope" list is modified (`git status`), and `plans/README.md` is
      untouched

## STOP conditions

Stop and report back — do not improvise — if:

- The drift check shows an in-scope file changed since `f767cf2` and the excerpts above no longer
  match the live code.
- `src/content/design.ts`, `src/lib/design-doc.ts` or `src/pages/design.md.ts` is absent. Plans 036
  and 037 are hard dependencies.
- **The `chip` shortcuts cannot reproduce the chip's drawing** (step 2), or the emitted rule order puts
  a state rule on the wrong side of `[aria-current="page"]`. Do not approximate the drawing and do not
  simplify the wall's states to make a shortcut fit — the contrast figures in those comments are
  measured and the ordering is what keeps the current chip's label readable.
- The step 2 diff shows a change **other than** the five kinds that step enumerates. A sixth is a
  defect, not a tidy-up. Note that four and five of those — shorthand becoming longhand, and `.chip`
  joining UnoCSS's merged state selector lists — are what a CORRECT execution produces; halting on
  them would stop this plan at step 2 of 12.
- **Growing the filter row to 44px pushes `/patches` past a layout boundary** — the wall's first row
  falling below the fold on a common phone, or a filter chip wrapping where it did not. Report the
  before/after figures from step 2.5 rather than tuning the height; 44 is the maintainer's decision and
  the fallback is theirs to make.
- Astro reports a route collision between `src/pages/patches/[sport].md.ts` and the existing
  `src/pages/patches/[...sport].astro`, or `dist/patches.md` is not emitted. The two-file shape in
  step 6 answers a rest parameter that cannot be empty mid-segment; if the build disagrees, the
  premise is wrong and the fix is not to guess a third filename.
- Moving the `<header>` out of `<main>` clips anything at the top of any page at any tested viewport.
  The measured probe says it does not, but the probe used a placeholder. The candidate fix is to stop
  `<body>` centring its column on pages carrying a header — **report before making it**, because that
  class is shared with the home page.
- Astro both inlines and links the header component's CSS on the same page, reddening "no page may
  load a chunk while also inlining the same rules". That is a bundling outcome, not a markup bug;
  report the chunk layout rather than duplicating the component.
- Reproducing the bib's ledger in markdown would need a derivation that already lives in
  `src/components/Patch.astro`. The right answer is to extract it into `src/lib/race.ts` and have both
  read it — but that widens the scope, so report first.
- You conclude a finished bib needs a word of its own in `PATCHES` (step 5, rule 3). Add it and say so
  prominently; expect the reviewer to have an opinion about the wording.
- Any change to `ThemeSwitcher`'s ARIA, its glyphs or its script seems necessary. Only the box class
  may change. If the chip genuinely cannot host the existing markup, report — do not re-open a
  decision made on a measured screen-reader survey.
- `pnpm test` fails twice on the same assertion after a reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **The site now has two control worlds and the rule is about scope, not about pages.** The plate is
  the mark for a primary action — the intro card's links out, a goal card's one way out. The chip is
  the quiet kind, for navigation and preferences. The wall's filter row and the page header are both
  chips because both are about getting somewhere, not about the page's one action. Draw a plate in a
  header and you are spending the strongest mark this palette has on furniture.
- **The `banner` role is a positional fact, not a class.** Move the `<header>` inside `<main>` — for a
  layout reason that will look excellent at the time — and it silently becomes a generic box.
  `tests/page-header.test.ts` is what stands between that and a merge.
- **The header is one component and four consumers.** A fifth page gets it by setting the layout prop;
  do not draw a fifth way back by hand. That is the defect this plan closed.
- **The wall's markdown twin restates nothing today.** The moment a distance, a count or a state word
  is typed into `src/lib/patch-doc.ts` rather than derived, it is a second home for that value and
  nothing will notice.
- **What a reviewer should scrutinise**: that step 2's diff changed selectors and not declarations;
  that the chip gate actually fails on the border mutation; that the markdown chip's `href` and the
  head's `rel="alternate"` are one value passed once; and that the measurement paragraphs moved out of
  `[...sport].astro` in step 9 arrived intact rather than summarised.

### Deferred out of this plan, with reasons

- **A visible label on the theme toggle.** SC 2.5.3 requires the accessible name to contain the
  visible label, and the accessible name here is `"Dark theme"` — deliberately naming the theme
  `aria-pressed` refers to, so the polarity cannot invert unnoticed. A chip reading "DARK THEME"
  beside a sun glyph in light mode contradicts itself. **The idea worth revisiting**: fix the glyph to
  the moon, label it with `THEME_TOGGLE.name` so the visible and accessible names are one string, and
  let the chip's own inverted state — the treatment the filter row already uses for
  `[aria-current="page"]` — carry `[aria-pressed="true"]`. That would make the toggle's state visible
  for the first time. It costs a mark from the census, a rewrite of the glyph-swapping style and its
  forced-colours note, and it is a decision about a control this plan was told not to redesign.
- **The home page gets no header**; its `<main>` has zero measured slack and its chrome is the intro
  card.
- **The 404 page gets no header**; its way back is its content and it carries two gate exemptions.
- **No copy-to-clipboard control**, at the maintainer's direction: opening the markdown page and
  selecting all is the same outcome with no client code. This deleted the site's only clipboard path.
- **No "copy as a prompt", no "Open in ChatGPT / Claude / Codex", no menu.** Rejected on the
  zero-external-JS gate, the size of an accessible menu-button contract relative to everything else on
  this domain, and the fact that a third-party origin in the page is a vendor's protocol rather than
  one of the three configuration homes this repository allows.
- **No sticky header.** The site is static and quiet; a bar following the reader down a wall of bibs
  would be the only moving chrome on the domain.
