# Implementation Plans

**Run 3 is in progress: plans 011–014 are TODO.** Runs 1–2 (plans 001–010)
are DONE, merged, and live on https://calvin.sg; their files and the full
evidence log are archived in [`done/`](done/README.md).

Run 3 (2026-07-22, audited at `4e15674`) has two mandated items from the
maintainer (emoji→icons migration, unnecessary-UnoCSS-classes cleanup — plans
011–012) plus a deep audit: nine read-only opus auditors, one opus skeptic
per finding. The audit returned **3 findings, all skeptic-CONFIRMED, but two
were the same defect** (the entrance-stagger off-by-one, reported by both the
correctness and debt auditors) — net **2 surviving findings** (plans
013–014). Six categories (security, performance, deps, DX, docs, direction)
returned zero findings, which on this baseline is the correct outcome.

Run 2's deep audit had returned 8 findings, of which the adversarial skeptic
pass and advisor review left 2 worth acting on. Everything killed in any run
is recorded below so it is not re-derived.

This file is the **living index**: the state a new `improve` run needs before it
audits anything. Read it first.

## If you are starting a new run

- **Numbering continues at `015`.** The improve skill requires monotonic
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
| 011 | Migrate every emoji to a UnoCSS presetIcons icon | P1 | M | — | TODO |
| 012 | Remove the no-op UnoCSS classes and lock the class↔rule pairing | P2 | S | 011 | TODO |
| 013 | Fix the entrance-stagger off-by-one and lock the ladder to the card count | P2 | S | 012 | TODO |
| 014 | Assert the Now card and Career dates/company survive the render | P3 | S | 011 | TODO |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

Plan 008 did not come from the audit — it was raised from a production PageSpeed
report mid-run and executed out of numeric order.

## Baseline: what this repo is now (verified at `f129245`, updated after run 2 at `1f06c27`, re-verified for run 3 at `4e15674`)

Run-3 corrections to the table below, verified 2026-07-22 at `4e15674` (PRs
#41–#42 and two content commits landed between runs): **tests are now 58
assertions** (still 3 files; PRs #41/#42 added 5), `GOALS` has two entries
(cycling + running), and `<main>` renders 8 direct children. Everything else
in the table still holds — spot-checked: `pnpm check` 0 errors/2 hints,
`pnpm eslint` clean, build green, 18 direct dependencies, zero external JS
files, zero `<svg>`.

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

### Run 3 (2026-07-22, audited at `4e15674`)

The mandated UnoCSS-classes lead **reproduced with evidence** — nine dead or
no-op class tokens, all relics of the upstream tilt effect deleted in plan
003 (see plan 012 for the per-class evidence table). The audit's near-misses,
recorded by the auditors themselves as not-findings — do not re-derive:

- **Goal.astro's CTA `aria-label` hardcodes "Strava" while `cta_logo` is a
  variable.** No bug today (both goals point at Strava); a future non-Strava
  goal would mislabel its CTA. Maintainer-owned content surface; not planned.
- **README.md:68 says "cycling goal" (singular)** vs the two-goal reality
  after PR #41. One-word incompleteness; the same sentence points at
  `constants.ts` where the running goal is visible, and CLAUDE.md is correct.
  Taste-tier; not planned.
- **`public/llms.txt` lists projects the site never shows** (surface
  asymmetry). Proposing a projects section is the maintainer's call, and the
  lg grid is packed exactly 32/32 (see the comment in `src/pages/index.astro`)
  — adding a card has a real layout cost. Not planned.
- **No browser-driven test for the theme toggle / localStorage round-trip.**
  Adopting Playwright infrastructure for two lines of client JS on a static
  one-pager is disproportionate; the SSR-only test posture is deliberate.
- **CORRECT-01 and DEBT-01 were the same finding** (entrance-stagger
  off-by-one) reported through two category lenses; merged into plan 013.

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

- ~~`public/preview.jpg` is still the August 2024 screenshot.~~ **Resolved
  2026-07-21**: the maintainer supplied a current dark-theme screenshot. It
  ships as a **hero-card crop filling the full 1200×630 canvas** (42,946
  bytes) rather than a whole-page pillarbox — the maintainer asked for the
  optimum social composition, and cropping to the welcome card (name, role
  lines, buttons, portrait) renders the text ~2× larger in unfurls. Recipe
  (maintainer supplies a hero-card screenshot on the `#111111` page
  background): detect the card's pixel bounds by scanning for non-`#111111`
  rows/columns, `extract` the card plus a uniform 24px margin, then
  `resize(1200×630, fit contain, background #111111)` → mozjpeg q80 — contain
  centers the card with equal letterbox bands (vertical asymmetry in the
  first crop was called out and fixed). The README hero, `og:image` and
  `twitter:image` all resolve from this one filename — a future refresh is a
  new screenshot through this same recipe.
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
