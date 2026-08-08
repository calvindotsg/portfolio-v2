# Plan 022: Separate the data contract from behaviour, and promote the Strava tooling

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Your reviewer maintains `plans/README.md` —
> do not edit it.
>
> **Drift check (run first)**:
> `git diff --stat 8ce7565..HEAD -- tests/projection.test.ts scripts/ .github/workflows/strava-progress.yml src/lib/today.ts`
> STOP if `describe("EVENTS")` or `describe("the bot's write contract")` changed shape, or if
> `scripts/fetch-strava-progress.mjs`'s token handling changed.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED (touches the credential path; no secret values are handled by this plan's author)
- **Depends on**: plans/020
- **Category**: tests, dx
- **Planned at**: commit `8ce7565`, 2026-08-07

## Why this matters

Two separate things share one file today. `tests/projection.test.ts` holds both *behaviour* tests
(pinned literals that a data edit reddens) and a *data contract* (assertions that hold for any
valid data and name the offending row when they fail). Splitting them means a valid data edit
reddens nothing, an invalid one reddens the contract and says why, and the derived-figures diff
from plan 019 carries what moved.

Separately, two working Strava tools live in `.scratchpad/`, which is gitignored and which the
convention says to clean up after a task — so they are one `rm` from being lost and are
undiscoverable to a future session.

## Current state

- `tests/projection.test.ts:522` — `describe("EVENTS")`, **eight** `it` blocks (`:523, 548, 579,
  620, 668, 706, 746, 795`), ~300 lines. None pins a digit; all hold for any valid data. This is
  the data contract, already written, just not separated.
- `tests/projection.test.ts:706` — **already asserts no Strava activity id appears twice**, across
  arrays. Do not "add" this invariant; you would duplicate or weaken it.
- `tests/projection.test.ts:1099` — `describe("the bot's write contract")`, six `it` blocks
  (`:1102-1143`). It exercises `nextProgress`/`serialise` imported from
  `scripts/fetch-strava-progress.mjs` against **literal fixtures** (`:1128-1131` feeds `""` and
  `"{not json"`). It is a script behaviour suite, not a live-data contract. `src/lib/today.ts`'s
  comment points at it as one half of a deliberately paired assertion, whose Singapore-date half
  is `:1139`.
- `tests/projection.test.ts:352` — the required-rate literal that a booked race reddens.
- `tests/projection.test.ts:447` and `:456` — **not** required-rate literals. They are the goal
  card's 182px width budget, and `:456` deliberately sweeps live `GOALS × goalStatusLine` against
  a measured character ceiling. Its comment at `:467-472` says the shipping string is
  "deliberately not re-pinned" because both figures move with the bot and with `EVENTS`.
- `.scratchpad/strava-activity-details.sh` — reads `op://Personal/calvindotsg-strava`, refreshes
  the access token, handles a rotated refresh token by writing 1Password **and** `gh secret set`,
  then fetches per-activity detail. `.scratchpad/strava-verify-events.sh` repeats the preamble.
- `scripts/fetch-strava-progress.mjs:109-110` — discards the rotated refresh token, commented as
  a "static-secret, fail-loud posture".
- `.github/workflows/strava-progress.yml:55` — calls 1Password a *backup*.

**The credential model, which the repo does not currently state**: **1Password is the source of
truth; the GitHub secret is a copy.** Only a tool that can reach the truth may change a
credential, and it writes the truth before the copy.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Tests | `pnpm test` | all pass |
| Local Strava run | `op run --env-file=.env.op -- pnpm race:add <ids>` | writes one race file |

## Scope

**In scope**: `tests/data-contract.test.ts`, `tests/projection.test.ts`, `scripts/strava-auth.mjs`,
`scripts/scaffold-race.mjs`, `scripts/fetch-strava-progress.mjs` (refresh call + one comment),
`.github/workflows/strava-progress.yml`, `.env.op`, `package.json`, `README.md`.

**Out of scope**:
- **`describe("the bot's write contract")` stays where it is.** Moving it mis-files a script
  behaviour suite and silently splits the pair `src/lib/today.ts` points at.
- **`tests/projection.test.ts:447` and `:456` stay live.** Fixturing them deletes the only guard
  that a real-data status line overflows the goal card.
- Any secret **value**. This plan names locations and credential types only.

## Git workflow

- Branch: `plan/022-data-contract-and-tooling`
- e.g. `test(events): separate the data contract from behaviour`

## Steps

### Step 1: move the contract

Move `describe("EVENTS")`'s eight `it` blocks into `tests/data-contract.test.ts` (created by plan
020 for the filename invariants). Add it to `README.md`'s Testing section if plan 020 has not.

**Verify**: `pnpm test` → all pass; the moved count is 8, not 6.

### Step 2: fixture exactly one assertion

Convert `tests/projection.test.ts:352` — and only that one — onto explicit fixtures, so it stops
reading live `EVENTS`. Leave `:447` and `:456` untouched.

**Verify**: add a booked race inside `GOAL_YEAR` to a scratch copy of the tree and confirm
`tests/projection.test.ts` stays green while `tests/derived-figures.test.ts` produces a diff.
Restore from a `cp` backup, then `git status --porcelain` → empty.

### Step 3: one place that gets an access token

`scripts/strava-auth.mjs` exporting `accessToken()`. Reads `STRAVA_CLIENT_ID`,
`STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN` from env — the same shape CI already uses, so one
code path in both places. On a rotation:

- **where `op` is reachable** (local): write 1Password first, then re-copy to the GitHub secret.
- **where it is not** (CI): persist nothing, and fail loudly.

Replace the bot's inline refresh and both `.scratchpad` copies with it.

**The CI asymmetry has a cost that must be written down**, because the corrected comment is a
reason a future reader will act on: `fetch-strava-progress.mjs` destructures only `access_token`,
so a rotation *during a CI refresh* kills the chain in **both** stores — 1Password's truth is dead
too, and a sync would push a dead credential. The only recovery is a fresh OAuth authorize. That
is the accepted cost of the posture, not a gap.

Correct `.github/workflows/strava-progress.yml:55` (1Password is the **truth**, not a backup) and
`scripts/fetch-strava-progress.mjs:109`'s reason (right behaviour — CI cannot reach the truth —
not a "static-secret posture").

Give the dispatch step at `.github/workflows/strava-progress.yml:122-129` `if: always()`, so a
credential failure stops the kilometre update without also skipping the day's rebuild.

### Step 4: `pnpm race:add`

`scripts/scaffold-race.mjs`, promoted from `.scratchpad/strava-activity-details.sh` rather than
written fresh. Takes one or more activity ids — a race can be split across activities, and which
ones belong together is the rider's call.

**Thin template**: emit only what the API knows — `date`, `sport`, `elapsed_time`, and each
recording's `id`/`metres`/`elapsed_time`. Leave `name`, `country`, `outcome`, `advertised_km` and
`official` **absent**, so the type demands them. The activity *title* is not the race name; put it
in a comment as evidence.

Three computations, each a recorded mistake: `metres` verbatim from the API's `distance`; the
race's `elapsed_time` as **first start to last stop**, never the sum of the parts; recordings
ordered by start time.

**Refuse to overwrite** an existing file; print what it would have written. Before exiting, check
whether a race on that date already exists and print which edit order applies.

Add `.env.op` holding `op://` **references, not values** — committable, and no `.gitignore` change
is needed (it lists `.env`, `.env.production`, `.env.local` as exact names, no wildcard).

**Verify**: `pnpm test` → the span arithmetic's unit test passes, modelled on how
`tests/projection.test.ts` already tests `nextProgress`.

### Step 5: sync, verified by use

`pnpm strava:sync` pushes 1Password to the GitHub secret and then **uses** the result once.
Nothing can assert the two match — a GitHub secret cannot be read back — so the only honest
verification is functional.

## Test plan

- `tests/data-contract.test.ts` — the eight moved assertions plus plan 020's invariants.
- A unit test for the scaffold's first-start-to-last-stop span, including the split-race case
  where the parts' elapsed times sum to less than the span.
- Verification: `pnpm test` → all pass.

## Done criteria

- [ ] `pnpm check`, `pnpm eslint`, `pnpm test` all exit 0
- [ ] `tests/data-contract.test.ts` holds 8 moved `it` blocks; `describe("the bot's write contract")` is still in `tests/projection.test.ts`
- [ ] `tests/projection.test.ts:447`/`:456` still read live `GOALS`
- [ ] the activity-id uniqueness assertion still appears exactly once across `tests/` — it was
      not re-added alongside the one moved out of `tests/projection.test.ts`
- [ ] a booked-race mutation leaves `tests/projection.test.ts` green and produces a derived-figures diff
- [ ] no secret value appears in any diff
- [ ] `README.md` names every suite in `tests/`

## STOP conditions

- Moving the contract makes any existing assertion fail — you have changed one, not moved it.
- The scaffold would need to write a field the API does not supply.
- `op` is locked and cannot be unlocked from the session: bound retries, then hand the command to
  the maintainer. Do not work around it.
- Strava returns a rotated refresh token during a **CI** run: stop and report, per the cost above.

## Maintenance notes

- `describe("the bot's write contract")` stayed in `tests/projection.test.ts` deliberately. If it
  ever moves, `src/lib/today.ts`'s comment pointing at it must move in the same commit.
- The scaffold is a scaffold, never a generator: a race can never be fully derived from Strava
  because no source has a DNF.
