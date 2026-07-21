# Plan 009: Refresh the lockfile in-range, clearing 9 of the 10 open audit advisories

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT update `plans/README.md` — your reviewer
> maintains the index.
>
> **Drift check (run first)**: `git diff --stat c8fe10f..HEAD -- pnpm-lock.yaml package.json`
> If either file changed since this plan was written, compare the "Current
> state" facts below against the live repo before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dependencies
- **Planned at**: commit `c8fe10f`, 2026-07-21

## Why this matters

`pnpm audit` currently reports 10 advisories (6 high, 4 moderate), every one on
a transitive dev/build-only path — nothing reaches the prerendered production
site. But 9 of the 10 have patched versions that already satisfy the parents'
declared semver ranges; the lockfile is simply stale. The noise cost is real:
`pnpm audit` is a manual-inspection signal on this repo (the Netlify gate runs
only `pnpm check && pnpm test`), and a 10-advisory floor makes the *next* real
advisory illegible. After this plan, the floor is exactly 1 known, documented,
out-of-reach moderate — a clean baseline.

This plan was pre-verified empirically by the advisor on 2026-07-21: the exact
command below was run against a copy of this manifest+lockfile and produced the
exact outcome the done criteria expect.

## Current state

- `package.json` — 5 runtime + 13 dev direct dependencies; do not edit it.
- `pnpm-lock.yaml` — locks (among others) `postcss@8.5.9`, `fast-uri@3.1.0`,
  `brace-expansion@1.1.13` and `@5.0.5`, `tmp@0.2.5`, `js-yaml@4.1.1`,
  `@opentelemetry/core@2.7.1` — the 10 advisories' subjects.
- `pnpm audit` at plan time: **6 high, 4 moderate, 0 critical**.
- The one advisory that CANNOT clear in-range: `@opentelemetry/core <2.8.0`
  (moderate), because `@netlify/otel@6.0.3` — the latest release — pins
  `@opentelemetry/core` to exactly `2.7.1`
  (path: `.>astro>unstorage>@netlify/blobs>@netlify/otel`). Forcing it would
  need a `pnpm.overrides` entry in `package.json`; this repo prefers no added
  config for a dev-only moderate, so the residual is accepted and documented.
- Expected in-range moves (verified): `eslint 10.2.0→10.7.0`,
  `unocss/@unocss/* 66.6.8→66.7.5`, `@typescript-eslint/parser 8.58.1→8.65.0`,
  `typescript 6.0.2→6.0.3`, `js-yaml→4.3.0`, `fast-uri→3.1.4`, `tmp→0.2.7`,
  `postcss→8.5.21`, plus other in-range minors. `astro` stays `7.1.3` and
  `eslint-plugin-astro` stays `1.7.0` (both already at their range maxima).
- Repo conventions: **pnpm only, never npm**. A `lint-staged` pre-commit hook
  runs `eslint --fix` on staged `src/**/*.{js,astro}` — it is expected and fine
  (this plan stages no such files).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Refresh (the fix) | `pnpm update --no-save` | exit 0; only `pnpm-lock.yaml` modified |
| Audit | `pnpm audit` | see per-step expectations |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Lint | `pnpm eslint` | exit 0, no output (0 problems) |
| Tests (builds site first) | `pnpm test` | all pass, same count as step 1 baseline |

## Scope

**In scope** (the only file you should end up committing):
- `pnpm-lock.yaml`

**Out of scope** (do NOT touch):
- `package.json` — `--no-save` exists precisely to keep it unchanged. If it
  shows as modified, you ran the wrong command; `git checkout -- package.json`
  and re-read step 2.
- Everything else, including `src/`, `tests/`, configs, and `plans/README.md`.
- Do NOT add `pnpm.overrides` or `auditConfig` anywhere — the residual advisory
  is accepted, not to be silenced.

## Git workflow

- Branch: `improve/009-refresh-lockfile` (you are already on an isolated
  worktree branch; rename or use it as-is).
- One commit, conventional style, e.g.:
  `chore(deps): refresh the lockfile in-range, clearing 9 of 10 audit advisories`
  Body: note the residual `@opentelemetry/core` moderate and why it cannot
  clear (exact pin in `@netlify/otel@6.0.3`).
- If commit signing fails (1Password locked), commit with
  `git -c commit.gpgsign=false commit …`.
- Do NOT push and do NOT open a PR — the reviewer does both.

## Steps

### Step 1: Record the baseline

Run `pnpm install` (fresh worktree has no `node_modules`), then:

- `pnpm audit` → record the counts. Expected: `10 vulnerabilities found`,
  `4 moderate | 6 high`. If it already reports 0, STOP (fixed independently).
  If a **critical** appears, STOP (new advisory landed; the reviewer must
  re-triage). If counts differ only by an extra low/moderate, note it and
  continue.
- `pnpm test` → record the exact passed-test count (`Tests N passed`). All must
  pass.

**Verify**: both commands exit as described; N recorded.

### Step 2: Refresh the lockfile

Run exactly:

```
pnpm update --no-save
```

**Verify**: `git status --porcelain` → exactly one modified file,
`pnpm-lock.yaml`. `package.json` must NOT appear.

### Step 3: Confirm the advisory outcome

Run `pnpm audit`.

**Verify**: output ends with `1 vulnerabilities found` / `Severity: 1 moderate`,
and the single advisory table names `@opentelemetry/core` with a path starting
`.>astro>unstorage>@netlify/blobs>@netlify/`. Anything else remaining → STOP.

### Step 4: Run the full verification ladder

- `pnpm check` → 0 errors, 0 warnings, 2 hints (the two known `astro(4000)`
  is:inline hints in `src/layouts/BasicLayout.astro` — they predate this plan).
- `pnpm eslint` → exits 0, no problems. (eslint moves 10.2→10.7 in this
  refresh; `eslint-plugin-astro` and its recommended configs are unchanged at
  1.7.0, so no new findings are expected. If any problem appears, STOP and
  report it verbatim — do not fix or silence it.)
- `pnpm test` → all pass, exactly N (the step-1 count).

**Verify**: all three as stated.

### Step 5: Commit

Stage `pnpm-lock.yaml` only; commit per the git workflow section.

**Verify**: `git show --name-status HEAD` lists exactly `M pnpm-lock.yaml`.

## Test plan

No new tests. The existing 3-file suite (constants invariants, Container-API
rendered HTML, `dist/` build output) plus `astro check` is the regression net;
it runs against the refreshed dependency tree in step 4, which is precisely the
verification this change needs.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm audit` reports exactly 1 moderate, 0 high, 0 critical, and it is
      `@opentelemetry/core`
- [ ] `pnpm check` → 0 errors, 0 warnings, 2 hints
- [ ] `pnpm eslint` → exit 0, no problems
- [ ] `pnpm test` → all pass, count identical to the step-1 baseline
- [ ] `git show --name-status HEAD` → exactly `M pnpm-lock.yaml`
- [ ] `git diff HEAD -- package.json` → empty

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm audit` in step 1 reports 0 advisories (fixed independently) or any
  critical (new advisory — needs re-triage, the expected outcome may shift).
- `package.json` is modified after step 2.
- Step 3 leaves anything beyond the single `@opentelemetry/core` moderate.
- `pnpm eslint` reports any problem in step 4.
- Any test fails in step 4.

## Maintenance notes

- The residual moderate clears itself when `@netlify/otel` releases with
  `@opentelemetry/core >=2.8.0` and astro's subtree picks it up — a future
  `pnpm update --no-save` is the whole fix. Do not add an override for it.
- `pnpm update --no-save` is the repeatable hygiene command for this repo:
  in-range, lockfile-only, gated by the same `pnpm check && pnpm test` that
  gates deploys.
- Reviewer should scrutinize: that the lockfile diff contains no major-version
  jumps (spot-check `eslint-plugin-astro` stays 1.7.x, `astro` stays 7.1.x).
