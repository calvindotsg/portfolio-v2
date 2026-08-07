# Completed run 2 — 2026-07-21 (plans 009–010)

Run 2 audited the post-refactor repo at `c8fe10f`. Nine read-only category
auditors (opus) fanned out via a workflow; every finding went to an independent
adversarial skeptic instructed to refute it. **8 findings came back; 2 were
refuted outright, 4 downgraded, 2 confirmed — and after advisor review, exactly
2 items were worth acting on.** Five categories (security, performance, DX,
docs, direction) returned zero findings. On this baseline that is the correct
outcome: the run's own brief said "I audited nine categories and only two
findings are worth acting on is a complete, successful run."

Everything killed is recorded in `../README.md` § "Findings considered and
rejected — Run 2" so the next run does not re-derive it.

## Run 2 verification log

- **009 — lockfile refresh** merged as `c00dd73` (PR #35).
  *Plan-authoring defect caught in pre-flight, before dispatch*: the audit
  finding claimed all 10 advisories clear in-range; empirically testing the
  command against a scratch copy of the manifest+lockfile showed
  `@netlify/otel@6.0.3` (latest) pins `@opentelemetry/core` to exactly `2.7.1`,
  so only 9 of 10 clear. The plan was written with the corrected expectation
  (1 moderate residual, accepted, no override) and the executor verified it
  exactly.
  *Execution incident, fully recovered*: a user interrupt mid-dispatch broke the
  first executor's worktree provisioning — it ran in the primary checkout and
  its commit briefly landed on local `main`. It detected this itself, moved the
  commit to a branch (`e4490f1`), hard-reset local `main` to `origin/main`
  (byte-identical, verified), and resynced `node_modules`. A redundantly
  relaunched second executor found the work present and verified rather than
  redid it. Nothing was pushed from `main`; the history that merged is clean.
  *Reviewer verification, independent of both executors*: detached review
  worktree at `e4490f1` — `pnpm audit` → exactly 1 moderate
  (`@opentelemetry/core`); `pnpm check` 0/0/2 hints; `pnpm eslint` 0 problems;
  51/51 tests; **`dist/index.html` and the emitted stylesheet byte-identical**
  to the pre-refresh build (the UnoCSS 66.6.8→66.7.5 minor changes zero output
  bytes). No major jumps: `astro` 7.1.3, `eslint-plugin-astro` 1.7.0.
  Preview-vs-production (PR #35): visible text **IDENTICAL** (1144 chars),
  markup **IDENTICAL**.
  *Known non-blocking*: pre-existing peer warning
  (`eslint-plugin-jsx-a11y` declares eslint `^3–^9`, repo runs 10) — unchanged
  by this plan, lints clean.
- **010 — layout head hardening** merged as `1f06c27` (PR #36).
  Executor: 53/53 (baseline 51 + 2), `pnpm check` 0/0/2, eslint 0; the
  tokenised before/after diff of `dist/index.html` showed **exactly one
  delta** — `<html lang="en">` → `<html lang="en" data-theme="light">` — with
  the og:image/twitter:image tags byte-identical (the `|| METADATA.image_url`
  fallback deletion is output-neutral, proving it was dead code). Both new
  assertions mutation-tested by the executor (each mutation turned exactly the
  named test red, suite green on revert).
  *Reviewer verification*: full ladder re-run in the worktree (53/53, check and
  eslint clean); **mutation 1 re-run personally** (strip the `data-theme`
  attribute → exactly 1 failed / 52 passed → green on restore); scope audited
  per commit (`08a88b6` touches only `BasicLayout.astro`, `2bdd166` only
  `tests/build-output.test.ts`).
  Because of the 009 worktree incident, the executor's branch had stacked on
  `e4490f1`; the PR was built by cherry-picking the two commits onto the
  post-009 `main` so each PR stayed single-purpose.
  Preview-vs-production (PR #36): visible text **IDENTICAL**; exactly one
  markup delta, the predicted `data-theme` attribute (+19 bytes uncompressed —
  the only shipped-output change of the whole run).
  Production verified live post-merge: `https://calvin.sg/` serves
  `<html lang="en" data-theme="light">`.

## What run 2 is worth

| | before (`c8fe10f`) | after (`1f06c27`) |
|---|---|---|
| `pnpm audit` | 6 high, 4 moderate | **0 high, 1 moderate** (documented residual) |
| automated tests | 51 | **53** |
| direct dependencies | 18 | **18** (refresh only, no adds/removes) |
| shipped page delta | — | **+19 bytes**: one `data-theme="light"` attribute |
| deleted | — | the unreachable `\|\| METADATA.image_url` fallback (×2) |

Run 2 changed no visible text, no visual rendering for JS visitors, and no
dependency set — by design. The wins are hygiene (a legible audit floor),
robustness (no-JS visitors keep the designed appearance), and net (social-preview
tags and the theme default are now asserted).

---

# Completed run — 2026-07-21 (plans 001–008)

> **Archive.** This is the full record of the first `improve` run: what was done,
> and the evidence it was done correctly. The **living index a new run should read
> first is `../README.md`** — it carries the decisions that still bind (refuted
> findings, deliberate non-goals, the current baseline). This file is the
> evidence behind them.
>
> Plan files for this run are in this directory, `001-*.md` … `008-*.md`. Per the
> improve skill: *"Don't delete plan files — they're the record."* They are moved,
> never removed.
>
> **Paths inside these files are as-written, and were not rewritten by the move.**
> A plan that says `plans/003-*.md` means the file now at `plans/done/003-*.md`,
> sitting beside it here. Editing 6,000 lines of archived record to repoint paths
> would risk corrupting the evidence to fix a cosmetic staleness; the files are
> all in one directory, so the reference is still unambiguous.

Generated by the `improve` skill on 2026-07-21, against commit `4550e1f`.

A `deep` audit fanned out nine read-only auditors — one per category — over this
repository. Each of the 50 findings they returned was then handed to an
independent skeptic agent instructed to *refute* it. **44 survived, 6 were
refuted** (listed at the bottom so nobody re-audits them). The surviving findings
were consolidated into the seven plans below.

Before any plan was written, the entire target architecture was **built and
measured** in a throwaway git worktree, and the test harness was **proven green on
unmodified `main`**. The plans therefore contain working code, real byte counts,
and the specific traps that were hit — not proposals.

Execute in numeric order. Each plan is self-contained: an executor with no prior
context should be able to run it from the plan file and the repository alone.
Each executor: read the plan fully before starting, honour its STOP conditions,
and update your row when done.

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

Plan 008 was **not** produced by the audit — it was raised from a production
PageSpeed Insights report on 2026-07-21 and executed the same day, out of numeric
order, because it fixes a defect that was live. It is independent of 005–007.

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

### Production status

**Plans 001–004 are live on https://calvin.sg** as of 2026-07-21 (deploy
`6a5f1a55`, commit `ef0da28`). The push to `main` triggered the deploy, and
`netlify build --dry` confirms the build ran `build.command from netlify.toml`
— i.e. production was gated on `pnpm check && pnpm test`, not just `pnpm build`.

Post-deploy verification against the pre-refactor production snapshot:

| check | result |
|---|---|
| visible text vs. pre-refactor prod | **identical**, 1155 chars |
| `available_functions` on the deploy | **none** (was a 2.4 MB SSR function) |
| `GET /.netlify/functions/ssr` | **404** |
| response headers | `public,max-age=0,must-revalidate` + `etag` (was `no-cache`, `Durable; fwd=bypass`) |
| portrait asset | `/_astro/me.D44fd81e_1hBdqr.webp` (8 kB, build-emitted) |
| canonical | `https://calvin.sg/` from config, no longer echoing the request host |

### Verification log

- **001** merged as `4144f81`. 32/32 tests green. The net was mutation-tested, not
  just run: pushing `GOAL.current_progress` above `total_goal` and emptying the
  about-me list each turned exactly one test red, and both returned to green on
  restore.
  *Plan defect found by the executor*: `astro check` typechecks the root
  `vitest.config.ts`, and `getViteConfig` is typed as Vite's plain `UserConfig`,
  which has no `test` key — needs `/// <reference types="vitest/config" />`.
  The executor stopped rather than improvising; the plan was amended (`bdce3ae`).
- **002** merged as `a4a3e0e`, plus `eca342c` from review. 38/38 tests green.
  Deploy preview diffed against production: **visible text byte-identical**.
  Only three markup deltas, all intended — canonical/`og:url`/`og:image`/JSON-LD
  `url` now read the configured `site` instead of echoing the request origin
  (that is CORRECT-03 fixed for free); the portrait moved from
  `/.netlify/images?url=…&w=275&h=275` to a build-emitted `/_astro/…webp`
  (41 kB → 8 kB); and `astro-island` uids are per-build noise.
  Response headers confirm the win: production serves
  `cache-control: no-cache` with `cache-status: "Netlify Durable"; fwd=bypass`,
  the preview serves `cache-control: public,max-age=0,must-revalidate` with an
  `etag`.
  *Defect found in review, not by the executor*: the new
  "no SSR function emitted" assertion passed in the executor's fresh worktree but
  failed on the maintainer's machine, where `.netlify/v1` survived from earlier
  adapter builds and nothing ever deletes it. `tests/setup/build.ts` now clears
  it before building, preserving `.netlify/state.json`.
- **003** merged as `621dd5a` (squash of 4 commits, PR #27). 41/41 tests green in
  both the executor worktree and the main worktree. Production deploy
  `6a5f152c` verified live: **0 external JS files** referenced, 0 `astro-island`
  markers, no `.loader` div, the pre-paint theme script present, the progress bar
  at `--progress: 74.88%` (= 2246.4/3000) without JS, and the old bundles
  (`client.Bb6KOtAu.js`, `ThemeSwitcher.DKIzLg0a.js`) now 404.
  All 3 new tests were **mutation-tested**: removing the inline theme script,
  re-adding a `.loader` div, and forcing an external JS chunk each turned exactly
  one test red. The 002 stale-artifact failure mode was explicitly re-checked and
  does **not** apply — a `.js` file planted in `dist/_astro` is cleared by
  `astro build`, and the suite passed in the main worktree where 6 stale JS files
  were present beforehand.
  Preview-vs-production diff: one visible-text delta, the `🔆` glyph leaving the
  DOM text. **Intended** — it moved to CSS `::before` keyed off `data-theme`, and
  the rules were confirmed present in the preview stylesheet
  (`.theme-toggle:before{content:"🔆"}`, byte-identical CSS to the local build),
  so the visitor still sees it and now sees the *correct* glyph in dark mode from
  first paint. Every markup delta was predicted by the plan.
  *Plan defect found by the executor*: the "ships zero external JavaScript files"
  assertion sat in Step 6, one step before Step 7 removes the `svelte()`
  integration — and `@astrojs/svelte` emits its `client.svelte.*.js` runtime
  purely because it is registered, regardless of whether any `.svelte` file or
  `client:*` directive survives. Proven by elimination: at end of Step 5 the tree
  had zero of both and still emitted a 29,694-byte chunk across a clean rebuild;
  deleting only the two `svelte()` lines took `dist/_astro` to zero. The plan was
  amended to move the test to Step 7d (`f044fdf`, squashed into `621dd5a`) rather
  than documenting a knowingly-red step.
  *Tooling defect found in review*: `.scratchpad/prod-diff.py` normalised only the
  serving origin, so since 002 made canonical/`og:url`/JSON-LD emit the configured
  `site`, a preview's identical tags diffed as changes. Fixed to normalise the
  canonical site too, and to strip Netlify's preview-only deploy-id beacon.
- **004** merged as `ef0da28` (squash of 10 commits, PR #28). 48/48 green in both
  worktrees. Production deploy `6a5f1a55` verified: JSON-LD `worksFor.name` is
  `"HeyMax"`, `sameAs` is a flat list of 5 absolute URLs with no `/resume.pdf`,
  `@context` is `https`; zero occurrences of `text-sm-1`, `custom-btn`,
  `transform-y-` or `sizes=` remain; 3 `<ul>`s carry `text-sm`.
  eslint down to 1 warning (the `colorText` one is gone).
  Preview-vs-production diff: **visible text byte-identical** (the one intended
  visual change is CSS, not content). Every markup delta predicted: JSON-LD
  flattened and `https`, `transform-y-[-40%]` gone from 6 cards, `custom-btn` gone
  from 7 buttons, `sizes` gone from the portrait, `text-sm-1` → `text-sm` on 3
  lists.
  All 7 new assertions **mutation-tested**, plus the dead-class tripwire probed
  with both `custom-btn` and `transform-y-[`. `Card`'s rewritten class string was
  proved character-identical to what the old template produced with no props,
  minus only the dead `transform-y-[-40%]` — the one edit in this plan that no
  test covers.
  *Three plan defects found by the executor*, all verified before amending:
  (a) the step-4 button test asserted `aria-label` must be absent wherever
  `.sr-only` text exists, on the false premise that `ThemeSwitcher.astro` has no
  `.sr-only` child — it has both, with identical text, reproducing the Svelte
  original; the invariant is *no downgrade*, so the test now requires them to
  agree rather than requiring absence; (b) a verify and a done criterion grepped
  for a bare `rounded-full` expecting no matches, impossible since it is live in
  `ProgressBar.astro` and `Pulse.astro`; (c) a done criterion counted
  `description: string$` expecting 1, but `METADATA.description` also matches.
  *Reviewer note on method*: the first attempt to mutation-test the button
  assertion **passed**, which looked like a dead test. It was an invalid mutation
  — adding `aria-label` to `<Button>` cannot reach the DOM precisely because
  `Button` swallows props, which is the defect. Mutating the `<button>` element
  directly turns it red correctly.

- **007** merged as `759ed8f` (squash of 6 commits, PR #32). 51/51 green — this
  plan changed **no code**: `git diff -- src/ package.json pnpm-lock.yaml tests/`
  is empty. `public/preview.jpg` 2400×1600 / 383,429 B → **1200×630 / 54,485 B**
  (−85.8 %), the largest file shipped to `dist/`.
  Preview-vs-production: **visible text and markup both IDENTICAL**; the only
  shipped deltas are `/llms.txt` (one line) and `/preview.jpg`.
  **The job-title instruction had inverted and was reversed before dispatch.** As
  authored, Step 5a rewrote `llms.txt` from "Business Systems Analyst" to
  "Founding Solutions Engineer" — correct at `4550e1f`, and `3f45874` flipped it,
  so running it verbatim would have published a title Calvin does not hold to the
  file whose whole purpose is an authoritative bio for AI crawlers. Neither guard
  would have caught it: the drift probe reports *whether* a file changed, not
  whether the instruction still points the right way, and the plan's own
  verification would have **half**-passed. `git diff -- public/llms.txt` is
  exactly 1 insertion / 1 deletion, on line 7.
  *Three further plan defects, all fixed in the plan file as well as the docs*:
  (a) the anti-regression grep `npm (install|run)` is unanchored and `pnpm
  install` *contains* `npm install`, so it matched the very command Step 3b
  mandates — **unsatisfiable by construction**, and the same pattern in the
  CLAUDE.md check passed only by luck; now anchored to `^[[:space:]]*`.
  (b) Step 3d had the README state Netlify's build command as `pnpm build`; it is
  `pnpm check && pnpm test` from `netlify.toml`, which the plan predates — the
  wrong version reads as though deploys skip the suite.
  (c) `CLAUDE.md` named `src/components/Card/Content.astro`, deleted by `ef0da28`
  in this same chain, and Step 4d explicitly said to leave that bullet alone.
  *Every new factual claim was checked against the repo* rather than trusted:
  `SKIP_BUILD=1` exists (`tests/setup/build.ts:20`), `ICON_COLLECTIONS` is
  `["fa6-brands","ri"]`, `@keyframes` rules exist with no JS animation library,
  `public/robots.txt` ships verbatim, `pnpm preview` returns **200**, and the
  pre-paint theme script is at `BasicLayout.astro:64`. The `CLAUDE.md` Memories
  contract survives verbatim. The resized image was **viewed, not just
  byte-counted** — full page, no crop, invisible `#111111` pillarbox.
  *Executor note*: the plan's `pnpm preview` snippet kills only the pnpm wrapper,
  leaving an orphaned Astro listener bound to 4321 that produced a spurious 404 on
  a retry; fixed to `pkill -f "astro preview"`.
- **006** merged as `ad7c5bf` (squash of 4 commits, PR #31). 51/51 green in both
  worktrees; **19 → 18 direct dependencies**; `pnpm audit --audit-level=critical`
  **exit 1 → exit 0** (`{critical:1, high:10, moderate:9, low:2}` →
  `{critical:0, high:6, moderate:4, low:0}`). None of those advisories was
  runtime-reachable — the exposure was build-time supply chain, in the laptop and
  the Netlify container holding the deploy credentials.
  **Icon geometry was measured, not asserted.** Production's seven `<svg>` widths
  were captured *before* dispatch, while the old renderer was still live; the new
  CSS mask rules reproduce all of them exactly (0.97 / 0.88 / 0.88 / 0.75 / 0.97 /
  1em), each with `display:inline-block`, a mask URL and
  `background-color:currentColor`. `text-xl`'s 28 px line-height governs over both
  the old 24 px and new 20 px icon box, so button height is unchanged. All eight
  accessible names are byte-identical and every icon span is `aria-hidden`.
  Preview-vs-production: **visible text IDENTICAL**; all 60 markup deltas are the
  `<svg>`/`<symbol>`/`<use>` → `<span>` swap and nothing else. Net first-load
  weight **+159 bytes brotli (+1.9 %)** as the icon payload moves from HTML into
  CSS — measured compressed, since uncompressed (+1,563 B) is not what anyone
  pays.
  *A real test defect found in review — the first in this run that was not a
  stale premise.* Deleting the Goal CTA's icon span outright left **all 51 tests
  green**. `fa6-brands:strava` is used twice (a `LINKS` entry and
  `GOAL.cta_logo`), so 7 icon *references* collapse to 6 distinct *classes*; the
  new test looped over classes calling `doc.querySelector`, which returns the
  first match in document order — always IntroCard's copy — leaving the Goal CTA
  icon unasserted. Ironically the plan's own correct warning ("six distinct
  icons, do not expect seven distinct classes") is what steered it there: right
  for the CSS-rule check, wrong for the DOM check. Now asserts one element per
  *reference*, and Step 7a of the plan was amended so the blind spot is not
  inherited. Re-mutation-tested three ways (delete the span → `expected 6 to be
  7`; drop its `aria-hidden`; drop `aria-hidden` on an IntroCard icon). The other
  new assertion was mutation-tested by dropping `extraProperties.display` and by
  emptying the safelist.
  *Reviewer note on method*: the first geometry comparison reported **FAIL on
  five of six** — that was the reviewer's own bug, not the code's. The minifier
  strips leading zeros, so `0.97em` is written `.97em`. Same family as the
  `::before` → `:before` trap.
  *Also corrected*: the assumption that moving bytes into a content-hashed asset
  buys repeat-visit caching. It does **not** here — Netlify serves `/_astro/*`
  with `cache-control: public,max-age=0,must-revalidate`, the same as the HTML.
- **005** merged as `255dbca` (squash of 7 commits, PR #30). 49/49 green in both
  worktrees; `pnpm check` hints **4 → 2** (both `ts(6385)` `presetUno`
  deprecations cleared); **20 → 19 direct dependencies**.
  `uno.config.ts` 60 → 9 lines, and it was proved **byte-identical (219 bytes)**
  to the text Step 2 specifies rather than eyeballed.
  **The whole-plan CSS delta was re-derived by the reviewer**, not taken from the
  executor's report — building `origin/main` and the branch, splitting each
  stylesheet into rules and sorting, gives exactly **one** removed rule:
  `h1,h2,h3,h4,h5,h6,p{font-family:…}`, 13,115 → 12,962 bytes, 188 → 187 rules.
  47 lines of config deleted, zero bytes of CSS changed.
  The load-bearing `robots.txt` assertion was **mutation-tested two ways** (wrong
  sitemap host; file deleted) — each turned exactly that test red, and
  `git diff origin/main..HEAD -- tests/` was **empty**, so the net was not
  weakened to fit the change.
  Preview-vs-production: **visible text and markup both IDENTICAL**, and the
  preview stylesheet's SHA-256 matched the local build exactly.
  The one visitor-observable change — `/robots.txt` losing
  `Sitemap: …/sitemap-0.xml` — was **verified rather than assumed**: the plan
  claims the index makes it redundant, and `dist/sitemap-index.xml` does contain
  exactly that one `<loc>`.
  *No plan defect reached the executor*, because two were caught in pre-flight:
  11 hard-coded `Tests  32 passed (32)` expectations plus a `32/32` STOP
  condition (the suite was at 49 — the executor would have stopped at Step 1),
  and a hand-off note claiming plan 005 owned the `IntroCard.astro` eslint
  warning when its scope excludes `src/components/` entirely.
  *Executor notes, both benign*: a stale `git add` pathspec split Step 3 across
  two commits (7 rather than the suggested 6, identical net tree); and three
  "expect zero hits" greps returned hits **inside the plan's own markdown**,
  since the plan's grep commands do not exclude `plans/`. Excluding `plans/`,
  zero functional references remain.
- **008** merged as `b14287d` (PR #29). 49/49 green in both worktrees;
  `pnpm eslint` now reports **0 problems**, down from 1 warning.
  PageSpeed Insights had flagged the portrait under *"Serves images with low
  resolution"* — displayed 275×275, served 275×275, expected 413×413 — while
  `src/assets/me.webp` is 1000×1000. The `<Image>` call emitted one candidate and
  no `srcset`, so every DPR-2 screen painted a 275 px bitmap into a 550 px box.
  `densities={[2]}` emits a 550×550 companion (20,860 B) beside the unchanged
  275×275 original (8,892 B). **The 1x content hash did not change**, so DPR-1
  visitors download byte-identical bytes; retina visitors pay +11,968 B and fetch
  the 2x candidate *instead of*, not in addition to, the 1x.
  Preview-vs-production diff: **visible text byte-identical**, and exactly one
  markup delta — the added `srcset` on that single `<img>`. Both candidates
  verified live on the preview: `200 image/webp`, 275×275 and 550×550.
  The new assertion was **mutation-tested three ways** (delete `densities`;
  `densities={[4]}`, which upscales past the 1000 px source; assert `width * 3`),
  each turning exactly that test red. The second is the load-bearing one:
  **Astro silently discards a density that would upscale the source**, so raising
  the layout width past 500 px would delete the `srcset` and revert the fix with a
  completely green build — which is why the test asserts *pixels* via `sharp`
  rather than asserting markup.
  *Tooling defect found in review*: `.scratchpad/prod-diff.py` split markup on
  `"> <"`, but the built HTML is minified with no whitespace between tags, so the
  whole 18 KB document stayed one line and every diff read "the entire document
  changed". It now tokenises on `(<[^>]+>)`; prod-vs-prod self-tests as IDENTICAL.

## Dependency notes

The chain is strictly linear, and deliberately so — this is a one-page site with
one maintainer, and every plan touches overlapping files. Each plan is merged to
`main` before the next begins.

- **001 unblocks everything.** The repo has no tests. Plans 002–007 delete a
  rendering framework, an animation library, an SSR adapter and most of the
  styling config; without assertions on rendered output, "the build is still
  green" would be the only evidence the page still says what it used to. A green
  build has never proved that here.
- **002 before 003** so that `dist/index.html` exists. Under `output: "server"`
  the build emits no HTML file at all — the page lives only inside the Netlify
  function — so plan 001's harness renders through Astro's Container API, and 002
  is what makes real build-artifact assertions possible.
- **003 before 004** because 003 rewrites `BasicLayout.astro`, where most of the
  markup defects live.
- **004 before 006** because 004 deletes `Card`'s dead `href` branch, which is the
  only static `astro-icon` reference in the repository.
- **005 before 006** because 006 adds `presetIcons` to a `uno.config.ts` that 005
  has already cut from 71 lines to ~15.
- **007 last** because the documentation must describe the architecture that
  exists after the refactor, not before it.

## What each plan is worth

Measured in the spike, not estimated:

| | before (`main`) | after | **final** |
|---|---|---|---|
| direct dependencies | 23 | 16 | **18** |
| client JS files | 6 | 0 | **0** |
| client JS bytes | 106,861 | ~525, inline | **525, inline** |
| Netlify SSR function | 2.4 MB | none | **none** |
| `pnpm audit` critical / high | 1 / 12 | 0 / 6, all dev-only | **0 / 6** |
| automated tests | 0 | 32+ | **51** |
| `pnpm eslint` problems | 2 | 0 | **0** |

The spike measured the client-JS baseline as 95,031 bytes; re-measured against
the current lockfile it is **106,861** across the same 6 files (the spike
worktree's `node_modules` resolved ~12% smaller). The post-003 inline figure is
525 bytes measured on the shipped `dist/index.html`, not the spike's 539.

---

# Run 3 (2026-07-22): plans 011–014

Audited at `4e15674`, all four plans merged the same day. Orchestrator on
Fable, executors on Opus 4.8 in isolated worktrees, audit/skeptic subagents on
opus via one Workflow pipeline (9 auditors → 3 findings → 3 skeptics, all
CONFIRMED; CORRECT-01 ≡ DEBT-01 merged into plan 013).

## Per-plan verification log

### 011 — emoji → presetIcons icons (PR #44, squash `7950203`)

- All 8 emoji sites migrated to `ri` icons; CAREER field renamed
  `emoji`→`icon`; FOOTER split `{prefix, icon, suffix}`; WELCOME gained
  `greeting_icon`; ThemeSwitcher's CSS-content emojis became literal sun/moon
  spans toggled by `data-theme` (descendant selector outranks presetIcons'
  `display:inline-block`).
- Prose proved byte-identical modulo emoji programmatically (python string
  equality on old vs prefix+suffix / stripped strings).
- Mutation-tested twice with different mutations: executor reintroduced ❤️ in
  FOOTER.prefix (exactly the emoji-lock test failed); reviewer reintroduced
  🚴🏻 in `goal_logo` (emoji-lock + collection + safelist-rule tests failed).
- Preview-vs-prod: visible text identical except emoji glyphs removed and the
  sr-only "love"; all 7 markup delta sites predicted by the plan.
- The `scale-x-[-1]` flip was dropped with evidence: both `ri:riding-line`
  and `ri:run-line` face right (head circles at x=16 / x=13.5 of the
  24-unit viewBox); the flip existed to mirror left-facing emoji.

### 012 — no-op UnoCSS class removal (PR #46, squash `6f0e24c`)

- Nine tokens removed: `card`, `group`, `perspective-1200`, `justify-start`,
  `flex-none`, `h-full`, 2× `z-20`, `sm:gap-2`, bare `transform`
  (IntroCard). Evidence per class from comparing built-HTML tokens against
  stylesheet selectors plus CSS-spec reasoning.
- **Executor STOP round**: the mandatory before/after screenshot check caught
  the mobile portrait vanishing. The executor's diagnosis (UnoCSS
  `--un-*`-defaults preflight collapsing without a bare `transform` class)
  was **refuted by the reviewer's fresh rebuild** — the full
  `*,:before,:after,::backdrop` preflight persists; the executor's evidence
  was a grep substring artifact. The true cause: `perspective-1200` created a
  stacking context that kept the `z-[-1]` portrait above the card's opaque
  background. Fix: `isolate` replaces it (intent-revealing, same effect),
  with a frontmatter comment; verified byte-identical 375×667 screenshots.
  Round 2 moved that comment out of the template body (an HTML comment there
  ships once per Card — 8 copies).
- New class↔rule tripwire test (every class token in dist/index.html must
  have a stylesheet rule), mutation-tested twice (`unstyled-probe` /
  `orchestrator-probe`), each failing exactly the tripwire.
- Preview-vs-prod: visible text identical; markup deltas confined to class
  attributes.

### 013 — entrance-stagger off-by-one (PR #49, squash `8036d3c`)

- PR #41 grew `<main>` to 8 children; the delay ladder stopped at
  `nth-child(7)`, so the footer animated with the hero. Added the
  `nth-child(8) { 0.56s }` rung + a source-hygiene test pinning
  max(ladder rung) ≥ main child count.
- Mutation: deleting the tail rung fails the test with "8 children but ladder
  stops at nth-child(7)". (Reviewer note: deleting a *middle* rung passes by
  design — the test pins the tail, which is the observed regression class.)
- Preview-vs-prod: text and markup identical (CSS-only change).

### 014 — rendered coverage for Now/Career (PR #51, squash `b7439e7`)

- Pure test additions: Career loop now asserts `start_date - end_date`,
  company, and the company_url anchor; new test pins `NOW.description` to
  body text (body-only matters: the string is a substring of
  METADATA.description, which reaches only meta attributes).
- Mutation-tested four ways (drop `<Now/>`, delete dates paragraph, break the
  anchor href, hardcode the Now paragraph) — each failed exactly the covering
  test.
- Preview-vs-prod: identical (test-only change).

## Run-3 outcome vs baseline

| | before run 3 (`4e15674`) | after (`b7439e7`) |
|---|---|---|
| tests | 58 | **64** |
| emoji in shipped page/CSS | 8 | **0** (test-locked) |
| class tokens without a CSS rule | 2 (`card`, `group`) | **0** (test-locked) |
| dead/no-op utility tokens | 9 | **0** |
| entrance stagger coverage | 7 of 8 cards | **8 of 8** (test-locked) |
| direct dependencies | 18 | 18 |
| `pnpm audit` | 1 moderate (deliberate) | 1 moderate (unchanged) |
| index.html gzip | ~3.6 KB | 3,533 B |
| stylesheet gzip | ~5.9 KB | 7,055 B (+~1.1 KB: 8 icon mask data-URIs replacing font-provided emoji glyphs) |

Deferred/unchanged, with reasons recorded in `plans/README.md`: the four
run-3 near-findings (Goal CTA aria-label hardcodes "Strava", README's
singular "cycling goal", llms.txt projects asymmetry, no browser test for the
theme toggle) and all maintainer-owned items.

# Plan 015 (2026-07-22): Strava goal automation (DIRECT-01)

Not an audit finding. DIRECT-01 had sat in `../README.md` § "Deliberately not
planned" across all three runs as *"worth a decision, not worth a plan written
without one"*. The maintainer supplied the decision on 2026-07-22 after a
research fan-out, and locked four choices: GitHub Actions cron (over a Netlify
scheduled function + Blobs + build hook, and over a runtime client fetch);
a static refresh token in repo secrets with a **fail-loud** posture; a
bot-owned JSON as the data target; and no `fetched_at` field, since an
always-changing key would degenerate commit-if-changed into a daily commit.

## What shipped (PR #54, squash `a4b419b`)

A daily workflow (`13 21 * * *` UTC = 05:13 SGT) refreshes a Strava token,
reads `ytd_ride_totals.distance` / `ytd_run_totals.distance` from
`/athletes/{id}/stats`, converts metres → km at 1 decimal, writes
`src/data/strava-progress.json`, and commits **only if that file changed**.
`constants.ts` imports it and clamps each value against its own `total_goal`.
Replaces the 38 manual `current_progress` bumps. The site stays fully static —
no runtime JS, no adapter, no functions.

Mid-execution the maintainer issued a standing directive — *every*
human-configurable value belongs in a repo secret, a repo variable, or
`src/lib/constants.ts` — which invalidated the plan as drafted and forced a
rework: the hardcoded athlete id became the `STRAVA_ATHLETE_ID` repo variable,
and a `CAPS_KM` object mirroring `total_goal` was deleted outright by moving
the clamp into `constants.ts`. Notably the duplicate had a lockstep test
guarding it and was *still* wrong; the fix was to give the knob one home, not
a better guard.

## Verification log

- **Ladder**: `pnpm check` 0 errors / 0 warnings / 2 hints; `pnpm eslint` exit
  0; `pnpm test` 67 (baseline 64 + 3); `pnpm build` 1 page. Rendered HTML
  byte-identical for the seeded values, proving the wiring behaviour-neutral.
- **Byte-stability**: the seeded JSON matches the writer's exact serialisation
  (`JSON.stringify(p, null, 4) + "\n"`), so an unchanged day produces a zero
  diff. Later confirmed in production — the bot's first real commit changed
  exactly one line.
- **Mutations, 5 run**: over-goal JSON, `clampToGoal` losing `Math.min`, the
  `GOALS` clamp projection removed, JSON key drift, and rounding dropped.
  Two of the five **survive** and are recorded as accepted coverage gaps: the
  clamp *application* cannot be exercised while both goals sit under target.
  Their failure mode is loud, not silent — without the clamp an overshooting
  year trips the pre-existing `[0, total_goal]` assertion and fails the deploy.
- **Strava contract, settled empirically**: the script POSTs the token refresh
  as `application/json` while Strava's docs show form-encoded. Probing both
  encodings with deliberately-bogus credentials returned byte-identical
  structured field errors (`{"resource":"Application","field":"client_id"}`),
  which proves the body was parsed. The maintainer separately ran the
  authenticated chain: `ytd_ride_km: 2246.449`, `ytd_run_km: 138.317`.

## Review panel (23 agents, 17 findings: 5 confirmed / 9 downgraded / 3 refuted)

Six finder dimensions, one adversarial reproduce-first skeptic per finding.
**One major, converged on independently by four of the six dimensions**:
`rendered-html.test.ts` located each progress bar by string-matching
`aria-valuenow`. Safe while a human hand-edited two different numbers; a
guaranteed annual outage once a bot writes them, because Strava's YTD resets
both goals to 0 every 1 January and `find()` then returns the Cycling bar for
both. Since the bot's commit reaches `main` *before* any gate runs, that would
have failed **every** deploy of main — not just the bot's — until a human
edited the test. The plan had called it a "known benign edge, noted not fixed".
Fixed before merge: selection is now positional and asserts `aria-valuenow`
rather than searching by it.

A judge also proved the *obvious* form of that fix is a regression — keeping
`expect(bar).toBeTruthy()` alongside positional selection makes it tautological
— by deleting the attribute and watching the suite stay green. The assertion
was replaced rather than left in place, then re-verified: 67/67 at live values
**and** at `0/0`, still red under both attribute mutations. Also confirmed:
a missing `concurrency:` group (added). Recorded not fixed: the writer's
`main()` is unexported and untested, so a ride/run field swap would pass the
suite — no live defect, and covering it means refactoring for testability.

## Post-merge activation

- Workflow registered `state: active`. The public-fork trap ("when a public
  repository is forked, scheduled workflows are disabled by default") did
  **not** bite: it governs workflows inherited at fork time, not ones added to
  a fork whose Actions are already enabled.
- First `workflow_dispatch`: green in 7s, logged
  `Wrote cycling 2246.4 km, running 138.3 km`, committed `ede28fa`
  (`chore(goals): update Strava progress to 2246.4 km ride / 138.3 km run`,
  one line changed, authored by `github-actions[bot]`) and pushed.
- The gated Netlify build then deployed it: `https://calvin.sg` served
  `138.3 km of 1000 km` — a value existing only in the bot's commit, which is
  the end-to-end proof that the gate passes on bot-written data.
- Index follow-up merged separately as `1bb32f6` (PR #55).

## Outcome vs baseline

| | before (`b7439e7`) | after (`a4b419b` + first bot run) |
|---|---|---|
| tests | 64 | **67** |
| `current_progress` maintenance | hand-edited (38 commits' worth) | **bot-owned**, daily |
| configuration in scripts | — | **none** (repo variable + secrets + `constants.ts`) |
| GitHub Actions workflows | 0 | 1 (`strava-progress`, `state: active`) |
| runtime JS / adapter / functions | none | **unchanged: none** |
| direct dependencies | 18 | 18 (writer script has zero deps) |

Latent risks recorded in the plan, not acted on: if the Netlify account ever
migrates off the legacy Free plan to credit billing, daily deploys need
rethinking; if branch protection or a `netlify.toml` ignore rule is added, the
bot pipeline silently breaks. Scheduled workflows on public repos also
auto-disable after 60 days without repo activity — the bot's own commits reset
that timer.

## Run 4 (2026-07-29, audited at `45e286f`, completed the same day)

Nine read-only opus auditors + one opus skeptic per finding; seven categories
returned zero and two findings survived (the audit record and the three
resolved maintainer leads are in `plans/README.md` § Run 4). Both plans
executed by opus worktree executors, reviewed against the full ladder, and
squash-merged the same morning.

### 016 — stop shipping rationale comments in built HTML (PR #90, squash `c3734b1`)

Ten `<!-- -->` template comments in four `.astro` files (BasicLayout, Career,
index, `[...sport]`) survived the build: 5,970 raw B on `/`, 4,311 B on each
`/patches` page — 45–51% of the compressed markup. Converted to Astro's
`{/* */}` form, prose byte-identical (word-diff verified: markers only), plus
a build-wide gate in `tests/build-output.test.ts` failing any built page that
contains `<!--`. Suite 277 → 278.

Verification log:
- Mutation-tested twice, independently. The reviewer's first probe
  (`<!-- probe -->` glued directly to a tag) never reached `dist/` — **the
  Astro compiler itself strips an HTML comment abutting a tag with no
  whitespace, while an own-line comment ships**. Calibrated both ways: an
  own-line probe reached `dist/` and reddened exactly the new gate; the glued
  probe shipped nothing, so the gate rightly stayed green. All ten real
  comments were own-line, i.e. the shipping class.
- Preview-vs-production diff (deploy-preview-90, both origins fingerprinted
  serving the same hashed CSS): visible text IDENTICAL on all four pages;
  markup delta exactly the comment removals. One apparent og:url/canonical
  delta was a reviewer instrument error — passing page URLs as
  `prod-diff.py --prod` mangles its origin normalisation; raw tags were
  identical on both origins.
- Production after deploy: `/patches/` 3,717 → **2,005 B** brotli (−46%),
  `/patches/running/` 3,359 → **1,656 B** (−51%), `/` 6,167 → ~4,3xx B; zero
  `<!--` on every page.

### 017 — lockfile refresh clearing one brace-expansion HIGH (PR #92, squash `6647c31`)

`pnpm update --no-save`, lockfile-only (+227/−263; `package.json` untouched).
`minimatch` 10.2.5 → 10.2.6 pulls `brace-expansion@5.0.8`, clearing the
typescript-estree/eslint HIGH paths of GHSA-mh99-v99m-4gvg; side-effect
in-range bumps astro 7.1.5, @astrojs/check 0.9.10, eslint 10.8.0. Audit
`1 moderate | 2 high` → **`1 moderate | 1 high`**.

Verification log:
- Ladder green in the worktree (executor and reviewer independently):
  `pnpm check` 0 errors, `pnpm eslint` clean — the functional exercise of the
  refreshed minimatch graph — `pnpm test` 278/278.
- `dist/` byte-identical before/after (same page byte counts, same hashed CSS
  filenames); Netlify's `Pages changed: skipping` confirmed zero page delta
  at the artifact level. (A raw md5 of preview vs production HTML differs by
  the preview-only Netlify beacon div — not a real delta.)
- The residual HIGH (`eslint-plugin-jsx-a11y → minimatch@3.1.5 →
  brace-expansion@1.1.16`) is deliberate and evidence-backed: the advisory's
  only patched release is 5.0.8 (no patched 1.x), jsx-a11y@6.10.2 is its
  latest release, and the override was built and measured to break —
  `brace-expansion@5`'s CJS entry is a namespace object, so `minimatch@3`'s
  `expand(...)` call throws `TypeError: expand is not a function`. Dev-only;
  the deploy gate never runs eslint. Clears when jsx-a11y ships off
  minimatch@3; a future `pnpm update --no-save` picks that up.

## Run-4 outcome vs baseline

| | before (`45e286f`) | after (`6647c31`) |
|---|---|---|
| tests | 277 / 10 files | **278** / 10 files |
| `/patches/` markup over the wire (brotli) | 3,717 B | **2,005 B** |
| `/patches/cycling/` | 3,642 B | ~1,9xx B |
| `/patches/running/` | 3,359 B | **1,656 B** |
| stylesheets | 6,798 + 1,392 B br | unchanged |
| `pnpm audit` | 1 moderate + 2 high (undocumented) | **1 moderate + 1 high, both documented residuals** |
| direct dependencies | 18 | 18 |
| client JS / adapter / functions | none | unchanged: none |

Lead 3's headline evidence (no loading-time problem existed: ~11.9 KB brotli
cold visit, Lighthouse 0.95–1.00 across 3 runs × 3 URLs, TBT 0, both suspected
mechanisms refuted) is recorded in `plans/README.md` § Run 4. Nothing was
deferred; the seven zero-finding categories each recorded their near-misses in
the same section so run 5 does not re-derive them.

# Plan 018 (2026-08-07): let a plan live in `plans/` again (maintainer-direct)

Not from an audit run. The maintainer asked for the race data and site copy to be
decoupled from the code that renders them; the resulting plans could not be written
into `plans/` at all, and 018 is what fixed that before 019–023 could land.

## What shipped (PR #130, squash `232f751`)

`tests/docs-drift.test.ts` gained a **third document class**. It already split documents
two ways — current-state, gated for accuracy; standing-instruction, gated for durability.
A numbered plan is neither: it describes a repository that does not exist yet, so the
three gates that hold a name against the tree that *does* — paths, `pnpm` scripts,
configured values — were asking it the wrong question. `isProposal` skips those three and
only those.

**Measured on the six plans that landed together: 51 path misses, 7 script, 0 configured.**
The clearest is plan 019 naming the two scripts CLAUDE.md warns do not exist, inside a
sentence whose entire purpose is to warn an executor about exactly that — a document
penalised for saying the true thing this suite exists to enforce.

**A gap, not a regression.** Plans 016 and 017 sat at the top level of `plans/` until
2026-07-29; this suite landed 2026-07-31. The two had never met.

Alongside it, `plans/README.md` gained "What governs this directory" — the pipeline named
as a pointer to `github.com/shadcn/improve`, with only the local deviations written down.

## Verification log

Five controls, because an exemption is the gate's new single point of failure:

| stimulus | result |
|---|---|
| bad path + bad script name inside a proposal | green — the exemption works |
| the same two tokens in `plans/README.md` | **red**, naming both |
| the six plans with the exemption reverted | **red**, 51 + 7 |
| `isProposal` broken so it never matches | **red**, with the intended message |
| every plan archived to `done/` | green |

The suite went 478 → 479. `dist/` was unchanged and calvin.sg served the same asset hash
after deploy, which is the expected result for a change that touches no site output.

## Review panel (13 agents, 24 findings, 6 blocking)

**The blocking one was in the new test.** Its non-vacuity floor asserted that a live
numbered plan is *currently* exempted — which reads as the stronger check and is the
weaker one. It passes only while `plans/` happens to hold a live plan, so **archiving the
last one turns it red**, and "completed plans move to `done/`" is the first rule this
directory documents. The gate would have punished someone for following the documented
lifecycle and blamed the exemption while doing it. It now asks the predicate about a
filename, which is unconditionally answerable. The last row of the table above is that
case, and this very archival exercised it.

Also caught: a script-gate figure of 5 that was 7 for six plans and had already shipped
into a code comment, a commit body and a PR body; the third document class needing saying
in four places rather than one; and a monotonic-numbering bullet that was upstream's rule
wearing a local label. A follow-up (PR #131, `f79e57f`) removed a second enumeration from
CLAUDE.md that went wrong within one commit of being written — prose counting a set is a
rot class no gate here can see, which is what plan 023 exists to sweep.

Panel workings are in `.scratchpad/plan-018-panel/` while 019–023 are open.

## Archived per the local convention, which is a deviation and is recorded as one

Upstream marks a plan DONE in the index and keeps the file where it is
(`skills/improve/references/closing-the-loop.md` — *"Update index status to DONE"*,
*"Don't delete plan files — they're the record"*). It defines no archive directory, so
moving satisfies it and the repo-owner convention wins. `plans/README.md` says so in
place.

# Run 5 (2026-08-07): decouple the data and the copy from the code (plans 019–023)

An autonomous run of the five plans authored at `8ce7565`, executed one at a time through
the upstream `execute` shape — a dispatched executor in an isolated worktree, then a
reviewer who re-runs the criteria rather than reading the report — with a fan-out review
panel over each resulting PR before merge.

## 019 — generate the projection's derived figures (PR #133, squash `14d652e`)

**What the plan was for.** `src/lib/projection.ts`'s header carried six derived figures
and instructed the reader, in bold, to re-derive them on a data edit. Nothing gated them
and every figure in that block except the ceiled required rate was wrong on `main` with
the suite green. The expensive part was never the wrong digits: not one of the six had its
DEFINITION written anywhere, so a reader had to reverse-engineer "the de-raced pace" from
a shipped value before they could tell whether it had rotted.

**The plan contradicted itself, and that is the record's most useful entry.** Step 2 asks
the generator to REFUSE — fail the suite — if any recorded `GOAL_YEAR` race post-dates the
frozen reference. Two do (`2026-07-29 Garmin Run`, `2026-08-02 Pesta Sukan`), so a literal
implementation makes the plan's own "`pnpm test` exits 0" criterion unsatisfiable, and the
remedy it names (advance the reference) moves assertions the same plan's Scope assigns to
plan 022. The executor converted the refusal into a **disclosure**: the scoping the plan
calls "the whole point" is implemented exactly as written, and the races that sit in
neither account are named — and, after review, PRICED — in the generated document. This is
the fifth consecutive time a stopped-or-deviating executor turned out to be a plan defect
rather than an execution failure.

## Review panel (12 agents, 17 findings: 2 MAJOR + 8 MINOR + 7 NIT, 0 agent deaths)

Both MAJORs were confirmed by a skeptic that reproduced them by execution, and **on both
the skeptic rated the finder's suggested remedy UNSOUND and built a better one**. That is
now the panel's most reliable yield.

- **The document could publish the negation of the argument it exists to make.** The
  ordering `de-raced < required < observed` had no assertion, and `render()` printed "the
  requirement does not sit between the two paces" under a heading calling the ordering a
  rule. The finder's fix — delete the honest arm — was measured to make the artifact print
  `56` as sitting between `61.54` and `76.72`, trading a contradiction for a lie. Shipped
  instead: the heading derives from the same predicate the lines do, so the file cannot
  contradict itself and the flip is a loud snapshot diff rather than a red build.
- **A non-vacuity floor that reddened on CORRECT data.** `expect(booked).toBeGreaterThan(0)`
  per sport fails once the two remaining 2026 running races are recorded — legal, imminent,
  and unclearable by `-u`. The gate now asks the wall's own `patchState` predicate instead
  of counting the tree's current contents, compares exact rates rather than ceiled ones
  (two 5 km booked races park both ceilings on the same integer), and asserts the inverse
  in its exempt arm instead of skipping past it. Found independently by two dimensions.

Also fixed: the epoch mix is priced on the required-rate cell itself, because prose two
sections up does not travel with a copy-pasted table cell; a docblock promising "a future
recording cannot quietly widen the gap" was measured false (4.43 km/wk, fully green) and
now states what the code does; a test claiming to run "on a fixture" ran on the live
calendar and compared two sets built by the predicate it then re-checked. Two REFUTED with
evidence: `AS_OF` literals reported as unmigrated are identical on `origin/main`, and a
disclosure counterfactual that is a definitional no-op.

**Rejected deliberately**: a percentage bound on the epoch mix. Built, measured, and turned
down because the threshold is arbitrary and its only remediation is out of this plan's scope.

## Verification log

Every gate re-run by the reviewer in the executor's worktree, never read from the report.

| stimulus | expected | observed |
|---|---|---|
| one recording's `metres` changed by a digit | snapshot RED | RED, diff naming de-raced `61.54 → 61.53` |
| de-raced numerator stops excluding post-reference races | RED, named | RED on 4 assertions |
| disclosure list forced empty | RED, named | RED, named |
| `bookedAhead` handed the reference-scoped list | RED, named | RED — survived the review fixes, so the old hole did not reopen |
| every remaining running race recorded (**correct data**) | snapshot only | snapshot only; `-u` clears it |
| inclusive boundary flipped to exclusive | RED | RED — was fully GREEN before the review added the on-the-day fixture race |

`toMatchFileSnapshot` was confirmed to FAIL under `CI=true` rather than write silently, which
the plan named as a STOP condition; `.github/workflows/ci.yml` runs bare `pnpm test`, so the
gate reaches the deploy.

## Post-merge activation

`main` at `14d652e`; suite re-run in the primary checkout **after** confirming `git pull`
moved HEAD to the merge commit — **486 passed / 7 skipped**, the predicted count, from 479.
Containment proven by tree diff against `origin/main` (empty), not by ancestry, which a
squash makes meaningless.

## 020 — one module per race (PR #135, squash `46119ae`)

**What the plan was for.** Adding a race meant a unique-match edit into a 1,900-line file in
which three rows share the name `Pesta Sukan Round Island Bike Adventure` and two share
`OCBC Cycle Johor Bahru`. The failure mode is a silently wrong edit. It is now a `Write` to a
new path, with every compile-time guarantee kept — which is why this is TypeScript modules
rather than Markdown with a schema.

**The plan's importer list was already stale when it ran.** It names nine; there are eleven.
`tests/derived-figures.test.ts` arrived with plan 019 four hours earlier and
`tests/clock-split.test.ts` was simply missed. `pnpm check` is the census — a plan's file list
is a lead.

## Review panel (14 agents, 20 findings: 4 MAJOR + 12 MINOR + 4 NIT, 0 agent deaths)

**The panel found the defect this migration introduces, and it was inside the gate written to
prevent it.** Two dimensions found it independently.

`tests/data-contract.test.ts`'s glob-drop gate read
`readdirSync(DIR).filter((f) => f.endsWith(".ts"))`, and its own comment claimed it read the
directory rather than globbing a second time *"because a second glob shares the mechanism it is
checking"*. **That reason was false of its own implementation.** Measured on full builds, twice:

| stimulus | suite | shipped site |
|---|---|---|
| `git mv <race>.ts <race>.mts` | 491 passed, exit 0 | race absent from `dist/llms.txt` and the wall |
| `git mv <race>.ts races/2023/` | 491 passed, exit 0 | same |

A whole race deleted from production with the deploy gate green. The gate now enumerates every
file under `src/data/races/` **recursively with no extension filter**, imports each, and requires
it to have put its default export into `EVENTS` by identity; an import that throws is reported
with its error rather than skipped.

Three more holes, each reproduced by execution:

- **`pnpm check` stopped type-checking a race module.** `import.meta.glob<{default: RaceEvent}>`
  ASSERTS the shape. A module with `sport: "runing"` and no `satisfies` gave 0 errors — against a
  plan whose stated rationale is that every compile-time guarantee is kept. A gate now requires
  the phrase in every module.
- **The README field gate compared a FLAT set of names**, so a nested field is documented by a
  top-level namesake. `recordings.elapsed_time` already was. Adding a required `date` to
  `Recording` left the suite green while making all 14 modules a compile error. It now compares
  field PATHS, deriving nesting from the type on one side and bullet indentation on the other.
- **Nothing asserted `EVENTS` was in date order**, and `llms.txt` renders in array order. A
  *partial* reorder shipped a misordered artifact green; a full reversal only reddened another
  file's snapshot by luck.

Plus the prose the move falsified and the commit did not sweep: `README.md`'s Configuration step
still sent race edits to `constants.ts`, four "read the note above X in `constants.ts`" pointers
were false, and **7 `{@link}` identifiers across 16 sites** stopped resolving — found with a
compiler-API resolver rather than grep, and the head set is now a strict subset of the base set.

**Deliberately not done**: `.devin/wiki.json` is stale the same way and was left for plan 023,
which owns it. It is gated for durability rather than accuracy, and adding a fact there is the
mistake that file exists to record.

## Verification log

Every gate and every stimulus re-run by the reviewer, in the executor's worktree.

| check | result |
|---|---|
| `.mts` rename, after the fix | RED — `puts every file in the directory into the array, whatever it is called` |
| subdirectory move, after the fix | RED — same named assertion |
| partial reorder, **in isolation** | RED — the date-order gate alone |
| module without `satisfies` | RED — named |
| required `date` added to `Recording` | RED — `expected [ 'recordings.date' ] to deeply equal []` |
| field added to the type, not the README | RED — the direction that matters most |
| `dist/` vs the `86f9a15` build | **byte-for-byte identical**, 17 files each side, content-hashed names included, `build-date` 2026-08-08 on both |

The baseline was built from a clean `git archive` extraction, never `git stash` — the stash stack
is shared across every worktree of this repo and held nine entries from other sessions throughout.

**One done criterion reads FALSE on `main` and the code is right — recorded so nobody "fixes" it.**
The plan asks that `grep -c "EVENTS" src/lib/constants.ts` return 0. It returned 0 at the reviewed
commit and returns **1** on `main`, because the review-fix commit retargeted a stale pointer into a
comment that now says the rule lives *above `EVENTS` in `src/data/races/index.ts`*. That is the
"delete the claim and name its source" doctrine producing exactly the sentence it should, and the
criterion's intent — no `EVENTS` code in that file — is met and separately checked (no export, no
compatibility re-export). A criterion counting a bare identifier cannot tell a reference from a
declaration; the count is the wrong instrument, not the comment.

## Post-merge activation

`main` at `46119ae`; suite re-run in the primary checkout after confirming the fast-forward moved
HEAD — **493 passed / 7 skipped**, the predicted count. Predicted `dist/` facts asserted rather
than trusting the gate: 14 `bib-cell` elements on the wall and 14 dated race lines in `llms.txt`.

# Plan 021 — split the copy out of `constants.ts` and delete the file

Merged as `4bf156d` (PR #138), archived here in the same run. Executed by a dispatched executor in
an isolated worktree; reviewed, fixed and merged by the chair. `main` was `fd8b5cf` throughout.

**The result: `src/lib/constants.ts` is gone**, and the 1,195 lines it held are five modules split
by kind — `src/content/{site,home,races}.ts`, `src/data/goals.ts`, `src/lib/goal.ts`. No barrel.
`uno.config.ts`'s one nine-name import became four lines, which SHRINKS the jiti-pinned surface.

## What the plan was wrong about, measured against `fd8b5cf` before dispatch

Every one of these was handed to the executor as a correction rather than left to be discovered:

| the plan said | the tree said |
|---|---|
| "~1,600 lines", "the 116 KB read path" | **1,195 lines / 68,835 bytes** — plan 020 had already taken 753 lines out |
| "~25 import sites" | **26 static, plus one dynamic** `await import()` in `tests/llms-dnf-fixture.test.ts` |
| the allocation table, as the whole allocation | it names only the EXPORTS. **Four module-private declarations had to travel with them and the table is silent about all four**: `STRAVA_PROFILE_URL`, `FULL_NAME`, `type GoalSource`, and the `strava-progress.json` import |
| `README.md:145` and `:106` | six README lines go false, not two |

**`src/content/` was PROBED, not assumed.** Astro reserves that directory for content collections,
which reads like a blocker for an allocation the maintainer had already signed off. A throwaway
worktree at `fd8b5cf` settled it in five minutes: a plain `.ts` module there builds, renders, passes
`astro check` 0/0/2, and — the load-bearing half — **loads through unconfig/jiti from
`uno.config.ts`**. With no collection config in the repo it is ordinary source. The hazard is now
written into CLAUDE.md with both config spellings in `NAMED_AS_ABSENT`, so the absence that makes it
safe is asserted rather than assumed.

**The executor overruled one of the corrections and was right.** The delta put the
`strava-progress.json` import in `src/lib/goal.ts`; the consumer is `RAW_GOALS`, which lives in
`src/data/goals.ts`. The compiler settled it.

## The review panel: 20 agents, 5 lenses, 29 findings, 0 deaths

5 of 5 lenses passed calibration. Both planted controls were correctly REFUTED — including the
false one, killed by a skeptic that reversed the first six safelist entries itself, rebuilt, and got
back a byte-identical `icons.BUUAjZ16.css`.

**Two real defects, both introduced by this branch, both invisible to the whole suite:**

1. **18 `{@link}`s stopped resolving.** Splitting one module into five turned the unresolved set
   from a strict subset of the base's into a SUPERSET. Fixed with six `import type` lines across
   four files; the unresolved set is now an exact EQUALITY with `fd8b5cf`'s — 18 names either side,
   zero regressed. **They must stay `import type`**: `verbatimModuleSyntax` is on, so a value import
   would close real `site↔home` and `goal↔races` cycles inside the jiti graph, whose failure names
   no source file. Four lenses found this independently and three built their own compiler-API
   resolvers that agreed site-for-site — but all three used the SAME instrument, which every one of
   them flagged in its own `harnessDoubt`.
2. **The rename opened a gate.** `docs-drift`'s "lists every test suite in the README" matched the
   bare stem, so `constants.test.ts` → `content.test.ts` moved the suite's identity onto the token
   `content`, which the same commit wrote into README seven times as `src/content/`. Proven both
   ways: with the whole `tests/content.test.ts` bullet deleted, the OLD predicate reports **zero
   misses** and the new one catches it. Three further suites (`build-output`, `derived-figures`,
   `projection`) were already vouched for by prose about the code rather than about the suite.

## The mutation table

| edit | result |
|---|---|
| a broken URL in the moved `site.ts` | RED — `tests/content.test.ts` and `tests/rendered-html.test.ts` |
| a backticked path that does not exist | RED — docs-drift's path gate, naming the line |
| the `tests/content.test.ts` bullet deleted from README, OLD predicate | **GREEN — the hole** |
| the same, NEW predicate | RED — `[ 'content' ]` |
| `total_goal` edited in its new home | RED — the same four assertions as before the split |
| `dist/` vs a `fd8b5cf` build | **byte-identical**, 17 files each side, identical filename sets, verified three times |

**A `pnpm test` dist and a `pnpm build` dist DIFFER, and comparing them reports a false failure.**
vitest exports `NODE_ENV=test`, which `tests/setup/build.ts` inherits, and that adds
`data-image-component="true"` to the portrait `<img>`. Rebuilding the UNCHANGED base with
`NODE_ENV=test` reproduces it. It cost one false "index.html differs" during the review-fix pass.
**Control the build mode on both sides.** Related: the plan specified the compare as "normalise the
build-date meta", which two lenses independently showed is insufficient — `llms.txt` carries a date
outside that meta, and a `sed`-based normaliser silently reports identical on binaries under a
non-C locale. Normalise content-hashed FILENAMES; read the meta from one HTML on each side and abort
if they differ.

## Scope: six forced, three elective, each measured

Nine files outside the plan's Scope were edited. The panel's two lenses disagreed on which were
forced (2 elective vs 3) and produced different lists of the forced six. Settled by reverting each
file individually and re-running the suite:

- **Forced** (red when reverted): `src/lib/icons.ts`, `src/lib/race.ts`, `src/data/races/index.ts`,
  `src/data/races/README.md`, `tests/strava-verify.test.ts`, `tests/llms-dnf-fixture.test.ts`.
- **Elective** (green when reverted, kept with reason): `.devin/wiki.json`,
  `scripts/fetch-strava-progress.mjs`, `tests/data-contract.test.ts`.

The measurement has a trap worth naming: `git checkout <sha> -- <file>` stages as well as writes, so
`git diff --quiet -- <file>` compares base against base and reports **NO-OP for every file**. Assert
against `HEAD` (`git diff --quiet HEAD -- <file>`) or the whole census is silently vacuous.

**The plan contradicted itself and the executor was right to deviate.** Its preamble says *"your
reviewer maintains `plans/README.md` — do not edit it"*, and its own step 2 makes that file's
docs-drift gate red, leaving no green branch. The reviewer made the two-line retarget in its own
commit; the general rule is now a local convention in `plans/README.md`.

**Left for plan 023, deliberately:** 33 prose references to `constants.ts` survive, and
`uno.config.ts:16` is one of them — a root-level file that neither of 023's residue greps reached.
Three agents found that line independently and all three noted it was owned by nobody. It is named
in 023's grep paths and its table now.

## Post-merge activation

`main` at `4bf156d`; suite re-run in the primary checkout after confirming the fast-forward moved
HEAD — **493 passed / 7 skipped across 18 suites**, the baseline exactly, which is the point of a
behaviour-free change. Containment proved by tree diff against the branch head: empty.
