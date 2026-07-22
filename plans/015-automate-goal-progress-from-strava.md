# Plan 015: Automate goal progress from Strava

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md` — do
> not edit it (the edits execution implies are listed at the end for the
> reviewer).
>
> **Drift check (run first)**:
> `ls .github 2>/dev/null; git diff --stat 32fb69a..HEAD -- src/lib/constants.ts tests/constants.test.ts tests/rendered-html.test.ts netlify.toml`
> `.github/` must not exist (this is the repo's first workflow —
> verified 2026-07-22). The GOALS *values* in `constants.ts` may have drifted
> (manual bumps continue until this plan lands) — that is expected; step 3
> seeds from the live values. STOP only if the `Goal` type, the test
> contracts cited under "Current state", or `netlify.toml`'s build command
> changed.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MEDIUM (first GitHub Actions workflow in this repo; depends on an external API and three repo secrets)
- **Depends on**: — (manual preconditions below, done outside this plan)
- **Category**: automation
- **Planned at**: commit `32fb69a`, 2026-07-22
- **Finding**: DIRECT-01 (`plans/README.md:209-214`, "Deliberately not planned — worth a decision"). The maintainer supplied the decision and the architecture on 2026-07-22; this plan executes it.

## Why this matters

38 of the commits touching `src/lib/constants.ts` are manual
`current_progress` bumps (the DIRECT-01 evidence). This plan replaces them
with one daily GitHub Actions run that reads Strava's YTD totals and commits
a bot-owned JSON file only when the numbers change. The site stays fully
static: no runtime JS, no adapter, no Netlify functions. Bad data cannot
reach production because the deploy gate (`netlify.toml:19-21` runs
`pnpm check && pnpm test`, and vitest's globalSetup runs the real build)
fails the deploy and Netlify keeps serving the last good build.

## Design decisions — locked by the maintainer, do NOT relitigate

- **GitHub Actions cron + commit-to-main**, chosen over a Netlify scheduled
  function + Blobs + build hook and over runtime client fetch.
- **The rotated `refresh_token` in the token response is IGNORED.**
  Static-secret, fail-loud posture: if Strava ever invalidates the stored
  token, the workflow goes red and the number freezes until a ~5-minute
  manual localhost re-auth. NO PAT, NO `gh secret set` from the workflow, NO
  auto-persistence.
- **No `fetched_at` / timestamp field in the JSON.** Any always-changing
  field would degenerate commit-if-changed into committing every day. The
  bot commit's own git timestamp carries "as of".
- **Values are clamped to `total_goal` on read, in `constants.ts`** (amended
  during execution — see Amendments). `tests/constants.test.ts:65-70` enforces
  `current_progress <= total_goal`, and `ProgressBar.astro:14` already clamps
  the fill at 100%. The writer stores raw km.
- **Every human-configurable value lives in a repository secret, a repository
  variable, or `src/lib/constants.ts`** (maintainer directive, 2026-07-22,
  matching README "Configuration"). The writer script holds none.
- **Humans keep `constants.ts`; the bot only ever writes
  `src/data/strava-progress.json`.** `total_goal` and `progress_last_year`
  stay manual.
- **Commit message**: `chore(goals): update Strava progress to X km ride / Y km run`.
  The spec's "follow the repo's conventional-commit style for progress
  bumps" is unsatisfiable as written — all 38 historical bumps are
  subject-only, non-conventional ("Update cycling progress in constants.ts",
  e.g. `b17ccfe`; "Update current_progress to 1704.1", `e88eac1`), while
  *recent* non-bump commits are conventional (`fix:`, `docs:`, `test:` per
  git log head). We align with the recent convention, not the legacy bumps.
- **Cron `13 21 * * *`** = 05:13 SGT — after a full Singapore day, off the
  top of the hour to dodge GitHub's peak-load scheduling delays.

## Current state (evidence gathered 2026-07-22 at `32fb69a`)

- `src/lib/constants.ts:72-90` — GOALS: Cycling `total_goal: 5000`,
  `current_progress: 2246.4` (lines 73-74); Running `total_goal: 1000`,
  `current_progress: 138` (lines 82-83). Both `website_url`s point at
  athlete **37641259** (lines 76, 85) — matches the stats endpoint's
  required id. `Goal.current_progress` is typed `number`
  (`constants.ts:62`), so the JSON must carry numbers, not strings.
- **Test contract the JSON-backed values must satisfy**:
  `tests/constants.test.ts:46-57` (finite numbers), `:59-63`
  (`total_goal > 0`), `:65-70` (`0 <= current_progress <= total_goal` — the
  clamp invariant); `tests/rendered-html.test.ts:104-134` (literal
  `${current_progress} ${unit} of ${total_goal} ${unit}` string at :109,
  `aria-valuenow === String(current_progress)` at :124, `aria-valuemax` at
  :127, and the recomputed clamped `--progress` percent at :130-132,
  identical to `src/components/ProgressBar.astro:14`). All suites import
  GOALS, so they assert against whatever is committed — deterministic,
  **zero changes needed to existing tests**. `tests/build-output.test.ts:67-68`
  uses GOALS only for icon-safelist checks; `METADATA.description` couples
  only to `total_goal` (`constants.test.ts:138`) — both unaffected.
- **JSON imports already work**: `tsconfig.json:2` extends
  `astro/tsconfigs/strict`, whose base sets `resolveJsonModule: true` — no
  tsconfig change (empirically probed at `32fb69a`; see step 6). There are
  currently zero JSON imports in `src/`
  (`grep -rn 'from .*\.json' src/` → empty) and `src/data/` does not exist.
- **A `.mjs` script is deliberately outside every gate**: the eslint CLI is
  scoped to `src/**/*.{js,astro}` (`package.json:12`); the config glob
  (`eslint.config.js:7`) is repo-wide `**/*.{js,astro}`, but neither glob
  matches a `.mjs` extension — the script is outside the gate twice over
  (path outside `src/`, extension outside the glob). lint-staged has the
  same CLI glob (`package.json:40-44`), and `astro check` skips it
  (`allowJs: true` but `checkJs` unset). `.gitignore` is a plain blacklist
  touching neither `src/data/` nor `.github/`.
- **Node is unpinned everywhere** (no `engines`, no `.nvmrc`, no
  `NODE_VERSION` in `netlify.toml`), and GitHub's `ubuntu-latest` runner
  image ships Node 22.x preinstalled — ≥20, so built-in `fetch` is available
  with no `setup-node` step.
- **`.github/` does not exist** — first workflow, no in-repo Actions
  precedent. `netlify.toml` has no ignore/skip rule, so every push to main
  deploys (as designed). `main` is unprotected
  (`gh api repos/calvindotsg/portfolio-v2/branches/main` →
  `"protected": false`), so `permissions: contents: write` suffices to push.
- **Husky is client-side only** (`.husky/pre-commit` → `pnpm lint-staged`);
  Actions commits bypass it, and the JSON matches no lint-staged glob anyway.
- **This repo is a fork** of `Ladvace/astro-bento-portfolio` (public, `fork: true`).
  Actions *are* enabled — `gh api repos/calvindotsg/portfolio-v2/actions/permissions`
  → `{"enabled": true, "allowed_actions": "all"}` — and there are zero existing
  workflows. But GitHub documents that "when a public repository is forked,
  scheduled workflows are disabled by default", so the `schedule` leg may land
  in workflow state `disabled_fork`. `workflow_dispatch` is unaffected either
  way. Verified and remediated in step 9 (found during execution pre-flight,
  2026-07-22).

**Safety/economics facts (verified by the maintainer — cite, don't
re-derive)**: Netlify account is the grandfathered legacy Free plan (slug
`free-is-free`, created 2022-06-02): 300 build-minutes/month, so a ~1-min
build on activity days is trivial. The 2025 credit-plan risk (15
credits/deploy, hard 300 cap, all-sites-paused) applies only if the account
ever migrates — latent, noted in Maintenance. Strava's Standard-tier paywall
(subscription required since 2026-06-30) is a non-issue: the maintainer has
subscribed since 2023-08-07. Rate limits are irrelevant at 1 call/day.
Access tokens live 6h, so every run refreshes. `athletes/{id}/stats`
requires the id to be the authenticated athlete, scope `read` suffices, and
it counts only "Everyone"-visibility activities.

## Preconditions (one-time, manual, done by the maintainer OUTSIDE this plan)

Instructions were delivered separately; the executor only verifies:

- [ ] Strava API application created (client id + secret).
- [ ] Initial refresh token minted via the localhost-redirect flow, scope `read`.
- [ ] Three repo secrets set on `calvindotsg/portfolio-v2`:
      `gh secret list --repo calvindotsg/portfolio-v2` must show
      `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`.
      STOP if any is missing.
- [ ] Repository **variable** `STRAVA_ATHLETE_ID` set (added during execution):
      `gh variable set STRAVA_ATHLETE_ID -R calvindotsg/portfolio-v2 --body 37641259`,
      verify with `gh variable list`. Done 2026-07-22.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Tests | `pnpm test` | all pass (measure baseline in step 1; 64 expected) |
| Lint | `pnpm eslint` | exit 0, no output |
| Build | `pnpm build` | exit 0, "1 page(s) built" |
| Secrets check | `gh secret list --repo calvindotsg/portfolio-v2` | the three STRAVA_* names |
| Script import smoke (no network) | `node -e 'import("./scripts/fetch-strava-progress.mjs").then((m)=>console.log(Object.keys(m)))'` | prints `[ 'kmFromMeters' ]`, performs NO network call |
| Workflow YAML sanity | `ruby -ryaml -e 'YAML.load_file(".github/workflows/strava-progress.yml"); puts "OK"'` | prints `OK` (macOS ships ruby; repo has no yaml package) |

pnpm ONLY — never npm. Use `gh` account `calvindotsg`.

## Scope

**In scope** (the only files you may create/modify):
- `.github/workflows/strava-progress.yml` (new)
- `scripts/fetch-strava-progress.mjs` (new)
- `src/data/strava-progress.json` (new, bot-owned after this plan)
- `src/lib/constants.ts` (two-value wiring only)
- `tests/constants.test.ts` (new describe block)
- `README.md` — "Configuration" section (added during execution; see Amendments)

**Out of scope** (do NOT touch):
- Strava webhooks, Netlify Blobs/DB, any runtime JS, auto-rotating token
  persistence, `progress_last_year` automation (stays manual), `total_goal`
  or any other GOALS field, `netlify.toml`, `plans/README.md`.

## Git workflow

- Branch: `improve/015-strava-progress`
- Conventional commit, e.g. `feat: automate goal progress from Strava via a daily bot-committed JSON`
- Worktree/PR mechanics are the executor session's per repo convention — not specified further here.

## Steps

### Step 1: Baseline + preconditions

`pnpm install && pnpm check && pnpm test && pnpm build` — record the passing
test count (expect 64). Run the secrets check (Preconditions). Confirm
`.github/` and `src/data/` do not exist. Read the live GOALS values from
`src/lib/constants.ts:72-90` — step 3 seeds from these, not from the numbers
printed in this plan.

### Step 2: the writer script

Create `scripts/fetch-strava-progress.mjs` (repo root `scripts/` —
deliberately outside the eslint glob and untouched by `astro check`; pure
helpers exported so vitest can unit-test them; the side-effecting main is
guarded so importing the module performs no network call):

```js
// Fetches Strava YTD ride/run totals and writes src/data/strava-progress.json.
// Runs in GitHub Actions (.github/workflows/strava-progress.yml) on node 20+
// built-in fetch — zero dependencies. Fail-loud: any error exits non-zero,
// the workflow goes red, and no file is written.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// This script holds no configuration of its own: the athlete comes from the
// STRAVA_ATHLETE_ID repository variable, and the goal targets live in
// src/lib/constants.ts, which clamps the raw km written here. See README.md
// "Configuration".
export function kmFromMeters(meters, label) {
    if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) {
        throw new Error(`Bad ${label} distance from Strava: ${JSON.stringify(meters)}`);
    }
    // Meters → km, 1 decimal (matches the existing 2246.4 style).
    return Number((meters / 1000).toFixed(1));
}

async function main() {
    const env = (name) => {
        const value = process.env[name];
        if (!value) throw new Error(`Missing env: ${name}`);
        return value;
    };

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: env("STRAVA_CLIENT_ID"),
            client_secret: env("STRAVA_CLIENT_SECRET"),
            refresh_token: env("STRAVA_REFRESH_TOKEN"),
            grant_type: "refresh_token"
        })
    });
    if (!tokenRes.ok) throw new Error(`Token refresh failed: ${tokenRes.status} ${await tokenRes.text()}`);
    // The response contains a rotated refresh_token. It is IGNORED by design
    // (static-secret, fail-loud posture — see plan 015). Do not persist it.
    const { access_token } = await tokenRes.json();

    const statsRes = await fetch(`https://www.strava.com/api/v3/athletes/${env("STRAVA_ATHLETE_ID")}/stats`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    if (!statsRes.ok) throw new Error(`Stats fetch failed: ${statsRes.status} ${await statsRes.text()}`);
    const stats = await statsRes.json();

    const progress = {
        cycling_km: kmFromMeters(stats.ytd_ride_totals?.distance, "ride"),
        running_km: kmFromMeters(stats.ytd_run_totals?.distance, "run")
    };

    // Formatting must stay byte-stable (4-space indent, trailing newline, this
    // key order) so unchanged values produce a zero diff and no commit.
    writeFileSync(
        new URL("../src/data/strava-progress.json", import.meta.url),
        JSON.stringify(progress, null, 4) + "\n"
    );
    console.log(`Wrote cycling ${progress.cycling_km} km, running ${progress.running_km} km`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
```

**Verify**: the import-smoke command from the table prints `[ 'kmFromMeters' ]`
instantly (no network, proving the main guard works).

### Step 3: the bot-owned JSON, seeded from the live values

Create `src/data/strava-progress.json` with the values currently in
`constants.ts` (at planning time: 2246.4 / 138 — use the live ones), in the
exact format below (what the script writes; the done criteria include a
byte-identity check — a mismatch would only cost one cosmetic bot commit on
the first changed-value day):

```json
{
    "cycling_km": 2246.4,
    "running_km": 138
}
```

### Step 4: wire constants.ts

In `src/lib/constants.ts`, add at the top of the file:

```ts
import stravaProgress from "../data/strava-progress.json"
```

and replace the two literals (this plan's only .ts change — the file
otherwise stays human-owned):

- line ~74: `current_progress: 2246.4,` → `current_progress: stravaProgress.cycling_km,`
- line ~83: `current_progress: 138,` → `current_progress: stravaProgress.running_km,`

Add a one-line comment above the goals array: `// current_progress is
bot-owned — see .github/workflows/strava-progress.yml; edit the JSON, not
this file, to bump it manually.`

Rename the literal to `RAW_GOALS`, and export `GOALS` as the clamped
projection so `total_goal` is the only place the target is configured:

```ts
export const clampToGoal = (progress: number, total_goal: number): number => Math.min(progress, total_goal)

export const GOALS: Goal[] = RAW_GOALS.map((goal) => ({
    ...goal,
    current_progress: clampToGoal(goal.current_progress, goal.total_goal)
}))
```

**Verify**: `pnpm check && pnpm test && pnpm build` — everything green with
the identical numbers; the rendered HTML is byte-identical for these values
(`grep -o '2246.4 km of 5000 km' dist/index.html` still matches, using the
live values).

### Step 5: the workflow

Create `.github/workflows/strava-progress.yml`:

```yaml
name: strava-progress

on:
  schedule:
    # 21:13 UTC = 05:13 SGT — after a full Singapore day; off the top of the
    # hour to avoid GitHub's peak scheduling delays.
    - cron: "13 21 * * *"
  workflow_dispatch: {}   # manual runs, and re-enabling after auto-disable

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Fetch YTD totals and write src/data/strava-progress.json
        # ubuntu-latest ships node >= 20 preinstalled (22.x on 24.04) —
        # built-in fetch, zero deps, no setup-node needed.
        env:
          # Not a secret — the athlete id is public on the site's Strava links.
          STRAVA_ATHLETE_ID: ${{ vars.STRAVA_ATHLETE_ID }}
          STRAVA_CLIENT_ID: ${{ secrets.STRAVA_CLIENT_ID }}
          STRAVA_CLIENT_SECRET: ${{ secrets.STRAVA_CLIENT_SECRET }}
          STRAVA_REFRESH_TOKEN: ${{ secrets.STRAVA_REFRESH_TOKEN }}
        run: node scripts/fetch-strava-progress.mjs
      - name: Commit and push only if the km values changed
        run: |
          if git diff --quiet -- src/data/strava-progress.json; then
            echo "Progress unchanged; no commit, no deploy."
            exit 0
          fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add src/data/strava-progress.json
          git commit -m "$(node -e 'const p=require("./src/data/strava-progress.json"); console.log(`chore(goals): update Strava progress to ${p.cycling_km} km ride / ${p.running_km} km run`)')"
          git push
```

Notes: `checkout` persists `GITHUB_TOKEN` credentials by default, main is
unprotected, and `netlify.toml` has no ignore rule — the push deploys
normally. There are no other workflows for the GITHUB_TOKEN-push
no-retrigger rule to matter.

**Verify**: run the Workflow-YAML-sanity command from the table — prints
`OK`. (Full end-to-end validation of the workflow only happens post-merge in
step 9; GitHub also rejects malformed workflow files on push.)

### Step 6: lock the contract with tests

In `tests/constants.test.ts`, add imports and a new describe block:

```ts
import stravaProgress from "../src/data/strava-progress.json";
import {kmFromMeters} from "../scripts/fetch-strava-progress.mjs";
// plus clampToGoal on the existing "../src/lib/constants" import
```

```ts
describe("strava progress wiring", () => {
    it("feeds current_progress from the bot-owned JSON", () => {
        const written = {Cycling: stravaProgress.cycling_km, Running: stravaProgress.running_km};
        for (const goal of GOALS) {
            const raw = written[goal.goal_name as keyof typeof written];
            // Guards the JSON's shape: a renamed or dropped key arrives here as
            // undefined, which would otherwise satisfy the comparison below.
            expect(Number.isFinite(raw), `${goal.goal_name} km must be a finite number`).toBe(true);
            expect(raw, goal.goal_name).toBeGreaterThanOrEqual(0);
            // Compared through the clamp so an overshot year is not a test failure.
            expect(goal.current_progress, goal.goal_name).toBe(clampToGoal(raw, goal.total_goal));
        }
    });

    it("caps an overshot year at the goal, so total_goal is the only knob", () => {
        expect(clampToGoal(6000, 5000)).toBe(5000);
        expect(clampToGoal(2246.4, 5000)).toBe(2246.4);
        for (const goal of GOALS) {
            expect(goal.current_progress, `${goal.goal_name}`).toBeLessThanOrEqual(goal.total_goal);
        }
    });

    it("converts meters to km rounded to 1 decimal, and rejects garbage", () => {
        expect(kmFromMeters(2246412.3, "ride")).toBe(2246.4);
        expect(kmFromMeters(0, "ride")).toBe(0);
        for (const bad of [undefined, null, NaN, Infinity, -1, "138"]) {
            expect(() => kmFromMeters(bad, "ride"), String(bad)).toThrow();
        }
    });
});
```

**Verify**: `pnpm check && pnpm test` — all pass, count = baseline + 3. This
was verified at `32fb69a`: a probe with these exact step 2–6 edits gave
`pnpm check` → 0 errors, 0 warnings, 2 hints (the `.mjs` import from the
`.ts` test type-checks cleanly under `astro/tsconfigs/strict`), 67 tests
passing, and `pnpm eslint` exit 0. If a *future* tsconfig change ever makes
`pnpm check` reject the `.mjs` import, add a sibling
`scripts/fetch-strava-progress.d.mts` declaring the two exports — insurance
only, not a live decision point; do not weaken tsconfig.

### Step 7: mutation-test the firewall and the new assertions

Apply, run, confirm, restore, confirm green. **Commit before mutating** — the
restore recipe is `git checkout -- <file>`, which silently discards
uncommitted work. Outcomes below are the ones actually observed on
2026-07-22 against the reworked design:

| # | Mutation | Observed |
|---|---|---|
| 1 | hand-edited over-goal JSON (`cycling_km: 6000`) | **67 pass, no failure** — clamped on read. See "Coverage gaps" below |
| 2 | `clampToGoal` loses `Math.min` | exactly `caps an overshot year…` fails |
| 3 | `GOALS` stops applying the clamp (`= RAW_GOALS`) | **67 pass, no failure** — see "Coverage gaps" |
| 4 | JSON shape drift (`cycling_km` → `cycling`) | `pnpm check`: 2× ts(2551) (`constants.ts`, the test import). `pnpm test`: 5 fail — `has finite numeric progress values`, `keeps progress within [0, total_goal]`, `feeds current_progress from the bot-owned JSON`, `caps an overshot year…`, `renders one card per goal` |
| 5 | `kmFromMeters` loses 1-decimal rounding | exactly `converts meters to km…` fails |

**Coverage gaps — accepted, recorded deliberately:**

- Mutations 1 and 3 both concern the clamp *application*, which live data
  cannot exercise (both goals sit well under target). Their real-world failure
  mode is loud, not silent: without the clamp, an overshooting year trips the
  pre-existing `keeps progress within [0, total_goal]` test and fails the
  deploy rather than shipping a wrong number.
- The cost of moving the clamp out of the writer is that a hand-edited,
  finite, out-of-range JSON value is now capped and deployed instead of
  failing the build. Non-finite, negative and missing values are still
  rejected — by `kmFromMeters` in the workflow (red run, nothing committed)
  and by the wiring test's shape guard at build time.

### Step 8: full ladder + commit

`pnpm check && pnpm eslint && pnpm test && pnpm build` — all green,
`pnpm eslint` proving the `.mjs` is outside its glob caused no new noise.
Commit.

### Step 9: post-merge activation (maintainer, after the PR lands on main)

**First, confirm the cron leg is actually armed** (fork caveat above):

```
gh api repos/calvindotsg/portfolio-v2/actions/workflows \
  --jq '.workflows[] | {name, state, id}'
```

`state` must be `active`. If it is `disabled_fork` (or `disabled_inactivity`),
enable it with
`gh api -X PUT repos/calvindotsg/portfolio-v2/actions/workflows/<id>/enable`
— or the "Enable workflow" button on the Actions tab — and re-check. A
`disabled_*` state means the daily cron never fires while `workflow_dispatch`
still works, i.e. the number silently freezes: this check is load-bearing.

Then trigger `workflow_dispatch` from the Actions tab. Expected first run: green;
either "Progress unchanged; no commit" (if the seeded values are current) or
one `chore(goals): ...` bot commit followed by a normal Netlify deploy.
Check https://calvin.sg shows the new numbers after the deploy. This step is
the only end-to-end proof — the executor cannot run it (no secrets locally).

## Test plan

Existing gates already covering this (zero changes): the clamp invariant
(`constants.test.ts:65-70`), finite-number checks (`:46-57`), and the
rendered-output assertions (`rendered-html.test.ts:104-134`) all read GOALS,
which now reads the JSON — they gate every bot commit at Netlify deploy
time. New: 3 tests (step 6), mutation-tested (step 7).

Known benign edge, noted not fixed: `rendered-html.test.ts:124` locates each
progressbar by `aria-valuenow` string match, so if both goals ever hold the
same `current_progress` (e.g. both `0` on Jan 1 after Strava's YTD reset),
`find()` returns the first bar for both goals and the `aria-valuemax` check
at `:127` could fail spuriously for the second. If a January deploy fails
that way, fix the test's bar-selection (scope by goal card), not the data.

## Failure modes

| Failure | Behavior | Recovery |
|---|---|---|
| Strava API down / 5xx / timeout | Script throws, workflow red, nothing written or committed; site keeps serving last value | None — next day's cron retries |
| Refresh token invalidated (Strava-side rotation/revoke) | Token step fails, workflow red daily; number freezes — the designed fail-loud outcome | ~5-min manual localhost re-auth, `gh secret set STRAVA_REFRESH_TOKEN` |
| Garbage/negative/missing distance in the API response | `kmFromMeters` throws before any write | Red run; investigate the run log |
| YTD > total_goal | Clamped to `total_goal`; bar shows 100% | Expected behavior, no action |
| Hand-edited JSON holds a finite but wrong over-goal value | Capped at `total_goal` and deployed — not caught (see step 7 coverage gaps) | Edit the JSON again; the next bot run overwrites it anyway |
| Clamp/validation bug ships a bad value to main | Netlify build runs `pnpm check && pnpm test` → deploy fails, last good build keeps serving; deploys stay frozen until fixed | Fix the script (the step-6 tests are load-bearing for exactly this) |
| Scheduled workflow auto-disabled (public repo, 60 days without repo activity — bot commits normally reset the timer, but a long no-exercise + no-push gap will not) | Number silently freezes, no red signal | Actions tab → re-enable, or run `workflow_dispatch` |
| Scheduled workflow never armed because the repo is a fork (`state: disabled_fork`) | Cron never fires; number silently freezes; `workflow_dispatch` still works | Step 9's state check; `gh api -X PUT .../actions/workflows/<id>/enable` |
| Jan 1 YTD reset | Both values drop toward 0 — annual-goal semantics, expected | See the test-plan edge note |

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` → 0 errors; `pnpm eslint` → exit 0
- [ ] `pnpm test` → all pass, count = step-1 baseline + 3
- [ ] `grep -n 'stravaProgress' src/lib/constants.ts` → the import and exactly two `current_progress` usages; no other GOALS field changed
- [ ] `src/data/strava-progress.json` exists, values equal the pre-plan constants values, format byte-identical to the script's writer — verify:
      `t=$(mktemp) && node -e 'const fs=require("node:fs");const p=require("./src/data/strava-progress.json");fs.writeFileSync(process.argv[1],JSON.stringify(p,null,4)+"\n")' "$t" && cmp src/data/strava-progress.json "$t"`
      — silent exit 0 on success. (`require` of `.json` works in `node -e` even
      in this `type: module` repo — `-e` input defaults to CommonJS. The cmp
      goes against a temp re-serialization because `git diff` would be
      vacuously quiet while the JSON is still untracked.)
- [ ] `.github/workflows/strava-progress.yml` exists with `permissions: contents: write`, the cron, and `workflow_dispatch`; the YAML-sanity command prints `OK`
- [ ] All four step-7 mutations reported (fail-then-green)
- [ ] `git status` — no files outside the in-scope list modified
- [ ] (post-merge, maintainer) one green `workflow_dispatch` run per step 9

## STOP conditions

Stop and report back (do not improvise) if:

- Any of the three `STRAVA_*` secrets is missing from `gh secret list`.
- `.github/` or `src/data/` already exists (someone got here first).
- The `Goal` type or the test contracts cited under "Current state" have
  changed shape (values changing is fine).
- `pnpm check` rejects the `.mjs` import (verified passing at `32fb69a`, so
  this indicates tsconfig drift) AND the `.d.mts` fallback in step 6 does
  not clear it.
- The rendered HTML changes for identical values after step 4 (the wiring
  must be behavior-neutral).

## Rollback

One revert commit restores the status quo: delete
`.github/workflows/strava-progress.yml`, `scripts/fetch-strava-progress.mjs`
and `src/data/strava-progress.json`, restore the two `current_progress`
literals in `constants.ts` (copy the JSON's last values), and remove the
step-6 describe block. No state lives anywhere else — secrets can stay set
harmlessly or be removed with `gh secret delete`.

## plans/README.md updates (reviewer applies at acceptance — not the executor)

- Execution-order table: add
  `| 015 | Automate goal progress from Strava | P2 | M | — | TODO |`
  (→ DONE with the merge commit on completion).
- "Deliberately not planned": remove the DIRECT-01 bullet and note the
  resolution, e.g. `**DIRECT-01 — resolved 2026-07-22**: the maintainer
  decided (GitHub Actions cron → bot-owned JSON, fail-loud static token);
  see plan 015.` DIRECT-04 stays.

## Amendments during execution (2026-07-22)

Both were discovered in pre-flight/execution and are already reflected in the
steps above.

1. **Fork caveat on the cron leg.** The repo is a public fork, and GitHub
   disables scheduled workflows in forks by default. Step 9 now verifies the
   workflow's `state` is `active` before trusting the schedule.
2. **Maintainer directive: every human-configurable value belongs in a
   repository secret, a repository variable, or `src/lib/constants.ts`**
   (README "Configuration"). As drafted, the writer script hardcoded
   `ATHLETE_ID` and duplicated the goal targets in `CAPS_KM`. Resolution:
   - `ATHLETE_ID` → `STRAVA_ATHLETE_ID` repository variable (public value, so
     a variable rather than a secret), read via the same fail-loud `env()`.
   - `CAPS_KM` deleted. The writer stores raw km; `constants.ts` clamps via an
     exported `clampToGoal`, leaving `total_goal` as the single knob. The
     lockstep test it existed to support is replaced by a direct clamp test.
   - `README.md` "Configuration" now documents the three homes.

   Consequence, recorded honestly: the deploy-time firewall against a
   hand-edited out-of-range value is weaker (step 7, coverage gaps).

## Maintenance notes

- **Changing a `total_goal`** is a one-place edit in `constants.ts`; the clamp
  reads it directly, and the writer script has no copy to keep in sync.
- **Manual progress bump** (e.g. workflow red for a while): edit the JSON,
  not `constants.ts`.
- The number may **undershoot the Strava UI**: the stats endpoint counts
  only "Everyone"-visibility activities. Maintainer should check the default
  activity visibility if the numbers look low.
- **Latent risks, one line each**: if the Netlify account ever migrates off
  the legacy Free plan to credit billing (15 credits/deploy, hard 300 cap),
  daily deploys need rethinking; if branch protection or a `netlify.toml`
  ignore rule is ever added, the bot pipeline silently breaks — revisit this
  plan's design decisions then.
- Reviewer should scrutinize: the workflow ignores the rotated refresh
  token (no `gh secret`, no PAT anywhere); `fetched_at` stayed out.