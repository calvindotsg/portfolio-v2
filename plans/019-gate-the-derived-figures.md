# Plan 019: Generate the projection's derived figures instead of writing them by hand

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Your reviewer maintains `plans/README.md` —
> do not edit it.
>
> **Drift check (run first)**:
> `git diff --stat 8ce7565..HEAD -- src/lib/projection.ts tests/projection.test.ts package.json README.md`
> The figures in `src/lib/projection.ts`'s header block are expected to be wrong — that is what
> this plan fixes. STOP only if `goalStatus`, `bookedAhead` or the frozen constants at
> `tests/projection.test.ts:346-348` changed shape.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (adds a test and a generated file; deletes prose; no runtime code changes)
- **Depends on**: plans/018 (this file cannot live in `plans/` until 018 lands)
- **Category**: docs
- **Planned at**: commit `8ce7565`, 2026-08-07

## Why this matters

`src/lib/projection.ts`'s header block carries six derived figures and instructs the reader, in
bold, to re-derive them when a race changes. Nothing gates them. **Six are wrong on `main` right
now with the suite green at 478 passed**, because five are pinned to the bot's *live* stamp and
rot on a push that moves only the date — which happened on 2026-08-06.

The cost is not the wrong numbers. It is that PR #128 spent most of its 30 minutes
reverse-engineering these six from shipped values, because **not one of them has its definition
written down anywhere**. This plan writes the definitions down once, in a file the suite
regenerates, so the next data edit produces a diff instead of an archaeology session.

## Current state

- `src/lib/projection.ts:29-46` — the header block. Measured against the tree at `8ce7565`:

  | the block says | actually |
  |---|---|
  | pinned to `2026-08-05` | tree carries `2026-08-06` |
  | 121 km/wk ignoring races, 41% reduction | **122**, **41.8%** |
  | 58.99 de-raced · 70.27 required · 78.72 observed | **58.72** · **70.74** · **78.36** |
  | 31.0 weeks | **31.1** |
  | 611.74 raced sum, "four recorded cycling races" | correct today, but see below |

- `src/lib/projection.ts:327-331` — the ceil-vs-round worked example, carrying `73.3804`,
  `1647.71`, `1656.30` and "146 of the 290".
- `src/lib/projection.ts:361` and `:425` — the `withBooked` string examples.
- `tests/projection.test.ts:346-348` — the frozen reference that already exists:

  ```ts
  const AS_OF = "2026-07-27";
  const CYCLING_KM = 2279.7;
  const RUNNING_KM = 152.7;
  ```

  Its header (`:329-345`) explains why: the nightly bot rewrites `GOALS[].raw_progress` and a red
  suite blocks the deploy. **This fired in production six hours after that feature merged.**
  **Move these three into `tests/helpers/reference.ts`** (the directory already holds shared test
  material) and have both files import them. Do NOT import `tests/projection.test.ts` from another
  test file: measured on vitest 4.1.10, that re-registers the imported file's suites under the
  importer and runs its 54 cases twice. Never declare a second triple.

**The definitions, reverse-engineered and not written down anywhere in the repo:**

| figure | derivation |
|---|---|
| days remaining | stamp .. 31 Dec **inclusive** |
| required rate | `ceil((total_goal − raw_progress − bookedAhead) / (days/7))` |
| "ignoring races" comparator | the same with `booked = 0`, also `ceil`ed |
| observed pace | `km / ((1 Jan .. stamp inclusive)/7)` |
| de-raced pace | same denominator; numerator less the sum of `raceKm` over **this year's recorded races of that sport** |
| ceil-vs-round sweep | every day `AS_OF`..31 Dec × both sports → count days in the `rate` branch, then how many have `round(exact) < exact` |

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, no errors |
| Lint | `pnpm eslint` | exit 0 |
| Tests | `pnpm test` | all pass |
| Update snapshots | `pnpm test -u` | writes the golden file |

`pnpm typecheck` and `pnpm lint` **do not exist** in this repo. `pnpm test` runs a full build
first via `globalSetup`.

## Scope

**In scope**:
- `tests/derived-figures.test.ts` (create)
- `src/lib/derived-figures.md` (created by the test, committed)
- `src/lib/projection.ts` (comments only)
- `package.json` (one script)
- `README.md` (Testing section)

**Out of scope**:
- Any change to `goalStatus`, `bookedAhead` or any exported function's behaviour. This plan
  changes comments and adds a test. If a figure disagrees with the code, **the comment is wrong**.
- `tests/projection.test.ts`'s own assertions — plan 022 touches those.
- `src/data/strava-progress.json` — bot-owned.

## Git workflow

- Branch: `plan/019-gate-derived-figures`
- Conventional commits, matching `git log`: e.g. `docs(projection): generate the derived figures`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: add the update script

Add to `package.json` scripts: `"test:update": "vitest run -u"`.

Use `pnpm test -u` in all prose — **not** `pnpm vitest -u`. `vitest` is not a script name, and
`tests/docs-drift.test.ts`'s `names no pnpm script that is not in package.json` reddens on a
`pnpm <name>` that is not in `package.json`. (Gates are cited by name rather than by line here:
the path gate strips a `:NNN` anchor before resolving, so an anchor is the one citation form
this suite cannot keep honest.)

**Verify**: `pnpm test -u` → runs, exit 0.

### Step 2: write the generator test

Create `tests/derived-figures.test.ts`. It:

1. Imports `AS_OF`, `CYCLING_KM`, `RUNNING_KM` from `tests/helpers/reference.ts`, which this step
   creates by moving them out of `tests/projection.test.ts` — the only edit permitted to that file
   in this plan.
2. **Scopes `EVENTS` to the reference**, not just the clock:
   ```ts
   const AT_REF = EVENTS.filter((e) => parseIsoDate(e.end_date ?? e.date) <= parseIsoDate(AS_OF))
   ```
   **`AT_REF` IS THE INPUT TO ONE FIGURE ONLY — the de-raced pace's numerator**, which sums
   races already RIDDEN. `bookedAhead` and `goalStatus` must receive the live `GOAL_YEAR`
   events, because their whole subject is races still AHEAD: hand them `AT_REF` and
   `bookedAhead` returns 0, the required rate and the "ignoring races" comparator collapse to
   the same number, and step 2's "non-zero and finite" check passes on all of it.
3. **Asserts the precondition before computing anything**: no recorded `GOAL_YEAR` race post-dates
   `AS_OF`. If one does, the test **fails with a message saying to advance the reference** — it
   must not publish a figure that mixes two epochs.
4. Computes every figure in the definitions table above from the real `goalStatus`/`bookedAhead`/
   `raceKm`, per sport.
5. Renders a Markdown table and writes it with `expect(md).toMatchFileSnapshot("../src/lib/derived-figures.md")`.

**Why the scoping matters — this is the whole point of the plan.** Freezing the clock but leaving
`EVENTS` live makes the de-raced pace subtract race kilometres that are not inside its own
numerator, by roughly 5 km/wk at the reference. A generated, gated, CI-blessed
wrong number is worse than the ungated wrong number it replaces, because a snapshot confers an
authority hand-written prose does not.

The file's **first line** must state its reference date and say the figures illustrate the model
at that reference, **not what the site publishes today**. Freezing re-bases the claim, and a
reader who misses that has a confident permanently-past-tense document.

**Verify**: `pnpm test -u` → `src/lib/derived-figures.md` exists, every figure is non-zero and
finite, **and the "ignoring races" comparator is strictly greater than the required rate**. That
last one is the check that catches the `AT_REF` mistake above; "non-zero and finite" does not.

### Step 3: prove the gate can fail

Change one recording's `metres` in `src/lib/constants.ts` by a single digit.

**Verify**: `pnpm test` → `tests/derived-figures.test.ts` FAILS with a diff naming the figures
that moved. Then revert the edit with `git checkout -- src/lib/constants.ts`... **no**: use
`cp` to back the file up before the edit and restore from the backup. Confirm `git status
--porcelain` is empty afterwards.

### Step 4: delete the six rotting digits

In `src/lib/projection.ts`, remove the **numbers** from the header block, the `goalStatus` worked
example and the `withBooked` example, keeping every argument they illustrate — the double count,
the comparator rule, "the ORDERING is the rule; the gaps move", why ceil rather than round. Point
each at `src/lib/derived-figures.md`.

**`611.74` and its adjacent row count "four recorded cycling races" go too.** They read as
correct today and are not pinned — they are a pure function of live `EVENTS` and rot on a
recorded-race edit, which is a mutation that reddens nothing else in the suite.

This is CLAUDE.md's own doctrine, stated there for `.devin/wiki.json`: *the right fix for a fact
that could go stale is to delete the claim and name its source.*

**Verify**: `grep -nE "58\.99|70\.27|78\.72|611\.74|31\.0 weeks|73\.3804|146 of" src/lib/projection.ts`
→ no matches.

### Step 5: name the new suite in the README

`tests/docs-drift.test.ts`'s `lists every test suite in the README` asserts every file in
`tests/` is named in `README.md`. Add
`tests/derived-figures.test.ts` to the Testing section.

**Verify**: `pnpm test` → all pass.

## Test plan

- New: `tests/derived-figures.test.ts` — the generator, its reference precondition, and the
  snapshot. Model its structure on `tests/projection.test.ts`'s frozen-reference block.
- The precondition is itself worth a case: construct a fixture where a recorded race post-dates
  the reference and assert the test refuses rather than reporting a figure.
- Verification: `pnpm test` → all pass, `tests/derived-figures.test.ts` among them.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `src/lib/derived-figures.md` exists, is committed, and its first line states its reference date
- [ ] `grep -c "test:update" package.json` returns 1
- [ ] `grep -rn "pnpm vitest" src/ README.md CLAUDE.md` returns no matches (this plan and
      `tests/strava-verify.test.ts` name it legitimately, so the sweep is scoped away from them)
- [ ] Step 3's mutation reddens `tests/derived-figures.test.ts` (recorded in the PR body)
- [ ] `README.md` names `tests/derived-figures.test.ts`
- [ ] `git status --porcelain` lists only in-scope files

## STOP conditions

- The frozen constants at `tests/projection.test.ts:346-348` no longer exist or have changed value
  — the reference moved and every figure needs re-deriving before this plan is valid.
- Step 3's mutation does **not** redden the test. The gate is vacuous; do not proceed.
- `toMatchFileSnapshot` writes silently under `CI=true` instead of failing. The gate cannot hold
  and the approach needs rethinking.
- Your de-raced pace disagrees with the definitions table above. **Re-derive rather than trust any
  digit in this plan** — an earlier draft pinned 61.83 here, computed on an EXCLUSIVE 1-Jan..stamp
  denominator while the table specifies the INCLUSIVE one, which is a 0.3 km/wk disagreement that
  reads as a real defect. Check the endpoint convention before concluding anything, and note that
  the whole point of this plan is that a hand-written digit rots.

## Maintenance notes

- The reference is deliberately frozen. **Advancing it is an edit, not maintenance** — and the
  `-u` diff is the re-derivation. Advance it when the precondition in step 2 starts failing.
- `src/lib/derived-figures.md` is generated and is gated as a current-state document (docs-drift
  walks every `.md`). A stale backticked path inside it is fixed **in the generator**, never by
  hand.
- Plans 020–023 all assume this exists. Land it first.
