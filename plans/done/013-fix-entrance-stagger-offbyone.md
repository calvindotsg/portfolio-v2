# Plan 013: Fix the entrance-stagger off-by-one and lock the ladder to the card count

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md` — do
> not edit it.
>
> **Drift check (run first)**: `git diff --stat 4e15674..HEAD -- src/layouts/BasicLayout.astro src/pages/index.astro tests/build-output.test.ts`
> Plans 011–012 land before this plan; they touch `src/pages/index.astro` and
> `tests/build-output.test.ts` (class attributes and two new tests) but NOT
> the `<main>` child structure or `BasicLayout`'s style block. If the
> excerpts below don't match, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/012-remove-noop-unocss-classes.md (merge order only — shared test file)
- **Category**: bug
- **Planned at**: commit `4e15674`, 2026-07-22
- **Finding**: run-3 audit CORRECT-01/DEBT-01 (two auditors, one defect; both skeptic-CONFIRMED)

## Why this matters

The card entrance animation staggers `<main>`'s children with per-child
delays — it is the page's only entrance effect, designed to walk the eye down
the grid. PR #41 added a second Goal card, growing `<main>` to **8** direct
children, but the delay ladder in `BasicLayout.astro` stops at
`nth-child(7)`. The 8th child (the footer card) gets the base animation with
`animation-delay: 0s`, so it fades in on the same frame as the hero while
cards 2–7 cascade after it. One CSS rule fixes it; a new test pins the ladder
to the child count so the next added card cannot silently fall off the end
again.

## Current state

`src/layouts/BasicLayout.astro:133-151`:

```astro
    /* Card entrance — replaces the JS stagger. Pure CSS, no client bundle. */
    main > * {
        animation: card-in 0.4s ease-out backwards;
    }

    main > *:nth-child(1) { animation-delay: 0.00s; }
    main > *:nth-child(2) { animation-delay: 0.08s; }
    main > *:nth-child(3) { animation-delay: 0.16s; }
    main > *:nth-child(4) { animation-delay: 0.24s; }
    main > *:nth-child(5) { animation-delay: 0.32s; }
    main > *:nth-child(6) { animation-delay: 0.40s; }
    main > *:nth-child(7) { animation-delay: 0.48s; }

    @keyframes card-in {
        from {
            opacity: 0;
            transform: translateY(40%);
        }
    }
```

(A `@media (prefers-reduced-motion: reduce)` block right after sets
`main > * { animation: none; }` — the fix must stay inside this same style
block so that override keeps covering it.)

`src/pages/index.astro` renders exactly 8 direct children of `<main>`:
IntroCard, 2 Goal cards (`GOALS.map`), AboutMe, 2 Career cards (`Career.astro`
maps `CAREER` to top-level `<Card>`s with no wrapper element), Now, and the
inline footer Card. Both `GOALS` and `CAREER` have 2 entries in
`src/lib/constants.ts`.

Test conventions: `tests/build-output.test.ts` asserts on `dist/` artifacts
and (in its "source hygiene" describe) on `src/` file contents; `read(...)`
and a `doc()` helper for `dist/index.html` already exist in that file. The
`doc()` linkedom parse supports element queries (`querySelector`,
`.children`) but not whole-document textContent — see the comment above the
"dist/index.html is prerendered" describe.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Tests | `pnpm test` | all pass (measure baseline in step 1) |
| Lint | `pnpm eslint` | exit 0, no output |
| Build | `pnpm build` | exit 0, "1 page(s) built" |

pnpm ONLY — never npm. The `lint-staged` pre-commit hook is expected.

## Scope

**In scope** (the only files you may modify):
- `src/layouts/BasicLayout.astro`
- `tests/build-output.test.ts`

**Out of scope** (do NOT touch):
- `src/pages/index.astro` — the child count is the input, not the thing to
  change.
- The animation's timing values, easing, or the reduced-motion block.
- `plans/README.md`.

## Git workflow

- Branch: `improve/013-entrance-stagger`
- Conventional commit, e.g. `fix: extend the entrance stagger to the 8th card and pin the ladder to the card count`
- Do NOT push, do NOT open a PR.

## Steps

### Step 1: Baseline

`pnpm install && pnpm check && pnpm test && pnpm build` — record the passing
test count. Confirm the current state: `grep -c 'nth-child' src/layouts/BasicLayout.astro`
→ `7`.

### Step 2: extend the ladder

In `src/layouts/BasicLayout.astro`, after the `nth-child(7)` line, add:

```astro
    main > *:nth-child(8) { animation-delay: 0.56s; }
```

And extend the section comment above the ladder so the coupling is explicit:

```astro
    /* Card entrance — replaces the JS stagger. Pure CSS, no client bundle.
       One rule per direct child of <main>: when a card is added, extend this
       ladder (a build-output test compares the ladder to the child count). */
```

**Verify**: `grep -c 'nth-child' src/layouts/BasicLayout.astro` → `8`.

### Step 3: pin the ladder to the card count

In `tests/build-output.test.ts`, inside the `describe("source hygiene", ...)`
block, add:

```ts
    it("covers every card with an entrance-stagger delay rule", () => {
        // PR #41 added an 8th <main> child while the delay ladder stopped at
        // nth-child(7), so the footer animated on the same frame as the hero.
        // The ladder is hand-written CSS; this is the lockstep check.
        const layout = read("src/layouts/BasicLayout.astro");
        const rungs = [...layout.matchAll(/nth-child\((\d+)\)\s*\{\s*animation-delay/g)].map((m) => Number(m[1]));
        expect(rungs.length, "the entrance cascade must exist").toBeGreaterThan(0);
        const cards = doc().querySelector("main")?.children.length ?? 0;
        expect(cards, "main must render cards").toBeGreaterThan(0);
        expect(Math.max(...rungs), `main renders ${cards} children but the delay ladder stops at nth-child(${Math.max(...rungs)})`).toBeGreaterThanOrEqual(cards);
    });
```

Note: `doc()` belongs to the "dist/index.html is prerendered" describe — if
it is scoped locally there, hoist nothing; construct the document the same
way this test file already does (`parseHTML(read("dist/index.html")).document`).

**Verify**: `pnpm build && pnpm test` → all pass, count = step-1 baseline + 1.

### Step 4: mutation-test the new assertion

Temporarily delete the `nth-child(8)` line you added to BasicLayout.astro
(no rebuild needed — the test reads that source file directly) and run
`pnpm test`:

**Verify**: exactly the new "covers every card with an entrance-stagger delay
rule" test fails, and its message names 8 children vs a ladder stopping at 7
— proving the mutation changed the artifact under assertion. Restore the
line; `pnpm test` fully green. Report both outcomes.

### Step 5: full ladder + commit

`pnpm check && pnpm eslint && pnpm test && pnpm build` — all green. Commit.

## Test plan

One new test (step 3), mutation-tested (step 4). Nothing else changes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` → 0 errors; `pnpm eslint` → exit 0
- [ ] `pnpm test` → all pass, count = step-1 baseline + 1
- [ ] `grep -c 'nth-child' src/layouts/BasicLayout.astro` → 8
- [ ] `grep 'nth-child(8)' src/layouts/BasicLayout.astro` → the 0.56s rule
- [ ] Mutation check of step 4 reported (fail-then-green)
- [ ] `git status` — no files outside the in-scope list modified

## STOP conditions

Stop and report back (do not improvise) if:

- `<main>` does not have exactly 8 direct children in the built page (the
  page structure drifted; the rule count and delay value need re-deriving).
- The ladder excerpt doesn't match (someone already fixed or restructured the
  animation).
- The new test fails after step 2 for any reason other than a deliberate
  mutation.

## Maintenance notes

- The delay step is 0.08s; a future 9th card needs `nth-child(9) { 0.64s }`.
  The new test fails the build if the ladder is not extended — that is the
  point.
- An alternative (`sibling-index()`-based delays) would remove the ladder
  entirely but is not yet baseline-available in browsers; revisit when it is.
- Reviewer should scrutinize: the delay value follows the 0.08s progression,
  and the fix sits inside the same `<style is:global>` block as the
  reduced-motion override.
