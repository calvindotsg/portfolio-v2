# Plan 045: Fetch the weekly training series, and store the sessions rather than the totals

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 719d3d6..HEAD -- scripts/ src/lib/ src/data/ .github/workflows/strava-progress.yml tests/`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts
> against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED — it adds a nightly writer to a repository whose nightly writer already merges itself
- **Depends on**: none
- **Category**: direction (new data surface) + tests
- **Planned at**: commit `719d3d6`, 2026-08-27

## Why this matters

The site knows two numbers about a year of training — `cycling_km` and `running_km` — and nothing
about its shape. That is enough for a progress bar and nothing else, which is why the home page's
goal cards go silent for roughly six weeks a year: once the kilometres pass the target the card
prints `Goal met` against a full rule until 31 December, and on 1 January it resets to `0 / 600 km`
against an empty one. "What is the training doing" stays interesting on all of those days, and the
site cannot answer it.

This plan adds the missing series: **one module per ISO week, holding that week's Strava sessions**,
fetched by a deterministic script in GitHub Actions and committed to the repository. It renders
nothing. Plans 046 and 047 render it.

**Two properties are the point, and both are decisions rather than defaults.** The repository stores
**sessions, not weekly totals** — a total is a derived value, and the three rules it derives from
(the metres→km conversion, the week boundary, the sport-type mapping) have each moved in this
project or its sibling. And the script writes through an **allow-list**, so a field Strava adds
later cannot arrive in the repository by accident.

## Current state

### The files that exist today

- `scripts/fetch-strava-progress.mjs` — the only Strava fetcher. Calls
  `GET /athletes/{id}/stats` and writes `src/data/strava-progress.json`. Zero dependencies,
  fail-loud, byte-stable output.
- `scripts/strava-auth.mjs` — the one token path (`accessToken(env)`); every Strava caller shares it.
- `src/data/strava-progress.json` — three fields:
  ```json
  {
      "cycling_km": 2602.2,
      "running_km": 284.6,
      "updated_at": "2026-08-27"
  }
  ```
- `.github/workflows/strava-progress.yml` — 21:13 UTC cron (05:13 SGT), `workflow_dispatch`,
  pushes `bot/strava-progress`, opens a PR as a GitHub App and merges it. **Read its commit step
  before step 6: the guard and the staging are BOTH pathspec-scoped to one file, and the commit
  takes no `-a`.** Verbatim, at the lines given:
  ```yaml
  # :272
  if git diff --quiet -- src/data/strava-progress.json; then
  # :289
  git add src/data/strava-progress.json
  # :308
  git commit -m "$SUBJECT"
  ```
- `src/data/races/index.ts` — the collector pattern this plan copies:
  ```ts
  const modules = import.meta.glob<{default: RaceEvent}>("./*.ts", {eager: true})

  export const EVENTS: readonly RaceEvent[] = Object.entries(modules)
      .map(([key, m]) => [key, m.default] as const)
      .sort(([ka, a], [kb, b]) => a.date.localeCompare(b.date) || ka.localeCompare(kb))
      .map(([, race]) => race)
  ```
- `src/lib/race.ts` — `Recording = {id: string, metres: number, elapsed_time: string}`, and
  `kmFromMetres`, which rounds metres **down** to two places.
- `src/lib/provenance.ts` — every field of `RaceEvent` has a declared origin:
  ```ts
  export type SourceOfRecord = "strava" | "organiser" | "results" | "athlete"

  export const SOURCE_OF_RECORD: Readonly<Record<string, SourceOfRecord>> = { ... }
  export const PROGRESS_SOURCE_OF_RECORD: Readonly<Record<string, SourceOfRecord>> = {
      cycling_km: "strava",
      running_km: "strava",
      updated_at: "athlete",
  }
  ```
  `tests/data-contract.test.ts` holds the type and the map to each other in both directions.
- `src/lib/today.ts` — the only module under `src/` that reads a clock. `BUILD_DATE` is what day
  it is; `UPDATED_AT` (in `projection.ts`, read from the JSON above) is the day the kilometres last
  **moved**. Calendar questions take `BUILD_DATE`. Do not use `UPDATED_AT` for anything in this plan.

### The conventions that apply

- **Zero-dependency scripts.** `scripts/*.mjs` use node's built-in `fetch` and nothing else. Match
  `scripts/fetch-strava-progress.mjs` exactly: named exports for every pure function so the suite
  can call them, `main()` guarded by
  `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`.
- **Fail-loud.** Any bad value from Strava throws; the workflow goes red; no file is written.
  See `kmFromMeters` in that file for the shape.
- **Byte-stable output.** 4-space indent, trailing newline, fixed key order — so an unchanged value
  produces a zero diff and `git diff --quiet` suppresses the commit. This is load-bearing: without
  it the repository deploys every night.
- **Configuration has exactly three homes** — a GitHub repository secret, a repository variable, or
  `src/content/` + `src/data/`. A script holds none of its own. The athlete id is already the
  `STRAVA_ATHLETE_ID` repository variable; reuse it, do not add a second.
- **`import.meta.glob` is forbidden in anything `uno.config.ts` reaches.** That config loads modules
  through unconfig/jiti, which has no `import.meta.glob`; a re-export into that graph kills
  `astro build` *and* vitest with `glob is not a function` and no test executed. The rule is written
  out at the bottom of `src/data/races/index.ts`. **Nothing may re-export
  `src/data/weeks/index.ts` from a module `uno.config.ts` imports, directly or transitively.**
- **A test file states what it is for above its own first `describe(`.** `tests/docs-drift.test.ts`
  enforces this. A new suite without that block is red.

### The design constraint this plan must honour

From `CLAUDE.md`:

> Any user configurable variable belongs in one of exactly three places: a GitHub repository secret,
> a GitHub repository variable, or the repository's own content.

and

> **The site has TWO clocks and they answer different questions.** `UPDATED_AT` is the bot's stamp
> … `BUILD_DATE` … is what day it is, and the calendar questions take it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, no errors |
| Lint | `pnpm eslint` | exit 0 |
| Tests | `pnpm test` | exit 0, all pass |
| Tests, reusing `dist/` | `SKIP_BUILD=1 pnpm test` | exit 0 — **only while iterating**; it makes a source change invisible to any `dist/`-reading gate |
| Build | `pnpm build` | exit 0 |

There is no `pnpm lint` and no `pnpm typecheck` in this repository. Do not invent them.

## Scope

**In scope**:
- `src/lib/training.ts` (create) — the session and week types, and the derivations
- `src/data/weeks/` (create) — one module per ISO week, plus `index.ts`
- `src/data/weeks/README.md` (create) — what a week module is, mirroring `src/data/races/README.md`
- `scripts/fetch-strava-weeks.mjs` (create)
- `scripts/README.md` (edit — add the new script)
- `src/lib/provenance.ts` (edit — add `WEEK_SOURCE_OF_RECORD`)
- `.github/workflows/strava-progress.yml` (edit — run the second fetch in the same job)
- `tests/training.test.ts` (create)
- `tests/strava-scripts.test.ts` (edit — the new script's pure functions)
- `tests/data-contract.test.ts` (edit — the new provenance map)
- `CONTRIBUTING.md` (edit **only if** step 8's CI-step assertion requires it)
- `plans/README.md` (edit — status row only, at the end)

**Out of scope** (do NOT touch, even though they look related):
- `src/data/strava-progress.json` and `scripts/fetch-strava-progress.mjs`'s **fetch logic**. The
  year totals keep coming from `/athletes/{id}/stats`. Re-deriving them by summing sessions would
  move a figure that `tests/derived-figures.test.ts`, `tests/projection.test.ts` and
  `tests/clock-split.test.ts` are all built on.
- `src/lib/projection.ts`. The weekly series is a new **consumer** of Strava data, not a new input
  to the projection. `bookedAhead`, `goalStatus` and `patchState` are unchanged by this plan.
- Any page, component or route. This plan renders nothing.
- `src/data/races/`. A race is already a Strava activity and will already appear in its week; do not
  add, remove or edit a race module here.

## Git workflow

- Branch: `advisor/045-fetch-the-weekly-training-series`
- Conventional commits, matching `git log --oneline -20`. Recent examples:
  `declare where every published figure comes from (#235)`,
  `chore(goals): update Strava progress to 2602.2 km ride / 284.6 km run (#229)`.
- Do NOT push or open a pull request unless the operator instructs it.

## Steps

### Step 1: Measure the three things this plan currently assumes

**This step writes no production code.** It produces three facts the rest of the plan depends on.
Write a throwaway probe under `.scratchpad/` (git-ignored) that authenticates with
`scripts/strava-auth.mjs` and calls
`GET https://www.strava.com/api/v3/athlete/activities?per_page=200&after=<epoch of 1 Jan 2026 SGT>`.

Record, in a file `.scratchpad/045-measurements.md`:

1. **The distinct `sport_type` values returned for the current year**, and for each, whether its
   metres are inside `ytd_ride_totals.distance` or `ytd_run_totals.distance` from
   `GET /athletes/{id}/stats`. Determine this by summing per `sport_type` and comparing.
   *This is the mapping step 3 encodes. Do not guess it — `VirtualRide`, `EBikeRide`, `TrailRun`,
   `Walk` and `Workout` each behave differently and the answer is an empirical fact about this
   athlete's account.*
2. **The largest absolute disagreement**, in metres, between the summed sessions and the `/stats`
   figure for each sport. This becomes the tolerance in step 7's cross-check gate.
3. **The number of activities** and therefore **the number of requests** at `per_page=200`.

**Verify**: `.scratchpad/045-measurements.md` exists and answers all three. If (1) shows a
`sport_type` you cannot confidently assign to ride, run or neither — **STOP and report**.

> Rate limits are 100 requests per 15 minutes and 1000 per day. A full year at `per_page=200` is
> expected to be 2 requests. If the probe needs more than 5, note it — the year is larger than
> this plan assumed.

### Step 2: Add the types

Create `src/lib/training.ts`. It must not import from `src/content/` (that direction is forbidden —
`src/lib/race.ts` records why: a value-import creates a jiti cycle).

```ts
/** A Sport is the site's own word, and it already exists — import it from `./race`. */
import type {Sport} from "./race"

/**
 * ONE STRAVA ACTIVITY, REDUCED TO THE SIX FACTS THIS SITE KEEPS.
 *
 * The list is an ALLOW-LIST rather than a subset, and the difference is the whole point:
 * a deny-list lets a field Strava adds next year arrive in this repository silently.
 * `scripts/fetch-strava-weeks.mjs` PROJECTS onto exactly these keys and never spreads.
 *
 * What is deliberately absent, and why:
 *   name, description        athlete-authored prose; nothing renders it
 *   map.summary_polyline     a route; the same rule the sibling training wiki enforces
 *   start_latlng, end_latlng a home address, in practice
 *   average_heartrate,
 *   max_heartrate,
 *   suffer_score             physiology. The owner's recorded decision keeps this private
 *   average_watts, gear_id,
 *   device_name              nothing on this site asks
 *
 * `metres` is stored EXACTLY as the API reported it, for the reason `Recording.metres`
 * in `./race.ts` gives: the conversion belongs at the edge, in one place, so a change to
 * the rounding rule cannot leave a stale figure behind.
 */
export type TrainingSession = {
    id: string
    sport_type: string
    /** ISO local datetime, exactly Strava's `start_date_local`. Local, not UTC — see the note in `isoWeekKey`. */
    start_local: string
    metres: number
    moving_seconds: number
    elapsed_seconds: number
}

export type TrainingWeek = {
    sessions: readonly TrainingSession[]
}

/** The six keys above, as data, so the gate and the script can both read the same list. */
export const SESSION_KEYS = [
    "id", "sport_type", "start_local", "metres", "moving_seconds", "elapsed_seconds",
] as const
```

Then add, in the same file, the derivations — **every one of them a function, none of them a stored
field**:

- `isoWeekKey(startLocal: string): string` → `"2026-W35"`. ISO-8601: weeks run Monday to Sunday and
  week 1 is the week containing the first Thursday of the January.
- `isoWeekMonday(key: string): string` → the ISO date of that week's Monday.
- `sportOf(sportType: string): Sport | null` → the mapping **measured in step 1**. Anything the
  measurement did not assign returns `null` and is counted in neither sport's total.
- `weekTotals(week: TrainingWeek)` → `{metres, run_metres, ride_metres, sessions, moving_seconds}`.
- `kmOf(metres: number): number` → **reuse the existing rule**. Import `kmFromMetres` from
  `./race.ts` rather than writing a second conversion. If it is not exported, export it; do not copy
  it. CLAUDE.md: *that rounding has been reversed twice and is now one line rather than a figure in
  every row.*

> **The trap, and it must be written into the file as a comment. An ISO week-year is not a calendar
> year, and the two claims must never be collapsed into one.** Measured, not assumed:
> `2026-W01` begins **Monday 29 December 2025**; so do `2025-W01` (29 Dec 2024) and `2030-W01`
> (31 Dec 2029); and **2026 has 53 ISO weeks**, so `2026-W53` exists and runs into January 2027.
> The wall and the goal cards are scoped by CALENDAR year (`GOAL_YEAR` in `src/data/goals.ts`).
>
> **THE TWO RULES THIS REPOSITORY ADOPTS, AND THEY ARE SEPARATE:**
> 1. **A file's key is its ISO week key and carries no calendar-year claim.** `2026-W01.ts` holds
>    the sessions of ISO week 2026-W01, several of which fall in December 2025. That is correct and
>    must not be "fixed".
> 2. **A PAGE's year filter uses the week's MONDAY.** So `/training/2026` does not show `2026-W01`
>    (its Monday is in 2025) and does show `2025-W53`-through-`2026-W53` by Monday. State this
>    beside `isoWeekMonday`, and gate rule 1 in step 7.
>
> An earlier draft of this plan said "a week belongs to the calendar year of its Monday" as a single
> rule and let the filename inherit it. That is self-contradictory — it makes `2026-W01.ts` a 2025
> file — and it would have reddened the suite on 2026 itself.

**Verify**: `pnpm check` → exit 0.

### Step 3: Add the collector

Create `src/data/weeks/index.ts`, modelled on `src/data/races/index.ts`:

```ts
import type {TrainingWeek} from "../../lib/training"

const modules = import.meta.glob<{default: TrainingWeek}>("./*.ts", {eager: true})

export const WEEKS: ReadonlyMap<string, TrainingWeek> = new Map(
    Object.entries(modules)
        .map(([key, m]) => [key.replace(/^\.\//, "").replace(/\.ts$/, ""), m.default] as const)
        .sort(([a], [b]) => a.localeCompare(b))
)
```

Carry across, in the file's own words, the two rules from `src/data/races/index.ts`:
one module per week; and **nothing may re-export this module from anything `uno.config.ts`
imports**, because jiti has no `import.meta.glob`.

Create `src/data/weeks/README.md` saying what a week module is and how it is written (by the script,
never by hand), mirroring `src/data/races/README.md`.

**Verify**: `pnpm check` → exit 0. `pnpm build` → exit 0 (an empty glob is legal).

### Step 4: Write the fetcher

Create `scripts/fetch-strava-weeks.mjs`. Copy the posture of `scripts/fetch-strava-progress.mjs`
exactly — header comment, zero dependencies, `accessToken` from `./strava-auth.mjs`,
`STRAVA_ATHLETE_ID` from the environment, named exports, guarded `main()`.

Behaviour:

1. Determine the target year: `process.env.STRAVA_WEEKS_YEAR` if set (that is how the backfill in
   step 9 runs), else the Singapore calendar year. **Reuse `singaporeDate` from
   `fetch-strava-progress.mjs`** — export it there if it is not already exported; do not write a
   second timezone conversion.
2. Page `GET /athlete/activities?per_page=200&after=<epoch>&before=<epoch>` until a short page
   comes back. `after`/`before` are seconds. Bound the window generously — one week either side of
   the year — and discard out-of-range weeks after bucketing, because the API filters on UTC
   `start_date` and this plan buckets on local time.
3. **Project each activity onto `SESSION_KEYS`, one key at a time.** Never `{...activity}`, never a
   `delete`. A pure exported function:
   ```js
   export function toSession(activity) { /* explicit six-field object, validating each */ }
   ```
   Every field is validated and throws on a bad value, the way `kmFromMeters` does. `id` is
   stringified (Strava ids exceed `Number.MAX_SAFE_INTEGER`; `Recording.id` in `src/lib/race.ts` is
   a string for the same reason).
4. Bucket by ISO week of `start_date_local`. **The script must not import `src/lib/training.ts`** —
   that is TypeScript and this script has no build step. Write the ISO-week function in the script
   and let `tests/training.test.ts` assert the two agree on a shared table of cases (step 7). That
   duplication is deliberate and gated; a silent second implementation is not.
5. Write one file per week, `src/data/weeks/<key>.ts`, byte-stable:
   ```ts
   import type {TrainingWeek} from "../../lib/training"

   export default {sessions: [
       {id: "…", sport_type: "Ride", start_local: "2026-08-24T06:02:11Z", metres: 42123.4, moving_seconds: 5400, elapsed_seconds: 5620},
   ]} satisfies TrainingWeek
   ```
   Sessions sorted by `start_local` then `id`, so the order is total and a re-fetch cannot reorder
   a file.
6. **Delete exactly the week files whose keys were IN THE FETCHED SPAN and came back empty**, so a
   deleted Strava activity leaves the repository. **Scope the sweep by the fetched ISO week keys,
   never by a `<year>-W*.ts` glob.** The fetch window is an ISO week-year span, not a calendar year,
   so a glob on the year prefix would sweep a boundary week the fetch never covered — `2026-W01`
   starts 29 December 2025 — and delete a real week every night. Compute the key set the fetch
   covered, and delete only members of that set with no sessions.

**Verify**:
- `pnpm eslint` → exit 0 (`scripts/**/*.mjs` is in the glob; the config block already exists).
- `node scripts/fetch-strava-weeks.mjs` with real credentials writes files; running it twice in a
  row leaves `git status --porcelain src/data/weeks/` **empty on the second run**. That is the
  byte-stability contract and it is the one thing standing between this repository and a nightly
  deploy.

### Step 5: Declare the provenance

In `src/lib/provenance.ts`, add:

```ts
export const WEEK_SOURCE_OF_RECORD: Readonly<Record<string, SourceOfRecord>> = {
    "sessions.id": "strava",
    "sessions.sport_type": "strava",
    "sessions.start_local": "strava",
    "sessions.metres": "strava",
    "sessions.moving_seconds": "strava",
    "sessions.elapsed_seconds": "strava",
}
```

Every stored field is `strava` — which is the check that the store-the-source decision held. **A
field that needs any other origin is a derived value that has leaked into storage; STOP and report
rather than inventing a fifth `SourceOfRecord`.**

The rule at the top of that file still applies: an origin names the original source of record and
never a store the fact passed through, so `src/data/weeks/` is not a legal value.

**Verify**: `pnpm check` → exit 0.

### Step 6: Run both fetches in one job

Edit `.github/workflows/strava-progress.yml`. Add a step running
`node scripts/fetch-strava-weeks.mjs` **immediately after** the existing progress fetch and
**before** the commit guard, inside the same job, so both files move in one commit.

**THE GUARD AND THE STAGING ARE BOTH PATHSPEC-SCOPED, AND WIDENING THE PATHSPEC IS NOT ENOUGH.**
Two separate defects, and missing either one produces a green workflow that silently discards every
week module:

1. `:272` is `git diff --quiet -- src/data/strava-progress.json` and `:289` is
   `git add src/data/strava-progress.json`. `git commit` at `:308` takes no `-a`. So a week module
   written into the runner is never staged and never committed.
2. **`git diff` cannot see a NEW file at all.** It compares tracked worktree against index, and a
   brand-new `src/data/weeks/2026-W36.ts` is untracked — so even with the pathspec widened, the
   guard reports "no change" on the very night a new week appears and exits before committing. The
   existing step works only because `src/data/strava-progress.json` is already tracked.

**So change the idiom, not the pathspec: stage first, then test the INDEX.** Replace the guard and
the `git add` with, in this order:

```yaml
git add -A -- src/data/strava-progress.json src/data/weeks
if git diff --cached --quiet; then
  echo "Nothing moved; nothing to commit"
  exit 0
fi
```

`-A` is what stages a deletion, which step 4.6's sweep depends on. Keep the rest of the step —
message, branch, push, PR — as it is.

Do not add a second workflow. The two fetches are coupled — a new activity moves the year total and
a week together, so they can never disagree about whether there is something to commit — and a
second nightly job would mean two pull requests a night racing the same protected branch.

Add `workflow_dispatch` input `year` (optional, string), passed as `STRAVA_WEEKS_YEAR`, for the
backfill in step 9.

Extend the commit message so it names what moved, matching the existing style
(`chore(goals): update Strava progress to …`).

**Verify**: `pnpm test` → exit 0. `tests/workflow-guards.test.ts` gates workflow shape; read its
failures rather than working around them.

### Step 7: Gate it

Create `tests/training.test.ts`, opening with a block above its first `describe(` saying what the
suite is for (`tests/docs-drift.test.ts` requires this). Assertions:

1. **ISO weeks.** A shared table of dated cases — at minimum: a mid-year Wednesday; **29 December
   2025 → `2026-W01`**; **1 January 2027 → `2026-W53`** if 2026 has 53 ISO weeks (compute, do not
   assume); a Sunday and the Monday after it landing in different weeks. Assert
   `isoWeekKey` in `src/lib/training.ts` and the script's own implementation agree on **every** case.
2. **The allow-list.** Walk every session in `WEEKS` and assert its key set equals `SESSION_KEYS`
   exactly — no missing key, no extra key. This is the gate that catches a spread.
3. **The writer's allow-list.** Call `toSession` from the script with a fixture activity carrying
   `name`, `map`, `start_latlng`, `average_heartrate` and `suffer_score`, and assert none survive.
   *Assert the projection, not the fixture: a deny-list test passes on the day a new field appears.*
4. **A file holds its own week, and nothing else.** Every module in `src/data/weeks/` contains only
   sessions whose ISO week equals the filename's key. **Assert nothing about the file's calendar
   year** — `2026-W01.ts` legitimately holds December-2025 sessions, and a gate that says otherwise
   is red on correct data (verified: `2025-W01`, `2026-W01` and `2030-W01` all begin in the previous
   calendar year, and 2026 runs to `W53`). Assert separately that `isoWeekMonday("2026-W01")` is
   `2025-12-29`, which is the fact the page's year filter rests on.
5. **The cross-check.** Summed session metres per sport for the calendar year agree with
   `src/data/strava-progress.json` within the tolerance **measured in step 1**. Write the measured
   figure and the date it was measured into the test as a comment. If no tolerance below 1 % of the
   year total makes this pass — **STOP and report**: the sport mapping is wrong, and shipping a
   loose tolerance would hide it.
6. **No TRAINING session id leaks into the built output — and the naive spelling of this gate is
   RED ON CORRECT CONTENT.** The obvious assertion is "no id from `src/data/weeks/` appears in
   `dist/`". **Do not write that.** A race IS a Strava activity, so its `recordings[].id` is a
   session id *and* is already published as an href — `src/lib/race.ts:24` builds
   `https://www.strava.com/activities/<id>`, `src/components/Patch.astro` renders it on the stub,
   and `src/lib/patch-doc.ts` emits it into the markdown twins. Five 2026 races carry recordings
   today, so that gate reddens the moment step 9 lands real data, with nothing wrong.
   **Assert the SET DIFFERENCE instead**: build the set of every id under `src/data/weeks/`,
   subtract every `recordings[].id` in `EVENTS`, and assert **no remaining id** appears anywhere in
   `dist/`. That is the actual invariant — the wall publishes race activity ids by design, with
   "View on Strava" beside them; an ordinary Tuesday's id must not appear at all.
   Assert the subtraction is non-empty before asserting the absence, or the gate is vacuous on a
   week that happens to contain only races.

Extend `tests/strava-scripts.test.ts` with the new script's pure functions (`toSession`, the ISO
week function, the year-window epochs), and `tests/data-contract.test.ts` with
`WEEK_SOURCE_OF_RECORD` held to `SESSION_KEYS` in both directions, exactly as it holds
`SOURCE_OF_RECORD` to `RaceEvent`.

**Verify**: `pnpm test` → exit 0, with the new assertions counted.

### Step 8: Watch each new gate fail on purpose

A gate nobody has watched fail is a claim about a gate. For each of the six assertions in step 7,
mutate the input so it *should* redden, run `pnpm test`, and record in the pull-request body which
test failed and with what message. Suggested mutations, one at a time, reverted after each:

| # | Mutation |
|---|---|
| 1 | Change the script's ISO week function to use `getDay()` instead of an ISO-Monday offset |
| 2 | Add `"name": "Morning Ride"` to one stored session |
| 3 | Change `toSession` to `{...activity, ...}` |
| 4 | Move one session into the adjacent week's file |
| 5 | Add 5 km to one session's `metres` |
| 6 | Render a **non-race** session id into any page under `src/pages/` — pick one that is not in any `recordings[]`, or the gate correctly stays green |

**Full `pnpm test`, never `SKIP_BUILD=1`**, for mutations 5 and 6 — a `dist/`-reading gate cannot
see a source change against a stale build.

**Verify**: each mutation produces at least one red test, and each red test is the one intended.
If a mutation is **green**, the gate is vacuous — fix the gate before proceeding.

### Step 9: Backfill 2026, and stop there

Run the workflow once by hand for the current year
(`gh workflow run strava-progress.yml -f year=2026`), review the pull request it opens, and merge it
only if the operator asks. Do **not** backfill 2022–2025 in this plan: plan 046 renders one year at
a time, and a back catalogue is a data edit that can land whenever it is wanted.

**Verify**: `src/data/weeks/2026-W*.ts` exist for every week of 2026 that has an activity, and
`pnpm test` → exit 0 against them.

## Test plan

New file `tests/training.test.ts` — the six assertions in step 7, modelled structurally on
`tests/data-contract.test.ts` (which is the closest existing suite: it walks typed data and holds it
to a declared contract).

Extended: `tests/strava-scripts.test.ts` (pattern already established for
`fetch-strava-progress.mjs`'s pure functions), `tests/data-contract.test.ts`.

Verification: `pnpm test` → exit 0.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `node scripts/fetch-strava-weeks.mjs` twice in a row leaves `git status --porcelain src/data/weeks/` empty on the second run
- [ ] `grep -rn "average_heartrate\|suffer_score\|summary_polyline\|start_latlng" src/data/weeks/` returns no matches
- [ ] `grep -rn "import.meta.glob" src/` shows it only in `src/data/races/index.ts` and `src/data/weeks/index.ts`, and neither is reachable from `uno.config.ts`'s import graph
- [ ] Each of the six mutations in step 8 was run and reddened the intended test; the results are in the PR body
- [ ] `.scratchpad/045-measurements.md` records the sport mapping, the tolerance and the request count
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 finds a `sport_type` you cannot confidently assign to ride, run or neither.
- Step 7's cross-check needs a tolerance above 1 % of the year total to pass. That is a wrong sport
  mapping wearing a loose gate.
- A mutation in step 8 leaves the suite green.
- The fetch needs more than 5 requests for one year, or returns a 429.
- `pnpm build` or `pnpm test` reports `glob is not a function`. Something re-exported
  `src/data/weeks/index.ts` into `uno.config.ts`'s graph; find it and cut the edge rather than
  removing the glob.
- The work appears to require editing `src/lib/projection.ts` or `src/data/strava-progress.json`.
  It does not; if it seems to, an assumption in this plan is wrong.
- You are about to write a weekly **total** into a file under `src/data/weeks/`. That is the one
  decision this plan exists to make, and it is made the other way.

## Maintenance notes

- **The two clocks stay apart.** Nothing in this plan may read `UPDATED_AT`. A week's dates come
  from its sessions; "is this week over" comes from `BUILD_DATE`.
- **Growth.** Roughly 50 modules and ~50 KB of text per year, against a 16 MiB packed repository.
  The fetcher rewrites a whole year each night; byte-stability is what keeps that free. If a future
  change makes the output unstable, the symptom is a deploy every night, not a test failure.
- **A retro-edited activity is handled by construction** — the full-year rewrite picks up an edited
  distance or a late upload, which a watermark could not.
- **What a reviewer should scrutinise**: that `toSession` projects rather than spreads; that the
  step-8 mutation results are in the PR body; and that the cross-check tolerance is the measured
  figure rather than a round number chosen to make the suite green.
- **Deferred out of this plan, deliberately**: rendering anything (046, 047); the authored weekly
  record with its prose and photographs; the models and the forecast scorecard. The memo's
  obligation is that the *learned* layer stays a separate module from the *measured* record — this
  plan ships only the measured record, which keeps that door open.
- **What Claude Code on the web cannot do**: land a commit touching `.github/workflows/`. Step 6 has
  to be done from a terminal. The rest of this plan can be written from anywhere.
