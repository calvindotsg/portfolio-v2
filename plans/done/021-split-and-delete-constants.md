# Plan 021: Split the copy out of `constants.ts` and delete the file

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Your reviewer maintains `plans/README.md` —
> do not edit it.
>
> **Drift check (run first)**:
> `git diff --stat 8ce7565..HEAD -- src/lib/constants.ts uno.config.ts README.md CLAUDE.md`
> STOP if `uno.config.ts:3`'s import list gained a name not in the allocation table below.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: **HIGH** — changes a standing configuration rule the maintainer set, and touches
  every consumer of site copy
- **Depends on**: plans/020
- **Category**: migration
- **Planned at**: commit `8ce7565`, 2026-08-07
- **Maintainer sign-off**: **GRANTED 2026-08-07.** What was approved is the rule change
  specifically: *"a GitHub repository secret, a GitHub repository variable, or
  `src/lib/constants.ts`"* becomes *"…or `src/content/` and `src/data/`"*, counted as one home so
  the sanctioned-homes count stays at three. The allocation table below is approved with it,
  including `RAW_GOALS` and `GOAL_YEAR` living under `src/data/` rather than `src/lib/`.
  **Sign-off does not extend past this plan's Scope**: it is not approval to change any copy
  text, to touch `uno.config.ts` beyond its import lines, or to alter site output. The `dist/`
  hash-compare in step 5 is what holds that boundary.

## Why this matters

After plan 020 the race data is out, but `constants.ts` still holds ~1,600 lines mixing site copy,
goal configuration and derivation code behind one name. A reader looking for the footer and a
reader looking for the goal target open the same 1,600-line file. Splitting it by kind means each
is found by looking where its kind lives.

**The maintainer's sign-off is recorded in the Status block above** — granted 2026-08-07, scoped
to the rule change and the allocation table. It was needed because this plan makes a standing rule
false and rewrites it, and the rule is the maintainer's rather than the repository's.

## Current state

`src/lib/constants.ts` at `8ce7565`, 1,902 lines before plan 020. The allocation:

| destination | exports |
|---|---|
| `src/content/site.ts` | `METADATA`, `LINKS`, `FOOTER`, `THEME_TOGGLE`, `NEW_TAB_NOTICE`, `NOT_FOUND` |
| `src/content/home.ts` | `WELCOME`, `ABOUT_ME`, `CAREER`, `PROJECTS`, `NOW` |
| `src/content/races.ts` | `PATCHES`, `NEXT_RACE` |
| `src/data/goals.ts` | `RAW_GOALS`, `GOAL_YEAR` |
| `src/lib/goal.ts` | `Goal`, `Sport`, `GOALS`, `goalForSport`, `clampToGoal` |

**`RAW_GOALS` goes to `src/data/`, not `src/lib/`.** It is authored configuration —
`total_goal` is the site's most obviously configurable value, and `README.md`'s `## Configuration`
says so today. Putting it in `src/lib/` while the rewritten rule names `src/content/` and
`src/data/` makes the rule false about `total_goal` **on the day it is written**.
`Sport = typeof RAW_GOALS[number]["sport"]` survives the import, and lib-reads-data is already
established — `constants.ts:1` reads `src/data/strava-progress.json` today. `RAW_GOALS` is
module-private at present, so this is a new export rather than a relocation.

**The constraint.** `@unocss/config` loads `uno.config.ts` via unconfig/jiti, not Vite.
`uno.config.ts:3` pulls **nine names** in one import:

```ts
import {CAREER, FOOTER, GOALS, LINKS, NEXT_RACE, NOT_FOUND, NOW, PATCHES, WELCOME} from "./src/lib/constants";
```

Against the table above that becomes **four import lines and four jiti-pinned roots**
(`site.ts`, `home.ts`, `races.ts`, `goal.ts`). The safelist *expressions* are untouched — that is
the risk being deleted. Note the direction of travel: this **shrinks** the jiti-pinned surface,
because today that import reaches the module that held `EVENTS`.

`tests/constants.test.ts` is named for a file that stops existing. `README.md:145` names both the
suite and the path.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Tests | `pnpm test` | all pass |
| Build | `pnpm build` | exit 0 |

## Scope

**In scope**: the five new modules, `src/lib/constants.ts` (deleted), the ~25 import sites,
`uno.config.ts` (import lines only), `tests/constants.test.ts` (renamed), `README.md`, `CLAUDE.md`.

**Out of scope**:
- `uno.config.ts`'s `safelist`, `blocklist`, presets or any expression in it. Import lines only.
- Any copy **text**. This is a move.
- `src/data/races/` — plan 020 owns it.

## Git workflow

- Branch: `plan/021-split-constants`
- e.g. `refactor(content): split constants.ts by kind and delete it`

## Steps

### Step 1: create the five modules

Move each group per the allocation table, comments intact. `constants.ts` re-exports from them
temporarily **only if nothing it re-exports touches `import.meta.glob`** — after plan 020 that is
true, because races have already left. Verify it stays true.

**Verify**: `pnpm check` → exit 0; `pnpm test` → all pass.

### Step 2: retarget every import, then delete `constants.ts`

~25 sites, all compiler-verified. `uno.config.ts:3` becomes four lines.

**No barrel survives.** A barrel everything imports re-couples what this plan separates and leaves
the 116 KB read path intact for whatever follows.

**Verify**: `test ! -f src/lib/constants.ts` → true. `pnpm check`, `pnpm eslint`, `pnpm test` → all pass.
`pnpm build` → exit 0 (this is what proves the jiti graph is still clean).

### Step 3: rename the suite

`tests/constants.test.ts` → a name that matches its subject. Update `README.md:145`, which names
both the old suite and the old path, in this same commit — `docs-drift` gates both.

### Step 4: rewrite the rule

The standing rule becomes: **a GitHub repository secret, a GitHub repository variable, or
`src/content/` and `src/data/`.** Count the two directories as **one** home so `README.md:106`'s
"two of the three sanctioned homes" survives as an edit rather than a recount.

Update `README.md`'s `## Configuration` (step 1 currently enumerates every piece of content and
names the deleted path) and CLAUDE.md's "Content Management" section, which is entirely about
`constants.ts`.

**Verify**: `pnpm test` → all pass (docs-drift covers both files).

### Step 5: prove it changed nothing

Same `dist/` hash-compare as plan 020 step 5, including the `<meta name="build-date">` guard.

## Test plan

No new tests. The regression net is the existing suite plus the `dist/` comparison: this plan
must be behaviour-free, and the comparison is what proves it rather than asserts it.

## Done criteria

- [ ] `pnpm check`, `pnpm eslint`, `pnpm test`, `pnpm build` all exit 0
- [ ] `test ! -f src/lib/constants.ts`
- [ ] `grep -rn "lib/constants" src/ tests/ uno.config.ts` → no matches
- [ ] `uno.config.ts` has four content/data imports and its safelist array is byte-identical
- [ ] `dist/` matches byte-for-byte after normalising hashes and the build-date meta
- [ ] `README.md` and `CLAUDE.md` state the rewritten rule; `README.md:106`'s count still reads three

## STOP conditions

- The Status block above does not record a maintainer sign-off, or the plan's Scope has grown
  beyond what that sign-off names. **Do not start.** (Sign-off was granted 2026-08-07 for the rule
  change and the allocation table, and for nothing wider.)
- `pnpm build` fails with a jiti stack after step 2 — something in the four new roots reaches
  `import.meta.glob`. `src/content/races.ts` and `src/data/races/index.ts` sit either side of that
  line with names that do not distinguish them; check that one first.
- `dist/` does not match and you cannot account for it.
- Any copy text would have to change to make a test pass.

## Maintenance notes

- The four jiti-pinned roots are `src/content/{site,home,races}.ts` and `src/lib/goal.ts`. None
  may ever use `import.meta.glob`, `astro:content`, top-level `await` or import a `.astro` file.
  Carry that note **in each of the four**, not only in `uno.config.ts`.
- Plan 023 sweeps the ~52 prose references no gate catches. It is sized on this plan landing.
