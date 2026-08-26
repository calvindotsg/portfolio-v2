# Plan 042: Redraw `/design` as a ledger sheet

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update the status row for this
> plan in `plans/README.md` — **except in this repository, where you must NOT.** That file's status
> table is the reviewer's alone; it says so in its own words, and it is gated in full, so an edit
> from you can redden a branch you cannot then make green. Report your status in the pull request
> body instead and leave the index untouched.
>
> **Drift check (run first)**:
> `git diff --stat 71bc7e1..HEAD -- src tests uno.config.ts CLAUDE.md DESIGN.md .design-sync`
> If any file named in "Scope" changed, compare the "Current state" excerpts against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.
>
> **This plan does not stand alone.** It requires 040's rendering gates and 041's `src/lib/palette.ts`.
> If `src/lib/palette.ts` does not exist, **STOP** — 041 has not landed and step 3 cannot be executed.
>
> **Do not push, open a pull request, or merge unless the operator has instructed it.** Finish
> every step up to that point.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED — this is the only plan of the four that **redraws** a page. (041 also changes what
  `/design` looks like, in one specimen; it is not invisible and its own Risk line says so.) The page
  has no layout engine behind it in the suite, so two of its properties (horizontal overflow at
  320px, and behaviour at a 200% text zoom) can only be measured in a browser. Step 8 is not
  optional.
- **Depends on**: **041** (hard — it supplies the values the colour ledger prints), which depends
  on **040** (hard — it supplies the gates that catch a section reaching one surface only), which
  is sequenced behind **039**.
- **Category**: dx
- **Planned at**: commit `71bc7e1`, 2026-08-26
- **Direction RECOMMENDED by the advisor on 2026-08-26** from three alternatives drawn as live
  mockups in the site's own tokens — a specimen-tile wall, a sticky reference rail, and this. The
  argument is in "Why this drawing" and the two rejections are recorded in `plans/README.md`.
  **This is a recommendation, not a decision.** The maintainer had not confirmed it when this plan
  was written, and confirming it is this plan's first precondition — see STOP conditions. Do not
  read "chosen" anywhere in this file as approval that was given.
- **Baseline**: re-measure `pnpm test` on your own branch point. Do not quote a total from here.

## Why this matters

Measured on the built page at `71bc7e1`:

- **3,626px of document at a 1280 viewport, 6,054px at 390** — both `body`'s height. `<main>`'s own
  height at 1280 is 3,558px. Quote one property or the other and say which: `get box` returns
  `height` and `bottom` side by side and an earlier draft of this line mixed them.
- **Four identical cards in one column.** At 1280 the specimen rows occupy about half the card's
  width; the only two-column block on the page is Do/Don't.
- **No section index, no anchors, no permalinks.** Reaching the Marks section means scrolling past
  everything above it. A reference document is entered from a search result at a specific section,
  and this one has no addressable sections.
- **Three of fifteen colour specimens carry almost no information.** `--background`,
  `--card-background` and `--card-border` are each within one step of the plate they are drawn on,
  in both themes: `#FAFAFA` / `#F5F5F5` / `#E5E5E5` on an `#F5F5F5` card in light, and `#111111` /
  `#171717` / `#2C2C2C` on `#171717` in dark. The page's own comment calls this "by design". A
  colour specimen a reader cannot see is a specimen that failed.
- **The page's thesis is asserted, not shown.** `SECTIONS.palette.lede` says several tokens "swap
  polarity rather than merely darkening"; seeing it requires pressing the theme toggle, which loses
  your place and shows you one theme at a time either way.
- **A third small-caps label register was invented here.** The site had two — the bib's meta row
  (`0.625rem / 700 / 0.14em`, `Patch.astro`) and the chip (`0.75rem / 700 / 0.1em`, `uno.config.ts`)
  — and `.design-guide-heading` in `src/pages/design.astro` added `0.75rem / 700 / 0.08em`: the
  chip's size at different tracking. The page that documents the system is the page that grew the
  system a register.
- **Do and Don't are drawn identically.** Same heading treatment, same marker, same ink. Only the
  word differs, in the two columns whose whole subject is that they are opposites.
- **The controls section destructures by arity**:
  `const [PLATED, LABELLED, WORDS, CHIP, CHIP_ICON] = CONTROLS;`. Publishing a kind of control means
  editing the module and the page, and plan 039 is currently paying that cost.

## Why this drawing

The wall already owns a device for **one thing with two accounts that must not be reconciled**: the
bib's ledger, where a race's official distance sits beside its recorded one, each keeping its own
clock. `OfficialResult` in `src/lib/race.ts` carries the rule — *nothing a reader can divide crosses
two sources* — and `.bib-ledger` in `src/components/Patch.astro` carries the drawing, including the
two container queries that restack it under text zoom.

**A two-theme palette is that shape.** One token, two values, several of which trade places, and
flattening them into one is the specific error `OMISSIONS` refuses to commit. So the colour section
becomes a ledger: `LIGHT · DARK · TOKEN · ROLE`, both columns always drawn, in either theme.

The rest follows from the same borrowing:

- **Navigation is the wall's filter row**, drawn in chips — a control this site already publishes,
  so the page gains a way to be entered at a section without gaining a new kind of furniture. A
  sticky rail was the alternative and was rejected on this repository's own argument: `uno.config.ts`
  says furniture recedes so the page's own subject stays the loudest thing on it, and a rail costs a
  quarter of a `max-w-4xl` measure and does nothing below `lg`.
- **Sections are separated by rules, not boxed in cards**, which returns the full measure to the
  roles — several of which are sentences.
- **The three neutrals become one nested specimen** — a ground holding a plate holding an edge —
  because that is what those three tokens *are*, and drawn as a relationship they are legible where
  drawn as three chips they are not.

## Current state

### The page

`src/pages/design.astro`, 600+ lines: frontmatter, a `<main>` with a heading block and four `Card`s
rendered from `Object.keys(SECTIONS)`, a scoped `<style>` and a small `<style is:global>`. Read the
whole file before starting — every block carries the argument for why it is drawn that way, and
several of those arguments survive this redraw unchanged. In particular:

- **`.design-row` is a wrapping flex row and not a grid**, and the comment above it says why: a
  three-column template shatters a long name into single letters at the 200% zoom WCAG asks for,
  and repairing that costs two container queries. **The ledger in this plan is a grid**, so it
  inherits that problem and must inherit the fix — see step 4.
- **`.design-marks` uses `minmax(min(9rem, 100%), 1fr)`** and the comment explains that the `min()`
  is what stops the track overhanging its card at a large root font size. Keep that idiom for every
  grid this plan adds.
- **`.design-name` is the page's one invented treatment**: a hairline box with the bib's 2px corner,
  because a literal a reader is meant to copy has no monospace face to be set in. It stays.
- **The forced-colours block** opts two elements out of the mode, and argues that a swatch is the
  one place on the site where a colour *is* the content. Any new element whose ink is a
  `background-color` needs the same treatment, and nothing else does.
- **`.design-cta` and `.design-cta-label`** exist because a labelled control lost 42.2px of ink past
  a card's edge at a 40px root. Whatever the controls section becomes, that must not regress.

### The chip, which the navigation will wear

`uno.config.ts` publishes `chip` and `chip-icon` (added by plan 038). The wall's filter row at
`src/pages/patches/[...sport].astro` is the working example, including its
`[aria-current="page"]` treatment and the four state rules whose **order** relative to it is
measured and argued in place. Read that before drawing a chip row here.

### The controls destructure

`src/pages/design.astro`:

```astro
const [PLATED, LABELLED, WORDS, CHIP, CHIP_ICON] = CONTROLS;
```

followed by five hand-written `<li class="design-row">` blocks, each pairing a specimen with one of
those bindings. Plan 039 removes one of the five.

### Repo conventions this plan must honour

- **Every length is font-relative** except the bib's 2px corner. `tests/page-fit.test.ts` and
  `tests/card-fill.test.ts` enforce parts of this; the rest is the standing rule.
- **A hover style must need a pointer.** Hand-written `:hover` carries its own
  `@media (hover: hover)` prelude and must be split from any `:focus-visible` sharing its selector
  list. `tests/build-output.test.ts` enforces this with no carve-outs.
- **A press must be drawn and must outlive the finger.** Any `:active` that paints ink also carries
  `transition-none`, and any press on a link the inline script holds needs a `[data-leaving]` twin.
  Two gates in `tests/build-output.test.ts` fail the deploy on this.
- **Every link carries a perceivable signifier**, walked build-wide over every `<a>`.
- **No class token may be orphaned.** The orphan gate reads a selector's leading class token and
  fails the build if no element wears it. Delete a rule when you delete its element.
- **A UnoCSS utility named in an `.astro` comment emits a real rule** — including CSS property
  names. Do not write class names into comments.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Full gate | `pnpm test` | exit 0; it builds first |
| Iterate | `SKIP_BUILD=1 pnpm test <filter>` | reuses `dist/` |
| Build only | `pnpm build` | exit 0 |
| Preview | `pnpm preview` | serves `dist/` on http://localhost:4321 |
| Regenerate the generated docs | `pnpm test:update` | rewrites `DESIGN.md` and `.design-sync/conventions.md` |

## Suggested executor toolkit

- A browser you can set a viewport and a root font size on. Step 8 needs 1280, 390 and 320 widths,
  and a 200% text zoom. If the environment offers a `cmux browser` surface, `viewport`, `get box`
  and `get styles` are the three subcommands this needs.
- `src/components/Patch.astro`'s `.bib-ledger` block — the container-query restack this plan reuses
  is already solved there. Read it rather than re-deriving it.

## Scope

**In scope** (the only files you may modify):

- `src/pages/design.astro` (modify — the redraw)
- `src/content/design.ts` (modify — **only** `SECTIONS.*.lede` where a lede describes the old
  drawing, and `DESIGN_PAGE.lede` for the same reason. No new sections, no new keys.)
- `tests/design-system.test.ts` (modify — extend the page-side gates 040 added)
- `tests/rendered-html.test.ts` (modify — if the CTA specimen's wrap assertion moves)
- `DESIGN.md`, `.design-sync/conventions.md` (regenerate only, if a lede changed)
- `CLAUDE.md` (modify — one sentence if the label-register rule changes)

**Out of scope** (do NOT touch, even though they look related):

- `uno.config.ts`. This plan adds no shortcut. If the ledger's column heads want the chip's label
  register, they take it as three declarations in the page's own scoped style — **a fourth shortcut
  for a heading is not a kind of control** and `tests/control-geometry.test.ts` discovers controls
  by the surface signature, so a non-control wearing one would be a false positive.
- `src/layouts/BasicLayout.astro`, `src/components/PageHeader.astro`. The page's chrome is settled
  by plan 038 and this page contributes the `header` prop and nothing else.
- `src/components/Patch.astro`. Read it; do not edit it. If the ledger idiom wants extracting into
  something shared, that is a later plan with its own measurement.
- `src/pages/index.astro`. The home page's height budget is its own contract.
- The content of any `does` or `donts` line. Plan 043 owns the guidance; this plan owns the drawing.
- `src/lib/design-doc.ts`. The markdown twin's shape is not a function of the page's drawing, and
  040's gates already hold the two to the same source.

## Git workflow

- Branch: `advisor/042-redraw-design-as-a-ledger-sheet`
- Commit per step. Conventional commits, matching `git log` — e.g.
  `feat(design): draw the palette as a ledger, both themes at once`
- Do NOT push or open a pull request unless the operator instructed it.

## Steps

### Step 0: Confirm the direction before drawing anything

This plan spends L effort redrawing a page to a direction the advisor recommended and the
maintainer had not confirmed at the time of writing. Every other step assumes that answer.

Check for a recorded confirmation — in the pull request that landed this plan, in
`plans/README.md`'s status row, or in an instruction you were given. **If there is none, STOP and
ask.** A redraw executed against an unconfirmed direction is the most expensive kind of rework
available here, and the two rejected alternatives are recorded well enough that reversing is a
decision rather than a re-derivation.

**Verify**: you can point at where the confirmation is recorded.

### Step 1: Measure what you are replacing

Build, preview, and record — these are the numbers step 8 compares against:

- `<main>`'s height at 1280 and at 390
- whether the document scrolls horizontally at 320
- the widest line length in the Controls section's role column at 1280

**Verify**: the four figures are written into your working notes. If `<main>` at 1280 is not within
a few per cent of 3,558px, the page has drifted since this plan was written — say so in the pull
request body and carry on with your own numbers.

### Step 2: Give the page a section index

Under the lede, a row of chips — one per entry of `SECTIONS`, in the module's own key order, each an
in-page link to its section. Derive them by iterating `SECTIONS`; do not write a list.

Requirements:

- Each section's heading element gets a stable `id`. Derive it from the section **key**, not from
  the heading text — the key is the module's stable identifier and a heading is prose that may be
  reworded. A reworded heading must not break a bookmarked URL.
- The chip row is a `<nav>` with an accessible name, so a screen reader can skip it.
- No `[aria-current]` unless something actually maintains it. This page ships no script and a static
  `aria-current` on a section link would be a lie in five cases out of six. **Do not add a scroll
  spy** — it is client state on a site that ships almost none, and the chip row is short enough to
  read.
- The row must wrap, and every chip must stay at its 44px floor on both axes.

**Verify**: `pnpm build`, then for each key of `SECTIONS`,
`grep -c 'id="design-<key>"' dist/design/index.html` returns 1 and a chip links to `#design-<key>`.
Then open the page and confirm each chip lands on its section.

### Step 3: Draw the colour ledger

Replace the palette section's `.design-rows` list with a four-column sheet: light value, dark
value, token, role — column heads set in a small-caps label register, under a rule.

- Both value cells carry the swatch **and** the hex, the hex in the `.design-name` treatment at a
  smaller size with `font-variant-numeric: tabular-nums` and `user-select: all`. 041 supplies
  `PALETTE`; join it to `TOKEN_ROLES` by token name.
- An `-on-ink` token's swatch is drawn on an ink plate in **both** columns, for the reason the
  current `.design-ink` comment gives: showing it against the card renders the pale half of the
  pair as a mistake.
- The three neutrals come **out** of the sheet and become one nested specimen above it: a ground
  box holding a plate box, each labelled with its token and role, the plate wearing the edge token
  as its border. They keep their hexes.
- Both value columns are the *same* in either theme. That is the point — the sheet is a record, and
  the page re-toning around it is what makes the record legible in both. Say so in a comment.

**Verify**: `pnpm build`; the built page contains every token's two values (041's gate covers
this); preview at 1280 in both themes and confirm the neutral specimen is legible in each — which
is the defect this step exists to close, so check it rather than assuming.

### Step 4: Make the sheet survive text zoom

The sheet is a grid, and the comment above `.design-row` records what a grid does to this content
at 200%: a long name shatters into single letters. `.bib-ledger` in `src/components/Patch.astro`
solves the same problem with two container queries that restack the row; reuse that approach —
`container-type: inline-size` on the sheet, and at narrow inline sizes the four columns become a
stacked block per token.

Do not solve it by capping a column in pixels, and do not solve it by letting the row scroll
sideways: the page body must never scroll horizontally, and a specimen that needs a horizontal
scrollbar to read is not a specimen.

**Verify**: measured in a browser at a 40px root font size and a 320px viewport — no horizontal
document overflow, and no token name broken mid-word. Record the measurement; **the suite cannot
see this**, which is why it is a browser step and not an assertion.

### Step 5: Draw Do and Don't as opposites

The two columns keep their content and stop being drawn identically. The distinction must be
carried by **at least two channels**, because one of them will be a colour and forced-colours mode
discards it:

- a mark in the heading that differs in shape, not only in ink
- a list marker that differs in shape

Do not reach for `--accent` for either. `uno.config.ts` and the layout's token comment both say
`--accent` means *you can interact with this*, and nothing about a column of sentences does. If a
colour is wanted, `--text` at two weights is the honest instrument here.

**Verify**: `SKIP_BUILD=1 pnpm test build-output` → all pass, including the forced-colours and
paired-foreground gates. Then view the page with forced colours active and confirm the two columns
are still distinguishable.

### Step 6: Retire the third label register

`.design-guide-heading` adopts the chip's register — `0.75rem / 700 / 0.1em`, the values
`uno.config.ts` already emits — and the specimen eyebrows and column heads adopt the bib's
(`0.625rem / 700 / 0.14em`). Two registers on the page, both the site's own, neither invented here.

Update the comment above the rule: the current one argues at length for a treatment and for the
`0.08em` it picked, and a comment that argues for a value the file no longer has is worse than no
comment. State the new rule — *this page invents no register; it uses the two the site already
has, the chip's for a label over a block and the bib's for a specimen's own eyebrow* — and delete
the archaeology.

**Verify**: `grep -c '0.08em' src/pages/design.astro` → 0.

### Step 7: Render the controls without an arity

Delete the destructure. Iterate `CONTROLS` and look each specimen up by `name` from a map declared
beside the loop. A control in `CONTROLS` with no specimen in the map must be a **loud failure**, not
a blank cell — throw at build time with a message naming the missing key.

Every specimen stays a working link to a real page, for the reason the current comment gives: an
inert `span` carrying a hover rule fails a build-wide gate, and naming each specimen with the words
its destination is headed with is the pairing rule the site already holds its goal cards to.

Add a gate: every `CONTROLS` name has a specimen. 040's gate 5 asserts the name reaches the page;
this asserts the page draws something for it. The two are different and both are needed — a name
printed in a table with no specimen beside it satisfies the first.

**Verify**: `SKIP_BUILD=1 pnpm test design-system control-geometry` → all pass. Then, as a mutation:
add a sixth entry to `CONTROLS` with no specimen and confirm the build fails naming it. Revert by
editing the file, not with a bare `git checkout --`.

### Step 8: Measure the result in a browser

Not optional, and not replaceable by the suite — there is no layout engine in it.

At 1280, 390 and 320, in both themes:

- `<main>`'s height, against step 1's figures
- no horizontal document overflow at any width
- every chip at or above 44px on both axes
- the neutral specimen legible in both themes
- Do and Don't distinguishable with forced colours active
- at a 40px root: no clipped ink, no shattered token name, the CTA specimen's label still wrapping

Record every figure in the pull request body. **A height that went up is not a failure** — the page
is denser per row but has more rows once 043 lands, and the metric that matters is whether a reader
can reach a section, not how tall the document is. Say what happened; do not tune for a number.

### Step 9: Reconcile the prose the drawing falsifies

`DESIGN_PAGE.lede` says "the ramp wears the real classes, and the controls are the controls".
Check every clause of it, and of each `SECTIONS.*.lede`, against what the page now does. Any
sentence describing the old drawing gets corrected — and **only** those; this is not licence to
rewrite the guidance, which belongs to plan 043.

Then `pnpm test:update` and read the diff to `DESIGN.md`: a lede change is expected, anything else
is not.

**Verify**: `pnpm test` → exit 0. `git diff DESIGN.md` contains only lede text.

## Test plan

New or extended, in `tests/design-system.test.ts`:

- every section key has a matching `id` in the built page, and a chip linking to it
- every `CONTROLS` name has a specimen element in the built page (not merely its name in text)
- the page contains no `0.08em` — the third register is gone
- a `CONTROLS` entry with no specimen fails the build (run as a mutation; report the message)

Existing suites that must stay green and are the reason this plan is MED and not HIGH:
`build-output` (hover, press, link signifiers, orphan classes, forced colours), `page-fit`,
`card-fill`, `control-geometry`, `rendered-html`, `docs-drift`.

**Browser measurements are part of the deliverable** and go in the pull request body, not in a
test. Say which instrument produced each number.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -c 'design-guide-heading' src/pages/design.astro` is non-zero and
      `grep -c '0.08em' src/pages/design.astro` is 0
- [ ] `grep -c 'const \[' src/pages/design.astro` is 0 — no arity destructure remains
- [ ] For every key of `SECTIONS`: `grep -o 'id="design-<key>"' dist/design/index.html | wc -l` is
      **1**. Use `grep -o … | wc -l`, not `grep -c`: `grep -c` counts matching lines and would
      report 1 for a duplicated id as readily as for a unique one — and a duplicated id is exactly
      the defect that breaks an anchor
- [ ] `git diff --name-only` lists only files from the In-scope section
- [ ] The pull request body carries the step 1 and step 8 measurements, at all three widths, both
      themes, and the 200%-zoom result
- [ ] `plans/README.md` is **unmodified**

## STOP conditions

Stop and report back (do not improvise) if:

- **The direction has not been confirmed by the maintainer** (step 0). This plan's "Why this
  drawing" is an argument, not a mandate.
- `src/lib/palette.ts` does not exist. 041 has not landed and step 3 cannot be executed.
- 040's rendering gates are not in `tests/design-system.test.ts`. Without them a section can leave
  the page in this very redraw and nothing will notice — which is the defect that motivated the
  ordering.
- The ledger cannot be made to restack without a horizontal scrollbar or a pixel cap. Report the
  measured widths; a different specimen shape is a design decision and belongs to the maintainer.
- A `build-output` gate goes red in a way that needs a carve-out. Those gates are universals on
  purpose and each one's absence has previously shipped a defect; a redraw is not a reason to open
  one.
- You are about to add a shortcut to `uno.config.ts`, a scroll-spy script, or a fourth label
  register.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **The section `id`s are derived from `SECTIONS`' keys and are now public URLs.** Renaming a key
  breaks every bookmark and every inbound link. If a key must change, say so in the pull request —
  there is no redirect layer on this site.
- **The ledger's container queries are the second copy of an idiom** `.bib-ledger` already has.
  If a third appears, extract it; two is not yet a pattern, and the wall's version carries
  bib-specific decisions that do not belong here.
- **What a reviewer should scrutinise**: that the browser measurements were actually taken and at
  all three widths; that Do/Don't survive forced colours; that no gate acquired a carve-out; and
  that the ledger's two value columns are identical in both themes, because a sheet that re-tones
  is a sheet that has quietly become a swatch again.
- **Deliberately deferred**: an "in use" specimen showing the system composed — it was the best
  idea in the rejected reference-rail direction and it wants real content to be honest, so it is
  worth its own plan rather than a corner of this one. Also deferred: publishing contrast ratios
  beside each pair, and any change to how the theme stylesheet ships.
