# Implementation Plans

**Nothing is executable right now.** Two runs are complete: plans 001–008
(run 1) and 009–010 (run 2) are all DONE, merged, and live on
https://calvin.sg. Their files and the full evidence log are archived in
[`done/`](done/README.md).

Run 2's deep audit fanned nine read-only auditors over the repo; they returned
**8 findings, of which the adversarial skeptic pass and advisor review left 2
worth acting on** — five categories (security, performance, DX, docs,
direction) returned zero findings, which on this baseline is the correct
outcome, not a failed audit. Everything killed is recorded below so it is not
re-derived.

This file is the **living index**: the state a new `improve` run needs before it
audits anything. Read it first.

## If you are starting a new run

- **Numbering continues at `011`.** The improve skill requires monotonic
  numbering across runs — do not restart at 001. (*"If `plans/` already exists
  from a previous run, reconcile, don't duplicate: read `plans/README.md`, keep
  numbering monotonic, skip findings already planned or listed as rejected."*)
- **Do not re-audit the refuted findings or re-propose CI** — see below. Six
  findings were killed by an adversarial skeptic pass with evidence; re-deriving
  them wastes a full audit cycle that has already been paid for once.
- **The two "deliberately not planned" items are the maintainer's call**, not an
  agent's. They are not oversights.
- **Re-verify the baseline below before trusting it.** It was true at `f129245`.
  Every failure in the last run came from a plan believing something about the
  repo that had stopped being true — not from bad code.

### ⚠️ The standing run prompt goes stale between runs — the baseline below wins

The re-pasted run prompt has carried a stale premise both times: run 1's said
*"this repo has zero automated tests"* (there were tests by then), run 2's said
*"51 assertions"* and *"6 high advisories"* (now **53** and **1 moderate** after
plans 009–010). Treat every number in the prompt as unverified until checked
against the baseline table below; the suite must always be **extended**, never
recreated.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | Establish a regression safety net | P1 | M | — | **DONE** (`4144f81`) |
| 002 | Prerender the site and delete the SSR adapter | P1 | M | 001 | **DONE** (`a4a3e0e`) |
| 003 | Delete the client runtime: Svelte and motion out, CSS in | P1 | M | 002 | **DONE** (`621dd5a`) |
| 004 | Fix the rendered-output defects, and assert each one | P1 | M | 003 | **DONE** (`ef0da28`) |
| 005 | Delete dead configuration and template cruft | P2 | S | 004 | **DONE** (`255dbca`) |
| 006 | Replace astro-icon with UnoCSS presetIcons | P2 | S | 005 | **DONE** (`ad7c5bf`) |
| 007 | Correct the documentation and shipped metadata | P3 | S | 006 | **DONE** (`759ed8f`) |
| 008 | Serve the portrait at device resolution | P2 | XS | 002, 004 | **DONE** (`b14287d`) |
| 009 | Refresh the lockfile in-range, clearing 9 of 10 audit advisories | P2 | S | — | **DONE** (`c00dd73`) |
| 010 | Harden the layout head: no-JS default theme, dead og:image fallback, social-tag assertions | P2 | S | — | **DONE** (`1f06c27`) |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

Plan 008 did not come from the audit — it was raised from a production PageSpeed
report mid-run and executed out of numeric order.

## Baseline: what this repo is now (verified at `f129245`, updated after run 2 at `1f06c27`)

A fresh audit should start from these facts rather than re-deriving them, and
should re-check any it intends to rely on.

| | value |
|---|---|
| output mode | `static` — no adapter, no SSR function, no middleware |
| astro integrations | `sitemap()`, `UnoCSS({injectReset: true})` — that is all |
| direct dependencies | **18** |
| client JavaScript | **zero external files**; ~525 B inline (the pre-paint theme script) |
| `<svg>` in the HTML | **zero** — icons are UnoCSS `presetIcons` mask rules |
| components | 10 `.astro` files; **no UI framework**, no `.svelte`, no islands |
| `uno.config.ts` | 21 lines |
| tests | **53** assertions, 3 files, run by `pnpm test` (51 + 2 from plan 010) |
| lint | `pnpm eslint` → **0 problems**; `pnpm check` → 0 errors, 2 hints |
| `pnpm audit` | **1 moderate, 0 high, 0 critical** since plan 009's in-range refresh. The residual is `@opentelemetry/core <2.8.0` (dev/build-only), pinned exactly by `@netlify/otel@6.0.3` — unreachable without an override, by design left alone; it clears when @netlify/otel bumps and a future `pnpm update --no-save` picks it up |
| deploy gate | `netlify.toml` runs `pnpm check && pnpm test`; the UI command is deliberately empty |
| content source | everything user-facing is in `src/lib/constants.ts` |

The obvious simplifications were taken. A new run should expect *fewer and
smaller* wins than the first one found, and should say so plainly when a finding
is cosmetic.

## Findings considered and rejected

### Run 2 (2026-07-21, audited at `c8fe10f`)

Killed by the run-2 skeptic pass or advisor review — do not re-audit:

- **CORRECT-02 — Person.nationality derived from `address_locality`.** Correct
  today (Singapore is both locality and country); the divergence scenario is
  speculative on a single-maintainer, single-file content surface. Refuted.
- **TEST-01 — a test asserting `llms.txt` agrees with `CAREER[0]`.** The
  llms.txt hand-sync is an "Open item owned by the maintainer" with a chosen
  mitigation (manual checklist); shipping a prose-coupling test would override
  that decision. Refuted — exactly the "helpfully doing them" this file warns
  about.
- **DEBT-01 — delete the unused `METADATA.email_obfuscated`.** The field is
  author contact data (his voice/intent, plans 005 and 007 both left it), so
  deletion is the maintainer's call; its self-referential test is 3 harmless
  lines. Recorded, not planned.
- **eslint-plugin-astro 1.7.0 → 3.0.1.** Lints clean today; the upgrade forces
  new Node engine ranges and parser peers for zero articulable gain on a
  10-file .astro repo. Not worth doing now.
- **typescript 6.0.2 → 7.x (native compiler).** `@astrojs/check` /
  `@typescript-eslint` compatibility unestablished, and the repo has almost no
  hand-written TS. Investigate-only; no leverage.
- **lint-staged 16 → 17.** No changelog signal affecting the hook. Skipped.
- **Security headers (CSP etc.) via netlify.toml.** Static one-pager, no
  forms/auth/cookies/user input; a real CSP needs `unsafe-inline` plus a
  cloud.umami.is allow-list. Marginal value, deliberately not raised.
- **DX micro-items** — silencing the two `astro(4000)` is:inline hints (they
  communicate intent), `.editorconfig`, widening the eslint glob (settled:
  constants.ts is test-gated), pre-commit check/test duplication, a Umami
  `preconnect`. All rejected as taste-tier or duplicative.

Also corrected in run 2: the original DEP-01 claim "all 10 advisories clear
in-range" is false — `@netlify/otel@6.0.3` pins `@opentelemetry/core@2.7.1`
exactly, so plan 009 expects a 1-moderate residual and says so.

### Run 1 (2026-07-21, audited at `4550e1f`)

Six findings were refuted by the skeptic pass. Recorded here so they are not
re-audited next run:

- **SEC-03 — canonical/OG URLs derived from the request Host header.** Duplicate
  of CORRECT-03, which plan 002 fixes as a side effect of prerendering. Not a
  separate finding.
- **SEC-04 — add `rel="noopener noreferrer"` to `target="_blank"` links.** The
  four line citations are accurate, but every current browser applies
  `noopener` implicitly to `target="_blank"`. Hygiene at best, not a
  vulnerability.
- **DEP-05 / DX-05 — remove `@typescript-eslint/parser` as unused.** False, and
  the fix would break linting. `eslint-plugin-astro` resolves it at runtime via
  `createRequire` and switches its processor depending on whether it is present.
  Verified empirically by linting in a sandbox with the package removed.
  **Do not remove this package.**
- **DX-01 — add a GitHub Actions CI workflow.** The finding's impact claim is
  inverted: the commit it cites as proof that a type error "reached production"
  (`2595328`) actually shows `astro build` rejecting the file and the Netlify
  deploy failing, so production kept serving the previous build. More
  importantly, the maintainer was offered a CI workflow on 2026-07-21 and chose
  to skip it. That decision is respected here. Plan 002 instead makes the
  *existing* Netlify pipeline run `pnpm check && pnpm test`, which closes the gap
  without introducing a second CI system.
- **DX-04 — the eslint config and pre-commit hook cannot block anything.** False.
  `no-undef`, `no-debugger`, `astro/no-unused-define-vars-in-style` and
  `astro/valid-compile` are all set to `error`, and a probe through the real
  config exits non-zero. The `.ts` coverage gap the finding worries about is
  largely closed by `astro check`, which reads 22 files including the root
  configs.

## Deliberately not planned

Two direction findings survived vetting but are the maintainer's call, not an
agent's:

- **DIRECT-01 — automate `GOAL.current_progress` from Strava.** 38 of the commits
  touching `src/lib/constants.ts` are manual progress bumps, so the friction is
  real. But a build-time Strava fetch needs OAuth refresh-token handling and
  turns a static build into something that can fail on someone else's API, and
  the number only refreshes when the site rebuilds. Worth a decision, not worth a
  plan written without one.
- **DIRECT-04 — stale time-bounded copy.** `ABOUT_ME.description` has advertised a
  "latest cycling challenge 1000km in 5 weeks" unchanged for 13 months, and it is
  live in production right now. It is a ten-second edit, but it is the owner's
  own voice; an agent should not rewrite someone's self-description. Plan 007
  flags it and changes nothing.

## Open items owned by the maintainer

Neither is an agent's call. Both are recorded so a new run does not "helpfully"
do them.

- **`public/preview.jpg` is still the August 2024 screenshot.** It shows
  "Software Engineer", five social buttons and 1440.1 km — none of which match
  the current site. Plan 007 resized it (383,429 → 54,485 bytes) but did not
  regenerate it: framing a screenshot is a judgment call an executor cannot
  verify, and a bad one ships to every LinkedIn and Slack unfurl. The README
  hero, `og:image` and `twitter:image` all resolve from that one filename, so
  replacing the file is the whole fix.
- **`public/llms.txt` duplicates facts from `src/lib/constants.ts` by hand**,
  with nothing keeping them in sync. That is exactly how its job title went stale
  once, and how plan 007 nearly re-staled it in the opposite direction. Add it to
  the checklist whenever anything about the current role changes.

## Where the evidence lives

[`done/README.md`](done/README.md) carries the per-plan verification log for all
eight plans: what was mutation-tested, what each preview-vs-production diff
showed, and every plan defect found during execution. Read it when you need to
know *why* something was done a particular way, or before assuming a past
decision was arbitrary.
