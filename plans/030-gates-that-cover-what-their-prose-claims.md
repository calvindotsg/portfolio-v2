# Plan 030: Every workflow gate covers every workflow, not the one file it happens to read

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Update this plan's status row in
> `plans/README.md` when you are done; the rest of that file is the reviewer's.
>
> **Drift check (run first)**:
> `git diff --stat 847d4a7..HEAD -- tests/workflow-guards.test.ts tests/dns-config.test.ts tests/build-output.test.ts .github/workflows/`
> If any of those changed, compare the excerpts under "Current state" against the live code before
> proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (assertions and one CI step; no behaviour under `src/` changes)
- **Depends on**: `plans/029-ship-the-artifact-you-gated.md` — not logically, but they edit three of
  the same files. Land 029 first and rebase.
- **Category**: tests / security
- **Planned at**: commit `847d4a7`, 2026-08-19
- **Finding**: security audit run 1 notes 4, 5, 10 and 17; run 2 notes 1, 2, 9 and 11.

## Why this matters

This suite is unusually strong and has one consistent blind spot: **it discovers within a single
file.** Every item here is a gate whose subject is narrower than the property it gets cited for, so
the repository's own documentation describes protections that hold by convention rather than by
assertion.

The two that matter most. **No test anywhere asserts that `ci.yml` or `strava-progress.yml` pin
their actions to a commit SHA** — the repository's only such assertion iterates `dns.yml`. And
`ci.yml` twice asserts in prose that `CLOUDFLARE_API_TOKEN` must exist only as an environment
secret, while `tests/workflow-guards.test.ts` calls the other half "GitHub-side and untestable". It
is testable in one step, and the consequence of a silent violation is sharp, because the `build` job
executes fork-pull-request-authored code: a repository-level copy of that secret would turn any fork
pull request into a production-site takeover.

None of this describes a live vulnerability. Every property currently holds. This plan makes them
hold *because something checks*, which is the difference between the rest of this suite and these
seven gaps.

## Current state

### A — the SHA-pin gate reaches one workflow of three

`tests/dns-config.test.ts:52-53` fixes the subject, and `:575-580` is the assertion:

```ts
const DNS_WORKFLOW = ".github/workflows/dns.yml";
const WF = parse(readFileSync(DNS_WORKFLOW, "utf8")) as { ... };
```

```ts
    it("pins every action to a full commit SHA", () => {
        for (const id of Object.keys(WF.jobs)) {
            for (const step of stepsOf(id)) {
                if (!step.uses) continue;
                expect(step.uses, `step in "${id}"`).toMatch(/@[0-9a-f]{40}$/);
```

Verified at `847d4a7`: `grep -rn '0-9a-f\]{40}' tests/` returns **that one line and nothing else**.
So `ci.yml` — which deploys production — and `strava-progress.yml` — which holds `contents: write`,
`actions: write` and both Strava secrets — have no SHA-pin gate in the tree.

The fix pattern already exists in the same file twice: `tests/dns-config.test.ts:652` and `:791`
both do `readdirSync(WORKFLOW_DIR)`. Use it.

### B — the repository-level-secret invariant

`tests/workflow-guards.test.ts:289-296` states the gap in its own words:

```
     * `ci.yml` states this as prose and calls it the thing that keeps the production branch
     * policy meaningful: `CLOUDFLARE_API_TOKEN` exists only as an ENVIRONMENT secret, so a
     * job that omits `environment:` cannot read it. That half is GitHub-side and untestable
     * from here.
```

The `build` job declares no `environment:` (`.github/workflows/ci.yml:85-105` is its step list; it
carries `permissions: contents: read` and nothing else). So a step in `build` that reads
`${{ secrets.CLOUDFLARE_API_TOKEN }}` gets the empty string while the invariant holds, and a real
value the moment it does not.

Verified against the live GitHub API at `847d4a7`: repository secrets are exactly
`CLOUDFLARE_DNS_READ_TOKEN`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`. **The invariant holds
today**, so the new step must pass on a correct repository — that is the expected result, not a
bug.

### C — nothing constrains any `permissions:` block

Verified: `grep -rn "permissions" tests/*.ts` returns **nothing**. `ci.yml:22-24` argues in prose
that a `permissions:` block replaces the defaults wholesale and that `contents: read` is all `build`
needs — and `build` is the one job that executes fork-authored code. That sentence is exactly the
kind of claim the rest of this suite executes rather than writes down.

The same applies to the script-injection property: the audit's "zero `${{ }}` inside any `run:`
body" is a property of the current text, held by convention.

### D — the deploy-path flags nothing reads

`ci.yml:96` is `- run: pnpm install --frozen-lockfile`; `:177` is `include-hidden-files: true`,
whose own comment at `:165` calls it "what makes the identity claim above TRUE"; `:77` is the
`WRANGLER_VERSION` pin. Verified: `grep -rn 'wrangler\|WRANGLER' tests/` returns six hits, **every
one inside a comment**.

### E — the `dist/` root deny-list has two entries

`tests/build-output.test.ts:2877`:

```ts
        for (const forbidden of ["_worker.js", "_routes.json"]) {
```

Cloudflare Pages honours four control files: those two, `_headers` (asserted separately) and
`_redirects` (unmentioned). `public/.well-known/` became shippable when `include-hidden-files: true`
was added, and nothing gates its contents. A deny-list here has now failed once — an audit hunter
filed a `_redirects` finding that turned out to be its own test artifact, but the *gap* it named is
real.

Today's `dist/` root file set, verified: `_headers`, `404.html`, `favicon.ico`, `index.html`,
`llms.txt`, `preview.jpg`, `resume.pdf`, `robots.txt`, `sitemap-0.xml`, `sitemap-index.xml`.

### F — the highest-privilege job has no ref test

`.github/workflows/strava-progress.yml` declares `workflow_dispatch: {}` (`:8`) with **no ref test
on the job**, holds `contents: write` and `actions: write` at workflow level (`:16-18`), reads both
Strava secrets (`:80-83`), pushes directly to `main`, and dispatches the production deploy
(`gh workflow run ci.yml --ref main`). `deploy-production` and `dns.yml`'s `apply` both carry a
`github.ref == 'refs/heads/main'` test; this is the only one of the three that does not.

Assessed honestly this is a lateral move rather than an escalation — dispatching needs write access
already — but it is the quietest available path to those secrets, since no commit is left on `main`.

Its steps are checkout, `node scripts/fetch-strava-progress.mjs` (`:83`), git, and the dispatch
(`:161`). Verified: **no `setup-node`, no `pnpm/action-setup`, no install of any kind**, and
`grep -rn "scripts/" .github/workflows/` returns that one run line — which is what bounds the
scaffold script's exposure in plan 031. Nothing states or gates any of it.

### G — publishing-job detection keys on one credential name

`tests/workflow-guards.test.ts:105`:

```ts
const publishingJobs = jobIds.filter((id) => TOKEN_REFERENCE.test(JSON.stringify(CI.jobs[id])));
```

`TOKEN_REFERENCE` matches both spellings of a `CLOUDFLARE_API_TOKEN` reference. A future publishing
job authenticating via OIDC or a differently-named secret is not classified as publishing, and the
`toEqual(["deploy-preview","deploy-production"])` assertion still passes — leaving the new job's
guard entirely unexecuted. That file's own docblock argues the right principle ("discovered from
the capability, not from a list or a name"); this is the one place it did not go far enough.

### Conventions that apply

- These suites derive their subjects rather than listing them, and each says why in a docblock.
  Match that: when you widen a subject, explain in the comment what a hand-kept list would have
  missed.
- Non-vacuity is first-class here — 168 `toBeGreaterThan(` calls across 17 of the 19 suites, and 15
  suites use the words "vacuous"/"vacuity" in their own prose. Every gate you add gets a floor.
- Prose is gated: `tests/docs-drift.test.ts` reaches `.md`, `.yml`, `.json` and `.ts`, so every
  backticked name must resolve against the real tree.
- Never commit to `main`; every change gets its own branch in its own worktree.
- A fresh worktree has no `node_modules` — symlink the main checkout's.

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

- `tests/workflow-guards.test.ts` — A, C, F, G
- `tests/dns-config.test.ts` — only if you move the SHA-pin assertion out of it; see step 1
- `tests/build-output.test.ts` — D and E
- `.github/workflows/ci.yml` — the new `build` step for B, and nothing else
- `.github/workflows/strava-progress.yml` — the ref test for F, and nothing else
- `plans/README.md` — this plan's status row only
- this file

**Out of scope**:

- Every workflow's existing `permissions:` values. Gate C asserts that each block *exists and is
  what it is*; it does not licence changing one. If a block looks too broad, that is a finding to
  report, not an edit.
- The `dns.yml` SHA-pin assertion's other behaviour. You are widening its subject, not rewriting
  the DNS suite.
- Anything under `src/`.
- Reorganising either test file. Add to them.
- The origin/live-site assertions — those are `plans/034-govern-the-origin.md`.

## Git workflow

- Branch: short and descriptive, in its own worktree under `.claude/worktrees/`.
- Conventional Commits, lowercase imperative subject; the body carries *why* and *what was
  verified*.
- Squash-merge. The pull request title becomes the commit subject.
- Do not push or open a pull request unless the operator instructed it.

## Steps

Each step is independent. Land them in one branch, but verify each on its own.

### Step 1 (A): pin-check every workflow

Make the SHA-pin assertion iterate every file in `.github/workflows/` instead of `dns.yml` alone.
Two shapes are acceptable and you should pick deliberately: widen it in place in
`tests/dns-config.test.ts`, or move it to `tests/workflow-guards.test.ts`, which already owns
cross-workflow properties. **Prefer moving it** — a repository-wide assertion living in the DNS
suite is how it came to be scoped to one file. Whichever you choose, say why in the docblock.

Add a non-vacuity floor: the discovered workflow count must be greater than one, or a glob that
matches nothing would pass.

**Verify**: temporarily rewrite one `uses:` in `.github/workflows/ci.yml` to a tag (`@v7`), run
`SKIP_BUILD=1 pnpm test`, confirm the assertion fails **and names `ci.yml`**. Restore it.

### Step 2 (B): make the untestable half testable

Add a step to the `build` job in `ci.yml` that reads `${{ secrets.CLOUDFLARE_API_TOKEN }}` into an
env var and fails if it is non-empty. `build` declares no `environment:`, so on a correct repository
the value is empty and the step passes.

Two constraints, both load-bearing:

- **Never echo the value.** Test emptiness only. Reproducing a secret into a log is the defect this
  step exists to detect, committed by the detector.
- Follow the file's convention that no `${{ }}` appears inside any `run:` body — the value arrives
  through `env:` and the script reads the environment variable.

Then update the docblock at `tests/workflow-guards.test.ts:289-296`: the "GitHub-side and
untestable" sentence becomes false the moment this step exists, and a stale reason outlives every
review that trusts it.

**Verify**: `pnpm test` green, and the new step's script exits non-zero when you locally set the
variable to a dummy value. Then `grep -n 'untestable' tests/workflow-guards.test.ts` → no match, or
a match whose surrounding sentence is now accurate.

### Step 3 (C): assert every `permissions:` block, and the absence of `${{ }}` in `run:`

Two assertions in `tests/workflow-guards.test.ts`, both derived from the directory:

- Every job in every workflow declares a `permissions:` block, and the map for each is what it is
  today. Assert the *shape* — that the block exists and is a mapping of known scopes — plus the
  specific value for `build`, which `ci.yml:22-24` singles out.
- No `run:` body in any workflow contains `${{`.

**Verify**: for each, mutate a workflow to break it (delete a `permissions:` block; put `${{
github.ref }}` inside a `run:`), confirm the corresponding assertion fails and names the job, then
restore.

### Step 4 (D): gate the deploy-path flags

Three assertions over `ci.yml`, in `tests/workflow-guards.test.ts`: the install step passes
`--frozen-lockfile`; the upload step's `with:` carries `include-hidden-files: true`; and every
deploy step's `run:` deploys `dist` using the `WRANGLER_VERSION` variable rather than a literal
version.

**Do not assert the version string itself.** Dependabot moves it, and a test that pins the number
turns every routine bump red. Assert that the pin is *referenced*, not what it equals.

**Verify**: mutate each of the three, one at a time, confirm the matching assertion fails, restore.

### Step 5 (E): allow-list the `dist/` root

Replace the two-entry deny-list with an assertion that the set of non-hashed files at the root of
`dist/` equals exactly today's set (listed under "Current state E"). Keep the existing failure
message's reasoning about why `_worker.js` and `_routes.json` in particular are dangerous — it is
the best explanation in the file — and extend it to say why an allow-list replaced the deny-list.

**Verify**: `touch dist/_redirects`, run `SKIP_BUILD=1 pnpm test`, confirm it fails and names the
file. Remove it and confirm green. This is the case the deny-list missed, so it is the one that
proves the change.

### Step 6 (F): guard and assert the credentialed job

Add `if: github.ref == 'refs/heads/main'` to the `update` job in `strava-progress.yml`, matching the
spelling `deploy-production` and `dns.yml`'s `apply` already use. Carry a comment saying what it
stops: a `workflow_dispatch` on any other ref running that job's script with `contents: write`,
`actions: write` and both Strava secrets, leaving no commit on `main`.

Then assert, in `tests/workflow-guards.test.ts`: that job carries the ref test; that it installs
nothing (no `setup-node`, no `pnpm/action-setup`, no `run:` invoking a package manager install); and
that its dispatch names a literal ref rather than an expression.

`tests/workflow-guards.test.ts` already **executes** workflow `if:` expressions through
`@actions/expressions` rather than reading them. Use that machinery for the ref test — reading the
string would be the weaker form of the same check, and this file has a docblock explaining why.

**Verify**: mutate `--ref main` to `--ref "$SOMETHING"`, confirm the new assertion fails; mutate the
job to add a `pnpm/action-setup` step, confirm the installs-nothing assertion fails. Restore both.

### Step 7 (G): widen publishing-job detection

Extend `publishingJobs` so a job is classified as publishing when it references *any* secret, or
declares an `environment:`, or configures OIDC (`id-token: write`) — not only when it names
`CLOUDFLARE_API_TOKEN`. Keep the existing `toEqual` assertion; widening the detector is what makes
it meaningful.

**Verify**: add a fake job to `ci.yml` that declares `environment: production` and no
`CLOUDFLARE_API_TOKEN`, run the suite, confirm the `toEqual` assertion now fails because the fake
job was detected. Remove the fake job.

### Step 8: full ladder

```bash
pnpm check && pnpm eslint && pnpm test
```

## Test plan

All new assertions live in existing suites; no new test file is created. If you create one,
`tests/docs-drift.test.ts` requires at least 300 characters of `/** */` docblock **above its first
`describe(`**.

Every assertion in steps 1 and 3–7 has its mutation named in the step. Perform each mutation, record
the failure message in the pull request body, and restore. **A gate that was never shown red is not
evidence of anything** — this suite's own prose says so in fifteen places.

Verification: `pnpm test` → all files pass. Do not write an absolute suite total into this plan or
into any assertion; two plans pinning one is how run 6's parallel execution nearly broke.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check`, `pnpm eslint`, `pnpm test` all exit 0
- [ ] `grep -rn '0-9a-f\]{40}' tests/` shows the SHA-pin assertion iterating a discovered directory, not a single-file constant
- [ ] `grep -rn "permissions" tests/*.ts` returns at least one assertion
- [ ] `grep -rn "wrangler" tests/` returns at least one non-comment line
- [ ] `grep -n 'refs/heads/main' .github/workflows/strava-progress.yml` matches
- [ ] `tests/build-output.test.ts` asserts an allow-list, and `touch dist/_redirects` reddens it
- [ ] Every mutation named in steps 1 and 3–7 was performed and its failure recorded
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] This plan's row in `plans/README.md` is updated

## STOP conditions

Stop and report back — do not improvise — if:

- The step added in step 2 **fails on a correct repository**, i.e. `CLOUDFLARE_API_TOKEN` reads
  non-empty in `build`. That is not a test bug — it means the invariant has been violated and a fork
  pull request can currently reach production. Report it immediately and do not "fix" the test.
- Widening the SHA-pin assertion reddens against a workflow that is genuinely tag-pinned. Report the
  offending line; do not pin it yourself in this plan — a pin bump is Dependabot's territory and has
  its own review.
- Any mutation you make cannot be made to redden its intended assertion. Report which one.
- Adding the ref test to `strava-progress.yml` would change when the nightly cron runs. It must not:
  `github.ref` on a scheduled run is the default branch. If your reading of the evaluator disagrees,
  STOP — breaking the nightly is a worse outcome than the gap being closed.
- The `dist/` root file set differs from the list under "Current state E". The tree has moved;
  re-derive the set before asserting it.

## Maintenance notes

- **Every gate here is derived from the directory rather than a list**, which is the property that
  makes them survive a new workflow. A reviewer should check that no step introduced a hardcoded
  filename or job id — that is precisely the defect being repaired.
- The step added in step 2 is a *canary for a GitHub-side misconfiguration*, not a test of this
  repository's code. If it ever fails, the fix is in repository settings, not in the workflow.
- The allow-list in step 5 must be updated deliberately whenever the build legitimately gains a root
  file. That is the cost of an allow-list and it is the intended cost — the deny-list's failure mode
  was silence.
- **Deferred deliberately**: asserting that `permissions:` values are *minimal* rather than merely
  present. Minimality is a judgement, not a predicate, and encoding today's judgement as a test
  would redden on a legitimate future need. Presence plus the explicit `build` value is the durable
  half.
