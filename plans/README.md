# Implementation Plans

**Nothing is executable right now.** Four runs are complete: plans 001–014
are all DONE, merged, and live on https://calvin.sg, as is plan **015**, which
came from the maintainer resolving DIRECT-01 rather than from an audit run.
Every plan file and the full evidence log are archived in
[`done/`](done/README.md).

Run 3 (2026-07-22, audited at `4e15674`, completed the same day) had two
mandated items from the maintainer (emoji→icons migration,
unnecessary-UnoCSS-classes cleanup — plans 011–012) plus a deep audit: nine
read-only opus auditors, one opus skeptic per finding. The audit returned
**3 findings, all skeptic-CONFIRMED, but two were the same defect** (the
entrance-stagger off-by-one, reported by both the correctness and debt
auditors) — net **2 surviving findings** (plans 013–014). Six categories
(security, performance, deps, DX, docs, direction) returned zero findings,
which on this baseline is the correct outcome. After run 3 the suite is **64
assertions** and the shipped page contains zero emoji and zero dead class
tokens (both now test-locked).

Run 2's deep audit had returned 8 findings, of which the adversarial skeptic
pass and advisor review left 2 worth acting on. Everything killed in any run
is recorded below so it is not re-derived.

This file is the **living index**: the state a new `improve` run needs before it
audits anything. Read it first.

## If you are starting a new run

- **Numbering continues at `018`.** The improve skill requires monotonic
  numbering across runs — do not restart at 001. (*"If `plans/` already exists
  from a previous run, reconcile, don't duplicate: read `plans/README.md`, keep
  numbering monotonic, skip findings already planned or listed as rejected."*)
- **Do not re-audit the refuted findings or re-propose CI** — see below. Six
  findings were killed by an adversarial skeptic pass with evidence; re-deriving
  them wastes a full audit cycle that has already been paid for once.
- **The "deliberately not planned" item is the maintainer's call**, not an
  agent's. It is not an oversight. (DIRECT-01, formerly the second, was resolved
  by the maintainer on 2026-07-22 → plan 015.)
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
| 001 | Establish a regression safety net | P1 | M | — | **DONE** (`6b2cfde`) |
| 002 | Prerender the site and delete the SSR adapter | P1 | M | 001 | **DONE** (`32071fe`) |
| 003 | Delete the client runtime: Svelte and motion out, CSS in | P1 | M | 002 | **DONE** (`621dd5a`) |
| 004 | Fix the rendered-output defects, and assert each one | P1 | M | 003 | **DONE** (`ef0da28`) |
| 005 | Delete dead configuration and template cruft | P2 | S | 004 | **DONE** (`255dbca`) |
| 006 | Replace astro-icon with UnoCSS presetIcons | P2 | S | 005 | **DONE** (`ad7c5bf`) |
| 007 | Correct the documentation and shipped metadata | P3 | S | 006 | **DONE** (`759ed8f`) |
| 008 | Serve the portrait at device resolution | P2 | XS | 002, 004 | **DONE** (`b14287d`) |
| 009 | Refresh the lockfile in-range, clearing 9 of 10 audit advisories | P2 | S | — | **DONE** (`c00dd73`) |
| 010 | Harden the layout head: no-JS default theme, dead og:image fallback, social-tag assertions | P2 | S | — | **DONE** (`1f06c27`) |
| 011 | Migrate every emoji to a UnoCSS presetIcons icon | P1 | M | — | **DONE** (`7950203`) |
| 012 | Remove the no-op UnoCSS classes and lock the class↔rule pairing | P2 | S | 011 | **DONE** (`6f0e24c`) |
| 013 | Fix the entrance-stagger off-by-one and lock the ladder to the card count | P2 | S | 012 | **DONE** (`8036d3c`) |
| 014 | Assert the Now card and Career dates/company survive the render | P3 | S | 011 | **DONE** (`b7439e7`) |
| 015 | Automate goal progress from Strava | P2 | M | — | **DONE** (`a4b419b`) |
| 016 | Stop shipping rationale comments in the built HTML | P2 | S | — | **DONE** (`c3734b1`) |
| 017 | Clear the clearable brace-expansion HIGH with an in-range lockfile refresh | P2 | S | — | **DONE** (`6647c31`) |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

Plan 008 did not come from the audit — it was raised from a production PageSpeed
report mid-run and executed out of numeric order.

**The host and CI moved outside this numbering, and the table is silent about it
on purpose.** On 2026-07-30 the site left Netlify for Cloudflare Pages, with
`.github/workflows/ci.yml` becoming its only builder; the Netlify project and
`netlify.toml` are deleted. That work was planned and executed under a separate
lifecycle (`~/.claude/plans/019-cloudflare-migration.md`), so it has no plan file
in `plans/done/` and adding a row here would point at nothing. It is recorded
here because two entries below — the DX-01 rejection and the deploy-gate baseline
— would otherwise read as current policy and send a run to re-derive a decision
that has already been reversed.

**That work package closed on 2026-07-31 with DNS-as-code (`dns/`), the last item
in it.** One correction is worth carrying forward, because the plan asserted the
opposite and a future run would inherit it: WP6 proposed excluding the apex and
`www` CNAMEs as "Pages-managed". They are not. Cloudflare marks what it owns —
the Email Routing records carry `meta.email_routing`, the DKIM key also carries
`read_only` — and both CNAMEs carry `meta: {}`, i.e. they are ordinary
hand-managed records. They are in git. What the plan did *not* anticipate is the
`pagerules: true` default, which would have planned the deletion of the very
redirect rules WP5 had created the day before; `dns/config.yaml` turns it off and
`dns/test_filters.py` executes both settings to show the difference.

## Baseline: what this repo is now (verified at `f129245`, updated after run 2 at `1f06c27`, re-verified for run 3 at `4e15674`, re-measured for run 4 at `45e286f`)

Run-3 corrections to the table below (audit at `4e15674`, final state after
plan 014's merge `b7439e7`): **tests are now 64 assertions** (still 3 files:
58 at audit time after PRs #41/#42, +6 across plans 011–014), `GOALS` has two
entries (cycling + running), and `<main>` renders 8 direct children.
Everything else in the table still holds — spot-checked: `pnpm check` 0
errors/2 hints, `pnpm eslint` clean, build green, 18 direct dependencies,
zero external JS files, zero `<svg>`, and now zero emoji (test-locked).
Post-run-3 correction (plan 015, merged `a4b419b`): the suite is now **67
assertions**, and the two `GOALS[].current_progress` values are bot-owned — a
daily workflow writes `src/data/strava-progress.json`, so they are no longer
hand-edited in `constants.ts` (`total_goal` and `progress_last_year` still are).
Later maintainer-direct fixes (PRs #57–#60 and the control-geometry fix) have
landed without updating the numbers above, so treat **every assertion count AND
every page-weight figure in this file as unverified** — including the run-3
stylesheet figures in the paragraph below, which no longer match a build of the
revision they claim to describe. Read counts from `pnpm test`: **109** as of the
control-geometry, page-fit and Strava-naming fixes, across **6** files
(`tests/control-geometry.test.ts` and `tests/page-fit.test.ts` are new;
`tests/helpers/css.ts` is a shared non-test module and is not counted). It was
already 91 before those fixes, i.e. the "67" above went stale independently of
them. Neither consumed a plan number — both came straight from the maintainer and
were implemented and verified in one session, so numbering still continues at
`016`. What they changed: the nine styled controls are one declared 64x48 box and
the second `control` variant is gone; `<body>`'s viewport height became a
*minimum* rather than an exact height, which had been compressing the two-column
grid between 768px and 1023px until four of the eight cards clipped content that
no scrollbar could reach (98.45px off the intro card at 768x900, measured against
each card's padding box; pre-existing since before the control work). The same
lock broke the large breakpoint too, which the first pass missed: `main` carries a
736px floor, so on a shorter viewport the exact-height body could not contain it
and the centring pushed the overflow above the scroll origin — 44px of the first
card unreachable at 1024x600, 94px at 1024x500, at every width up to 1920. Both
ranges are clean now. Also in this change: the Strava URL, which had been written
out three times in
`constants.ts` with three different accessible names attached, is now one
`STRAVA` constant, so the three controls pointing at it announce one name; and
`public/preview.jpg` was regenerated from the current build (it had still been
showing the pre-icon-migration emoji greeting). The 64x48 control box was
deliberately left as it is rather than squared off to 48x48 — both clear WCAG
2.5.5 AAA, so that choice is aesthetic and the reasoning is recorded in
`uno.config.ts`. Page weight **over the wire**, deploy
preview 61 against production, both served `content-encoding: br` (confirmed, not
assumed), five samples each and all five identical on both origins: stylesheet
6,842 → 6,738 B (**−104**), markup 3,244 → 3,360 B (**+116**), net **+12 B**.
Read that net as *neutral rather than a cost*, because production's compressed
markup measured **3,277 B** earlier the same day and 3,244 B later for
byte-identical content on an unchanged `main` — a 33 B cross-session swing in the
stored artifact, wider than the delta being reported. The stylesheet's −104 B is
outside that band and is attributable: the sheet lost five selectors and gained
one. Local `gzip -9` of the same builds disagrees in both magnitude and, on the
markup component, direction — brotli compresses the added class tokens far worse
than gzip — which is why only the transfer number is quoted here, and why a
single sample of it is not enough.

Page weight after run 3: `dist/index.html` 15,735 B raw / **3,533 B gzip**;
the single stylesheet 24,138 B raw / **7,055 B gzip** (up ~1.1 KB gzip from
run 2 — the 8 migrated icons each embed an SVG mask data-URI; the emoji they
replaced were "free" glyphs from system fonts; accepted as the cost of the
mandated migration).

**One Strava link, brand-ink heart, toggle state (2026-07-26, maintainer-direct,
no plan number — numbering still continues at `016`).** Four changes, suite
**109 → 122** across the same 6 files:

1. **The two goal cards' calls to action are gone**, leaving the intro card's
   social link as the site's only Strava control. Both pointed at the same profile
   that link already reaches, and a logged-out visitor meets a login wall at it
   either way — verified: 25 sport-scoped path shapes all 404 or redirect to
   `/login`, and `?activity_type=Run` and `=Ride` serve the same page. `GOALS[]`
   lost `website_url`, `cta_label` and `cta_logo` with them. This partly supersedes
   the Strava-naming work described above: that made three controls announce one
   name, and there is now one control to name. The paragraph above is left as
   written because it records what that change did at the time.
2. **The footer heart takes a new `--brand-ink` token** instead of inheriting the
   body text colour — `#A82334` on light at 6.519:1, `#F3A3AA` on dark at 9.075:1,
   both measured against the card background the glyph actually sits on. The token
   sits on a wrapper around the glyph, not on the glyph: an icon's own rule sets
   `color: inherit` at the same specificity as a colour utility, so on the same
   element the winner is decided by emission order alone. `ProgressBar.astro`
   already colours its icon from an ancestor for the same reason.
3. **The theme toggle reports its state** via `aria-pressed`, kept in step by the
   script that already existed, with one state-independent name in `constants.ts`.
   The inert `aria-live` and the duplicate `aria-label` are gone. A per-theme
   changing name was built first and rejected on measurement, not taste: WAI-ARIA
   sanctions either but forbids both together, and Sarah Higley's screen-reader
   survey found a name change announced in roughly half of reader/browser
   combinations against `aria-pressed` in all of them. **Residual, deliberate:**
   nothing announces at the moment of the press beyond what `aria-pressed` gives —
   a real live region would need JS and an extra element, out of proportion here.
4. **The athlete-id coupling note now lives in one place**, `README.md`'s
   Configuration section, with a pointer beside the constant rather than a second
   copy of the explanation.

Two assertions changed shape rather than being deleted. The name↔destination
bijection tests had non-vacuity guards satisfied *by* the three Strava anchors, so
removing two of them made both guards unsatisfiable. Deleting the tests would have
dropped the invariant; keeping the guards would have gone red for a reason
unrelated to the rule. They now assert against the rendered page and take their
evidence-of-working from a two-anchor fixture instead — a positive control rather
than a coverage claim. A separate assertion pins the decision itself: the page
links to Strava exactly once.

A fresh audit should start from these facts rather than re-deriving them, and
should re-check any it intends to rely on.

**Run-4 re-baseline (2026-07-29, measured at `45e286f`).** Every count in the
history above had gone stale again by run 4 — the `/patches` patch wall, the
projection model, and the SC 1.4.12 work all landed maintainer-direct after
run 3 with no plan numbers. Measured fresh (`pnpm test`; `wc`; local
`gzip -9`; production `curl` with `content-encoding: br` confirmed, three
identical samples per URL):

- Suite: **277 assertions, 10 test files** plus `tests/helpers/{css,pages}.ts`
  and `tests/setup/build.ts`; `pnpm test` builds `dist/` first and runs in ~3 s.
- Pages: **4 prerendered** — `/`, `/patches`, `/patches/cycling`,
  `/patches/running` (one rest-parameter route builds the three patch pages).
- Source: 14 `.astro` files; `src/lib/{constants,projection,icons}.ts` at
  839/587/9 lines; `uno.config.ts` **506 lines**, most of it measured rationale.
- Page weight, local gzip -9 / production brotli: `/` 6,575 / 6,167 B;
  `/patches` 4,011 / 3,717 B; `/patches/cycling` 3,912 / 3,642 B;
  `/patches/running` 3,620 / 3,359 B; shared stylesheet `projection.*.css`
  7,198 / 6,798 B; patches-only stylesheet 1,488 / 1,392 B. A cold `/patches`
  visit is ~11.9 KB brotli total, zero external first-party JS.
- Gates at `45e286f`: `pnpm check` 0 errors / 2 hints; `pnpm eslint` clean;
  `pnpm audit` **1 moderate + 2 high** (movement since run 3 — see the table
  row below and plan 017).

The table below is updated in place to these values; the run-2/3 prose above
is left as written because it records what was true when it was measured.

| | value |
|---|---|
| output mode | `static` — no adapter, no SSR function, no middleware |
| astro integrations | `sitemap()`, `UnoCSS({injectReset: true})` — that is all |
| direct dependencies | **18** |
| client JavaScript | **zero external files**; ~525 B inline (the pre-paint theme script) |
| `<svg>` in the HTML | **zero** — icons are UnoCSS `presetIcons` mask rules |
| components | 14 `.astro` files (11 components, 1 layout, 2 page routes → 4 pages); **no UI framework**, no `.svelte`, no islands |
| `uno.config.ts` | 506 lines — safelist, blocklist, five `rem` breakpoints, the two shortcuts; mostly measured rationale |
| tests | **277** assertions, 10 files (+ `tests/helpers/`, `tests/setup/`), run by `pnpm test`. **Now 362 in 12 files** — measured 2026-07-30 on the commit that deleted `netlify.toml` (`git log --diff-filter=D -- netlify.toml`), read off `pnpm test` rather than counted. The two new files are `clock-split` (the `BUILD_DATE`/`UPDATED_AT` split) and `workflow-guards` (the deploy gate, executed rather than read). **Now 393 in 13 files** — measured 2026-07-31 off `pnpm test`; the new file is `dns-config` (the DNS workflow's guards, also executed). A further 9 checks live in `dns/test_filters.py`, which needs Python and runs in `.github/workflows/dns.yml` rather than here |
| lint | `pnpm eslint` → **0 problems**; `pnpm check` → 0 errors, 2 hints |
| `pnpm audit` | **1 moderate, 0 high, 0 critical** since plan 009's in-range refresh. The residual is `@opentelemetry/core <2.8.0` (dev/build-only), pinned exactly by `@netlify/otel@6.0.3` — unreachable without an override, by design left alone; it clears when @netlify/otel bumps and a future `pnpm update --no-save` picks it up. **Run 4: now 1 moderate + 2 high** — both highs are brace-expansion GHSA-mh99-v99m-4gvg on dev-only lint paths; plan 017 clears one in-range and documents the other as a second deliberate residual (no patched 1.x exists; the override is measured-broken). **`@netlify/otel` survived the cutover and always would have**: it arrives as `astro` → `unstorage` → `@netlify/blobs`, so it is an Astro dependency and has nothing to do with where the site is hosted — leaving Netlify does not clear it |
| deploy gate | **Changed after run 4.** `.github/workflows/ci.yml` — a `build` job runs `pnpm check`, `pnpm eslint` and `pnpm test`, uploads `dist/`, and two `wrangler pages deploy` jobs sit behind `needs: build` and publish that same artifact without rebuilding. It replaced `netlify.toml` running `pnpm check && pnpm test`; that file and the Netlify project are both deleted. `tests/workflow-guards.test.ts` is what holds the `needs:` edge |
| host | **Cloudflare Pages** (project `calvindotsg`), zone on Cloudflare DNS. Was Netlify until 2026-07-30 |
| DNS | **In git since 2026-07-31** — `dns/zones/calvin.sg.yaml` (octoDNS), planned and applied by `.github/workflows/dns.yml`. Ten of the zone's fifteen records; the three Email Routing `MX`, the `read_only` DKIM key and `_dmarc` are each excluded for a different reason, stated in `dns/config.yaml` beside the exclusion. **Live since 2026-07-31**: the first plan against the real zone reported *"No changes were planned"* (11 records returned, 3 rejected, 8 matched). Two zone-scoped tokens, read-only for planning and edit-only for applying — see `dns/README.md`; nothing in this repository can mint them |
| content source | everything user-facing is in `src/lib/constants.ts` |

The obvious simplifications were taken. A new run should expect *fewer and
smaller* wins than the first one found, and should say so plainly when a finding
is cosmetic.

## Findings considered and rejected

### Run 4 (2026-07-29, audited at `45e286f`)

Nine read-only opus auditors (playbook categories, with the maintainer's
three directed leads folded into their natural categories), one opus skeptic
per finding. **Seven categories returned zero findings; two findings total
survived** — PERF-01 (skeptic-CONFIRMED → plan 016) and DEP-01
(skeptic-DOWNGRADED with corrections → plan 017). On this baseline that
shape is the correct outcome, and it matches runs 2–3's trajectory of fewer,
smaller wins.

**The three directed leads, resolved with evidence:**

- **Lead 1 (simplification pass over the post-run-3 surface): zero findings.**
  The debt and tests auditors read the whole new surface and every plausible
  simplification was refuted by a measured comment already in the file (the
  `w-max` removal, the `::before`→background-image perforation rewrite, the
  `text-link` shortcut vs three inline copies, the duplicated
  `grid-template-areas` on `.bib--linked` — a documented height decision).
  Near-misses recorded so they are not re-derived: the WCAG contrast math
  appears in three test files (~20 lines total) but with three different
  input types — extraction is signature negotiation, not simplification;
  `build-output.test.ts` shadows the imported `decl` helper with a local one
  (lexically correct, reader-confusing, taste-tier); `formatPatchDate` is
  called only from tests but is the named anti-drift witness for
  `patchDateSegments`, not dead code.
- **Lead 2 (UnoCSS/CSS cleanup): zero findings.** Every `.bib*`,
  `.patch-*`, `.events-link*`, `.goal-*` and `.measure`/`.progress-fill`
  class was traced authored→worn→emitted in `dist/_astro/*.css`; nothing
  orphaned, nothing cancelled, no repeated group worth a third shortcut
  (Now.astro's corner anchor shares 4 tokens with `text-link`'s expansion
  but is neither of the site's two declared control kinds — a third
  vocabulary would be abstraction for its own sake).
- **Lead 3 (`/patches` loading time): no problem exists**, measured two
  ways. Production transfer (brotli confirmed, 3 identical samples/URL):
  `/patches` 3,717 B + 6,798 B + 1,392 B CSS ≈ 11.9 KB cold, zero external
  first-party JS. Lighthouse (local runs over headless Chrome, mobile
  emulation, 3 runs × 3 URLs): performance 0.95–1.00, median 0.99, TBT 0
  everywhere. The two mechanisms the lead named were both **refuted**:
  per-bib CSS is O(1) — Astro scoped styles emit one ruleset per component,
  so a new race costs ~700 B raw HTML and zero CSS; and the two-stylesheet
  split is clean — the 1.4 KB patches-only sheet is quarantined to the three
  patch pages, and `/` does not load it. (The shared sheet does carry 12
  icon data-URIs `/patches` never uses; per-route CSS splitting on UnoCSS's
  single-sheet architecture would be a large change for ~2 KB brotli — bad
  trade, deliberately not raised.) The one real item on this surface is
  PERF-01 → plan 016: ten `<!-- -->` rationale comments survive the build
  and are ~45–50% of the compressed markup on the patch pages.

**Also recorded by the auditors as deliberately-not-findings** (do not
re-derive): `actions/checkout@v5` pinned by major tag is standard for
first-party actions; the Strava workflow's commit-message interpolation is
digit-only by construction (validated via `kmFromMeters`); ignoring Strava's
rotated `refresh_token` is plan 015's documented fail-loud posture;
`Goal.progress_last_year` configured-but-unrendered is documented in
Goal.astro as "one edit from returning"; the wall's lack of a lifetime
patch-count summary is the settled census-vs-count decision in
`projection.ts`; in-range patch bumps (astro 7.1.5, eslint 10.8) are
hygiene, picked up as a side effect of plan 017.

**Run-4 closing state (both plans merged 2026-07-29, main `6647c31`):**
suite **278**; production `/patches/` markup **2,005 B** brotli (was 3,717),
`/patches/running/` **1,656 B** (was 3,359); `pnpm audit` **1 moderate +
1 high, both documented residuals** (@opentelemetry/core via @netlify/otel;
brace-expansion via jsx-a11y's minimatch@3 — no patched 1.x exists and the
override is measured-broken, see plan 017 in `done/`). Per-plan verification
evidence is in [`done/README.md`](done/README.md) § Run 4.

**DEP-01's skeptic corrections, preserved** (DOWNGRADED, not flattened):
the vulnerable resolutions are real (`brace-expansion@5.0.7` via
`minimatch@10.2.5`, pulled by typescript-estree, eslint itself, and
`@eslint/config-array`), but impact is dev-only posture erosion, not
exposure — the deploy gate never runs eslint. The chair's own dry-run
established the rest: `pnpm update --no-save` clears exactly one of the two
HIGHs; the `eslint-plugin-jsx-a11y → minimatch@3.1.5 → brace-expansion@1.1.16`
path has **no patched 1.x** (the advisory's only patched release is 5.0.8),
`eslint-plugin-jsx-a11y@6.10.2` is its latest release, and an override was
built and measured to **break at runtime** (`brace-expansion@5`'s CJS entry
is a namespace object; `minimatch@3` calls it → `TypeError: expand is not a
function`). Plan 017 therefore leaves it as a second documented residual
beside the `@opentelemetry/core` moderate.

### PR #61 review (2026-07-26, uniform controls / md height lock / one Strava name)

Out of scope for that PR, which covered the controls' box, the page's height and
the Strava naming. Recorded so they are not rediscovered as new:

**Both theme-toggle entries below are RESOLVED as of 2026-07-26** — see the
"one Strava link, brand-ink heart, toggle state" change recorded above. Kept here
because the reasoning for deferring them is what shaped the fix.

- **The theme toggle announces no state.** It carries `aria-live="polite"`, but
  everything inside it that changes on activation is `aria-hidden` (the sun and
  moon spans, swapped by CSS `display`), and its only text node never changes —
  so the live region has nothing to announce, and there is no `aria-pressed` or
  state-bearing name either. A screen-reader user activates it, the page repaints,
  and nothing is said; re-reading the button still gives "Toggle Theme, button".
  Verified against Chrome's own AX tree. Pre-existing and untouched by #61, which
  changed only the button's class. The fix is a real decision, not a typo — drop
  the inert `aria-live`, or make the state real with a per-theme accessible name —
  and it changes announced copy, so it is the maintainer's call.
- **`aria-label="Toggle Theme"` and an `sr-only` span with the same text both sit
  on that button.** AccName takes the `aria-label`, so the span is inert. Harmless
  today because the two strings agree; it is a trap if either is ever edited alone.

### Run 3 (2026-07-22, audited at `4e15674`)

The mandated UnoCSS-classes lead **reproduced with evidence** — nine dead or
no-op class tokens, all relics of the upstream tilt effect deleted in plan
003 (see plan 012 for the per-class evidence table). The audit's near-misses,
recorded by the auditors themselves as not-findings — do not re-derive:

- **Goal.astro's CTA name hardcodes "Strava" while `cta_logo` is a variable.**
  No bug today (both goals point at Strava); a future non-Strava goal would
  mislabel its CTA. Maintainer-owned content surface; not planned. **Resolved
  since, twice over.** First as a side effect of the Strava-naming fix, which moved
  the name into `GOALS[].cta_label` so it followed the destination; then
  permanently on 2026-07-26, when the goal cards' CTAs were removed altogether and
  that field went with them. There is no CTA left to mislabel. (The finding named
  `aria-label`; the element was always an `sr-only` span.)
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
- **Security headers (CSP etc.) via the host's headers file.** Static one-pager, no
  forms/auth/cookies/user input; a real CSP needs `unsafe-inline` plus a
  cloud.umami.is allow-list. Marginal value, deliberately not raised. (Raised against
  `netlify.toml`; the file that would carry it now is `public/_headers`, and the
  reasoning is unchanged by the move.)
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
- **DX-01 — add a GitHub Actions CI workflow. REVERSED 2026-07-30 — this is now
  how the site ships; do not read the rejection below as standing policy.** The
  maintainer decided to leave Netlify, and with the host went the platform
  guarantee the rejection rested on, so `.github/workflows/ci.yml` became the only
  builder rather than a second one. What survives of the original reasoning is the
  part that was never about Netlify: there must be exactly ONE pipeline, and the
  thing that gates must be the thing that builds — which is why the deploy jobs
  publish the `build` job's artifact instead of rebuilding.
  The rest is recorded as it stood. The finding's impact claim was inverted: the
  commit it cited as proof that a type error "reached production" (`2595328`)
  actually shows `astro build` rejecting the file and the deploy failing, so
  production kept serving the previous build. And the maintainer was offered a CI
  workflow on 2026-07-21 and chose to skip it; plan 002 instead made the *existing*
  pipeline run `pnpm check && pnpm test`, which closed the gap at the time.
- **DX-04 — the eslint config and pre-commit hook cannot block anything.** False.
  `no-undef`, `no-debugger`, `astro/no-unused-define-vars-in-style` and
  `astro/valid-compile` are all set to `error`, and a probe through the real
  config exits non-zero. The `.ts` coverage gap the finding worries about is
  largely closed by `astro check`, which reads 22 files including the root
  configs.

## Deliberately not planned

Two direction findings survived vetting as the maintainer's call, not an
agent's. **DIRECT-01 has since been decided** (2026-07-22 → plan 015); it is
kept below with its resolution so the reasoning is not re-derived. DIRECT-04
remains open:

- **DIRECT-01 — resolved 2026-07-22, see plan 015.** The maintainer supplied the
  decision this finding was waiting on: a daily GitHub Actions cron writes
  Strava's YTD totals to a bot-owned `src/data/strava-progress.json` that
  `constants.ts` imports, with a static refresh token in repo secrets and a
  fail-loud posture (a Strava-side invalidation turns the run red and freezes the
  number rather than self-healing). The objections above were addressed rather
  than overruled: the fetch happens in CI, not at build time, so the static build
  can still never fail on someone else's API — a bad or missing response simply
  produces no commit.
- **DIRECT-04 — stale time-bounded copy.** `ABOUT_ME.description` has advertised a
  "latest cycling challenge 1000km in 5 weeks" unchanged for 13 months, and it is
  live in production right now. It is a ten-second edit, but it is the owner's
  own voice; an agent should not rewrite someone's self-description. Plan 007
  flags it and changes nothing.

## Open items owned by the maintainer

None of these is an agent's call. They are recorded so a new run does not
"helpfully" do them; the first two have since been resolved and are kept with
their resolutions rather than deleted.

- ~~**`www.calvin.sg` serves the site instead of redirecting.**~~ **Resolved 2026-07-30.**
  `https://www.calvin.sg/` now answers `301` to the apex, preserving path and query, in
  one hop. `.scratchpad/verify-canonical.sh` is **15/15**, from 9/5 before. HSTS is on at
  180 days (deliberately no `includeSubDomains`, no preload — it is close to irreversible,
  so this is the ramp), both legacy Page Rules are deleted, and the slickshots forward
  moved to a Single Redirect.

  **The cause was never a missing rule**, and that matters for the next hostname. `www`
  was an *attached custom domain on the Pages project*, with its own certificate — so
  Pages routed it by Host exactly as it routed the apex, and the two were equal origin
  bindings. A redirect rule *masks* that; detaching removes it. When a hostname serves
  something you did not intend, read the custom-domain list before the rules list.

  **Order was load-bearing**: redirect rule first, detach second. Single Redirects execute
  first in the rules pipeline and take precedence over Page Rules, so the rule answers
  before origin selection and the hostname never stops responding.

  **Two instrument failures worth keeping**, both caught only because the config was
  re-read after the run rather than trusting it. (1) The apply script reported `www`
  "already detached" when its API read had been *refused* — a failed GET and an absent
  domain were indistinguishable to it, and it gave the reassuring one. It now probes every
  surface it will later write to, and exits rather than interpreting a failed read.
  (2) The gate passed **14/14 while `www` was still bound**: the redirect fires before
  origin selection, so from outside every observable was correct and the structure was
  not. A behavioural probe cannot see a redundancy that something upstream is masking —
  check 11 reads the binding itself and is the one that would have caught it.

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
- ~~**`public/llms.txt` duplicates facts from `src/lib/constants.ts` by hand**,
  with nothing keeping them in sync.~~ **Resolved 2026-07-30 (PR #108).** Both
  `llms.txt` and `robots.txt` are now generated endpoints — `src/pages/llms.txt.ts`
  and `src/pages/robots.txt.ts` — deriving every fact from `constants.ts`, and
  `tests/build-output.test.ts` asserts the association row by row rather than
  token by token. `public/` holds no text file at all now. The checklist item this
  used to add is gone: nothing about the current role can go stale there any more,
  which is what made it stale once and what plan 007 nearly re-staled in the
  opposite direction.

## Where the evidence lives

[`done/README.md`](done/README.md) carries the per-plan verification log for all
eight plans: what was mutation-tested, what each preview-vs-production diff
showed, and every plan defect found during execution. Read it when you need to
know *why* something was done a particular way, or before assuming a past
decision was arbitrary.
