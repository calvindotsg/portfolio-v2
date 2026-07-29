# Plan 017: Clear the clearable brace-expansion HIGH with an in-range lockfile refresh

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`; do
> not edit it.
>
> **Drift check (run first)**:
> `git diff --stat 45e286f..HEAD -- package.json pnpm-lock.yaml`
> If either file changed since this plan was written, re-run
> `pnpm audit` and compare against the "Current state" numbers before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security (dev-only; audit-posture maintenance)
- **Planned at**: commit `45e286f`, 2026-07-29

## Why this matters

Since run 3, `pnpm audit` has moved from the recorded clean posture
("1 moderate, 0 high, 0 critical") to **1 moderate + 2 high**. The two HIGH
hits are one advisory — GHSA-mh99-v99m-4gvg, `brace-expansion` DoS,
vulnerable `<= 5.0.7`, first patched `5.0.8` — reached through dev-only lint
paths. Nothing in the shipped static site or the Netlify deploy gate
(`pnpm check && pnpm test`) executes this code, so real exposure is nil; the
cost is posture erosion — a future genuinely-reachable HIGH would be lost in
the noise. One of the two paths clears with a plain in-range lockfile
refresh (the same mechanism plan 009 used). The other **cannot be cleared
safely** — this plan documents why and deliberately leaves it, mirroring the
settled `@opentelemetry/core` residual.

## Current state

`pnpm audit` at `45e286f` reports (severity line: `1 moderate | 2 high`):

1. **HIGH, clearable**: `. > @typescript-eslint/parser >
   @typescript-eslint/typescript-estree > minimatch@10.2.5 >
   brace-expansion@5.0.7` (the same `minimatch@10.2.5` resolution is also
   pulled by `eslint` and `@eslint/config-array`). `minimatch@10.2.6` exists
   and depends on `brace-expansion@^5.0.8` — an in-range refresh clears
   this. Dry-run verified at planning time: after `pnpm update --no-save`,
   the lockfile resolves `minimatch@10.2.6` → `brace-expansion@5.0.8` and
   the audit drops to `1 moderate | 1 high`.
2. **HIGH, NOT clearable — leave it**: `. > eslint-plugin-jsx-a11y >
   minimatch@3.1.5 > brace-expansion@1.1.16`. The advisory's only patched
   release is 5.0.8; **no patched 1.x exists**, and
   `eslint-plugin-jsx-a11y@6.10.2` is its latest release (verified
   `pnpm view eslint-plugin-jsx-a11y version` → 6.10.2). An override was
   built and measured at planning time and **breaks at runtime**: under
   `minimatch@3` (CJS, `var expand = require('brace-expansion')`),
   `brace-expansion@5.0.8`'s CommonJS entry returns a namespace **object**,
   not a function — calling it throws `TypeError: expand is not a
   function`. Do not add any `pnpm.overrides`.
3. **MODERATE, settled**: `@opentelemetry/core` via `@netlify/otel` —
   deliberate residual since plan 009; leave untouched.

Also expected from an in-range refresh (verified via `pnpm outdated` at
planning time, all within existing ranges): `astro` 7.1.3 → 7.1.5, `eslint`
10.7.0 → 10.8.0, `@astrojs/check` 0.9.9 → 0.9.10, and similar patch/minor
transitive movement. These are acceptable side effects **provided the whole
verification ladder stays green**. Note pnpm 10 behaviour: `pnpm update`
without `--no-save` rewrites `package.json` specifiers — this plan must not
change `package.json` at all.

A pre-existing, unrelated warning you will see during install:
`eslint-plugin-jsx-a11y … unmet peer eslint@"^3 || … || ^9": found 10.x` —
it exists on `main` today; it is not caused by this plan and not yours to
fix.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Audit (read-only, lockfile-based) | `pnpm audit` | see per-step expectations |
| In-range refresh | `pnpm update --no-save` | exit 0; `package.json` untouched |
| Typecheck | `pnpm check` | 0 errors (2 pre-existing hints fine) |
| Lint (exercises minimatch/brace-expansion for real) | `pnpm eslint` | exit 0, no output |
| Tests (builds `dist/`) | `pnpm test` | all pass |

## Scope

**In scope** (the only file you should modify):

- `pnpm-lock.yaml`

**Out of scope** (do NOT touch):

- `package.json` — no specifier changes, no `pnpm.overrides`, no
  `auditConfig`. `git diff package.json` must stay empty.
- Any source, test, or config file.
- The `@opentelemetry/core` moderate residual.

## Git workflow

- Branch: `advisor/017-brace-expansion-refresh`
- Commit style: conventional, e.g. `chore(deps): refresh lockfile in-range, clearing one brace-expansion HIGH`
- Do NOT push and do NOT open a PR — your reviewer does both.

## Steps

### Step 1: Baseline

`pnpm install --frozen-lockfile`, then `pnpm audit`.

**Verify**: severity line reads `1 moderate | 2 high`, and the two HIGH
paths match "Current state" above. Then run `pnpm test` once.
**Verify**: all pass (this is the green baseline the refresh is judged
against).

### Step 2: In-range refresh

`pnpm update --no-save`

**Verify**: `git diff --name-only` → exactly `pnpm-lock.yaml`.
`git diff package.json` → empty.

### Step 3: Re-audit

`pnpm audit`

**Verify**: severity line reads `1 moderate | 1 high`; the remaining HIGH
path is exactly `. > eslint-plugin-jsx-a11y > minimatch >
brace-expansion` (the 1.1.16 residual), and the remaining moderate is
`@opentelemetry/core`. Also verify the clearable path is gone:
`grep -c 'brace-expansion@5.0.7' pnpm-lock.yaml` → 0.

### Step 4: Full ladder

**Verify**: `pnpm check` → 0 errors; `pnpm eslint` → clean (this is the
functional test of the refreshed minimatch graph); `pnpm test` → all pass.

### Step 5: Record the dist delta

The refresh may bump Astro in-range, which can move built output. Compare:
`wc -c dist/index.html dist/patches/index.html` before (from Step 1's
build) and after Step 4's build, and note any change in the hashed
`dist/_astro/*.css` filenames.

**Verify**: differences, if any, are recorded in your report — your
reviewer diffs the deploy preview against production and needs to know
what to expect.

## Test plan

No new tests: the change is lockfile-only and the existing 277-assertion
suite (which builds and inspects `dist/`) plus `pnpm eslint` are the
functional gates. The discriminating check for the security claim is
Step 3's audit output.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm audit` → `1 moderate | 1 high`, residual paths exactly as in Step 3
- [ ] `git diff --name-only` (vs the branch point) → `pnpm-lock.yaml` only
- [ ] `pnpm check` exits 0 with 0 errors
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] Step 5's dist delta is recorded in the report

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's audit does not read `1 moderate | 2 high` (the advisory landscape
  moved since planning — the plan's premises need re-verifying, possibly
  including a now-published patched 1.x or jsx-a11y release that changes the
  right fix).
- Step 3's audit reads anything other than `1 moderate | 1 high`.
- Any ladder command that was green in Step 1 is red after Step 2 — report
  which package movement broke it; do not pin or override anything.
- `package.json` shows any diff at any point.

## Maintenance notes

- The `eslint-plugin-jsx-a11y → minimatch@3 → brace-expansion@1.x` HIGH is a
  **deliberate residual** after this plan: dev-only, unreachable from the
  shipped site and the deploy gate, no patched 1.x exists, and the override
  is measured-broken (CJS interop). It clears the day
  `eslint-plugin-jsx-a11y` ships a release off `minimatch@3` — a future
  `pnpm update --no-save` picks that up. The reviewer records this beside
  the `@opentelemetry/core` residual in `plans/README.md` so the audit
  posture is "1 moderate + 1 high, both documented", not "noise".
- If a future run finds the audit above that documented floor, that is a
  real signal again.
