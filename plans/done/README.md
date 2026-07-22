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
