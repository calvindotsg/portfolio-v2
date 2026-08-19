# Plan 029: The artifact CI gates is built in production mode, and the deploy step runs no install scripts

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Update this plan's status row in
> `plans/README.md` when you are done; the rest of that file is the reviewer's.
>
> **Drift check (run first)**:
> `git diff --stat 847d4a7..HEAD -- .github/workflows/ci.yml tests/setup/build.ts vitest.config.ts tests/build-output.test.ts tests/workflow-guards.test.ts`
> If any of those changed, compare the excerpts under "Current state" against the live code before
> proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one environment variable, one CLI flag, one comment — all reversible; no source under `src/` is touched)
- **Depends on**: —
- **Category**: security / correctness
- **Planned at**: commit `847d4a7`, 2026-08-19
- **Finding**: security audit run 2's only confirmed defect, and run 1's finding 1. Artifacts are outside this repository at `~/security-audit-skill/portfolio-v2/`; everything you need is inlined below, so you do not need to read them.

## Why this matters

**Production is currently served a development-mode build.** Vitest sets `NODE_ENV=test` in its own
process, `tests/setup/build.ts` spawns `pnpm build` inheriting that environment, and Vite derives
`isProduction` from `NODE_ENV` — so the whole prerender runs with `import.meta.env.DEV === true`.
CI has no other build step, and the deploy jobs publish that exact artifact without rebuilding, so
the mode leaks all the way to visitors. Today the blast radius is one HTML attribute. It is latent
rather than static: `astro/dist` carries `import.meta.env.DEV` branches in three **client** modules
this site does not use yet, so the day anyone adds `<ClientRouter />` or prefetch, dev-only code —
`console.debug` calls, the Vite dev style-state path, `data-vite-dev-id` — ships to visitors on a
green run.

Separately, both `wrangler pages deploy` steps run `npx --yes`, which consults no lockfile and runs
install scripts by default, in a process holding `CLOUDFLARE_API_TOKEN`. The obvious attack does not
work against wrangler's graph today — the three install-script packages are exact-pinned and none of
the float-only packages declares an install script — but nothing in this repository observes that
property, and Dependabot bumps `WRANGLER_VERSION` without re-checking it. `--ignore-scripts` closes
it for one word per line.

Both fixes are **ungated in both directions**: no test reads `import.meta.env.PROD` and no test
mentions `--ignore-scripts`, so the defect arrived silently and a revert would too. Each fix ships
with its assertion in the same change. That is the point of this plan as much as the fixes are.

## Current state

### A — the build mode

- `vitest.config.ts:7` — `globalSetup: ["tests/setup/build.ts"]`. This is the only build CI runs.
- `.github/workflows/ci.yml:105` — `- run: pnpm test`. There is no bare `pnpm build` anywhere in CI.
- `tests/setup/build.ts` — the spawn, with no `env` option, so the child inherits vitest's
  `NODE_ENV=test`:

```ts
export default function setup() {
    rmSync(".netlify", {recursive: true, force: true});

    if (process.env.SKIP_BUILD === "1" && existsSync("dist")) return;
    execFileSync("pnpm", ["build"], {stdio: "inherit"});
}
```

**Measured at `847d4a7`, in an isolated `git archive` copy** — reproduce this yourself in step 1
rather than trusting it:

| `NODE_ENV` | occurrences of `data-image-component` in `dist/index.html` |
|---|---|
| unset | 0 |
| `production` | 0 (tree byte-identical to unset) |
| `test` | **1** |
| live `https://calvin.sg/` | **1** |

`data-image-component` is emitted only under `import.meta.env.DEV`. A full `diff -rq` between the
production and test trees differs in `index.html` alone, by a 28-byte attribute.

**The fix is verified, not proposed.** `NODE_ENV=production vitest run` left the suite at
**536 passed / 7 skipped of 543** — identical to the baseline — and produced a `dist/` that was
**byte-identical** to a bare `NODE_ENV=production astro build`.

### B — the deploy step

`.github/workflows/ci.yml:293` (preview) and `:416` (production), identical but for the `--branch`:

```yaml
          npx --yes "wrangler@${WRANGLER_VERSION}" pages deploy dist \
            --project-name="${PAGES_PROJECT}" \
            --branch=main \
            --commit-hash="${HEAD_SHA}"
```

`WRANGLER_VERSION: "4.114.0"` is at `:77`. Each step's `env:` block exports
`CLOUDFLARE_API_TOKEN`. **Both must be changed** — `ci.yml:359-361` states that the preview copy is
the same account-scoped `Pages: Edit` credential and can publish production.

Verified at `847d4a7`: `npx --yes --ignore-scripts wrangler@4.114.0 --version` prints `4.114.0`
and its `pages` subcommand is intact. wrangler's platform binaries arrive as
`optionalDependencies`, so their install scripts are not load-bearing.

### C — the comment that points at the wrong half

`.github/workflows/ci.yml:283-291`:

```
        # WHAT THE VERSION PIN BUYS, STATED HONESTLY: it pins wrangler's own version and
        # NOT its dependency tree. `npx --yes` resolves ~91 packages with no lockfile and no
        # integrity pinning, 23 of them on floating ranges, two with install scripts — in
        # the same process as the deploy token, while every `uses:` above is SHA-pinned for
        # exactly that threat. The control that actually bounds this is the token's scope:
        # `Cloudflare Pages: Edit` on one account, which cannot touch DNS, zones or Workers.
```

Two things are wrong. The floating count is **18**, not 23. And the two install-script packages it
gestures at (`esbuild`, `workerd`) are the **exact-pinned, safe** half; the floating half is the
part that currently cannot execute at install time. A reader hardening this line would optimise the
wrong thing.

The token-scope sentence is true but weaker than it reads: `Pages: Edit` already permits publishing
arbitrary content to the project serving `calvin.sg`. Its policy was later confirmed to be exactly
one permission, `Pages Write` on one account — so do not soften the scope claim, sharpen what it
buys.

### Conventions that apply

- Comments here argue rather than assert, and the exemplar is the file being edited. Read the
  surrounding comments in `ci.yml` before writing one.
- **Do not write a figure that will rot.** This repository's doctrine is to name a derivation and a
  test instead of transcribing a number — `plans/README.md`'s baseline table says "derive:" in cell
  after cell for exactly this reason. The corrected comment should describe the *property* and how
  to re-derive it, not swap 23 for 18.
- Prose is gated: `tests/docs-drift.test.ts` walks the tree and reaches `.md`, `.yml`, `.json` and
  `.ts`, so every backticked name must resolve against the real tree.
- Never commit to `main`; every change gets its own branch in its own worktree.
- A fresh worktree has no `node_modules` — symlink the main checkout's rather than installing a
  second copy.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0, no output |
| Tests (builds first) | `pnpm test` | exit 0, all files pass |
| Fast iteration | `SKIP_BUILD=1 pnpm test` | reuses `dist/` — never for the run you trust |

## Scope

**In scope**:

- `tests/setup/build.ts` — the build spawn's environment
- `.github/workflows/ci.yml` — the two `npx` lines and the comment block at `:283-291`
- `tests/build-output.test.ts` — the production-mode assertion
- `tests/workflow-guards.test.ts` — the `--ignore-scripts` assertion
- `plans/README.md` — this plan's status row only
- this file

**Out of scope**:

- Anything under `src/`. This plan changes how the site is built, not what it contains. If the
  production-mode build changes rendered output beyond the dev-only attribute, that is a STOP
  condition, not a licence to edit a component.
- `vitest.config.ts` — setting `NODE_ENV` there is a third place the value could live. Put it in
  one place and say why in a comment.
- The `WRANGLER_VERSION` pin itself. Bumping wrangler is Dependabot's job and a separate decision.
- Every other assertion in the two test files. Add to them; do not reorganise them.
- The `dist/` root deny-list, the SHA-pin gate, and the `permissions:` gate — those are plan 030.

## Git workflow

- Branch: short and descriptive, in its own worktree under `.claude/worktrees/`.
- Conventional Commits, lowercase imperative subject. The body carries *why* and *what was
  verified* — measurements, and what a reviewer should not have to re-derive.
- Squash-merge. The pull request title becomes the commit subject.
- Do not push or open a pull request unless the operator instructed it.

## Steps

### Step 1: reproduce the defect before fixing it

Do not fix first. A baseline is what lets you tell a fix from a coincidence.

```bash
pnpm build && grep -c 'data-image-component' dist/index.html   # expect: 0
rm -rf dist && NODE_ENV=test pnpm build && grep -c 'data-image-component' dist/index.html   # expect: 1
curl -sS https://calvin.sg/ -o /tmp/live.html && grep -c 'data-image-component' /tmp/live.html   # expect: 1
```

Fetch **once to a file and grep the file**. A fetch per grep straddles the edge cache warm-up and
gives you two inconsistent reads of the same page.

**Verify**: the three counts are `0`, `1`, `1`. If the live count is `0`, someone has already fixed
this — STOP and report.

### Step 2: build in production mode

Set `NODE_ENV=production` on the `execFileSync` call in `tests/setup/build.ts` — the child's
environment, not the parent's, so nothing else in the suite changes mode. Carry a comment saying
what it is for: that vitest sets `NODE_ENV=test`, that Vite reads `isProduction` from it, and that
this spawn produces the artifact CI ships.

**Verify**:

```bash
rm -rf dist && pnpm test 2>&1 | tail -5     # expect: 536 passed | 7 skipped (543)
grep -c 'data-image-component' dist/index.html   # expect: 0
```

The suite total must be **unchanged** by this step. If it moved, STOP — you have changed behaviour,
not mode.

### Step 3: assert the mode, so a revert is loud

Add an assertion to `tests/build-output.test.ts` that the shipped `dist/index.html` carries no
development-mode marker. Follow the file's existing style: a docblock that argues why, then the
assertion.

Assert on the marker's **absence** and give the assertion a non-vacuity floor — the file's own
idiom is `toBeGreaterThan(`, used 168 times across the suite. An assertion that "no dev marker is
present" passes trivially against an empty file, so also assert the file has real content.

**Verify**: mutate `tests/setup/build.ts` back to `NODE_ENV=test`, run `pnpm test`, and confirm the
new assertion **fails**. Restore it and confirm the suite is green again. A gate that does not go
red on the defect it names is not a gate.

### Step 4: `--ignore-scripts` on both deploy invocations

Add the flag to `ci.yml:293` and `:416`. It goes on `npx`, before the package specifier:

```yaml
          npx --yes --ignore-scripts "wrangler@${WRANGLER_VERSION}" pages deploy dist \
```

**Verify**: `grep -c 'npx --yes --ignore-scripts' .github/workflows/ci.yml` → `2`.

### Step 5: assert the flag, so a bump cannot drop it

Add an assertion to `tests/workflow-guards.test.ts` that **every** step in `ci.yml` whose `run:`
body invokes `npx` passes `--ignore-scripts`. Derive the set of steps from the file rather than
naming the two jobs — the file already does this for publishing jobs, and its comment explains why
("keying on `deploy-` in the job id would instead be a naming convention"). Match that reasoning.

**Verify**: remove the flag from one of the two lines, run `SKIP_BUILD=1 pnpm test`, confirm the new
assertion fails and names the offending job. Restore it.

### Step 6: rewrite the comment at `ci.yml:283-291`

State the property and how to re-derive it, not a count. What is true, and what the comment should
carry:

- `npx` consults no lockfile, so there is no independent integrity expectation for anything it
  resolves — that is the durable fact, and it does not depend on any number.
- The reason this is LOW rather than higher is an *intersection*: the packages that re-resolve on
  every deploy and the packages that run install scripts are disjoint sets today. Name that
  property, and name the command that re-derives it, so the next reader checks rather than trusts.
- `--ignore-scripts` (step 4) now closes the executing half regardless.
- Keep the token-scope sentence but do not let it read as the control that bounds the risk.
  `Pages: Edit` permits publishing arbitrary content to the project that serves `calvin.sg`.

**Verify**: `grep -n '23 of them' .github/workflows/ci.yml` returns nothing, and `pnpm test` is
green (`docs-drift` reaches `.yml`, so a backticked name you invent must exist).

### Step 7: full ladder

```bash
pnpm check && pnpm eslint && pnpm test
```

**Verify**: all three exit 0.

## Test plan

Two new assertions, both mutation-verified in the steps that add them:

- `tests/build-output.test.ts` — the shipped HTML carries no development-mode marker, with a
  non-vacuity floor. Model it on the surrounding assertions in that file.
- `tests/workflow-guards.test.ts` — every `npx` invocation in `ci.yml` passes `--ignore-scripts`,
  with the step set derived from the file. Model it on the `publishingJobs` discovery already in
  that file.

No new test **file** is created. If you find yourself creating one, note that
`tests/docs-drift.test.ts` requires every `tests/*.test.ts` to carry at least 300 characters of
`/** */` docblock **above its first `describe(`**, or the suite goes red.

Verification: `pnpm test` → all files pass, with 2 more assertions than the baseline. Do not write
an absolute total into this plan or the suite; plans that pinned one have broken each other before.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -c 'data-image-component' dist/index.html` → `0` after a plain `pnpm test`
- [ ] `grep -c 'npx --yes --ignore-scripts' .github/workflows/ci.yml` → `2`
- [ ] `grep -c 'npx --yes "wrangler' .github/workflows/ci.yml` → `0`
- [ ] `grep -n '23 of them' .github/workflows/ci.yml` → no match
- [ ] Both new assertions were shown to fail against the un-fixed code and pass against the fixed code
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] This plan's row in `plans/README.md` is updated

## STOP conditions

Stop and report back — do not improvise — if:

- The live site returns `0` for `data-image-component` in step 1. Someone has already fixed this and
  this plan's premise is stale.
- Building with `NODE_ENV=production` changes anything in `dist/` beyond that attribute. The
  measurement says `index.html` alone differs; if `diff -rq` disagrees, the tree has moved and the
  blast radius must be re-established before shipping.
- `pnpm test` under `NODE_ENV=production` does not leave the suite at its pre-change total. A moved
  total means behaviour changed, not just mode.
- Adding `--ignore-scripts` breaks a local `wrangler --version` check. Report it rather than
  reverting silently — it would mean wrangler's packaging changed since `4.114.0` was measured.
- You cannot make a new assertion fail against the un-fixed code. An unfalsifiable gate is worse
  than none, because it reads as protection.

## Maintenance notes

- **`NODE_ENV` now has a load-bearing value in exactly one place.** Anyone adding a second build
  invocation to CI must set it there too, or reintroduce this defect on the new path. The assertion
  in step 3 is what catches that, which is why it asserts the artifact rather than the config.
- **The `--ignore-scripts` assertion is the thing that survives a wrangler bump.** Dependabot moves
  `WRANGLER_VERSION` without re-checking the dependency-graph property that makes this LOW; the gate
  is what makes the bump safe to merge on green.
- A reviewer should scrutinise: that the mode change is on the child process and not exported
  globally, and that both new assertions were demonstrated red before green — the plan requires it
  and the PR body should say so.
- **Deferred deliberately**: the complete fix for the `npx` exposure is a vendored deploy-only
  lockfile behind a sparse checkout, which costs the "no repository source in the runner" property
  the deploy jobs currently have. Not worth that trade for a graph whose executing and re-resolving
  sets are disjoint. Revisit only if that intersection stops being empty.
