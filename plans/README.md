# Implementation Plans

**Plans 021–023 are executable; 021 is next.** Four runs are complete: plans 001–014 are all DONE,
merged, and live on https://calvin.sg, as is plan **015**, which came from the
maintainer resolving DIRECT-01 rather than from an audit run. Those plan files
and the full evidence log are archived in [`done/`](done/README.md).

They are the first live plans since 2026-07-29, and they exist because **018** made a
live plan possible again: three name gates in `tests/docs-drift.test.ts` check what a
document names against the tree that exists, and a plan names the tree it intends to
create. 018 closed that in the same change that landed 019–023, which decouple the race
data and the site copy from the code that renders them. It is `done/` already — the
directory's own lifecycle, applied to the plan that reopened it.

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

## What governs this directory

`plans/` implements the **improve** skill pipeline from `github.com/shadcn/improve`.
Read it rather than this file for the pipeline itself — the plan template, the file
naming, the numbering rule, the advisor/executor split and the audit workflow all
live there and are deliberately **not** restated here. A copied convention goes stale
in silence, which is the failure `.devin/wiki.json` exists to record.

    pnpm dlx opensrc path shadcn/improve

then read `skills/improve/SKILL.md` and `skills/improve/references/plan-template.md`.
The closest in-tree exemplar of the template is [`done/015-automate-goal-progress-from-strava.md`](done/015-automate-goal-progress-from-strava.md).

What follows is only what is **local**, and therefore cannot be derived from upstream:

- **Completed plans move to [`done/`](done/README.md)** and are archived permanently.
  Upstream leaves them in place carrying a DONE status; this repo does not. This file
  stays the living index either way, and the archive is exempt from the prose gates.
- **This repository overrides the user-level plan lifecycle.** The global instruction
  is that plans are drafted in a home directory; here they are written into `plans/`.
- **A numbered plan is a proposal, and the suite treats that as its own document class.**
  It is exempt from the three gates that check a name against the tree that exists —
  paths, `pnpm` scripts and configured values — because a plan names the tree it intends
  to create. This file is not a proposal and is fully gated; so is everything else. The
  reason lives beside the predicate in `tests/docs-drift.test.ts`, not here.
- **A plan never waits outside `plans/`.** If a plan cannot land green because the change
  it depends on has not shipped, ship that change first — do not stage the plan somewhere
  gitignored, where it would not travel with a branch, appear in a PR, or survive a fresh
  clone. That was tried while closing this very gap and it is what the exemption above
  replaced.

## If you are starting a new run

- **The next number is one below the last row of the execution table.** Do not
  restart at 001 and do not reuse a number; the table is the only thing that knows,
  which is why no figure is written here.
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
| 018 | Let a plan live in this directory again, and record what governs it | P1 | S | — | **DONE** (`232f751`) |
| 019 | Generate the projection's derived figures instead of writing them by hand | P1 | M | 018 | **DONE** (`14d652e`) |
| 020 | Make each race its own module, so adding one is adding a file | P1 | L | 019 | **DONE** (`46119ae`) |
| 021 | Split the copy out of `constants.ts` and delete the file | P2 | L | 020 | **TODO** |
| 022 | Separate the data contract from behaviour, and promote the Strava tooling | P2 | L | 020 | **TODO** |
| 023 | Sweep the prose references no gate catches | P2 | M | 019, 020, 021, 022 | **TODO** |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

Plan 008 did not come from the audit — it was raised from a production PageSpeed
report mid-run and executed out of numeric order.

**The host and CI moved outside this numbering, and the table is silent about it
on purpose.** On 2026-07-30 the site left Netlify for Cloudflare Pages, with
`.github/workflows/ci.yml` becoming its only builder; the Netlify project and
`netlify.toml` are deleted. That work was planned and executed under a separate
lifecycle (`~/.claude/plans/done/019-cloudflare-migration.md`, archived there on
2026-07-31 once WP6 merged), so it has no plan file in this repository's
`plans/done/` and adding a row here would point at nothing. It is recorded
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

## Baseline: what this repo is now

Re-measured at `45e286f` (2026-07-29) and updated in place since. **Read every
figure below as of that measurement and re-derive anything you intend to rely on**
— this section has gone stale under its own heading four times, once carrying a
chain of four superseded assertion counts (277 → 362 → 402 → 410) against a real
451. Nothing here is gated for its VALUES: `tests/docs-drift.test.ts` resolves the
names in backticks and is structurally blind to a quoted number.

The commands are one line each: `pnpm test` for the suite, `pnpm check` and
`pnpm eslint` for the gates, `wc` and a local `gzip -9` or a production `curl`
with `content-encoding: br` confirmed for weight. What is worth recording here is
the SHAPE — one test file per gated concern, all of them run by that one command
— not the integer. **Do not add the next figure to a running list; replace it.**

Four maintainer-direct changes landed between runs with no plan number, and they
took none of the numbering with them: the control-geometry and page-fit fixes, one
Strava link with a brand-ink heart and a toggle reporting `aria-pressed`, the
`/patches` wall with its projection model, and the SC 1.4.12 text-resize work.
Each is written up where it can be checked — in `plans/done/` and in the source
comments beside the code it changed — rather than re-narrated here.

| | value |
|---|---|
| output mode | `static` — no adapter, no SSR function, no middleware |
| astro integrations | `sitemap()`, `UnoCSS({injectReset: true})` — that is all |
| direct dependencies | derive: `jq '(.dependencies + .devDependencies) | length' package.json` (**21** at 2026-08-07) |
| client JavaScript | **zero external files**, which is not the same as none. **Three first-party scripts, all inline**: the pre-paint theme resolver and the press-hold (`data-leaving`) listener, both in `BasicLayout.astro` and on every page, plus `ThemeSwitcher`'s toggle listener, inlined as a module on the home page only. The ~525 B figure quoted here before was the theme resolver alone, and it was labelled as the total. **Nothing gates this row** — a census gate was written and then deliberately deleted, because pinning a count is what puts a rotting fact somewhere nobody revisits. Re-derive it from the script elements in `dist/` when you touch it |
| `<svg>` in the HTML | **zero** — icons are UnoCSS `presetIcons` mask rules |
| components | 15 `.astro` files (11 components, 1 layout, 3 page routes → **5 prerendered pages**: `/`, `/patches`, `/patches/cycling`, `/patches/running` and `/404`, plus the `robots.txt` and `llms.txt` endpoints); **no UI framework**, no `.svelte`, no islands |
| `uno.config.ts` | derive: `wc -l uno.config.ts` (**719** at 2026-08-07) — safelist, blocklist, five `rem` breakpoints, the `hover-needs-a-pointer` preset and **four shortcuts** (`control-surface`, `control`, `control-cta`, `text-link`); mostly measured rationale |
| tests | **493** assertions across **17** files (+ `tests/helpers/`, `tests/setup/`), run by `pnpm test`, measured 2026-08-08 after plan 020. An 18th file, `tests/strava-verify.test.ts`, holds 7 more and is opt-in — it skips by default, so it contributes none of the 493. **DERIVE THIS, DO NOT ADD TO IT** — a running list of superseded counts lived here and was wrong every time it was read, because `docs-drift` resolves names that must EXIST and is structurally blind to a quoted VALUE. The SHAPE is what matters: one file per gated concern, all of them run by that one command, including `docs-drift` itself, which asserts this repository's prose against its code and splits it into three kinds — a current-state document (this table included) is gated for accuracy; `.devin/wiki.json`, a standing instruction read on every future generation, is gated for *durability*, forbidden from stating a count, a component filename or an exported constant at all and required to say where each is derived instead; and a numbered plan is a *proposal*, exempt from the checks that hold a name against a tree it exists to change. A further 13 checks live in `dns/test_filters.py`, which needs Python and octoDNS and so runs in `.github/workflows/dns.yml` rather than here |
| lint | `pnpm eslint` → **0 problems**; `pnpm check` → 0 errors, 2 hints |
| `pnpm audit` | **1 moderate, 0 high, 0 critical** since plan 009's in-range refresh. The residual is `@opentelemetry/core <2.8.0` (dev/build-only), pinned exactly by `@netlify/otel@6.0.3` — unreachable without an override, by design left alone; it clears when @netlify/otel bumps and a future `pnpm update --no-save` picks it up. **Run 4: now 1 moderate + 2 high** — both highs are brace-expansion GHSA-mh99-v99m-4gvg on dev-only lint paths; plan 017 clears one in-range and documents the other as a second deliberate residual (no patched 1.x exists; the override is measured-broken). **`@netlify/otel` survived the cutover and always would have**: it arrives as `astro` → `unstorage` → `@netlify/blobs`, so it is an Astro dependency and has nothing to do with where the site is hosted — leaving Netlify does not clear it |
| deploy gate | **Changed after run 4.** `.github/workflows/ci.yml` — a `build` job runs `pnpm check`, `pnpm eslint` and `pnpm test`, uploads `dist/`, and two `wrangler pages deploy` jobs sit behind `needs: build` and publish that same artifact without rebuilding. It replaced `netlify.toml` running `pnpm check && pnpm test`; that file and the Netlify project are both deleted. `tests/workflow-guards.test.ts` is what holds the `needs:` edge |
| host | **Cloudflare Pages** (project `calvindotsg`), zone on Cloudflare DNS. Was Netlify until 2026-07-30 |
| DNS | **In git since 2026-07-31** — `dns/zones/calvin.sg.yaml` (octoDNS), planned and applied by `.github/workflows/dns.yml`. Ten of the zone's fifteen records; the three Email Routing `MX`, the `read_only` DKIM key and `_dmarc` are each excluded for a different reason, stated in `dns/config.yaml` beside the exclusion. **Live since 2026-07-31**: the first plan against the real zone reported *"No changes were planned"* (11 records returned, 3 rejected, 8 matched). Two zone-scoped tokens, read-only for planning and edit-only for applying — see `dns/README.md`; nothing in this repository can mint them |
| content source | copy and goals in `src/lib/constants.ts`; the races are one module each under `src/data/races/`, collected by the `index.ts` beside them (plan 020). Plan 021 splits what is left and deletes `constants.ts` |

The obvious simplifications were taken. A new run should expect *fewer and
smaller* wins than the first one found, and should say so plainly when a finding
is cosmetic.

## Findings considered and rejected

### The ponytail-audit review panel (2026-08-07, 13 agents over the audit-application branch)

18 findings; 8 verified by an adversarial skeptic each, 4 more verified by hand out of
the unverified passthrough. The confirmed ones were fixed in the branch. **These five
were real and deliberately NOT fixed** — each is recorded with what makes it real, so a
future run neither re-derives it nor "fixes" a non-defect.

- **`CanvasText` and `ButtonText` in `BasicLayout.astro`'s shared mark block are ungated.**
  The pairing walk in `tests/build-output.test.ts` drops every wordless mask
  (`if (!textContent.trim()) continue`), so only `LinkText` is held, and only by the
  chevron assertion in `rendered-html.test.ts`. Mutating `CanvasText` to `Canvas` ships
  invisible marks with the suite green. **Not fixed because the hole is INHERITED, not
  created**: on the revision before the consolidation, 31 of those 32 mark instances had
  no forced-colours rule at all and were already painting Canvas-on-Canvas — measured. The
  branch's net effect on a forced-colours reader is +31 marks correctly painted, 0 lost,
  and the same mutation is equally green on the base revision. What the consolidation does
  change is BLAST RADIUS: one literal now decides 32 instances where seven literals decided
  one each. Worth one assertion; not worth +67 lines of new gate inside a cleanup.
- **The grid-template refusal collector is blind to an unmodellable selector with zero
  class tokens** (`tests/patch-wall.test.ts`, `winner()`'s `classTokensOf(sel).some(...)`).
  An element- or attribute-only rule still mis-attributes silently. Downgraded to NIT: the
  component ships no such rule, and the skeptic showed the obvious repair is a no-op whose
  natural fix measurably reopens the hole it closes.
- **The same collector can redden a CORRECT build**: a variant-scoped descendant rule that
  places its element in an area the template does declare fails all three wall pages.
  Reproduced, and genuinely new to this branch. Not fixed because the trigger does not
  exist (`grep -E '^\s+\.bib[\w-]*\s+\.bib' src/components/Patch.astro` returns 0), the
  failure names its own two remedies, and erring strict is the safer side — a false GREEN
  here shipped an invisible sport mark to production once.
- **The icon-only forced-colours gate accepts a rule that paints without opting out**
  (`build-output.test.ts`'s `covered` checks only that a selector matches, not what the
  matching rule declares). REFUTED as a finding against this branch: the skeptic showed the
  gate's contract is "is this glyph named by any forced-colours rule", which the split
  opt-out still satisfies, and the paint/opt-out pairing is held elsewhere.
- **Four prose figures** in commit bodies and comments: "211 lines" is above the ceiling of
  what that commit could have removed from the eight named files; commit 3's "the two
  disagreed on any escaped class token" does not reproduce against the shipped sheet; a
  rewritten `BasicLayout.astro` paragraph attributes "seven" to the eight-root clipping
  sweep; `plans/README.md` points at `plans/done/` for four changes not archived there.
  Ungated by construction — `docs-drift` resolves names that must exist and is blind to a
  quoted VALUE. Recorded rather than corrected one at a time, because the class is the
  finding: **a figure in a commit body is unreviewable after the fact.**

### Two review panels over PR #122 (2026-08-03, merged at `ea6fa8f`)

An 8-dimension audit panel over the shipped site, then a 5-dimension panel over
that panel's own work. Every entry below was **re-measured on 2026-08-03 before
being written here**, because the handover that proposed this section stated three
things that turned out not to be true.

**SC 1.4.11 non-text contrast was NOT "never measured".** That claim was carried
forward twice and is wrong. Four surfaces are gated in the suite today:

| surface | floor | where |
|---|---|---|
| progress-bar fill vs track | 3:1 | `tests/build-output.test.ts` |
| control accent vs surface | 3:1 | same file — it shipped at 1.89:1 once |
| the Now card's live dot | 3:1 | same file |
| a bib's sport mark | 4.5:1 | `tests/patch-wall.test.ts` — the mark includes the word, so it takes the text floor |

What was genuinely unmeasured, and now is:

- **Focus indicators — measured, all pass.** 3.00:1 to 18.86:1 across both themes,
  both pages, seven focusable kinds. The bibs and the goal cards' control carry an
  authored ring in the accent; the rest inherit the browser's own ring, which
  clears 3:1 on both grounds. Nothing is owed here, but note the dependency: three
  control kinds pass on a colour this repo does not choose.
- **The perforation is exempt, not unmeasured.** On screen it is a
  `radial-gradient` at 45% of the row's ink — a texture, and SC 1.4.11 exempts
  purely decorative graphics. `Patch.astro` says so in place ("quiet enough to stay
  behind the words it introduces"). Filing it as a gap would be a false positive;
  it is a border only in the print and forced-colours arms.
- **A booked or DNF bib's outline is 2.13:1 in light and 2.84:1 in dark**, against
  a 3:1 floor. This is the one real gap and it is **the maintainer's call, because
  the remedy is a palette change** — see "Open items" below.

**Also verified and downgraded:**

- **The `ping` halo under `prefers-reduced-motion`.** `Pulse.astro` states a
  rationale, and it is about CONTRAST ("the halo carries no information the dot
  does not"), not about motion — so the rationale does not answer the motion
  question, and the reduced-motion arm in `BasicLayout.astro` names `main > *` and
  `.bib-cell`, neither of which reaches a span inside a card. Recorded as open
  rather than resolved; it is a small, real inconsistency, not a WCAG A failure.
- **A year axis on the patch wall.** Rejected on measurement in the first panel
  (+47.4% document height at 1440, from empty grid cells beside singleton years,
  and it breaks the one-cell-per-race contract). The stale premise it originally
  rested on was fixed in #122. The prototype was not retained, so that figure is
  quoted from the run that made it and has not been re-derived here.

**Findings the panels killed, so they are not re-found:** a "new tab" notice on the
six intro links (refuted on the recorded decision at `constants.ts:978`, which
cites G201's own noise guidance); a claim that the `llms.txt` DNF guard "cannot
fail" (refuted — it can, once a qualifying row exists; the coverage hole was real
and is closed by `tests/llms-dnf-fixture.test.ts`, but the reasoning was wrong);
and a proposed rewrite of this file's DNS record counts that replaced two true
figures with one false one.

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
"helpfully" do them; two have since been resolved and are kept with
their resolutions rather than deleted.

- **A booked or DNF bib's outline is below the SC 1.4.11 floor.** Measured
  2026-08-03 on the shipped build: **2.13:1 in light, 2.84:1 in dark**, against 3:1.
  The border is the row's own ink at 32% alpha, composited over the wall's card.
  **It is the maintainer's call because the only remedy is a palette change**, and
  the palette is a settled decision — raising the alpha or picking a second token
  changes how every outline bib reads against every earned one beside it.
  There is a real argument that it is not a failure at all: SC 1.4.11 covers visual
  information *required* to identify a state, and neither state depends on the
  border — a booked bib prints the word `Booked` in its meta row and a DNF prints
  `DNF` where the distance would be, which is the distinction `CLAUDE.md` says is
  load-bearing. What the outline carries alone is the bib's EXTENT, not its state.
  Do not change a token to close this without asking; do not delete this entry
  because the argument above is persuasive, either. It is measured and open.
- **The `ping` halo keeps animating under `prefers-reduced-motion`.** The
  reduced-motion arm in `BasicLayout.astro` names `main > *` and `.bib-cell`;
  the halo is a span inside a card, so neither reaches it. `Pulse.astro` states a
  rationale for not gating the halo, but that rationale is about contrast, not
  motion, so it does not settle this. Small and real; a design call rather than a
  conformance failure, since SC 2.2.2 is about content that moves for more than
  five seconds and this is a decorative pulse on a status dot.

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

[`done/README.md`](done/README.md) carries the per-plan verification log for every
archived plan — count them from `plans/done/` rather than from this sentence, which
said "all eight plans" for nine plans after that stopped being true: what was
mutation-tested, what each preview-vs-production diff showed, and every plan defect
found during execution. Read it when you need to
know *why* something was done a particular way, or before assuming a past
decision was arbitrary.
