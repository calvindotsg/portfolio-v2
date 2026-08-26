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
- **Risk**: LOW — nothing moves. One new derivation, one new gate, and three documents gain a
  column. No stylesheet changes, so no contrast, layout or cascade assertion can be disturbed.
- **Depends on**: **040**, which makes every rendering of `src/content/design.ts` provably reach
  every surface. Hard dependency in one direction only: without it, a document that stopped
  carrying the new value columns would still match its own snapshot. Also **039**, for sequencing
  rather than semantics — see "Why the dependency on 039 is only sequencing" below.
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

**The stated reason for withholding was never secrecy.** `OMISSIONS` in `src/content/design.ts`
says the `colors` group is omitted because "One name to one value cannot say that" — that a token
has two values, one per theme, several of which trade places. That objection is about the DESIGN.md
front-matter format, and it is correct; it says nothing about a table in the body, which can carry
a pair. This plan satisfies the objection rather than overruling it: **the front-matter group stays
omitted, its reason is corrected to name the real limitation, and the body table publishes both
values.**

After this plan, a reader — human or agent — can take `--accent` away from the page in either
theme, and no value has been typed in a second place.

## Why the dependency on 039 is only sequencing

Plan 039 deletes the `control` shortcut, removes one entry from `CONTROLS` in
`src/content/design.ts`, removes the icon-plate specimen from `src/pages/design.astro`, and
regenerates `DESIGN.md` and `.design-sync/conventions.md`. This plan touches `TOKEN_ROLES` and
`OMISSIONS` in the first file and the palette section in the second — **disjoint regions**, and it
does not read `CONTROLS` at all. The only interaction is a textual merge conflict if both branches
are open on the same files, and the regeneration in step 6 is the same command 039 runs.

**If 039 has already landed when you start, nothing in this plan changes.** If it has not, you may
still execute — but say so in the pull request body, because the two branches will both regenerate
`DESIGN.md` and whichever lands second must re-run `pnpm test:update`.

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
- **Nothing under `src/content/` may import the new module.** `uno.config.ts` loads
  `src/lib/icons.ts` through unconfig/jiti, and that module imports `src/content/home`,
  `src/content/races` and `src/content/site` — so those three and their graph run under jiti. Keep
  the new module out of that graph; `src/lib/design-doc.ts` and `src/pages/design.astro` may import
  it freely because neither is reachable from `uno.config.ts`.
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
- `src/lib/design-doc.ts` (modify — `tokenTable` and one authored sentence)
- `src/content/design.ts` (modify — the `colors` omission's reason, and one palette "Don't")
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
6. **At least one token's two values differ.** If light and dark were ever parsed from the same
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

In `src/pages/design.astro`, the `key === "palette"` branch: join `TOKEN_ROLES` to `PALETTE` by
token name and render each row's two values after the token name and before the role.

The treatment is **not new**. A literal a reader is meant to copy already wears the hairline box
this page invents — `.design-name`, argued in place as the site's answer to having no monospace
face. A hex is that same kind of thing, so it wears that same box, at a smaller size, with
`font-variant-numeric: tabular-nums` and `user-select: all` so a click selects the whole value.
Add one class for it; do not invent a second treatment and do not add a copy button — a button
needs script, and this site ships almost none.

Each value needs a label saying which theme it is, and the label may not be a bare word floating
beside a hex. Use the register the page already has after 041 has not yet run: the existing
`.design-guide-heading` label style is the page's only small-caps register today, and reusing it
here is correct. **Do not add a third register.**

Keep the row wrapping. `.design-row` is a wrapping flex row on purpose — the comment above it
explains that a three-column grid shatters a long name into single letters at the 200% zoom WCAG
asks for. Two more items in that row must not turn it into a grid.

**Verify**: `pnpm build`, then
`grep -o 'design-hex[^<]*' dist/design/index.html | head -4` → four matches carrying hexes.
Then `pnpm preview` and read the page at 1280 and at 390 in both themes; confirm no row overflows
its card horizontally at either width.

### Step 4: Add the page-side gate

In `tests/design-system.test.ts`, in the block that already reads `DESIGN_PAGE_FILE`, add one
assertion: **every token in `PALETTE` has both of its values present in the built
`dist/design/index.html`.** Not "some hex is present" — that would pass on a single row.

Watch the trap the existing suite already names in its own comments: the minifier may shorten
`#111111` to `#111` inside a *stylesheet*, but these values are page **text**, not declarations, so
they ship verbatim. Assert the verbatim form, and if that turns out to be false, assert the
normalised form and say why in a comment — do not loosen the assertion to a substring of the token
name, which would make it unfalsifiable.

**Verify**: `SKIP_BUILD=1 pnpm test design-system` → all pass.

### Step 5: Give the full markdown rendering the same table — and only the full one

In `src/lib/design-doc.ts`:

1. `tokenTable()` grows two columns for the `full` audience: `| Token | Light | Dark | Role |`,
   values in backticks, derived from `PALETTE`.
2. **`renderAgent()` keeps the roles-only table**, and this is a measured decision rather than an
   omission. Measured at `71bc7e1`: `.design-sync/conventions.md` is **3,933 characters** against
   the **4,096** budget asserted by `tests/design-system.test.ts`, leaving **163 spare**. Two value
   columns over fifteen rows cost about **323** — twice the headroom. It does not fit, and it
   should not: that document's own "The stylesheet is a closed set" section already tells the agent
   the shipped stylesheet "restates both themes' tokens above its rules", so the agent is holding
   the values already. Spending a system prompt on a table the reader can read out of its own
   bound artifact is the most expensive duplication available.
   **Re-measure both figures yourself** — every input to them can move, and 039 changes the length
   of that document.
3. Because `tokenTable()` now has two callers wanting different shapes, give it an audience
   parameter rather than writing a second function. The header of that file states the rule in as
   many words: *add an audience here rather than a second renderer.*
4. Record the budget decision in `.design-sync/NOTES.md`, beside the existing notes, in one short
   paragraph: what was measured, why the agent keeps roles only, and that the values are in the
   bundle's own stylesheet.

**Verify**: `pnpm test:update`, then `git diff DESIGN.md` shows the four-column table and
`git diff .design-sync/conventions.md` shows the two-column one unchanged in shape. Then
`SKIP_BUILD=1 pnpm test design-system` → all pass, including the budget assertion.

### Step 6: Correct the omission's reason, and the palette's "Don't"

In `src/content/design.ts`:

1. `OMISSIONS[0]` — the `colors` group **stays omitted**. Rewrite only its `reason` so it names the
   real limitation and points at what now exists: the format's front matter maps one name to one
   value, this palette's tokens each have two and several trade places, so the pair is published in
   the table in the body rather than flattened into a map that would be false in whichever theme
   was not written down. Keep the module's own voice; the surrounding entries are the register.
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

**Verify**: `pnpm test:update`, then `SKIP_BUILD=1 pnpm test design-system content` → all pass.

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
- [ ] `grep -c 'A82334' .design-sync/conventions.md` returns **0** — the agent brief does not
- [ ] `pnpm build && grep -c 'design-hex' dist/design/index.html` returns at least 30
      (two per token; re-derive the floor from `PALETTE.length` rather than trusting 30 if the
      palette has changed)
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
  document.
- Any assertion in `tests/design-system.test.ts` above line 230 changes behaviour. Those gate the
  built CSS; this plan must not be able to move them.
- You find yourself typing a hex, a rem or a count into any file.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

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
