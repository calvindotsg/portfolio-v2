# Plan 041: Publish a token's two values, not just its role

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update the status row for this
> plan in `plans/README.md` — **except in this repository, where you must NOT.** That file's status
> table is the reviewer's alone; it says so in its own words, and it is gated in full, so an edit
> from you can redden a branch you cannot then make green. Report your status in the pull request
> body instead and leave the index untouched.
>
> **Drift check (run first)**:
> `git diff --stat 71bc7e1..HEAD -- src tests CLAUDE.md DESIGN.md .design-sync`
> If any file named in "Scope" changed, compare the "Current state" excerpts against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.
>
> **Do not push, open a pull request, or merge unless the operator has instructed it.** Finish
> every step up to that point.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW-MED. No value moves and no theme block is touched, so no contrast assertion can be
  disturbed. But this plan is **not** invisible on the page, and an earlier draft of this line
  claimed it was: step 3 adds one scoped class and two items to each of fifteen `.design-row`
  items, which is a stylesheet change and a layout change. `.design-row`'s own comment warns that
  this row shatters a long token name at the 200% zoom WCAG asks for, and no suite here has a
  layout engine — so step 3 carries a browser measurement rather than relying on the gates.
- **Depends on**: **040**, which makes every rendering of `src/content/design.ts` provably reach
  every surface. Hard dependency in one direction only: without it, a document that stopped
  carrying the new value columns would still match its own snapshot. **039 has landed**
  (`b1eea8a`, #217), so the sequencing dependency below is discharged [reconciled].
- **Category**: dx
- **Planned at**: commit `71bc7e1`, 2026-08-26
- **Baseline measured at `71bc7e1`**: `pnpm test` → 22 files passed, 1 skipped; 661 tests passed,
  7 skipped; exit 0. **Re-measure this yourself before step 1 and compare deltas, not totals** —
  an absolute figure quoted from here is an undeclared dependency on every other branch in flight.

## Why this matters

**`/design` is a design system page you cannot get a colour out of.** It draws fifteen swatches,
names each token and says what each is for, and never tells you what any of them is. Neither does
`DESIGN.md`, neither does `/design.md`, and neither does `.design-sync/conventions.md` — all three
decline to publish colours at all. Somebody building against this system has to open
`src/layouts/BasicLayout.astro` and read the stylesheet, which is exactly the situation the page
exists to replace.

**This is not the "restate no value" rule working as intended — it is that rule over-applied.** The
rule, stated in the header of `src/content/design.ts`, is about *authoring*: "if you find yourself
**typing** a hex … it does not belong here." A swatch is already the value, rendered as colour; the
page has published every one of them since the day it shipped. Printing the same value as text is
the identical mechanism with a different output, and it is safe for exactly the same reason: it is
**read from** the block that authors it rather than typed beside it, so it cannot drift.

**The stated reason for withholding is FALSE, and that was measured rather than argued.**
`OMISSIONS` in `src/content/design.ts` says the `colors` group is omitted because "One name to one
value cannot say that" — that a token has two values, one per theme, several of which trade places.
The premise sounds right and the format does not actually have it. Measured on 2026-08-26 with the
official linter, `@google/design.md` v0.4.0:

| Probe | Result |
|---|---|
| The shipped `DESIGN.md` as it stands | **0 errors, 0 warnings**, 5 infos (the declared omissions) |
| A `colors` group of 30 tokens named `light-*` / `dark-*` | **0 errors**, 1 warning: `missing-primary` |
| The same, plus `primary: "{colors.light-accent}"` and a `neutral` alias | **0 errors, 0 warnings** |
| `export --format css-vars` over that file | **33 CSS custom properties** emitted |

The spec's own words are why: the `colors` group is a flat `<token-name>: <Color>` map and "the exact
mapping from color palettes to color tokens may follow any consistent naming convention". A theme
suffix is such a convention. So a two-theme palette **is** expressible, the objection was about a
shape the format does not impose, and omitting the group costs the format's whole toolchain —
Tailwind v3 and v4 themes, W3C Design Tokens and CSS custom properties, all of which it can generate
from the values and none of which it can generate from prose.

**The spec also expects hex in the body prose**, which settles the other half: its own Colors example
is written `**Primary (#1A1C1E):** A deep ink used for headlines…`. Publishing a value in the body is
idiomatic in this format, not a transgression of it.

So this plan **retires the `colors` omission** and publishes the group, rather than correcting the
omission's wording as an earlier draft proposed.

After this plan, a reader — human or agent — can take `--accent` away from the page in either
theme, and no value has been typed in a second place.

## What plan 039 left behind, which this plan reads

**039 is done** — merged as `b1eea8a` (#217) and archived — so nothing here waits on it
[reconciled]. It is named because it moved two things this plan depends on:

- **`CONTROLS` has four entries, not five.** 039 deleted the `control` shortcut and, with it, that
  entry and its specimen in `src/pages/design.astro`. This plan does not read `CONTROLS` at all, so
  the change is invisible to it — but an excerpt quoting five entries would be stale.
- **`.design-sync/conventions.md` is shorter.** 039 regenerated both documents, which is why step 5's
  budget figures are restated against the merged tree rather than against `71bc7e1`.

Everything this plan touches in those two files is a disjoint region: `TOKEN_ROLES`, `OMISSIONS` and
`DESIGN_PAGE.lede` in the module, and the palette section on the page.

## Current state

### The values, and the one place they are authored

`src/layouts/BasicLayout.astro:452-489` — two sibling blocks inside a single `<style is:global>`,
preceded by a long header comment that defines every token's role and the progress-bar polarity
rule. Excerpt, verbatim:

```css
    :root[data-theme='light'] {
        --background: #FAFAFA; /* grey-50 */
        --card-background: #F5F5F5; /* grey-100 */
        --card-border: #E5E5E5; /* grey-200 */
        --shadow: #A82334; /* primary-600 */
        --accent: #A82334; /* primary-600 */
        --text: #0B0B0B; /* darkslate-900 */
        --progress-fill: #A82334; /* primary-600 */
        --progress-track: #E3B3B8; /* primary-150 */
        --status-live: #A82334; /* primary-600 */
        --status-halo: #A82334; /* primary-600 */
        --brand-ink: #A82334; /* primary-600 — 6.52:1 on the card */
        --sport-ride: #A82334; /* primary-600 — deep, for the card */
        --sport-ride-on-ink: #F3A3AA; /* primary-200 — pale, for the inverted bib face */
        --sport-run: #1F4E9C; /* marine-600 */
        --sport-run-on-ink: #9FC0F0; /* marine-200 */
    }

    :root[data-theme='dark'] {
        --background: #111111; /* darkslate-700 */
        ...
    }
```

**These blocks do not move.** `CLAUDE.md` names this file as the home of every colour token and
that stays true; this plan adds a reader, not a second author.

### What names the tokens today

`src/content/design.ts:130-146`:

```ts
export const TOKEN_ROLES: readonly {token: string, role: string}[] = [
    {token: "--background", role: "the page ground"},
    {token: "--card-background", role: "a card's plate, one step off the ground"},
    ...
    {token: "--sport-run-on-ink", role: "the same mark on ink"},
]
```

`tests/design-system.test.ts:158-169` already holds that list against the built stylesheet in both
directions:

```ts
    it("names every token the stylesheet defines, and no other", () => {
        const named = new Set(TOKEN_ROLES.map((t) => t.token));
        expect(named.size, "TOKEN_ROLES is empty — this gate would assert nothing")
            .toBe(TOKEN_ROLES.length);
        const defined = themes.light!;
        ...
```

`themeTokens(css)` at `tests/design-system.test.ts:109-119` parses `:root[data-theme=…]` blocks out
of the **built** CSS. That gate is not touched by this plan and remains the authority on which
tokens exist.

### What renders the token table

`src/lib/design-doc.ts:172-176`:

```ts
const tokenTable = () => [
    "| Token | Role |",
    "|---|---|",
    ...TOKEN_ROLES.map(({token, role}) => `| \`${token}\` | ${role} |`),
].join("\n")
```

It is called from both `renderFull()` and `renderAgent()`.

### The omission being corrected

`src/content/design.ts:294-300`:

```ts
export const OMISSIONS: readonly {section: string, reason: string}[] = [
    {
        section: "colors",
        reason: "Every token is defined twice, once per theme, and several swap polarity rather "
            + "than darkening. One name to one value cannot say that, so the roles are published "
            + "here and the values stay in the stylesheet, where both themes are.",
    },
```

The final clause — "the values stay in the stylesheet" — is the sentence this plan falsifies.

### The palette specimen on the page

`src/pages/design.astro`, inside the `key === "palette"` branch:

```astro
                                            <span class="design-name">{token}</span>
                                            <span class="design-role text-sm">{role}</span>
```

### Repo conventions this plan must honour

- **No value is typed twice.** Everything below derives. If a step has you typing a hex into a
  `.ts`, `.md` or `.astro` file, you have misread it — stop.
- **No count in any string a reader can see.** `src/content/design.ts`'s header states this; the
  markdown renderer derives every figure it prints. Do not add "fifteen tokens" anywhere.
- **`src/content/` is for meaning, `src/lib/` is for derivation.** `goal.ts` and `projection.ts`
  are the exemplars: they read authored data and compute. The new module is one of those and goes
  in `src/lib/`.
- **Nothing REACHABLE FROM `uno.config.ts` may import the new module.** State the guard by graph,
  not by directory — a directory rule is both too wide and too narrow. `uno.config.ts` loads
  `src/lib/icons.ts` through unconfig/jiti; that module imports `src/content/home`,
  `src/content/races`, `src/content/site` **and `src/lib/goal.ts`**, which is in `src/lib/` and is
  in the graph anyway. Verify the graph yourself rather than trusting this list — it is a fact
  about imports on the day it was written. `src/lib/design-doc.ts` and `src/pages/design.astro` may
  import the new module freely because neither is reachable from `uno.config.ts`.
- **Generated files are committed and gated by snapshot.** `DESIGN.md` and
  `.design-sync/conventions.md` are regenerated with `pnpm test:update` and drift fails `pnpm test`.
- **Comments carry the argument.** Every module in `src/` opens with why it exists. Match that —
  see `src/lib/design-doc.ts` for the register.

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

- Read `src/lib/design-doc.ts` end to end before step 5. Its header is the contract for what each
  audience may say, and it explains why the agent rendering drops things the full one keeps.
- Read the header of `tests/design-system.test.ts` before step 4. It states which links in the
  chain "stylesheet defines → module names → document and page render" already have a gate.

## Scope

**In scope** (the only files you may modify):

- `src/lib/palette.ts` (create)
- `tests/palette.test.ts` (create)
- `tests/design-system.test.ts` (modify — one new gate; existing ones untouched)
- `src/pages/design.astro` (modify — the palette specimen only)
- `src/lib/design-doc.ts` (modify — `tokenTable`, and the Overview paragraph in `renderFull()`
  whose "neither can tell you a colour" clause step 6 falsifies)
- `src/content/design.ts` (modify — **delete** the `colors` entry from `OMISSIONS` and the passage
  in its header that argues for it, one palette "Don't", **and
  `DESIGN_PAGE.lede`**, which says "Nothing here restates a value" under the h1 of a page that will
  print thirty hexes)
- `DESIGN.md` (regenerate — never hand-edit)
- `.design-sync/conventions.md` (regenerate — never hand-edit)
- `.design-sync/NOTES.md` (modify — record the budget decision in step 5)
- `CLAUDE.md` (modify — one sentence, step 7)

**Out of scope** (do NOT touch, even though they look related):

- `src/layouts/BasicLayout.astro`. **The values do not move and the selectors do not change.**
  De-anchoring `:root[data-theme=…]`, extracting the block into a `.css` file, or generating it
  from TypeScript are all real options and all of them are refused here: Astro's
  `inlineStylesheets: "auto"` once pushed these very tokens from a chunk into the page and took
  sixteen tests red with nothing wrong with the page — the story is written out in
  `tests/helpers/css.ts`. Anything that changes how this stylesheet ships is its own plan.
- **`AGENT_BUDGET`'s value in `tests/design-system.test.ts`. It may not be raised.** The number is
  a design agent's context window rather than this repository's, and its provenance is written
  beside it. If the agent rendering will not fit, that is a finding for the pull request body, not
  an edit — see the STOP conditions.
- `themeTokens()` and the four `it(` blocks that already exist in `tests/design-system.test.ts`
  above line 230. They gate the built CSS and are the reason this plan is low-risk.
- The drawing of `/design` — its layout, its cards, its navigation, its Do/Don't columns. Plan 042
  redraws the page. This plan changes **one specimen** and adds nothing to the page's structure.
- `tests/build-output.test.ts` and `tests/patch-wall.test.ts`. Both parse theme blocks out of the
  built CSS with an already-unanchored regex and are unaffected.
- Anything under `src/data/`.

## Git workflow

- Branch: `advisor/041-publish-a-tokens-two-values`
- Commit per step or per logical unit. Conventional commits, matching `git log` — e.g.
  `feat(design): derive every token's two values from the block that authors them`
- Do NOT push or open a pull request unless the operator instructed it.

## Steps

### Step 1: Add the reader

Create `src/lib/palette.ts`. It reads `src/layouts/BasicLayout.astro` **as text through Vite's
`?raw` query** and parses the two theme blocks.

**The import form is load-bearing and was measured rather than chosen.** Three ways to reach the
source were tested against a real `pnpm build` and a real `vitest run` at `71bc7e1`:

| Form | `astro build` | `vitest run` |
|---|---|---|
| `import src from "../layouts/BasicLayout.astro?raw"` | **works** (47131 chars) | **works** |
| `readFileSync("src/layouts/BasicLayout.astro")` — cwd-relative | works | works |
| `readFileSync(new URL("../layouts/BasicLayout.astro", import.meta.url))` | **FAILS — `ENOENT`** | works |

`import.meta.url` fails in the build because Astro bundles the SSR modules into a temporary
directory before running them, so the path resolves next to the bundle rather than next to the
source. Use `?raw`: it needs no filesystem access, does not depend on the working directory, is a
real module edge so a rebuild picks up an edit, and — measured — **needs no type declaration**:
`astro/client` already declares `*?raw`, and adding a `@ts-expect-error` above it makes
`pnpm check` fail with "Unused '@ts-expect-error' directive."

Target shape:

```ts
import themeSource from "../layouts/BasicLayout.astro?raw"

/** One token, and what it resolves to in each theme. Ordered as the stylesheet declares them. */
export type TokenValues = {token: string, light: string, dark: string}

export const PALETTE: readonly TokenValues[] = /* parsed from themeSource */
```

Parsing notes, all confirmed against the current file:

- The block opener is `:root[data-theme='light'] {` — single quotes in the source, though the
  parser should accept either quoting and none, the way the existing gates do.
- Each declaration is `--name: #VALUE;` optionally followed by a `/* … */` comment. Capture up to
  the `;` so the comment is excluded.
- Both blocks declare the same fifteen names in the same order. **Do not rely on that** — derive
  the order from the light block and look each name up in the dark one, and make a name present in
  one and missing in the other a thrown error rather than an `undefined` that renders as blank.
- The module must **throw** rather than export an empty array if either block fails to parse. A
  silent empty palette renders a page with no values and a green build; the failure has to be loud
  at build time. Say so in a comment.

Write the module header in this repository's register: what it derives, why it derives rather than
restates, why the `?raw` form and not the other two (with the measurement above), and the standing
constraint that nothing under `src/content/` may import it.

**Verify**: `pnpm check` → exit 0. Then `pnpm build` → exit 0.

### Step 2: Prove the reader is not lying

Create `tests/palette.test.ts`. Above its first `describe(`, state what the suite is for — this
repository gates that (`tests/docs-drift.test.ts`), and a suite added without a reason is red.

Assertions, each with a message naming what a failure means:

1. **Vacuity floor** — `PALETTE.length` is greater than ten. Without this every assertion below is
   satisfied by an empty array.
2. **Both values are colours** — every `light` and every `dark` matches `/^#[0-9A-Fa-f]{3,8}$/`.
   A parse that captured a trailing comment or an empty string fails here.
3. **No duplicate token.**
4. **The set matches `TOKEN_ROLES`, both ways.** Import `TOKEN_ROLES` from `src/content/design.ts`
   and compare. This is what stops the reader and the role list from disagreeing.
5. **The set matches the built stylesheet, both ways** — reuse `pageCss()` from
   `tests/helpers/css.ts` and the same `:root[data-theme=…]` parse the existing suite uses, and
   compare token names AND values. This is the assertion that makes the whole plan safe: it proves
   the values the page prints are the values the browser resolves.

   **COMPARE CANONICALLY, NOT VERBATIM — the built sheet is MINIFIED and a verbatim comparison is a
   false red on correct code.** The minifier lower-cases hex and folds `#111111` to `#111`, so of
   the thirty declarations only a handful survive a literal match. `tests/build-output.test.ts:1056`
   already reads theme values out of the built sheet and is the working example; `expandHex` in
   `tests/helpers/contrast.ts` covers the shorthand half of the problem but not the case half.
   Normalise both sides at the comparison — lower-case, and expand three digits to six.
   **Do NOT normalise inside the palette module.** Step 1 captures the source verbatim, and a
   done criterion below greps `DESIGN.md` for a case-sensitive `A82334`; lower-casing in the parser
   turns that criterion red.
6. **Every value reaches the full markdown rendering, and none reaches the agent one.** For every
   `PALETTE` entry, both values appear in `renderDesignDoc("full")`; for the agent rendering, no
   hex appears at all. This is the document-side twin of step 4's page-side gate, and without it
   the chain reopens the exact hole plan 040 was ordered first to close — a value that reaches the
   page and not the spec, with a snapshot that matches itself either way. It also holds step 5.2's
   measured budget decision in **both** directions rather than only recording it in `NOTES.md`.
   Vacuity floor on `PALETTE.length`.
7. **At least one token's two values differ.** If light and dark were ever parsed from the same
   block, every pair would be identical and assertions 1–5 would all still pass. Measured at
   `71bc7e1`, `--text` is `#0B0B0B` / `#FAFAFA`; assert the property ("some token's values
   differ"), not that pair, so the gate survives a repalette.

**Then prove the gate bites.** Temporarily change one hex in
`src/layouts/BasicLayout.astro` — for example `--accent` in the light block — and run
`SKIP_BUILD=1 pnpm test palette` after a `pnpm build`. Assertion 5 must go red. **Revert the
mutation with `git diff` and a manual edit, not `git checkout --`**, which would eat uncommitted
work elsewhere in the tree. Record the observed failure message in the pull request body.

**Verify**: `SKIP_BUILD=1 pnpm test palette` → all pass. The mutation above → assertion 5 red.

### Step 3: Print both values on the page

**This drawing is provisional and plan 042 re-draws it.** 042 replaces this whole specimen with a
four-column ledger, so the rows you add here are rework by design. The split is deliberate rather
than an oversight: 042's direction is unconfirmed by its own step 0, so folding this work into it
would risk `/design` never publishing a value at all. Draw it plainly and do not over-invest.

In `src/pages/design.astro`, the `key === "palette"` branch: join `TOKEN_ROLES` to `PALETTE` by
token name and render each row's two values after the token name and before the role.

The treatment is **not new**. A literal a reader is meant to copy already wears the hairline box
this page invents — `.design-name`, argued in place as the site's answer to having no monospace
face. A hex is that same kind of thing, so it wears that same box, at a smaller size, with
`font-variant-numeric: tabular-nums` and `user-select: all` so a click selects the whole value.
Add one class for it; do not invent a second treatment and do not add a copy button — a button
needs script, and this site ships almost none.

Each value needs a label saying which theme it is, and the label may not be a bare word floating
beside a hex. The page today carries **two** uppercase registers — the page header's chips, which
are the site's own, and `.design-guide-heading`, which this page invented. Set the theme labels in
`.design-guide-heading`. That class is re-toned to the chip's register by plan 042, so taking it
here means the labels follow that correction for free. **Do not invent a new register for these
labels.**

Keep the row wrapping. `.design-row` is a wrapping flex row on purpose — the comment above it
explains that a three-column grid shatters a long name into single letters at the 200% zoom WCAG
asks for. Two more items in that row must not turn it into a grid.

**Verify**: `pnpm build`, then
`grep -o 'design-hex' dist/design/index.html | wc -l` → at least twice `PALETTE.length`.
Then `pnpm preview` and read the page in both themes at **1280, 390 and 320**, and again **at a
40px root font size**. Required at every one of those: no horizontal document overflow, and no
token name broken mid-word. This is a browser step because the suite has no layout engine, and
`.design-row`'s own comment is the reason it is needed — two more items in a wrapping row is
exactly the pressure that comment describes. Record the measurements in the pull request body.

### Step 4: Add the page-side gate

In `tests/design-system.test.ts`, in the block that already reads `DESIGN_PAGE_FILE`, add one
assertion: **every token's row in the built page carries that token's own two values.**

**Assert PER ROW, not per document, and this is the load-bearing part of the step.** A
document-wide substring test is not the property: measured at `71bc7e1`, the two theme blocks
declare thirty values over only **fourteen distinct hexes** — `#A82334` is worn by eight tokens,
`#F3A3AA` by five, `#F9CDD3` by three, and three more by two each. So "both of this token's values
appear somewhere in the page" stays green for most tokens with **both of their own cells missing**,
because another token supplies the string. Locate each row by its token name, which is unique and
already rendered in `.design-name`, and require that row's own text to carry its pair. Keep a floor
of twice `PALETTE.length` value cells as a companion check, and say in the comment why the
document-wide form is insufficient — otherwise someone will simplify it back.

Plan 042 restacks exactly these rows under container queries, which is where a dropped cell is
easiest to introduce and hardest to see.

Watch the trap the existing suite already names in its own comments — and note it cuts the
opposite way here from step 2. The minifier shortens `#111111` to `#111` and lower-cases inside a
*stylesheet*, which is why step 2's assertion 5 must compare canonically. These values are page
**text**, not declarations, so they ship verbatim and the verbatim form is the right assertion.
If that turns out to be false, assert the normalised form and say why in a comment — do not loosen
the assertion to a substring of the token name, which would make it unfalsifiable.

The page also needs the entity and split-text-node normalisation plan 040 introduces for its
page-reading gates. Reuse that helper rather than writing a second one.

**Verify**: `SKIP_BUILD=1 pnpm test design-system` → all pass.

### Step 5: Give the full markdown rendering the same table — and only the full one

In `src/lib/design-doc.ts`:

1. `tokenTable()` grows two columns for the `full` audience: `| Token | Light | Dark | Role |`,
   values in backticks, derived from `PALETTE`.
2. **`renderAgent()` keeps the roles-only table**, and this is a measured decision rather than an
   omission. Measured against the merged tree at `b1eea8a` [reconciled]:
   `.design-sync/conventions.md` is **3,859 characters** against
   the **4,096** budget asserted by `tests/design-system.test.ts`, leaving **237 spare**. Two value
   columns over fifteen rows cost about **323** — twice the headroom. It does not fit, and it
   should not: that document's own "The stylesheet is a closed set" section already tells the agent
   the shipped stylesheet "restates both themes' tokens above its rules", so the agent is holding
   the values already. Spending a system prompt on a table the reader can read out of its own
   bound artifact is the most expensive duplication available.
   **Re-measured against the merged tree at `b1eea8a`** [reconciled]: the agent rendering is
   **3,859 characters, so 237 spare** — 039 saved 74 characters, not the two hundred that was
   estimated before it landed. The conclusion is unchanged, because 237 is still well under the
   ~323 two value columns cost. **Re-measure again yourself**: every input to both figures can
   move, and step 6 rewrites a "Don't" this audience carries.
3. Because `tokenTable()` now has two callers wanting different shapes, give it an audience
   parameter rather than writing a second function. The header of that file states the rule in as
   many words: *add an audience here rather than a second renderer.*
4. Record the budget decision in `.design-sync/NOTES.md`, beside the existing notes, in one short
   paragraph: what was measured, why the agent keeps roles only, and that the values are in the
   bundle's own stylesheet.

**Verify**: `pnpm test:update`, then `git diff DESIGN.md` shows the four-column table and
`git diff .design-sync/conventions.md` shows the two-column one unchanged in shape. Then
`SKIP_BUILD=1 pnpm test design-system` → all pass, including the budget assertion.

### Step 5b: Publish the `colors` token group, per the format's own schema

In `src/lib/design-doc.ts`'s `frontMatter()` — the **`full` audience only**; the agent rendering
carries no front matter at all, by design.

Emit a `colors` map derived from `PALETTE`, one entry per token per theme, named with a theme prefix
or suffix consistently. Then two aliases so the linter's `missing-primary` rule is satisfied, written
with the spec's own `{colors.x}` reference syntax rather than by repeating a hex:

```yaml
colors:
  primary: "{colors.light-accent}"
  neutral: "{colors.light-background}"
  light-background: "#FAFAFA"
  ...
  dark-sport-run-on-ink: "#1F4E9C"
```

**Which theme the aliases point at is a decision, not an accident**: light is what the site serves
with no stored preference, and `THEMING.themes` already states that in as many words. Say so in a
comment, because a reader will otherwise read it as arbitrary.

**Derive the names; do not write thirty of them.** The token names come from `PALETTE`, the prefix is
one string, and the leading `--` is stripped because a YAML key beginning with a dash is not what the
format's `<token-name>` means.

**Verify** — this is the step's real gate and it is an external tool rather than the suite:

```
pnpm test:update
npx --yes @google/design.md@latest lint DESIGN.md
```

Expected: `"errors": 0, "warnings": 0`. Measured at the time of writing, that command reports exactly
that for a file shaped as above, and reports `missing-primary` as a warning without the aliases.
Then, as evidence the publication is worth something:

```
npx --yes @google/design.md@latest export DESIGN.md --format css-vars
```

Expected: one `--color-…` custom property per token, twice the palette's length plus the aliases.
Record the count in the pull request body.

**Do not add `@google/design.md` as a dependency.** `pnpm-workspace.yaml` turns peer auto-install off
and this repository is deliberate about its tree; `npx --yes` needs nothing installed. Adding this to
CI is a separate decision — see Maintenance notes.

### Step 6: Retire the `colors` omission, and correct the palette's "Don't"

In `src/content/design.ts`:

1. `OMISSIONS[0]` — **delete the `colors` entry.** The group is no longer omitted; step 5b publishes
   it. Leave the other four entries alone. The header comment above `OMISSIONS` argues at length that
   the colour omission is "the load-bearing one" and that a single map "would be false in the
   direction that makes a design fail in whichever theme was not written down" — **that whole passage
   goes**, because a `light-*` / `dark-*` map is not a single map and is not false in either theme.
   Replace it with what is now true: every group this system genuinely has no scale for is omitted,
   and colours are published as a theme-suffixed pair with a `primary` alias so the format's own
   exporters can read them.
2. `SECTIONS.palette.donts` — the first entry currently reads "Hardcode a hex. There is no token
   here whose value is worth restating." That sentence is now false about its own page. Replace it
   with an instruction that is true and still says the same thing: the values are printed so a
   design can be checked against them, and only the token name carries **both**, so a hardcoded hex
   is right in at most one theme.
3. Update the module header's "NO COUNTS EITHER" neighbourhood: the one-line rule at the top says
   not to type a hex "that the page could read out of the build instead". That is still exactly
   right and does not change — but add a sentence making the distinction explicit, because a future
   reader will otherwise see a hex on the page and conclude the rule was abandoned. State it as:
   *authoring a value here is forbidden; deriving one and printing it is what the page is for.*

4. **`DESIGN_PAGE.lede`.** It reads "Nothing here restates a value, so nothing here can go out of
   date". After this plan the page prints thirty hexes under that sentence. It is not enough to
   delete the clause — the *reason* it gave is the page's whole claim and is still true. Say the
   true, stronger version: nothing here is **authored** twice; every value on the page is read out
   of the block that declares it, which is why the page cannot go out of date even though it now
   tells you what each colour is.

**Verify**: `pnpm test:update`, then `SKIP_BUILD=1 pnpm test design-system content` → all pass.
Then **re-measure `.design-sync/conventions.md`** and report the character count and the remaining
headroom in the pull request body. Step 2's palette "Don't" is carried by the agent audience, so
rewriting it moves that number, and plan 043's whole budget argument starts from it.

### Step 6b: Correct the spec's own Overview — it currently promises the opposite

**This step is why the plan cannot stop at step 6, and skipping it ships a document that contradicts
itself on one screen.** `renderFull()` in `src/lib/design-doc.ts` authors an Overview paragraph that
lands at `DESIGN.md:41-44` and in the byte-identical `/design.md`:

```
It restates no value. What each token is FOR is authored in `src/content/design.ts`; what
each token IS lives in the theme block of `src/layouts/BasicLayout.astro` …
the first of those, so neither can disagree with it — and neither can tell you a colour,
because neither is where a colour is written down.
```

Step 5 puts a four-column hex table a few lines beneath that. Correct the paragraph in
`src/lib/design-doc.ts` — not in `DESIGN.md`, which is generated. What it must say after: the
values are not authored here, they are **read** from the theme block, which is why the table below
can carry both of a token's values and still have exactly one home.

**Do not defer this to plan 042.** 042 declares `src/lib/design-doc.ts` out of scope, and its own
step 0 may stop the plan entirely, so nothing else in the chain repairs this sentence.

**The third site needs no change and that is worth saying so nobody "fixes" it.**
`src/pages/design.astro`'s header rule — *if you are about to type a hex, a rem or a class name
that the build already knows, stop* — remains exactly true of a derived value. Step 6.3 adds the
sentence that makes the distinction explicit rather than leaving a future reader to infer the rule
was abandoned.

**Verify**: `pnpm test:update`, then
`grep -c 'tell you a colour' DESIGN.md` → **0**, and
`grep -c 'restates no value' DESIGN.md` → **0**.

### Step 7: Tell `CLAUDE.md`

The Styling System section says colour tokens "are CSS custom properties in `BasicLayout.astro`".
That stays true and must not be softened. Add, in the same bullet or the one below it, that those
two blocks are also **read at build time** by `src/lib/palette.ts`, which is what lets `/design`
and `DESIGN.md` print a value without a second home — and that the blocks' selector shape is
therefore load-bearing for three readers, not one.

Keep it to two sentences. `tests/docs-drift.test.ts` resolves every backticked path in this file
against the tree, so `src/lib/palette.ts` must exist before this edit is green.

**Verify**: `SKIP_BUILD=1 pnpm test docs-drift` → all pass.

### Step 8: Full gate

**Verify**: `pnpm test` → exit 0; `pnpm check` → exit 0; `pnpm eslint` → exit 0.
`git status` shows changes only to files in the In-scope list.

## Test plan

New tests, all in `tests/palette.test.ts` unless stated:

- vacuity floor on `PALETTE.length`
- every value matches a hex pattern
- no duplicate token
- token set equals `TOKEN_ROLES`, both directions
- token set **and values** equal the built stylesheet's, both directions
- at least one token's two values differ

New test in `tests/design-system.test.ts`:

- every token's two values appear in the built `dist/design/index.html`

Model the file's structure on `tests/design-system.test.ts`: a header stating what the suite is for
above the first `describe(`, one `it(` per property, and a message on every `expect` that says what
a failure means rather than what was compared.

**Verification**: `pnpm test` → exit 0, with the new tests present and passing, and the delta
against your own re-measured baseline accounted for.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `src/lib/palette.ts` exists and `grep -c '#' src/lib/palette.ts` returns **0 hex literals** —
      verify by eye that no `#RRGGBB` appears in the file; the parser may contain `#` inside a
      regex, so read the matches rather than trusting the count
- [ ] `grep -rn '#A82334' src/pages src/content src/lib --include=*.ts --include=*.astro` returns
      no matches — no value has been typed into a second home
- [ ] `grep -c 'A82334' DESIGN.md` returns a non-zero count — the spec now publishes values
- [ ] `npx --yes @google/design.md@latest lint DESIGN.md` reports **0 errors and 0 warnings**. This is
      the conformance gate and it is an external tool; record the JSON summary in the pull request
- [ ] `npx --yes @google/design.md@latest export DESIGN.md --format css-vars` emits one
      `--color-…` property per published token; record the count
- [ ] `sed -n '/^---$/,/^---$/p' DESIGN.md | grep -c '^colors:'` returns **1**, and
      `sed -n '/^---$/,/^---$/p' DESIGN.md | grep -c 'section: colors'` returns **0** — the group is
      published and no longer declared omitted
- [ ] `grep -c 'A82334' .design-sync/conventions.md` returns **0** — the agent brief does not
- [ ] `pnpm build && grep -o 'design-hex' dist/design/index.html | wc -l` returns at least twice
      `PALETTE.length`. **`grep -o … | wc -l`, not `grep -c`** — `grep -c` counts matching *lines*,
      and Astro emits this markup on very few of them, so the count would never reach the floor
      however correct the page was. Keep "at least": the scoped `.design-hex` rule in the page's own
      `<style>` contributes one further match
- [ ] `grep -c 'tell you a colour' DESIGN.md` returns **0** and `grep -c 'restates no value'
      DESIGN.md` returns **0** — the spec no longer promises the opposite of what it now does
- [ ] `grep -c 'restates a value' src/content/design.ts` returns **0** — `DESIGN_PAGE.lede` has been
      corrected rather than left contradicting its own page
- [ ] The pull request body carries the step 3 browser measurements: 1280, 390 and 320, both themes,
      and again at a 40px root, each with the overflow and word-breaking result
- [ ] `git diff --name-only` lists only files from the In-scope section
- [ ] `plans/README.md` is **unmodified**

## STOP conditions

Stop and report back (do not improvise) if:

- The theme blocks in `src/layouts/BasicLayout.astro` no longer match the excerpt in "Current
  state" — a different selector, a different quoting, or values that are not plain hex (a
  `color-mix()`, an `oklch()`, a `var()` reference). The parser in step 1 is specified against plain
  hex and a different shape needs a decision, not a wider regex.
- `?raw` does not resolve, or `pnpm check` reports an error on the import. Re-run the measurement
  table in step 1 and report which forms work; do not fall back to `import.meta.url`, which is
  measured to fail in the build.
- The agent budget assertion goes red. That means step 5's decision was wrong for the tree as it
  now stands; report the measured character count and the budget rather than trimming
  `src/content/design.ts` to fit, which would take guidance off `/design` to buy room in a third
  document. **Raising `AGENT_BUDGET` is not an option available to you** — the number is a design
  agent's context window rather than this repository's, and its provenance is written beside it.
- Any assertion in `tests/design-system.test.ts` above line 230 changes behaviour. Those gate the
  built CSS; this plan must not be able to move them.
- You find yourself typing a hex, a rem or a count into any file.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **Spec conformance is checked by an external tool, not by `pnpm test`.** That is deliberate and it
  is the same division `tests/dns-config.test.ts` argues for: the linter needs the network and a
  version that moves, so it runs when somebody touches the format. **A green `pnpm test` is therefore
  not evidence that `DESIGN.md` still conforms.** Putting `npx @google/design.md lint` into CI is a
  reasonable follow-up and was deliberately not taken here: `@latest` drifts, and a pinned version is
  a dependency decision this plan should not make on its own.
- **The body's structure is still not canonical, and that is plan 044's subject.** This plan
  publishes the front-matter tokens; it does not rename `## Colour` to the spec's `## Colors`, does
  not add a canonical `## Do's and Don'ts` section and does not reorder the body. All three are
  tolerated — the spec's own table says an unknown section heading is preserved rather than an error,
  and only a *duplicate* heading is fatal — so this plan leaves them and 044 decides.
- **Plan 040's gates do not yet cover the value columns**, because they were written before this
  plan existed: they assert that every token's *name* and *role* reach every surface. Step 4 here
  adds the page-side value assertion and step 2's assertion 5 covers the module. If a future
  audience is added to `renderDesignDoc`, ask whether it should carry values and record the answer
  the way 040's step 3 records a dropped section.
- **The selector shape of the two theme blocks now has three readers**, not one:
  `tests/design-system.test.ts`'s `themeTokens()`, `.design-sync/prepare-css.mjs`'s
  single-sheet detector, and `src/lib/palette.ts`. A future plan that de-anchors `:root`, moves the
  block into a `.css` file or generates it from TypeScript must retarget all three, and must weigh
  the inline-versus-chunk hazard recorded in `tests/helpers/css.ts`.
- **What a reviewer should scrutinise**: that no hex was typed anywhere; that the new gate compares
  values and not just names; and that the mutation in step 2 was actually run and reported, because
  a value gate that cannot fail is worse than none.
- **Deliberately deferred**: a copy-to-clipboard control (needs script, and a selectable literal
  already serves); publishing contrast ratios beside each pair (the arithmetic exists in
  `tests/patch-wall.test.ts` but which pairs are worth publishing is a content decision, not a
  mechanical one); and any change to how the stylesheet ships.
