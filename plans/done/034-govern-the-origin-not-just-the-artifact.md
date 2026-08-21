# Plan 034: The live origin is asserted, preview deployments expire, and the edge configuration is written down

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Update this plan's status row in
> `plans/README.md` when you are done; the rest of that file is the reviewer's.
>
> **Drift check (run first)**:
> `git diff --stat 847d4a7..HEAD -- .github/workflows/ tests/ public/_headers`
> If any of those changed, compare the excerpts under "Current state" against the live code before
> proceeding. On a mismatch, treat it as a STOP condition.
>
> **PRECONDITION — this plan cannot go green until three Cloudflare zone settings are off.** See
> "Preconditions" below. Verify them in step 0 and STOP if they are not done.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: **MED** — the only plan in this set that adds a network-dependent step to CI, and the
  only one containing an irreversible action (step 5 deletes deployments permanently)
- **Depends on**: `plans/029-ship-the-artifact-you-gated.md` and
  `plans/030-gates-that-cover-what-their-prose-claims.md`, plus the zone preconditions below
- **Category**: security / infrastructure
- **Planned at**: commit `847d4a7`, 2026-08-19
- **Finding**: not from an audit item. This is the root-cause response to run 1 defect 1 and run 2
  note 4, which the audit reported as two separate symptoms.

## Why this matters

**This repository governs the artifact and nothing governs the origin.**

DNS records are in git and drift-checked weekly. Zone settings, redirect rules, the Pages project and
its deployments are not in git, not backed up, not drift-checked — and no test, in CI or in the
suite, ever fetches the live site. `CLAUDE.md`'s central claim that what ships is the artifact the
suite gated is true at rest and false on the wire: Cloudflare Rocket Loader rewrites four of the five
shipped `<script>` tags on production and injects a loader, so the pre-paint theme script that
`src/layouts/BasicLayout.astro` documents as running before first paint is deferred into the
loader's queue. Two more HTML rewriters are enabled behind it and nothing would report a third.

The same cause, different symptom: a preview deployment is permanent, removing a file from `public/`
does not unpublish it, and nothing retires them. Sixty-one are live, and three still serve a
superseded résumé advertising the wrong job title — the exact contradiction a merged pull request
was written to fix.

**Turning the settings off fixes today; this plan is what makes it stay fixed.**

### The design, and why it is split in two

Standard continuous-delivery guidance is that a deploy is not done until it is verified, and that
verification should be able to *act*. Checked at `847d4a7`: `wrangler pages` offers `list`,
`create`, `tail` and `delete` — **there is no rollback**. A post-deploy check here cannot revert
anything, so it is a loud alarm, not a gate, and it should be scoped to what it can honestly claim.

The two questions are different in kind:

- **"Did the bytes I just built reach the edge?"** is release verification. It is genuinely caused by
  the deploy, it is answerable immediately, and it belongs in the deploy job where a failure means
  the deploy failed.
- **"Is Rocket Loader on?"** is **drift**. It is not deploy-correlated at all. Binding it to the
  deploy would be wrong twice: it reddens a build for something the build did not cause, and it
  notices only when someone happens to ship.

**This repository already made this argument.** `.github/workflows/dns.yml`'s header says it
outright — *"Applying from git is the smaller half of this. Calvin edits DNS in the Cloudflare
dashboard … so the realistic job of this workflow is to NOTICE when the zone and the repository
disagree, weekly, and say so."* — and implements it as a scheduled job at `cron: "41 20 * * 1"`.
That is the canary, already built, for the half of the origin octoDNS can see. This plan completes
the pattern for the half it cannot.

## Preconditions (the maintainer, outside this plan)

Three Cloudflare zone settings must be **off** before step 4 can pass. They are dashboard actions;
nothing in this repository can perform them.

| Setting | Why off |
|---|---|
| Rocket Loader | Nothing to optimise — the site ships one external script, already `defer`, and three inline. It defers the pre-paint theme resolver, causing the light flash the inline script exists to prevent. |
| Hotlink Protection | Returns 403 for `preview.jpg` — the site's own `og:image` — on any foreign `Referer`. Pages bandwidth is unmetered and `Referer` is client-supplied, so it blocks only honest consumers. |
| Email Obfuscation and Server-Side Excludes | Both inert today (no mailto is rendered, no `sse` markers exist) and both HTML rewriters, so both arm silently the day content changes. |

## Current state

### A — nothing reads the live origin

`grep -rn 'calvin.sg' tests/` finds references in prose and in canonical-URL assertions against
`dist/`, and **no fetch**. The chain of custody stops at the artifact. `rocket` appears nowhere in
the repository; `cdn-cgi` appears once, in an unrelated comment.

**Measured on the wire at `847d4a7`**, and reproducible in step 0:

```
$ curl -sS https://calvin.sg/ -o live.html
$ grep -c 'data-image-component' live.html      # 1  (fixed by plan 029)
$ grep -c 'rocket-loader' live.html             # 1
$ grep -o 'type="[0-9a-f]\{16,\}-' live.html | wc -l   # 4  (rewritten script tags)
```

### B — the deploy identity check is cheap and exact

`dist/index.html` references content-hashed assets. At `847d4a7` those were:

```
/_astro/icons.BUUAjZ16.css
/_astro/me.D44fd81e_1hBdqr.webp
/_astro/me.D44fd81e_1iSPVs.webp
```

and live `https://calvin.sg/` referenced **the identical set**. The deploy jobs already
`download-artifact` the `dist/` they are publishing, so the job can read the hashed names out of the
artifact it just uploaded and require the live HTML to reference them. **No new credential, no
guessing, and the hash changes whenever the content does** — which is exactly the property a
freshness check needs.

Two traps, both measured previously and both load-bearing:

- **A post-deploy fetch can be stale despite `cf-cache-status: DYNAMIC`.** The check needs bounded
  retries against the asset hash before it asserts anything, and a clear failure when the retries
  are exhausted.
- **One fetch per grep straddles the warm-up.** Fetch once to a file and assert against the file, or
  two greps read two different responses and disagree for reasons that have nothing to do with the
  deploy.

### C — preview deployments are permanent

Verified on the wire at `847d4a7`: `pr-150.calvindotsg.pages.dev/resume.pdf` returns 200 at
**114,874 bytes** while production and `pr-169` serve **91,761**. `pdftotext` on the stale copy shows
the superseded job title. Roughly 61 aliases are live; `pr-103` is the boundary below which they 404.

Bounded rather than alarming — `x-robots-tag` is present on every preview alias, the repository is
public, and the stale blob is in git history either way. What it costs is the assumption that `HEAD`
describes what is served.

`wrangler pages deployment list` and `wrangler pages deployment delete <deployment-id>` both exist at
the pinned `4.114.0` — verified. The `Pages: Edit` token already in the `preview` environment is
sufficient; its policy is exactly one permission, `Pages Write` on one account.

### D — nothing records what the edge is configured to do

No document in the repository states which zone features are enabled or what each is for, which is
how four unnecessary ones stayed on. The two Cloudflare Redirect Rules (`www` → apex,
`slickshots` → Instagram) live outside git with no version-controlled record, no backup and no drift
detection.

### Conventions that apply

- `.github/workflows/dns.yml` is the exemplar for a scheduled drift job — read its header and its
  `plan` job before writing the canary. `dns/drift.sh` is the exemplar for **failing closed**: it
  reads both of octoDNS's mutually exclusive signals and exits 2 when they disagree, rather than
  taking the fail-open branch a one-line grep would.
- Every `permissions:` block replaces the defaults wholesale; an unlisted scope is `none`.
- No `${{ }}` inside any `run:` body. Context values arrive through `env:` and are used as quoted
  expansions.
- Every `uses:` is pinned to a full 40-character commit SHA with the version in a trailing comment.
- Never commit to `main`; every change gets its own branch in its own worktree.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint (reaches `scripts/**/*.mjs`) | `pnpm eslint` | exit 0, no output |
| Tests (builds first) | `pnpm test` | exit 0, all files pass |
| Read the live origin | `curl -sS https://calvin.sg/ -o /tmp/live.html` | exit 0, then grep the **file** |
| List deployments | `npx --yes --ignore-scripts wrangler@4.114.0 pages deployment list --project-name=calvindotsg` | a table |

## Scope

**In scope**:

- `.github/workflows/ci.yml` — the release-verification step in `deploy-production` only
- a new workflow for the scheduled origin canary
- a new workflow or job for preview-deployment retention
- `scripts/` — a helper if the checks need more than a few lines of shell; `pnpm eslint` reaches
  `scripts/**/*.mjs`, so it must lint clean
- `tests/workflow-guards.test.ts` — assertions over the new workflows
- a document recording the zone configuration (D)
- `plans/README.md` — this plan's status row only
- this file

**Out of scope**:

- **Changing any Cloudflare setting from CI.** The canary reads; it never writes. The token it would
  need does not exist and minting one is a decision, not a step.
- An automated zone-settings drift check. It needs a `zone_settings:read` credential this repository
  does not have. Record the configuration (step 6); do not invent a token to poll it.
- `public/_headers` — that was `plans/done/033-the-remaining-hardenings.md`, which has landed. The
  file now carries a `/*` block of security headers as well as the `/_astro/*` cache rule, and
  `tests/build-output.test.ts` holds the rule SET exactly. **Adding a header there is no longer a
  one-file edit**, and a header name may appear in exactly one rule — read that file's own comment
  before touching it.
- The deploy steps' existing wrangler invocation and output assertions.
- Anything under `src/`.
- Deleting the production deployment, or any preview whose pull request is still open. See STOP
  conditions.

## Git workflow

- Branch: short and descriptive, in its own worktree under `.claude/worktrees/`.
- Conventional Commits, lowercase imperative subject; the body carries *why* and *what was verified*.
- Squash-merge. The pull request title becomes the commit subject.
- Do not push or open a pull request unless the operator instructed it.

## Steps

### Step 0: confirm the preconditions, and record the baseline

```bash
curl -sS https://calvin.sg/ -o /tmp/live.html
grep -c 'rocket-loader' /tmp/live.html                      # want: 0
grep -o 'type="[0-9a-f]\{16,\}-' /tmp/live.html | wc -l     # want: 0
curl -sS -o /dev/null -w '%{http_code}\n' -H 'Referer: https://www.linkedin.com/' https://calvin.sg/preview.jpg   # want: 200
```

**Verify**: all three. **If any is not, STOP** — the zone preconditions have not been done, and
writing a canary that is red on arrival is how a gate gets disabled instead of fixed.

### Step 1: the release-verification step

Add a step to `deploy-production` in `ci.yml`, after the wrangler deploy, that:

1. Reads the content-hashed `_astro` asset names out of the downloaded `dist/index.html`. There is
   at least one; assert that, or an empty set makes the whole check vacuous.
2. Fetches `https://calvin.sg/` **once to a file**, with bounded retries, until the fetched HTML
   references every one of those names — or the retries are exhausted, which is a failure with a
   message saying the deploy may not have propagated.
3. Asserts nothing else. Zone properties are step 3's job.

**Verify**: run the logic locally against the current production site using the local `dist/` from a
`pnpm build` at the deployed commit — it should pass. Then mutate one expected asset name to a
fabricated hash and confirm it fails after the retries rather than hanging.

### Step 2: assert the release-verification step exists

Add an assertion in `tests/workflow-guards.test.ts` that `deploy-production` carries a step that
fetches the live origin after the deploy step. Derive it from the job's steps, not from a step name —
a name is a convention, and this file's own docblock explains why that is the weaker form.

**Verify**: delete the step, confirm the assertion fails, restore.

### Step 3: the origin drift canary

A **new scheduled workflow**, modelled on `.github/workflows/dns.yml`'s `plan` job. Requirements:

- `permissions: {}` — it needs none. It reads a public site. This makes it the lowest-privilege job
  in the repository, which is the right shape for the thing that watches everything else.
- Holds **no secret**. If you find yourself adding one, you are writing step 1's check in the wrong
  place.
- Fetches once to a file, asserts against the file.
- Asserts what a zone change would break: no injected loader; no rewritten `<script>` type; the
  security headers present; the `dist/` root file set still what the site serves; and
  `preview.jpg` reachable with a foreign `Referer`.
- **Fails closed.** Follow `dns/drift.sh`: when the check cannot tell — a non-200, a truncated body,
  a network error — exit distinctly rather than passing. A canary that goes green on a failed fetch
  is worse than no canary.
- A schedule off the top of the hour and on a weekday, for the reason `dns.yml`'s comment gives:
  GitHub delays scheduled runs most at `:00`, and an alert is seen the same morning.

**Verify**: run its script locally against production — green. Then point it at
`https://calvindotsg.pages.dev/` and confirm it **fails** on the missing `strict-transport-security`
header, which that origin genuinely does not send. That is your non-degeneracy control: a canary
that passes against both origins is not testing anything.

### Step 4: assert the canary's own properties

In `tests/workflow-guards.test.ts`: the canary workflow declares empty `permissions:`, references no
secret, and runs on a schedule. These are the properties that would silently rot.

**Verify**: add a `secrets.` reference to the canary, confirm the assertion fails, remove it.

### Step 5: preview-deployment retention — the irreversible step

**Read this whole step before running anything.**

The policy, set by the maintainer: **delete every preview deployment except the current production
deployment and any preview whose pull request is still open**, then keep that as the standing rule.

Implement it in two phases, and do not merge them into one:

1. **Enumerate and report.** List deployments, classify each as production / open-PR / deletable, and
   **print the deletable set without deleting it**. Run this first and put its output in the pull
   request body. Roughly 61 deployments exist; if the deletable count is wildly different, the
   classifier is wrong.
2. **Delete**, only after the list has been reviewed. Then wire the same classifier as a scheduled or
   post-merge job so the backlog does not reform.

Guard rails that belong in the code, not just in this plan:

- Never delete the deployment whose `environment` is `production`, or the latest one.
- Never delete a deployment whose pull request is open — resolve the PR state from the alias, not
  from a stored list.
- Deletion is permanent. There is no undo and no rollback command.

**Verify**: phase 1's report is reviewed by a human before phase 2 runs. After phase 2,
`curl -sS -o /dev/null -w '%{http_code}' https://pr-150.calvindotsg.pages.dev/resume.pdf` returns
404, and `https://calvin.sg/resume.pdf` still returns 200 at the current size.

### Step 6: record what the edge is configured to do

Write a document — under `dns/`, beside the zone material it belongs with — recording which zone
features are enabled, what each is for, and the two Redirect Rules with their contents. State
plainly that it is a **snapshot, not a drift check**, and why: reading zone settings needs a
`zone_settings:read` credential this repository does not have.

Do not put counts or values in it that a future reader would take as current without checking. Say
where each is read from.

**Verify**: `pnpm test` green — `docs-drift` reaches `.md` under `dns/`, so every backticked name
must resolve.

### Step 7: full ladder

```bash
pnpm check && pnpm eslint && pnpm test
```

## Test plan

New assertions in `tests/workflow-guards.test.ts`; no new test file. If you create one,
`tests/docs-drift.test.ts` requires at least 300 characters of `/** */` docblock **above its first
`describe(`**.

- The release-verification step exists in `deploy-production` (step 2).
- The canary declares empty `permissions:`, references no secret, and is scheduled (step 4).

The canary's own logic is verified by the `pages.dev` non-degeneracy control in step 3, not by a
unit test — the thing it asserts is a property of a live origin, and a test that mocked the fetch
would assert the mock.

Verification: `pnpm test` → all files pass. Do not write an absolute suite total anywhere.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check`, `pnpm eslint`, `pnpm test` all exit 0
- [ ] Step 0's three preconditions pass against live `https://calvin.sg/`
- [ ] The release-verification step fails against a fabricated asset hash and passes against the real one
- [ ] The canary passes against `calvin.sg` and **fails** against `calvindotsg.pages.dev`
- [ ] The canary workflow declares `permissions: {}` and references no secret
- [ ] Phase 1 of step 5 was run and its output reviewed before phase 2
- [ ] `https://pr-150.calvindotsg.pages.dev/resume.pdf` returns 404; `https://calvin.sg/resume.pdf` returns 200
- [ ] The zone-configuration document exists and states that it is a snapshot
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] This plan's row in `plans/README.md` is updated

## STOP conditions

Stop and report back — do not improvise — if:

- **Any of step 0's preconditions fails.** Do not write a canary that is red on arrival, and do not
  weaken an assertion to make it pass — that converts a finding into a permanently ignored alarm.
- The classifier in step 5 would delete the production deployment, or any deployment whose pull
  request is open. Report the classification and stop; a wrong delete here is unrecoverable.
- The deletable count in step 5 phase 1 differs substantially from the roughly 61 live deployments
  the audit measured. Either the classifier is wrong or the state has moved; both need a human.
- The release-verification step is flaky across three consecutive real deploys. A check that
  sometimes reddens a good deploy will be disabled, so report it and let the retry bound be
  reconsidered rather than shipping it.
- The canary passes against `calvindotsg.pages.dev`. Your assertions are not discriminating and the
  green run means nothing.
- You need a Cloudflare credential to complete a step other than 5. Step 5 uses the existing
  `Pages: Edit` token; anything else needing one is out of scope by design.

## Maintenance notes

- **The two checks answer different questions and must not be merged.** If a future change moves the
  zone assertions into the deploy job, it reintroduces both defects this split avoids: a build going
  red for something it did not cause, and a zone change going unnoticed between deploys.
- **The canary holds no credential and must stay that way.** The moment it needs one, it has stopped
  being a check on a public surface and its threat model changes.
- The retention job is the only thing in this repository that deletes something permanently. A
  reviewer should read its classifier line by line, and should expect the pull request body to carry
  phase 1's report.
- The zone snapshot in step 6 goes stale by construction. It says so about itself; the fix for a
  stale entry is to re-read the dashboard, not to delete the document.
- **Deferred deliberately**: an automated zone-settings drift check, and bringing the two Redirect
  Rules under version control. Both need credentials or APIs outside what CI holds today. The
  snapshot is the honest half; a poller pretending to be a drift check would be the dishonest one.
