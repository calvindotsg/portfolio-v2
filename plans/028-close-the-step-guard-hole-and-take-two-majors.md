# Plan 028: A step-level `if:` can no longer be neutered unnoticed, and the two held major bumps are decided

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 6f231f7..HEAD -- tests/workflow-guards.test.ts .github/workflows/ci.yml package.json plans/`
> If any in-scope file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P1 (work package A) / P2 (work packages B and C)
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests (A), dependencies (B, C)
- **Planned at**: commit `6f231f7`, 2026-08-17

## Why this matters

Three separate things, bundled because they share one context and one gate run.

**A — the guard hole.** `tests/workflow-guards.test.ts` exists because this repository's
deploy safety is a property of a YAML file that a careless refactor can silently break, so
the suite EXECUTES the workflow conditions rather than reading them. A review panel measured
that the protection is one-sided: mutate a **job-level** guard in `.github/workflows/dns.yml`
to something never-true and the suite goes red; mutate a **step-level** `if:` in
`.github/workflows/ci.yml` the same way and the suite stays green. Plan 027 is what makes
this urgent — it promoted the analytics step's `github.actor != 'dependabot[bot]'` clause
from hypothetical to load-bearing, and five real bot pull requests have now exercised it.

**B and C — two held major bumps.** `.github/dependabot.yml` deliberately raises majors as
individual pull requests so each gets read as a migration. Two are open and were analysed but
not merged, because merging a major on green tests alone is the thing that policy exists to
prevent. This plan carries that analysis so the decision is made from evidence rather than
re-derived.

## Current state

### A — the guard hole

`tests/workflow-guards.test.ts` defines two similar helpers. The first applies an
always-runs check; the second does not, and that asymmetry is the whole defect.

`tests/workflow-guards.test.ts:172-182` — the helper that is correct:

```
/** Does this step's own `if:` let it run wherever the site can be published? */
const stepAlwaysRuns = (s: Step): boolean => {
    if (typeof s.if !== "string") return true;
    return PUBLISHING_PATHS.every((name) => evaluate(s.if as string, CONTEXTS[name]));
};

const stepsRunning = (id: string, command: string): Step[] =>
    (CI.jobs[id]?.steps ?? []).filter((s) => stepAlwaysRuns(s) && (s.run ?? "")
```

`tests/workflow-guards.test.ts:313-319` — the helper that is not:

```
    const failingRunSteps = (id: string, mustMention: RegExp[]): Step[] =>
        (CI.jobs[id]?.steps ?? []).filter((s) => {
            const live = (s.run ?? "").split("\n").filter((line) => !/^\s*#/.test(line)).join("\n");
            return mustMention.every((re) => re.test(live))
                && /(^|\s)exit\s+[1-9]/.test(live)
                && !NEUTERED(s["continue-on-error"]);
        });
```

`failingRunSteps` checks that a step mentions the right things, contains a failing `exit`,
and is not neutered by `continue-on-error` — but never asks whether the step's own `if:`
lets it run at all. Its two callers are at `:325` (the stale-artifact stamp check) and
`:348` (the analytics check). Both therefore pass on a step that can never execute.

`PUBLISHING_PATHS` is `["same-repo PR from a human", "push to main"]`, so this is a question
about the paths that can publish the site — not about bot pull requests, which are correctly
excluded from the analytics step by design.

### B — `eslint-plugin-astro` 1.7.0 → 3.0.1 (pull request #162)

Crosses two majors. Declared at `package.json` as `"eslint-plugin-astro": "^1.6.0"`, consumed
by `eslint.config.js` which spreads `configs.recommended` and `configs["jsx-a11y-recommended"]`.

Breaking changes that touch this repository, read from the upstream release notes:

- v2 requires ESLint v10 — satisfied, `package.json` declares `"eslint": "^10.1.0"`.
- v2 is ESM-only — satisfied, the package is `"type": "module"` and the config uses `import`.
- v2 raises the optional `@typescript-eslint/parser` peer floor to `8.61.0`, while
  `package.json` declares `"^8.58.0"`. The caret resolves to a satisfying version, so nothing
  breaks — but the DECLARED floor now sits below the peer minimum, which is a latent
  inconsistency worth correcting in the same change.
- v3 switches `.astro` parsing to Astro's Rust compiler. This repository has a recorded
  history of that compiler being stricter than its predecessor.
- v3 removes `astro/no-omitted-end-tags` and `astro/valid-compile` from `recommended`, so
  lint coverage decreases. Both losses are covered elsewhere: the compiler itself now rejects
  omitted end tags, and `pnpm check` is the replacement for `valid-compile`.

**The decisive evidence already exists**: `pnpm eslint` runs inside the `build and test` job,
and that job passed on #162 — so the Rust parser accepted every `.astro` file in this
repository. The plugin is a development dependency that the build never loads, so it cannot
change the shipped artifact.

### C — `lint-staged` 16.4.0 → 17.0.8 (pull request #163)

Declared at `package.json` and invoked by `.husky/pre-commit`, which runs `pnpm lint-staged`.
The configuration is the inline `"lint-staged"` key in `package.json`.

Breaking changes: Node floor rises to 22.22.1 (satisfied — `.nvmrc` pins 26); a Git floor of
2.32.0; and `yaml` becomes an optional dependency that YAML-configured users must install
separately. **The `yaml` change does not apply here** — the configuration is inline in
`package.json`, not a YAML file, and `yaml` is already a direct development dependency for
other reasons. This tool runs only in a local pre-commit hook; it never runs in CI and cannot
reach the built output.

### Conventions that apply

- Comments argue rather than assert; the exemplar is the file being edited.
- Prose is gated: `tests/docs-drift.test.ts` walks the tree and reaches `.md`, `.yml`, `.json`
  and `.ts`, so every backticked name must resolve against the real tree.
- Never commit to `main`; every change gets its own branch in its own worktree.
- A fresh worktree has no `node_modules` — symlink the main checkout's rather than installing
  a second copy.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0, no output |
| Tests (builds first) | `pnpm test` | exit 0, all files pass |
| Fast iteration | `SKIP_BUILD=1 pnpm test` | reuses `dist/` — never for the run you trust |

## Suggested executor toolkit

- `/dependabot-review` — this repository's own skill for work packages B and C. It carries the
  floor checks and the per-ecosystem expectations, and it is the reason those two pull
  requests were held rather than merged.

## Scope

**In scope**:

- `tests/workflow-guards.test.ts` (work package A)
- `package.json` — the `@typescript-eslint/parser` floor only (work package B)
- `plans/README.md` — status row, and the lede if it still claims no live proposal
- `plans/028-close-the-step-guard-hole-and-take-two-majors.md` — this file

**Out of scope**:

- `.github/workflows/ci.yml` and `.github/workflows/dns.yml` — work package A fixes the TEST,
  not the workflows. If the corrected gate reddens against a real workflow, that is a finding
  to report, not a licence to edit the workflow until the test passes.
- Any other assertion in `tests/workflow-guards.test.ts`. Add the always-runs check to
  `failingRunSteps`; do not reorganise the file.
- `.github/dependabot.yml` — its cooldown note is deliberately unresolved and has its own
  re-test written into it.
- The pull request branches for #162 and #163 — they belong to the bot. Merge or close them
  through the pull request, never by pushing to them.

## Git workflow

- Branch: short and descriptive, in its own worktree under `.claude/worktrees/`.
- Conventional Commits, lowercase imperative subject. The body carries *why* and *what was
  verified* — measurements, and what a reviewer should not have to re-derive.
- Squash-merge. The pull request title becomes the commit subject.

## Steps

### Step 1 (A): prove the hole exists before fixing it

Do not fix first. Establish the baseline, or you cannot tell a fix from a coincidence.

In a scratch copy of the tree, change the analytics step's `if:` in
`.github/workflows/ci.yml` to something never-true — `if: ${{ false }}` is enough — and run
`SKIP_BUILD=1 pnpm test`.

**Verify**: the suite is GREEN with that mutation in place. That green run is the defect.
Record the test-file and test counts. **If it is already RED, STOP** — the hole is closed and
this work package is obsolete; report that and move to Step 3.

### Step 2 (A): apply the always-runs check, and re-run the same mutation

In `tests/workflow-guards.test.ts`, add `stepAlwaysRuns(s) &&` to the `failingRunSteps`
predicate so it matches the discipline `stepsRunning` already uses. Extend the comment above
it to say why — a step that cannot run cannot fail anything, which is the same reasoning the
existing comment already gives for ignoring `exit 1` inside a `#` comment.

**Verify**, in this order:

1. With the Step 1 mutation still applied: `SKIP_BUILD=1 pnpm test` → **RED**, naming the
   analytics assertion.
2. With the mutation reverted: `pnpm test` → **GREEN**, with the same counts as the Step 1
   baseline.

Both directions are required. A gate that is red on everything is not a gate.

### Step 3 (B): decide `eslint-plugin-astro` #162

The analysis is in "Current state" and its decisive evidence is already recorded. Confirm the
pull request is still green and still contains only the dependency change, then merge it.

In the SAME change as the merge — or in a follow-up branch if the bot pull request cannot
carry it — raise the `@typescript-eslint/parser` floor in `package.json` from `^8.58.0` to
`^8.61.0` so the declaration matches the peer requirement.

**Verify**: `pnpm eslint` exits 0 with no output against the updated plugin, and `pnpm test`
is green.

### Step 4 (C): decide `lint-staged` #163

Confirm the pull request is still green and still contains only the dependency change, then
merge it.

**Verify**: after merging and pulling, make a trivial staged edit to a file matching the
`lint-staged` globs and run `pnpm lint-staged` directly. It must exit 0 and leave the staged
file staged. This exercises the one behavioural change that could bite — the switch to
`git update-index --again` — which no CI job can cover, because this tool never runs there.

## Test plan

Work package A **is** a test change, so the test plan is the mutation pair in Steps 1 and 2:
the same mutation must go from green to red, and the unmutated tree must stay green with
unchanged counts. That pairing is the evidence; a one-directional run proves nothing.

No new test file. Do not add an assertion that restates the workflow's contents — the gate
already executes the real conditions, and a second copy of the YAML in a test is the drift
class this repository's documentation suite exists to prevent.

Work packages B and C need no new tests. C's verification is the manual `pnpm lint-staged`
run in Step 4, which is deliberate: it covers a hook that CI structurally cannot reach.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0 with `0 errors`
- [ ] `pnpm eslint` exits 0 with no output
- [ ] `pnpm test` exits 0, every test file passing or skipped
- [ ] Mutating any step-level `if:` in `.github/workflows/ci.yml` to a never-true expression
      makes `SKIP_BUILD=1 pnpm test` RED, and the unmutated tree is GREEN with the counts
      recorded in Step 1
- [ ] `grep -c 'stepAlwaysRuns' tests/workflow-guards.test.ts` returns at least `3` — the
      definition plus both call sites
- [ ] `grep -c '8.61' package.json` returns `1`
- [ ] Pull requests #162 and #163 are MERGED or CLOSED with a stated reason, not left open
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The Step 1 mutation is already RED. The hole is closed; work package A is obsolete.
- The corrected gate reddens against the workflows AS THEY ARE, with no mutation applied.
  That means a real step cannot run on a publishing path — a genuine finding about
  `.github/workflows/ci.yml`, and far more interesting than this plan. Report it; do not edit
  the workflow to make the test pass.
- Either bot pull request has grown a file beyond its dependency change, or its checks are
  not green. The bot rebases itself, so re-read rather than assuming what was analysed.
- `pnpm eslint` reports errors under the new plugin that were not there before. That is the
  Rust-parser risk arriving; report which files and which rules, and do not merge #162.

## Maintenance notes

- **The asymmetry is the lesson, not the line of code.** A job-level guard was covered and a
  step-level one was not, and both looked covered from the test names. When adding any future
  guard assertion, ask which of the two it is and whether the helper it uses applies
  `stepAlwaysRuns`.
- Two further gaps were measured by the same review panel and are deliberately NOT in this
  plan: a `directory:` typo in `.github/dependabot.yml` silently disables an ecosystem while
  passing both the suite and a schema pre-flight; and `semver-major-days: 30` under a monthly
  interval defers a major 30–60 days rather than 30. Both are recorded with their evidence in
  `plans/done/README.md`.
- After #162 lands, the next `astro` major is the one to watch — the linter now parses with
  the same Rust compiler the build uses, so the two can now disagree in new ways.
