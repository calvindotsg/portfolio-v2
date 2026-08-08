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
> STOP condition.

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
that with three rules, and the repair's whole content is **which system colour
each mark gets**: `CanvasText` for a bare mark, `LinkText` inside an anchor,
`ButtonText` inside a button, so a glyph agrees with the words beside it.

**The gate written to protect that asserts reach and never paint.**
`tests/build-output.test.ts`'s "keeps a name on every icon-only control when
colours are forced" walks every built page, finds every icon-only control, and
asks whether *any* forced-colours rule matches the glyph. It never reads the
declaration. Change `CanvasText` to `Canvas` in the shared block and 32 marks are
painted the ground colour — invisible — with the whole suite green.

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

The long comment above them states the rule this plan turns into an assertion:
*"WHICH SYSTEM COLOUR IS DECIDED BY WHAT CONTAINS THE MARK, because the mode
reserves a different one for each kind of thing and a glyph must agree with the
words beside it."*

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
has visible words), which excludes every bare mark — the 32 that the base rule is
for.

The one place a declaration *is* read is
`tests/rendered-html.test.ts`'s `it("keeps the control's chevron painted when
forced colours override background-color")`, which asserts on **one element**
(the `EventsLink` chevron) and takes the **last** matching declaration. That
chevron sits inside an `<a>`, so the value it reads is `LinkText` — mutating the
base rule's `CanvasText` leaves it untouched.

### Measured, on a real `pnpm build` of the current tree

A probe replicating the proposed gate over all five built pages:

```
glyphs examined: 78
  32  (bare)  -> canvastext
  44  a       -> linktext
   2  button  -> buttontext
forced-color-adjust values seen: none
MISMATCHES against the container rule: 0
glyphs painted a NON-foreground system colour: 0
```

So the gate specified below is **green on the current, correct build**, all three
arms are exercised, and every glyph is reached by a rule.

Three mutations, each applied to the shipped stylesheet and re-probed:

| mutation | mismatches |
|---|---|
| base `canvastext` → `canvas` | **32** — every bare mark, `expected canvastext got canvas` |
| anchor `linktext` → `canvastext` | **44** — `expected linktext got canvastext` |
| button `buttontext` → `canvas` | **2** — `expected buttontext got canvas` |

### Conventions to match

- The new assertion belongs in `tests/build-output.test.ts`, beside the existing
  forced-colours gate, because it is a **build-wide** question asked of every
  page. Model it structurally on that same `it(...)`: it already walks
  `builtPages()`, parses each page with `parseHTML`, joins the page's inline
  `<style>` blocks with `cssChunks()`, and brace-walks each
  `@media …forced-colors…` block. Reuse that shape; do not invent a second way
  to find the rules.
- **Component CSS on this site is largely inline.** Reading only
  `dist/_astro/*.css` finds a fraction of the rules — the existing gate says so
  in a comment and the new one must do the same.
- Tests here carry a block comment stating what the assertion is *for* and what
  it caught. Match that register: the comments are load-bearing prose, not
  decoration. Read the existing forced-colours `it(...)`'s comment as the
  exemplar.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Lint | `pnpm eslint` | exit 0, 0 problems |
| Tests | `pnpm test` | 531 passed, 7 skipped before your change; **532 passed** after |
| Build only | `pnpm build` | exit 0, 5 pages |
| Faster iteration | `SKIP_BUILD=1 pnpm test` | reuses the existing `dist/` |

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
  the two would blur both.
- `tests/rendered-html.test.ts`'s chevron assertion — same reason.
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

### Step 1: Confirm the hole before closing it

Install, build, and confirm the baseline, then prove the gap is real **in this
worktree** rather than taking the plan's word for it.

```
pnpm install
pnpm test
```

**Verify**: `531 passed | 7 skipped`.

Now mutate the shared block in `src/layouts/BasicLayout.astro`: change the base
rule's `background-color: CanvasText;` (line ~712, the one **not** prefixed by
`a ` or `button `) to `background-color: Canvas;`. Then:

```
pnpm test
```

**Verify**: still **531 passed | 7 skipped**. That green run on invisible marks
is the defect this plan exists to close.

Revert the mutation before continuing:

```
git checkout -- src/layouts/BasicLayout.astro
git diff --exit-code -- src/layouts/BasicLayout.astro ; echo "reverted: $?"
```

**Verify**: exits 0.

### Step 2: Add the assertion

Add one `it(...)` to `tests/build-output.test.ts`, inside the same `describe`
that holds the existing forced-colours gate and directly after it.

What it must do, per page in `builtPages()`:

1. Parse the page with `parseHTML`; join its inline `<style>` bodies with the
   shared `cssChunks()` CSS, exactly as the existing gate does.
2. Collect every rule inside every `@media` block whose prelude mentions
   `forced-colors`, keeping **both** the selector list and the declaration body.
   The existing gate's brace-walk already finds the blocks; extend it to keep the
   body instead of discarding it.
3. For every element matching `[aria-hidden="true"]` that carries a class
   beginning `i-`:
   - find the matching rules, in source order;
   - take the **last** declared `background-color`, falling back to `background`
     — later rules override earlier ones here, and the existing chevron
     assertion in `tests/rendered-html.test.ts` records why the last one is the
     one that paints;
   - derive the expected colour from `glyph.closest("a,button")`:
     `a` → `LinkText`, `button` → `ButtonText`, no such ancestor → `CanvasText`;
   - assert the two agree, **compared lower-cased**.
4. Count the glyphs examined and assert the total is greater than zero, so the
   gate cannot pass by asking nothing.

The failure message must name the page, the container kind, the expected colour
and the one found — a bare `expected 'canvas' to be 'canvastext'` does not tell
the next reader which of 78 marks went wrong.

**Do NOT add a per-arm floor** (`expect(bareCount).toBeGreaterThan(0)` and
friends). A floor that counts the current tree reddens on a legitimate design
change — the theme toggle becoming an anchor would take the `button` arm to zero
on correct code. This repository has already shipped and then had to remove
exactly that shape. The single total is the vacuity floor.

**Verify**:

```
pnpm test
```

→ **532 passed | 7 skipped**, and the new test's name appears in the output.

### Step 3: Mutation-test the new assertion, three ways

Each mutation goes into `src/layouts/BasicLayout.astro`, is measured, and is
reverted with `git checkout --` before the next.

| # | mutation | expected |
|---|---|---|
| 1 | base rule `CanvasText` → `Canvas` | the new test fails, naming 32 bare marks |
| 2 | anchor rule `LinkText` → `CanvasText` | the new test fails, naming 44 anchor marks |
| 3 | button rule `ButtonText` → `Canvas` | the new test fails, naming 2 button marks |

For each: apply, run `pnpm test`, record **which tests failed and the message**,
then `git checkout -- src/layouts/BasicLayout.astro` and confirm `pnpm test`
returns to 532.

**Verify**: all three turn the **new** test red. Mutation 1 must fail the new
test and **not** the existing "keeps a name…" one — if the existing gate also
goes red on mutation 1, say so in NOTES, because that would mean the plan's
premise is wrong and the reviewer needs to know.

Record the exact counts you observe. If your counts differ from 32 / 44 / 2, that
is not a failure — the markup may have moved — but report the numbers you saw.

### Step 4: Run the full ladder and commit

```
pnpm check
pnpm eslint
pnpm test
git add tests/build-output.test.ts
git commit -m "test(a11y): assert which system colour repaints each mark in forced colours"
git status --porcelain
```

**Verify**: check → 0 errors / 0 warnings / 2 hints; eslint → 0 problems;
test → 532 passed / 7 skipped; `git show --stat HEAD` names
`tests/build-output.test.ts` and nothing else.

## Test plan

- **One new test** in `tests/build-output.test.ts`, named for what it asserts —
  something in the register of *"paints every mark the system colour its
  container reserves"*. Structural pattern: the `it(...)` immediately above it.
- Cases covered, all derived from the built markup rather than listed:
  a bare mark → `CanvasText`; a mark inside an anchor → `LinkText`; a mark inside
  a button → `ButtonText`; a mark no forced-colours rule reaches at all (no
  declaration found) → fails, which is strictly stronger than the existing
  reach-only check.
- Non-vacuity: the total glyph count must exceed zero.
- Verification: `pnpm test` → 532 pass, and each of the three mutations in step 3
  turns exactly the new test red.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git diff --name-only 219dcde..HEAD` lists exactly `tests/build-output.test.ts`
- [ ] `pnpm test` exits 0 with **532 passed | 7 skipped**
- [ ] `pnpm check` exits 0 with 0 errors and 0 warnings
- [ ] `pnpm eslint` exits 0 with 0 problems
- [ ] Each of the three mutations in step 3 turns the new test red, and
      `git status --porcelain` is empty afterwards (all reverted)
- [ ] The new test's assertion message names the page, the container kind and
      both colours — verifiable by reading one of the three failure outputs you
      captured
- [ ] `grep -c "toBeGreaterThan(0)" tests/build-output.test.ts` has increased by
      exactly 1 (the single total floor, not a per-arm one)

## STOP conditions

Stop and report back (do not improvise) if:

- The shared block in `src/layouts/BasicLayout.astro` does not match the excerpt
  in "Current state".
- The new assertion is **red on the unmutated build**. That means a real mark is
  painted something other than its container's colour — a live defect, and a
  finding rather than a test to loosen. Report which page and which glyph. **Do
  not add a carve-out to make it green.**
- Step 1's mutation turns the suite red before you have added anything. That
  would mean the hole is already closed elsewhere and this plan is unnecessary;
  report which test caught it.
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
- A reviewer should check that the new test reads the **last** matching
  declaration rather than the first. Reading the first would make it assert
  `CanvasText` for every glyph and go red on the entire correct build.
- Deliberately not done here: nothing asserts that the *contrast* between a
  glyph's system colour and its container's forced ground is adequate. The mode
  chooses both colours, so the pairing is the user agent's to get right; asserting
  it would be asserting something this repository does not control.
