# Plan 020: Make each race its own module, so adding one is adding a file

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Your reviewer maintains `plans/README.md` —
> do not edit it.
>
> **Drift check (run first)**:
> `git diff --stat 8ce7565..HEAD -- src/lib/constants.ts src/lib/projection.ts src/pages/llms.txt.ts src/components/Patch.astro uno.config.ts`
> If `EVENTS` gained or lost a row since `8ce7565`, that is fine — migrate what is there. STOP if
> `uno.config.ts` started importing `EVENTS`, or if `RaceEvent` changed shape.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED (touches nine importers; one forbidden shortcut breaks the toolchain opaquely)
- **Depends on**: plans/019
- **Category**: migration
- **Planned at**: commit `8ce7565`, 2026-08-07

## Why this matters

Adding a race today means a unique-match `Edit` into a 1,902-line file in which three rows share
the name `Pesta Sukan Round Island Bike Adventure` and two share `OCBC Cycle Johor Bahru`. The
failure mode is a silently wrong edit, and the reader — human or agent — must load 116 KB to make
a 20-line change.

One module per race makes it a `Write` to a new path: no read-before-edit, no unique-string
requirement, no ambiguity. Every compile-time guarantee is kept, which is the reason this is
TypeScript modules and not Markdown with a schema.

## Current state

- `src/lib/constants.ts:905-1021` — `EVENTS`, 14 rows, each preceded by a comment that is the
  row's argument. Several say "do not correct this row" and record why; **these are the valuable
  part and the part most easily lost.**
- `src/lib/constants.ts:61-155` — `stravaActivityUrl`, `recordingsOf`, `kmFromMetres`,
  `recordingKm`, `raceKm`.
- `src/lib/constants.ts:546-904` — `OfficialResult`, `RaceEvent`, `Recording` types.
- **Nine importers**, all of which must be retargeted:
  ```
  src/lib/projection.ts:2        src/pages/llms.txt.ts:5       src/components/Patch.astro:2
  tests/build-output.test.ts:9   tests/constants.test.ts:6     tests/patch-wall.test.ts:10
  tests/projection.test.ts:6     tests/strava-verify.test.ts:3
  tests/llms-dnf-fixture.test.ts:49  (a vi.mock target, not a plain import)
  ```
- `uno.config.ts:3` imports `./src/lib/constants` — and **deliberately does not import `EVENTS`**,
  which its own comment at `:11-18` explains. That is the fact this whole migration rests on.
- `src/pages/llms.txt.ts:119-121` renders `EVENTS` in **array order** into a shipped artifact,
  with no sort of its own. Ordering is therefore load-bearing.
- Every projection function already takes `events` as a parameter (`projection.ts:149, 233, 308,
  382, 657, 783, 811`); only the *defaults* reach for `EVENTS`. **Nothing becomes async.**

**The constraint that governs this plan.** `@unocss/config` loads `uno.config.ts` through
**unconfig/jiti**, not Vite. Anything reachable from `uno.config.ts` must be plain
statically-importable TypeScript — no `import.meta.glob`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Tests | `pnpm test` | all pass |
| Build only | `pnpm build` | exit 0 |

## Scope

**In scope**:
- `src/data/races/*.ts` (create, 14 files + `index.ts`)
- `src/data/races/README.md` (create)
- `src/lib/race.ts` (create)
- `src/lib/constants.ts` (remove what moved)
- the nine importers above
- `tests/data-contract.test.ts` (create — the filename/date invariants only; plan 022 fills it out)

**Out of scope**:
- `uno.config.ts` — it must not change in this plan. If you find yourself editing it, stop.
- Any `EVENTS` row's **data**. This is a move, not an edit. `dist/` must come out identical.
- The copy constants (`WELCOME`, `CAREER`, …) — plan 021.

## Git workflow

- Branch: `plan/020-one-module-per-race`
- Conventional commits, e.g. `refactor(events): give each race its own module`

## Steps

### Step 1: create `src/lib/race.ts`

Move `RaceEvent`, `Recording`, `OfficialResult` and the five derivation functions out of
`constants.ts`, comments intact. `constants.ts` imports them back for now so nothing breaks yet.

**Verify**: `pnpm check` → exit 0. `pnpm test` → all pass.

### Step 2: one file per race

For each of the 14 rows, create `src/data/races/YYYY-MM-DD-slug.ts`:

```ts
import type {RaceEvent} from "../../lib/race"

/**
 * <the row's existing comment, moved verbatim>
 */
export default {
    date: "2024-08-04",
    // …the row, unchanged
} satisfies RaceEvent
```

Carry each comment **verbatim**. Where a comment covered two rows, split it so each file carries
the part that is about it.

### Step 3: collect them

`src/data/races/index.ts`:

```ts
import type {RaceEvent} from "../../lib/race"

const modules = import.meta.glob<{default: RaceEvent}>("./*.ts", {eager: true})

export const EVENTS: readonly RaceEvent[] = Object.entries(modules)
    .map(([key, m]) => [key, m.default] as const)
    .sort(([ka, a], [kb, b]) => a.date.localeCompare(b.date) || ka.localeCompare(kb))
    .map(([, race]) => race)
```

**Sort by `m.default.date`, not by glob key.** The filename is then a human aid carrying no load.
Sorting by key would make the filename a second, unchecked copy of `date`, and
`src/pages/llms.txt.ts:119-121` would silently misorder a shipped artifact if the two disagreed.

### Step 4: retarget the nine importers

Point each at `src/data/races` (for `EVENTS`) or `src/lib/race` (for the types and helpers).
Delete `EVENTS` and the moved helpers from `constants.ts`.

**DO NOT add a compatibility re-export in `constants.ts`, not even transitionally.** This is the
single highest-probability way to lose an afternoon on this plan. `uno.config.ts:3` imports that
module, so a re-export drags `import.meta.glob` into the jiti graph and kills **`astro build` and
vitest itself** — vitest resolves its own config through UnoCSS, so there is no `SKIP_BUILD=1`
escape and no test output to read. The failure is a four-line
`TypeError: (intermediate value).glob is not a function` with no banner and no test executed.

`tests/llms-dnf-fixture.test.ts:49` is a `vi.mock` spreading `real.EVENTS`; it must retarget too.
`pnpm check` catches it via the `importOriginal<typeof import(...)>()` type parameter — but check
it deliberately, because a mock that silently stops mocking is this repo's documented failure class.

**Verify**: `pnpm check` → exit 0. `pnpm test` → all pass.
`grep -n "export .*from.*data/races" src/lib/constants.ts` → **no matches**.

### Step 5: prove it changed nothing

```
git stash                     # or build from a clean checkout of 8ce7565
pnpm build && cp -r dist /tmp/dist-before
git stash pop
pnpm build
```
Compare, normalising content-hashed filenames. **Capture `<meta name="build-date">` from the
before-build and abort the comparison if the after-build differs** — a comparison straddling
Singapore midnight produces a diff that is not a change.

All 14 current rows carry strictly ascending distinct dates, so glob order equals today's array
order and a clean match is achievable. **Anything but a clean match is a real change — find it.**

### Step 6: the procedure, beside the data

`src/data/races/README.md`. It must state, correctly this time:
- that a **booked** race inside `GOAL_YEAR` moves the required rate and a past one does not
  (`src/lib/constants.ts:427` currently says a race is "a data edit and not a code change", which
  is true of a past race and false of a booked one);
- **both edit orders** and which applies when — a race not yet listed: fetch first, then add; a
  race already listed: add the recording first and let the cron follow. Fetching first on an
  already-listed race counts its distance twice, measured at 66 km/wk against an honest 71;
- every required field, each **backticked**.

### Step 7: gate what a test can hold

In `tests/data-contract.test.ts`:
- every field name declared in `src/lib/race.ts`'s `RaceEvent` appears backticked in the README,
  and **the reverse** — a backticked field the type no longer declares reddens too. Derive the
  expected set from the type's declarations, not from the data.
- each basename's `YYYY-MM-DD` prefix equals its module's `date`.
- no two modules share a date+name.
- assert by canonical phrase that the README names both edit orders and the booked-race rule —
  the same shape as the existing shortcut-count gate in `tests/docs-drift.test.ts`.

Add `tests/data-contract.test.ts` to `README.md`'s Testing section (`docs-drift` requires it).

**Verify**: `pnpm test` → all pass. Then break each invariant in turn and confirm each reddens.

## Test plan

- `tests/data-contract.test.ts` — the four invariants above, each proved to fail on its own
  minimum stimulus (rename one file's date prefix; duplicate a date+name; remove one backticked
  field from the README; delete one edit-order sentence).
- Existing suites are the real regression net: `patch-wall`, `build-output` and `rendered-html`
  all derive from `EVENTS` and must stay green untouched.

## Done criteria

- [ ] `pnpm check`, `pnpm eslint`, `pnpm test` all exit 0
- [ ] `ls src/data/races/*.ts | wc -l` returns 15 (14 races + index)
- [ ] `grep -c "EVENTS" src/lib/constants.ts` returns 0
- [ ] `grep -rn "import.meta.glob" uno.config.ts src/lib/constants.ts src/lib/icons.ts` → no matches
- [ ] `dist/` matches byte-for-byte after normalising hashes and the build-date meta
- [ ] each of the four new invariants reddened on its own stimulus (recorded in the PR body)
- [ ] `README.md` names `tests/data-contract.test.ts`

## STOP conditions

- `pnpm test` dies before any test runs with `glob is not a function` — you have put
  `import.meta.glob` somewhere `uno.config.ts` can reach. Revert step 4 and re-read it.
- `dist/` does not match and you cannot account for the difference.
- `uno.config.ts` needs editing to make anything pass. It must not change in this plan.
- A race row's data has to change to make a test pass. It must not — this is a move.

## Maintenance notes

- Adding a race is now: write one file. The type demands the required fields; `pnpm check` names
  a missing one.
- The filename carries the date **as a convenience**; `index.ts` sorts by the field. Do not
  "simplify" the sort to use the glob key — that reintroduces an unchecked second copy.
- Plan 021 deletes `constants.ts` entirely. Anything left in it after this plan is copy or goals.
