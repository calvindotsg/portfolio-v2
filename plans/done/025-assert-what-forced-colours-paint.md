# Plan 025: Assert what forced colours PAINT a mark, not merely that some rule reaches it

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT update `plans/README.md`; your reviewer
> maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat 219dcde..HEAD -- src/layouts/BasicLayout.astro tests/build-output.test.ts`
> If either file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a
> STOP condition. The pin is path-scoped and deliberate — it asks whether these
> two files moved, not whether the branch did.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `219dcde`, 2026-08-08

## Why this matters

Windows High Contrast and every other forced-colours mode overrides
`background-color`. On this site a mark is a UnoCSS `presetIcons` **mask painted
over `background-color`**, so the mode erases it — and where the mark is a
control's only visible name, it erases the control. `BasicLayout.astro` repairs
that, and **the repair has two halves**: `forced-color-adjust: none`, which lets
author colour through at all, and the system colour each mark is then given —
`CanvasText` bare, `LinkText` inside an anchor, `ButtonText` inside a button, so
a glyph agrees with the words beside it.

**The gate written to protect that asserts reach, and reads neither half.**
`tests/build-output.test.ts`'s "keeps a name on every icon-only control when
colours are forced" walks every built page, finds every icon-only control, and
asks whether *any* forced-colours rule matches the glyph. It never reads a
declaration. Two measured consequences, both with the whole suite green:

- change `CanvasText` to `Canvas` in the shared block → 32 marks painted the
  ground colour, invisible;
- move `forced-color-adjust: none` out of the base rule into the `a` and
  `button` arms → all 32 bare marks erased, because without the opt-out the mode
  discards the author's `background-color` entirely.

This is the failure class the repository already knows by name: a gate's real
predicate left unasserted while its logic is fully tested. It is an **inherited**
hole rather than a new one, and it is worth one assertion.

## Current state

### The rules under test — `src/layouts/BasicLayout.astro:708-724`

```css
@media (forced-colors: active) {
    span[aria-hidden][class^="i-"],
    span[aria-hidden][class*=" i-"] {
        forced-color-adjust: none;
        background-color: CanvasText;
    }

    a span[aria-hidden][class^="i-"],
    a span[aria-hidden][class*=" i-"] {
        background-color: LinkText;
    }

    button span[aria-hidden][class^="i-"],
    button span[aria-hidden][class*=" i-"] {
        background-color: ButtonText;
    }
}
```

The comment above them states the rule this plan turns into an assertion:
*"WHICH SYSTEM COLOUR IS DECIDED BY WHAT CONTAINS THE MARK, because the mode
reserves a different one for each kind of thing and a glyph must agree with the
words beside it — an anchor's own text is forced to LinkText whatever the author
says."*

As shipped (minified, system-colour keywords lower-cased) these land in
`dist/_astro/icons.*.css`:

```
@media (forced-colors:active){span[aria-hidden][class^=i-],span[aria-hidden][class*=\ i-]{forced-color-adjust:none;background-color:canvastext}a span[aria-hidden][class^=i-],a span[aria-hidden][class*=\ i-]{background-color:linktext}button span[aria-hidden][class^=i-],button span[aria-hidden][class*=\ i-]{background-color:buttontext}}
```

**The minifier lower-cases these keywords**, so every comparison in the new test
must be case-insensitive. A case-sensitive match fails on correct CSS; the
existing chevron assertion in `tests/rendered-html.test.ts` records that it went
red exactly this way once.

### The gate that exists, and what it does not ask — `tests/build-output.test.ts`

Inside `it("keeps a name on every icon-only control when colours are forced")`:

```ts
const covered = selectors.some((s) => {
    try { return glyph.matches(s); } catch { return false; }
});
expect(covered, `${page}: <${control.tagName.toLowerCase()} …> has no visible name but its glyph, …`).toBe(true);
```

`selectors` is every selector inside every `@media` block mentioning
`forced-colors`. The test collects selectors and discards the declaration bodies,
so `background-color: Canvas` satisfies it exactly as well as `CanvasText` does.
It also restricts itself to **icon-only** controls (`continue` when the control
has visible words), which excludes every bare mark — the 32 the base rule is for.

Declarations *are* read elsewhere in this suite — `tests/build-output.test.ts`
around line 1339 and `tests/mobile-hero-contrast.test.ts:223-230` both do it —
but neither reads them for a glyph. The one assertion that does is
`tests/rendered-html.test.ts`'s `it("keeps the control's chevron painted when
forced colours override background-color")`, and it asks about **one element**,
the `EventsLink` chevron, taking the **last** matching declaration. That chevron
sits inside an `<a>`, so the value it reads is `LinkText` — mutating the base
rule's `CanvasText` leaves it untouched.

### Measured, on a real `pnpm build` of the current tree

A probe replicating the proposed gate over all five built pages:

```
glyphs examined: 78
  32  (bare)  -> canvastext
  44  a       -> linktext
   2  button  -> buttontext
forced-color-adjust values seen: none
MISMATCHES against the container rule: 0
```

So the gate specified below is **green on the current, correct build**, and all
three arms are exercised.

Four mutations, each applied and re-probed:

| mutation | result |
|---|---|
| base `canvastext` → `canvas` | **32** mismatches, every bare mark |
| anchor `linktext` → `canvastext` | **44** mismatches |
| button `buttontext` → `canvas` | **2** mismatches |
| `forced-color-adjust: none` moved out of the base rule into the two arms | **32** bare marks lose the opt-out — green today, and the assertion in step 2 is what closes it |

Note the casing difference between the two mutation tables in this plan: the one
above was measured against the **minified shipped sheet**, which is lowercase.
Step 3 mutates the **source**, which is CamelCase. They cannot be merged.

### Conventions to match

- The new assertion belongs in `tests/build-output.test.ts`, beside the existing
  forced-colours gate, because it is a **build-wide** question asked of every
  page.
- **Read the page's CSS with `pageCss(page)`, not by joining inline styles with
  `cssChunks()`.** This is load-bearing rather than stylistic. The gate's whole
  rule is *last declaration wins*, and `dist/index.html` carries
  `<link rel=stylesheet>` at byte 4952 and its inline `<style>` at 5009 — the
  shared sheet is **first** in the document. A hand-rolled `inline + shared`
  concatenation is therefore the **inverse** of the cascade: measured, with a
  synthetic component rule injected into the page's own `<style>`, the join order
  reports 0 mismatches and stays green on the defect while document order reports
  2. `pageCss` exists for exactly this and says so in its own comment —
  *"Links and inline blocks are returned interleaved in document order, so
  later-wins reasoning over the result stays sound."* It is also per-page, where
  `cssChunks()` would hand `index.html` and `404.html` the forced-colours rules
  of a chunk neither page loads.
- `parseRules`, `pageCss`, `lastDecl` and `structuralSelector` are **already
  imported** at the top of `tests/build-output.test.ts` (lines 16–17). Use them;
  do not write a second brace-walk.
- Tests here carry a block comment stating what the assertion is *for* and what
  it caught. Match that register: the comments are load-bearing prose, not
  decoration. Read the existing forced-colours `it(...)`'s comment as the
  exemplar.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Lint | `pnpm eslint` | exit 0, 0 problems (says nothing about `.ts`) |
| Tests | `pnpm test` | see step 1 — you record the baseline |
| Build only | `pnpm build` | exit 0, 5 pages |
| Faster iteration | `SKIP_BUILD=1 pnpm test build-output` | reuses the existing `dist/` |

`pnpm test` runs `pnpm build` first (`globalSetup` in `vitest.config.ts`), so
`dist/` is real. `pnpm eslint` globs `src/**/*.{js,astro}` and `scripts/**/*.mjs`
and therefore says nothing about a `.ts` test file; `pnpm check` and the suite
are what gate it.

## Scope

**In scope** (the only file you should modify):

- `tests/build-output.test.ts` — add exactly one `it(...)`.

**Out of scope** (do NOT touch, even though they look related):

- `src/layouts/BasicLayout.astro` — the CSS is **correct**. This plan asserts it;
  it does not change it. If you find yourself editing a system colour, stop.
- The existing `it("keeps a name on every icon-only control when colours are
  forced")` — leave it exactly as it is. It asks a different question (does a
  control keep a *name*) of a different population (icon-only controls). Merging
  the two would blur both, and a rule-first loop of that shape goes **green when
  the entire shared `@media` block is deleted** — measured: 78 marks invisible,
  suite green. The glyph-first shape specified here fails 78 times.
- `describe("forced colours never paint a system colour on top of itself")` in
  the same file — a sibling concern about contrast, not about which colour is
  chosen. Do not extend it.
- `tests/rendered-html.test.ts`'s chevron assertion.
- Every component-level `@media (forced-colors: active)` block
  (`Patch.astro`, `IntroCard.astro`, `ProgressBar.astro`, `EventsLink.astro`,
  `src/pages/patches/[...sport].astro`). None of them paints an `i-` glyph's
  `background-color`; the census above proves it, and the new gate is green with
  all of them in place.
- `plans/README.md`.

## Git workflow

- Branch: `advisor/025-assert-what-forced-colours-paint`
- One commit. Conventional commits, matching recent history
  (`test(events): separate the data contract from behaviour, …`). Use:
  `test(a11y): assert which system colour repaints each mark in forced colours`
- Do NOT push or open a PR; the reviewer does that.

## Steps

### Step 1: Establish YOUR baseline, and confirm the hole before closing it

```
pnpm install
pnpm test
```

**Record**: the suite's `N passed | 7 skipped`. At the time of writing N was
**531**. A higher N means sibling plan 024 or 026 landed first — that is expected
drift, not a STOP. Every later figure in this plan is `N + 1`. The `7 skipped` is
absolute.

Now prove the gap is real **in this worktree** rather than taking the plan's word
for it. Mutate the shared block in `src/layouts/BasicLayout.astro`: change the
base rule's `background-color: CanvasText;` — the one on the selector pair with
no `a ` or `button ` prefix, at roughly line 712 — to
`background-color: Canvas;`. Then:

```
pnpm test
```

**Verify**: still `N passed | 7 skipped`. That green run on invisible marks is
the defect this plan exists to close. If it is **red**, STOP and report which
test caught it: the hole is already closed elsewhere and this plan is
unnecessary.

Revert before continuing: `git checkout -- src/layouts/BasicLayout.astro`, then
confirm `git status --porcelain` is empty.

### Step 2: Add the assertion

Add one `it(...)` to `tests/build-output.test.ts`, inside the same `describe`
that holds the existing forced-colours gate and directly after it.

**One `it(...)` that loops `builtPages()` internally.** Do not use
`it.each(builtPages())`: that registers five tests, and the done criterion below
counts on exactly one being added.

Per page:

1. `parseRules(pageCss(page)).filter((r) => (r.at ?? "").includes("forced-colors"))`
   — rules in cascade order, with their bodies kept.
2. Parse the page's HTML and take every element matching `[aria-hidden="true"]`
   that carries a class beginning `i-`.
3. Find the rules whose selectors match the glyph. **Skip any selector naming a
   pseudo-element before calling `matches`** — `structuralSelector` strips
   pseudos, and `index.html` already ships `.intro-type:after{background-color:canvas}`,
   which would otherwise be attributed to a glyph it cannot reach.
4. From the matching rules, in order, take:
   - the last `background-color`, falling back to `background`;
   - the last `forced-color-adjust`.
   **Use `lastDecl`, not `decl`.** `decl` returns the *first* occurrence within a
   body, and the minifier merges same-selector rules into one body, so `decl`
   silently reads a superseded value.
5. Derive the expected colour from `glyph.closest("a,button")`:
   `a` → `LinkText`, `button` → `ButtonText`, no such ancestor → `CanvasText`.
6. Assert both halves, compared lower-cased: the colour agrees, **and**
   `forced-color-adjust` is `none`.
7. Count the glyphs examined and assert the total exceeds zero, so the gate
   cannot pass by asking nothing.

The failure message must name the page, the container kind, the expected colour
and the one found — a bare `expected 'canvas' to be 'canvastext'` does not tell
the next reader which of 78 marks went wrong.

**Do NOT add a per-arm floor** (`expect(bareCount).toBeGreaterThan(0)` and
friends). A floor that counts the current tree reddens on a legitimate design
change — the theme toggle becoming an anchor would take the `button` arm to zero
on correct code. This repository has already shipped and then had to remove
exactly that shape. The single total is the vacuity floor.

**Verify**: `pnpm test` → `N + 1 passed | 7 skipped`, and the new test's name
appears in the output.

### Step 3: Mutation-test the new assertion, four ways

Each mutation goes into `src/layouts/BasicLayout.astro`, is measured, and is
reverted with `git checkout -- src/layouts/BasicLayout.astro` before the next.
The source is CamelCase; the census table above was measured on the minified
sheet, so the casing differs and that is expected.

| # | mutation | expected |
|---|---|---|
| 1 | base rule `CanvasText` → `Canvas` | the new test fails, naming 32 bare marks |
| 2 | anchor rule `LinkText` → `CanvasText` | the new test fails, naming 44 anchor marks |
| 3 | button rule `ButtonText` → `Canvas` | the new test fails, naming 2 button marks |
| 4 | move `forced-color-adjust: none` out of the base rule and into the `a` and `button` arms | the new test fails on the 32 bare marks for the **opt-out**, not the colour |

For each: apply, run `pnpm test`, record **which tests failed and the message**,
then revert and confirm the suite returns to `N + 1`.

**Verify**: all four turn the **new** test red. Mutation 1 must fail the new test
and **not** the existing "keeps a name…" one — if the existing gate also goes red
on mutation 1, say so in NOTES, because that would mean the plan's premise is
wrong and the reviewer needs to know.

Record the exact counts you observe. If they differ from 32 / 44 / 2, that is not
a failure — the markup may have moved — but report the numbers you saw.

### Step 4: Run the full ladder and commit

```
pnpm check
pnpm eslint
pnpm test
git add tests/build-output.test.ts
git commit -m "test(a11y): assert which system colour repaints each mark in forced colours"
git status --porcelain
git show --stat HEAD
```

**Verify**: check → 0 errors / 0 warnings / 2 hints; eslint → 0 problems;
test → `N + 1 passed | 7 skipped`; the commit names
`tests/build-output.test.ts` and nothing else.

## Test plan

- **One new test** in `tests/build-output.test.ts`, named for what it asserts —
  something in the register of *"paints every mark the system colour its
  container reserves"*. Structural pattern: the `it(...)` immediately above it.
- Cases covered, all derived from the built markup rather than listed: a bare
  mark → `CanvasText`; a mark inside an anchor → `LinkText`; a mark inside a
  button → `ButtonText`; and the opt-out present on all of them.
- **The case step 2's list does not state, and the one to get right: a mark no
  forced-colours rule reaches at all must FAIL, never `continue`.** All four
  mutations in step 3 change a *value*, so none of them can see a skip branch. If
  you write the loop so that a glyph with no matching rule is skipped, the gate
  is strictly weaker than the reach-only one it sits beside. Deleting the whole
  shared `@media` block must fail this test 78 times; check that by hand once.
- Non-vacuity: the total glyph count must exceed zero.
- Verification: `pnpm test` → `N + 1` pass, and each of the four mutations in
  step 3 turns exactly the new test red.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git diff --name-only main...HEAD` lists exactly `tests/build-output.test.ts`
      (three dots — the branch point, not this plan's `Planned at` SHA, which the
      plan files themselves have already moved past)
- [ ] `pnpm test` exits 0 with `N + 1 passed | 7 skipped`, against the N you
      recorded in step 1
- [ ] `pnpm check` exits 0 with 0 errors and 0 warnings
- [ ] `pnpm eslint` exits 0 with 0 problems
- [ ] Each of the four mutations in step 3 turns the new test red, and
      `git status --porcelain` is empty afterwards (all reverted)
- [ ] The new test's assertion message names the page, the container kind and
      both colours — verifiable by reading one of the four failure outputs you
      captured
- [ ] `grep -c "toBeGreaterThan(0)" tests/build-output.test.ts` returns **34**
      (it was 33 at `219dcde`): one new total floor, and no per-arm ones
- [ ] `grep -c "it.each" tests/build-output.test.ts` has not increased

## STOP conditions

Stop and report back (do not improvise) if:

- The shared block in `src/layouts/BasicLayout.astro` does not match the excerpt
  in "Current state".
- The new assertion is **red on the unmutated build**. That means a real mark is
  painted something other than its container's colour, or is missing the opt-out
  — a live defect, and a finding rather than a test to loosen. Report which page
  and which glyph. **Do not add a carve-out to make it green.**
- Step 1's mutation leaves the suite red before you have added anything.
- Any mutation in step 3 leaves the new test green.
- You need to touch `src/` to make the test pass.

## Maintenance notes

- **The population is derived, not listed, and that is the point.** A future mark
  added anywhere is covered by being a mark. If someone puts an `i-` class on
  something that is not a `span`, the shared rule will not reach it and this gate
  will say so — that is correct, not a false positive.
- `forced-color-adjust: none` lets *all* author colour through on the element it
  names, so the shared rules are deliberately scoped to icon masks rather than to
  every `aria-hidden` span. If a future change widens that selector, this gate
  will start asserting the container rule over a larger population; check that
  the widening was intended before adjusting anything here.
- A reviewer should check three things: that the test reads the **last** matching
  declaration and not the first; that it reads CSS through `pageCss(page)` rather
  than a hand-rolled concatenation, since the join order is the inverse of the
  cascade; and that a glyph reached by no rule fails rather than being skipped.
- Deliberately not done here: nothing asserts that the *contrast* between a
  glyph's system colour and its container's forced ground is adequate. The mode
  chooses both colours, so the pairing is the user agent's to get right.
