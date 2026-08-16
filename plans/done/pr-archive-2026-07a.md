# Pull request archive — 1–27 July 2026

46 pull requests. Bodies and comments as they stood on 2026-08-16, the day `portfolio-v2` left its fork network and the originals stopped resolving. Index and rationale: [`pr-index.md`](pr-index.md).

Netlify deploy-preview bot comments are omitted. Nothing else is edited: bodies and comments are verbatim, including their own broken cross-references.

---

<a id="pr-25"></a>

## #25 — chore: prune dead template dependencies ahead of the Astro 7 sync

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `9481ae0ca` · `chore/prune-dead-deps` → `main` · +3/−1166 across 6 files

## Summary

Prunes dead weight inherited from the `astro-bento-portfolio` template, ahead of the Astro 6 → 7 upstream sync. No behaviour change intended.

**−36 source lines, −1130 lockfile lines.**

## Problem

Our fork is 1 commit behind upstream, and that commit is an Astro **6 → 7** major bump (plus `@astrojs/netlify` 7→8, `@astrojs/svelte` 8→9). Before taking a major framework upgrade — which includes a Vite 7 → 8 jump — it's worth shrinking the blast radius.

Auditing the tree turned up:

- **`@astrojs/solid-js` renders nothing but executes every build.** There are zero `.tsx`/`.jsx` files and no `solid-js` imports in `src/`; the only "solid" match was the Iconify collection name `fa6-solid:arrow-up`. The integration was still registered. It also declares *no* `astro` peer dependency, so it would have silently stayed on v6 through an Astro 7 upgrade.
- **12 dependencies referenced nowhere**, plus `motion` duplicated across `dependencies` and `devDependencies` at the same range.
- **A vestigial `vite` block.** `assetsInclude: "**/*.riv"` guards nothing (zero `.riv` files in the repo). `resolve.conditions: ['browser']` does *not* leak into the SSR bundle — Vite marks `conditions` non-inherited — but on the client it **replaced** the defaults `["module","browser","development|production"]` with just `["browser"]`, silently disabling Svelte's dev warnings.
- **A latent icon bug.** `Card/index.astro` referenced `fa6-solid:arrow-up`, but `@iconify-json/fa6-solid` is in neither `package.json` nor `pnpm-lock.yaml`. It never broke a build only because the icon sits in the true branch of the `{href ? ...}` ternary and no `<Card>` call site passes `href` — verified across all six usages. The first caller to pass `href` would have broken the build.

## Solution

Four atomic commits, each independently buildable:

| Commit | Change |
|---|---|
| `487d148` | Remove the Solid renderer — `astro.config.mjs` import + integration, `tsconfig.json` `jsxImportSource`, and both packages, together so typechecking never points at an uninstalled package |
| `6d6e51c` | Drop the `vite` block and the `*.riv` module shim in `env.d.ts`, plus `@rive-app/canvas` and `lenis` |
| `955539b` | Prune `d3`, `gsap`, `reading-time`, `mdast-util-to-string`, `@astrojs/rss`, `autoprefixer`, `@types/d3`, `markdown-it`, `sanitize-html`, the duplicate `motion`, `@unocss/postcss` (postcss config declares an empty `plugins` object), and `@unocss/preset-uno` (redundant — `uno.config.ts` imports `presetUno` from the `unocss` umbrella; also deprecated in unocss 66) |
| `9b207dd` | Swap the card arrow to `ri:arrow-right-up-line` from the `ri` collection we actually ship |

**Deliberately not touched:** `adapter: netlify({ middlewareMode: 'edge' })` stays byte-for-byte. Verified against `@astrojs/netlify@8.1.2` source — `middlewareMode` is still declared, with the older `edgeMiddleware` retained as deprecated. The historical trap of the adapter renaming its options every major does **not** recur at the 7→8 boundary.

## Test Plan

Run at each commit, all green on the final state:

- [x] `pnpm build` — completes, SSR function + sitemap + robots.txt all emitted
- [x] `pnpm check` — **0 errors**, 0 warnings, 6 hints
- [x] `pnpm eslint` — 0 errors (2 pre-existing `no-unused-vars` warnings, untouched)

Post-merge, confirm on the deploy: the loader fade-out and staggered card animation still run (that's what the `vite` block removal could plausibly affect), the theme toggle works, and all six icons render.

## Known issues found but deliberately left alone

- **`uno.config.ts:8-11`** — all four filesystem globs have a stray double closing brace (`...,svelte,astro}}`), so the explicit content scan matches nothing and UnoCSS falls back to the Astro integration's default extraction. Fixing it would *add* content sources and could change generated CSS, so it does not belong in a no-op cleanup PR.
- **Nothing lints `.ts`.** Both the `eslint` script and the lint-staged glob are `src/**/*.{js,astro}`, and there is no CI workflow. This is how the `2,246.4` syntax error reached production in `bb38e7e` (fixed in `2595328`). Widening the glob requires registering `@typescript-eslint/parser` first — kept as a separate decision.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-26"></a>

## #26 — chore: sync upstream — Astro 6 → 7 major bump

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `4550e1f50` · `sync/upstream-astro7-2026-07` → `main` · +1376/−1252 across 3 files

Clears the "1 commit behind `Ladvace/astro-bento-portfolio:master`" state by merging `bc5e4ed`, which is an **Astro 6 → 7 major bump**. Follows #25, which pruned the dead template deps so this diff stays legible.

## Dependencies

| package | from | to |
|---|---|---|
| `astro` | `^6.1.3` | `^7.1.3` |
| `@astrojs/netlify` | `^7.0.6` | `^8.1.2` |
| `@astrojs/svelte` | `^8.0.4` | `^9.0.1` |
| `@astrojs/sitemap` | `^3.7.2` | `^3.7.3` |
| `@astrojs/check` | `^0.9.8` | `^0.9.9` |

Pinned **above** upstream in two places:

- `astro ^7.1.3`, not upstream's `^7.0.9` — 7.1.3 fixes image optimization spawning too many parallel processes in CPU-limited containers. That is exactly Netlify, and we optimize `me.webp`.
- `@astrojs/svelte ^9.0.1`, not `9.0.0` — 9.0.0 shipped a malformed `peerDependencies` (`astro ^7.0.0-alpha.0`), fixed in 9.0.1.

Upstream's `package.json` also adds `@astrojs/db`, `@astrojs/markdown-remark`, `@swup/*` and `@astrojs/solid-js`. None are taken — #25 removed them, and `@astrojs/db` no longer exists in Astro 7 at all.

## Conflict resolution

All three conflicts (`astro.config.mjs`, `package.json`, `pnpm-lock.yaml`) resolved to our side, then edited by hand.

`astro.config.mjs` ends up **byte-identical to before the merge**. Upstream's version adds a 35-line `fonts:` block referencing a `fontProviders` import it never makes — taking it is an instant build break. `middlewareMode: 'edge'` stays: adapter v8 still declares `middlewareMode`, so the v6→v7 option rename does not recur.

`pnpm-lock.yaml` was regenerated with `pnpm install`, never hand-merged.

## Verification

| gate | result |
|---|---|
| `pnpm build` | green |
| `pnpm check` | 0 errors, 0 warnings, 6 hints — **identical** to the Astro 6 baseline |
| `pnpm eslint` | 0 errors, 2 pre-existing warnings (no `.astro` file changed) |
| peer deps | no unmet `astro@` peer |
| Vite majors | exactly one — `8.1.5` |

There is no `.npmrc`, so `strict-peer-dependencies` is false and a half-applied bump would install cleanly and only explode later. The last two gates were asserted manually for that reason.

**Astro 7 replaces the Go compiler with a Rust one, with no fallback flag.** It requires non-void elements to have closing tags and no longer auto-corrects invalid HTML. `BasicLayout.astro:61` has a self-closed `<script type="application/ld+json" .../>` — non-void, raw-text content model — so a mis-parse would silently swallow the rest of `<head>` with a *green* build. Checked by rendering rather than assuming: the JSON-LD, the umami tag and the sitemap link all survive, `<body>` is intact, both Svelte islands hydrate, and all 7 icons render. Left as-is since the behaviour is verified correct.

Also confirmed non-issues: no `src/fetch.ts` (newly reserved), no markdown or content collections (so the remark → Sätteri default swap cannot bite), no `astro:transitions` usage. The `<Image>` output is structurally unchanged from Astro 6.

## Unrelated but folded in

`.gitignore` now covers `.scratchpad/` and `.claude/worktrees/`. Both were untracked, and `.claude/worktrees/` can hold a full nested checkout that a broad `git add` would stage. Bundled here rather than pushed separately so it costs one deploy instead of two.

## Merging

**Use "Create a merge commit".** Squash and rebase both collapse to a single parent, which leaves the fork stuck at 1 behind — the badge tracks commit *reachability*, not content. Verify after:

```
git merge-base --is-ancestor upstream/master main; echo $?   # expect 0
```

Then follow the git-push deploy with a **cache-cleared** Netlify build (Deploys → Trigger deploy → Clear cache and deploy site). After the 5→6 bump we hit a runtime "does not provide an export named X" from a stale cached `node_modules` behind a green build, and 7 changes strictly more pinned internals (`vite` 7→8, `esbuild` 0.27→0.28).

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-27"></a>

## #27 — perf: delete the client-side runtime — Svelte and motion out, CSS in

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `621dd5af6` · `003-delete-the-client-runtime` → `main` · +183/−407 across 16 files

Deletes the entire client-side JavaScript runtime. The page ships **0 external JS files** where it previously shipped **6 totalling 106,861 bytes** — replaced by 525 bytes of inline script.

Implements `plans/003-delete-the-client-runtime.md`.

## What changed

| | before | after |
|---|---|---|
| external JS files | 6 | **0** |
| external JS bytes | 106,861 | **0** (525 B inline) |
| `astro-island` markers in HTML | 9 | **0** |
| direct dependencies | 23 | **20** |

- Two Svelte islands → plain `.astro` components. `ThemeSwitcher` picks its glyph in CSS from `data-theme`; `ProgressBar` computes its width at build time and animates with `@keyframes`.
- `motion` card stagger → CSS `@keyframes` with `:nth-child` delays.
- `svelte`, `@astrojs/svelte`, `motion` removed, along with `svelte.config.js` and the pass-through `src/layouts/Layout.astro`.

## Defects fixed

1. **An invisible full-viewport click trap.** The `.loader` div was `fixed inset-0 z-50` with no CSS rule and no `pointer-events-none`. The only code disarming it ran inside a `setTimeout` after an un-awaited, uncaught async call, behind a 63 kB motion download. With JS blocked or failing, the page looked normal while every link and button was silently dead. The overlay is now deleted outright.
2. **Every CSS custom property undefined at first paint.** All six design tokens live only under `:root[data-theme=…]`, and `data-theme` was set in Svelte's `onMount` — after a 40 kB runtime hydrated. Dark-mode visitors got a white flash on every load and the toggle always rendered 🔆 before flipping. A `<script is:inline>` in `<head>` now sets it before first paint.
3. **`.svelte` files were invisible to every gate.** `pnpm eslint` and `lint-staged` glob `{js,astro}`, and `astro check`/`astro build` were shown to pass with an undefined call injected into `ThemeSwitcher.svelte`. Deleting the files removes the blind spot rather than papering over it.
4. **The progress bar required JS to show a value.** The SSR'd HTML shipped `width: 0%` next to text reading "2246.4 km of 3000 km". It is now correct without JS, clamped to [0,100], and respects `prefers-reduced-motion` (the JS version never did).

## Verification

- `pnpm test` → **41 passed** (was 38; +3), `pnpm check` → 0 errors, `pnpm eslint` → 0 errors, `pnpm build` → Complete
- **All 3 new tests mutation-tested.** Removing the inline theme script, re-adding a `.loader` div, and forcing an external JS chunk each turned **exactly one** test red and nothing else.
- **Stale-artifact check**: a JS file planted in `dist/_astro` before a rebuild is cleared by `astro build`, so the "zero external JS" assertion is not vulnerable to the false-pass that affected plan 002's SSR-function assertion.
- Class strings verified character-identical to the Svelte originals: `ThemeSwitcher` is `theme-toggle ` + the original 350 chars; `ProgressBar`'s fill is the original minus exactly the four transition utilities the keyframe replaces.
- No stray UnoCSS utility rules emitted from the keyframe names (`progress-grow`, `card-in`).

## Plan amendment included

`f044fdf` fixes a real ordering defect the executor caught and stopped on: the "zero external JS" test sat in step 6, one step before step 7 removes the `svelte()` integration. `@astrojs/svelte` emits its `client.svelte.*.js` runtime **purely because it is registered** — regardless of whether any `.svelte` file or `client:*` directive survives.

Verified by elimination: at the end of step 5 the tree had zero `.svelte` files and zero `client:` directives and still emitted a 29,694-byte chunk across a full clean rebuild; deleting only the two `svelte()` lines took `dist/_astro` to zero. The test moved to step 7d so every step still ends on a fully green suite. The commit also re-measures the client-JS baseline against the current lockfile (the plan's 95,031 figure came from a spike worktree whose `node_modules` resolved ~12% smaller; the file count of 6 was right).

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-28"></a>

## #28 — fix: correct five rendered-output defects, and assert every one

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `ef0da280a` · `fix/004-rendered-output-defects` → `main` · +142/−70 across 13 files

Fixes five rendered-output defects that survive `pnpm check`, `pnpm eslint` and a green `pnpm build`, and lands each fix together with the assertion that would have caught it. **+7 tests (41 → 48).**

Implements `plans/004-fix-rendered-output-defects.md`.

## Defects fixed

**1. The JSON-LD `Person` block was malformed and factually wrong** — live in production for roughly two years.

| field | before | after |
|---|---|---|
| `sameAs` | `[[…]]` — array-of-arrays, invalid for a `URL` range | flat list of 5 absolute URLs |
| `sameAs` contents | included `/resume.pdf`, a site-relative path | filtered to absolute URLs only |
| `worksFor.name` | `"Founding Solutions Engineer"` — a copy-paste of `jobTitle` | `"HeyMax"` |
| `@context` | `http://schema.org` | `https://schema.org` (cosmetic, not a bug) |

Still fully derived from `LINKS` and `CAREER` in `src/lib/constants.ts` — add a social profile and it appears in `sameAs` automatically.

**2. `text-sm-1` generated no CSS at all.** Three bullet lists (about-me, both career entries) silently rendered at the inherited 16px. Corrected to `text-sm` → 14px, matching every other small-print block. **This is the only intentional visual change in the entire seven-plan refactor.**

**3. The hero portrait carried an inert `sizes` attribute.** Astro emits `srcset` only when given `widths` or `densities`; neither was present, so per spec the attribute was a no-op. Deleted rather than adding `widths` — the rendered box is 275 CSS px and the delivered bitmap is a pixel-exact match at 1× DPR, so a 550px rendition would cost ~9.8 kB on every high-DPI viewport for a sharper portrait. That is the owner's call, not a defect fix.

**4. `Card` advertised a 10-prop API of which 3 were real,** plus an `href` branch that had never executed. Collapsed to `title`/`colSpan`/`rowSpan`, and `Content.astro` (14 lines, one consumer) inlined and deleted. This removes the repository's only *static* `astro-icon` reference — **plan 006 depends on it.**

**5. `Button` declared a `rounded` prop nobody passes** and silently swallowed the `aria-label` both call sites gave it. Collapsed to a bare `<button>` with no prop surface, and the two dead `aria-label` props deleted at the call sites.

> Deliberately **not** "fixed" by forwarding `aria-label`: every button already gets its accessible name from its `<span class="sr-only">` child, and `aria-label` takes precedence over content — forwarding would *downgrade* "Github Profile" to "Github".

## Verification

- `pnpm test` → **48 passed** (41 + 7), `pnpm check` → 0 errors, `pnpm build` → Complete
- `pnpm eslint` → 1 warning, down from 2 — the `colorText` warning is gone
- **All 7 new assertions mutation-tested.** Reverting each fix individually — nesting `sameAs`, restoring `worksFor.name`, downgrading the context to `http`, reinstating the `text-sm-1` typo, putting an overriding `aria-label` on the `<button>` element, re-adding the inert `sizes`, retyping `NOW.description` as an array — turned exactly the expected test red each time. Re-introducing `custom-btn` or `transform-y-[` each tripped the new source-hygiene tripwire.
- **`Card`'s class string proved unchanged**: the new literal string is character-identical to what the old template produced with no props passed, minus only the dead `transform-y-[-40%]`. The three literals `bg-[var(--card-background)]`, `p-6` and `h-full` are in their original positions — dropping any one would visibly break all six cards and no test covers it.

## Plan amendments included

Three defects in the plan itself, all found by the executor and verified independently before amending:

- `5d26802` — Step 4's test asserted that a button with `.sr-only` text must carry no `aria-label`, on the stated premise that the theme toggle has "an `aria-label` and no `sr-only` child". It has **both**, with identical text, faithfully reproducing the Svelte original plan 003 replaced. The invariant that matters is *no downgrade*, so the test now permits both when they agree.
- `5d26802` — Step 4's verify and a done criterion grepped for a bare `rounded-full` expecting no matches. Impossible: it is a live utility used 4× in `ProgressBar.astro` and `Pulse.astro`. Scoped to `custom-btn` and `Button`'s dead prop.
- `f324602` — a done criterion checked `description: string$` expecting 1 match; `METADATA.description` is also typed `string` and always was, so it returns 2. Replaced with the `string[]` count dropping 4 → 3.
- `5b443b1` — Excerpt 4 claimed plan 003 had replaced the `<Icon …/>` usages. Plan 006 owns that; both call sites still read as quoted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-29"></a>

## #29 — fix(image): serve the portrait at 2x density for high-DPI screens

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `b14287d36` · `advisor/008-portrait-device-resolution` → `main` · +172/−1 across 3 files

PageSpeed Insights flagged the portrait under Best Practices → **"Serves images with low resolution"**:

| | |
|---|---|
| URL | `/_astro/me.D44fd81e_1hBdqr.webp` |
| Displayed size | 275 × 275 |
| Actual size | 275 × 275 |
| **Expected size** | **413 × 413** |

`src/assets/me.webp` is **1000 × 1000** — the pixels were always there. The `<Image>` call emitted a single candidate and no `srcset`, so a DPR-2 phone painted a 275 px bitmap into a 550 px box.

## Change

`densities={[2]}` on the portrait, which emits a 550 × 550 companion:

```html
<img src="/_astro/me.D44fd81e_1hBdqr.webp"
     srcset="/_astro/me.D44fd81e_1iSPVs.webp 2x"
     … width="275" height="275">
```

| asset | dimensions | bytes | fetched by |
|---|---|---|---|
| `me.D44fd81e_1hBdqr.webp` | 275 × 275 | 8,892 | DPR 1 |
| `me.D44fd81e_1iSPVs.webp` | 550 × 550 | 20,860 | DPR ≥ 1.5 |

550 ≥ the 413 Lighthouse asked for. **The 1x hash is unchanged**, so a DPR-1 visitor downloads byte-identical bytes to production today; a retina visitor downloads the 2x candidate *instead of*, not in addition to, the 1x — **+11,968 bytes**. `dist/` grows 592 KB → 616 KB.

`densities` rather than `widths` because the portrait is laid out at a fixed 275 px at every breakpoint — only device pixel ratio varies. `widths` requires a `sizes` attribute duplicating the bento breakpoints, and #28 deleted an inert `sizes` from this same element.

## Test — asserts pixels, not markup

One assertion added (48 → **49**), using `sharp` (already a direct dependency, resolvable from the project root).

**Mutation-tested three ways**, each turning exactly this test red and no other:

| mutation | result |
|---|---|
| delete `densities={[2]}` | `expected undefined to be truthy` |
| `densities={[4]}` — 1100 px, upscales past the 1000 px source | `expected undefined to be truthy` |
| assert `width * 3` | `expected 550 to be 825` |

The second is load-bearing: **Astro silently discards a density that would upscale the source.** Raising the layout width past 500 px would delete the `srcset` and revert this fix *with a completely green build* — the same class of silent failure as every regression that has reached calvin.sg. The third proves the `sharp` call reads the emitted file rather than passing vacuously on `undefined`.

## Also

Dropped the unused `index` parameter on `WELCOME.description.map` — the repository's only eslint warning, and one **no plan owned** (005 excludes `src/components/`; 006 touches this file only for `astro-icon`). `pnpm eslint` now reports **0 problems**.

## Verification

`pnpm check` 0 errors / 0 warnings · `pnpm eslint` 0 problems · `pnpm test` 49 passed · `pnpm build` exit 0

## Noted, deliberately not changed

`max-h-[415px]` on the portrait is dead — the element is `w-auto` with a 275 px intrinsic width and no CSS height. Making it genuinely 415 px tall is a *design* change nobody asked for, and is not what Lighthouse flagged; it measured the displayed size at 275 and asked only for more pixels inside it. Recorded in the plan file so the next reader need not re-derive it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-30"></a>

## #30 — chore: delete dead configuration and template cruft

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `255dbca4c` · `advisor/005-delete-dead-config-and-cruft` → `main` · +11/−145 across 12 files

Pure subtraction. 47 of `uno.config.ts`'s 60 lines emitted no CSS; four tracked config files declared nothing; a 110 KB PDF nothing imported; two competing `robots.txt` producers emitting *different* content; and one font stack written three times.

## What went

| | |
|---|---|
| `uno.config.ts` | **60 → 9 lines**; `presetUno` → `presetWind3` |
| `astro-robots-txt` | removed — **20 → 19 direct deps** |
| `src/pages/robots.txt.ts` | deleted (the losing producer) |
| `public/robots.txt` | **new**, 69 bytes, zero deps and zero logic |
| `postcss.config.cjs`, `.mcp.json`, `tsconfig.eslint.json`, `jsx.d.ts` | deleted |
| `src/assets/Calvin_Loh_…_Resume.pdf` | deleted (110 KB orphan; `public/resume.pdf` is the live one) |
| `BasicLayout.astro` | the redundant `h1..h6` and `p` font-family rules |

`pnpm check` hints **4 → 2** (both `ts(6385)` `presetUno` deprecations cleared). `@typescript-eslint/parser` and `@unocss/reset` deliberately kept — both look unused and both break the build if removed.

## Evidence

**The whole-plan CSS delta is exactly one rule**, re-derived by the reviewer rather than taken from the executor's report — building `origin/main` and this branch, splitting each stylesheet into rules and sorting:

```
164d163
< h1,h2,h3,h4,h5,h6,p{font-family:-apple-system,…,sans-serif
```

13,115 → 12,962 bytes; 188 → 187 rules. That is the 153-byte rule the minifier merges from the two deleted source rules, and nothing else. **47 lines of config deleted, zero bytes of CSS changed.** `body{…font-family:-apple-system…}` confirmed still present.

`uno.config.ts` was proved **byte-identical** (219 bytes) to the text the plan specifies, programmatically rather than by eye.

The load-bearing existing assertion — the `robots.txt` test — was **mutation-tested two ways**: pointing the sitemap at the wrong host, and deleting `public/robots.txt` entirely. Each turned exactly that one test red. `git diff origin/main..HEAD -- tests/` is **empty**: the net was not weakened to fit the change.

## The one visitor-observable change

`/robots.txt` loses `Sitemap: https://calvin.sg/sitemap-0.xml`. Safe, and verified rather than assumed — `dist/sitemap-index.xml` contains exactly one `<loc>`, `https://calvin.sg/sitemap-0.xml`, so every crawler reaches it through the index.

## Verification

`pnpm check` 0 errors / 0 warnings · `pnpm eslint` 0 problems · `pnpm test` 49 passed · `pnpm build` exit 0 · `git status` clean · scope audited per-commit against the plan's in-scope list, nothing extra touched.

Excluding the plan's own narrative in `plans/`, zero functional references remain to `postcss`, `tsconfig.eslint`, `Calvin_Loh`, `astro-robots-txt`, `jsx.d.ts` or `mcpServers`. The single `postcss` hit is `pnpm-lock.yaml` — `eslint-plugin-astro`'s own transitive dependency, exactly as the plan predicted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-31"></a>

## #31 — refactor(icons): render icons via UnoCSS presetIcons, drop astro-icon

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `ad7c5bf72` · `advisor/006-preset-icons` → `main` · +81/−362 across 10 files

`astro-icon` renders each icon as an inline `<svg>` and drags `@iconify/tools` (2.0 MB) and `cheerio` (1.5 MB) into the install graph. `unocss` is **already a direct dependency** and ships `presetIcons`, which reads the **same** `@iconify-json/*` collections and emits each icon as a CSS mask rule.

| | before | after |
|---|---|---|
| direct dependencies | 19 | **18** |
| `pnpm audit --audit-level=critical` | **exit 1** | **exit 0** |
| full audit | `{critical:1, high:10, moderate:9, low:2}` | `{critical:0, high:6, moderate:4, low:0}` |
| `<svg>` in the HTML | 7 | 0 |
| tests | 49 | 51 |

Be precise about what this buys: **none of these advisories was reachable at runtime.** The site is static with no server. The exposure was build-time and developer-machine supply chain — code running during `pnpm install` / `pnpm build` on a laptop and in the Netlify container that holds the deploy credentials. Worth reducing; not a live vulnerability.

## Visitor-visible outcome: none — and this was measured, not asserted

Before dispatching, production's seven `<svg>` widths were captured while the **old** renderer was still live. The new CSS mask rules reproduce them exactly:

| icon | production `<svg>` | new CSS rule |
|---|---|---|
| github | 0.97em | .97em |
| linkedin / instagram | 0.88em | .88em |
| strava | 0.75em | .75em |
| telegram | 0.97em | .97em |
| ri:file-pdf-2-line | 1em | 1em |

(The minifier strips leading zeros; `.97em` and `0.97em` are the same value.) All six rules also carry `display:inline-block`, a mask URL, and `background-color:currentColor`, so `hover:text-[var(--accent)]` still tints the icon.

Button height is unchanged: `text-xl` line-height is **28px**, which governs over both the old 24px box and the new 20px one. All **eight** accessible names are byte-identical to production, and all seven icon spans are `aria-hidden` so the `sr-only` siblings remain the accessible names.

## A defect found in review — and it was in the plan, not the execution

Mutation-testing the new `rendered-html` assertion, I **deleted the Goal CTA's icon span outright and all 51 tests stayed green.**

`fa6-brands:strava` is used twice — a `LINKS` entry and `GOAL.cta_logo` — so **7 icon references collapse to 6 distinct classes**. The test looped over classes calling `querySelector`, which returns the first match in document order: always IntroCard's copy. The Goal CTA's icon was never examined. The plan's own warning ("six distinct icons, do not expect seven distinct classes") is what steered it there — correct for the CSS-rule check in 7b, wrong for the DOM check in 7a.

Now fixed to assert one element per **reference**, and `plans/006` Step 7a was amended to match so the next reader does not inherit the blind spot. Re-mutation-tested:

| mutation | result |
|---|---|
| delete the Goal CTA icon span | `expected 6 to be 7` |
| drop its `aria-hidden` | fails naming `i-fa6-brands-strava` |
| drop `aria-hidden` on an IntroCard icon | fails naming `i-fa6-brands-github` |

The other new assertion was mutation-tested too: dropping `extraProperties.display` and emptying the safelist each turned it red — the two silent "icons render at zero size / have no CSS rule" failures.

## Verification

Step 6's cross-check, verbatim:

```
icon classes in HTML: 6 i-fa6-brands-github i-fa6-brands-instagram i-fa6-brands-linkedin i-fa6-brands-strava i-fa6-brands-telegram i-ri-file-pdf-2-line
missing a CSS rule: 0
```

`pnpm check` 0 errors / 0 warnings · `pnpm eslint` 0 problems · `pnpm test` 51 passed · `pnpm build` exit 0 · clean tree. `@iconify-json/fa6-brands` and `@iconify-json/ri` deliberately **kept** — `presetIcons` reads them and removing them breaks every icon.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-32"></a>

## #32 — docs: correct the documentation and shipped metadata

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `759ed8f51` · `advisor/007-correct-the-docs-and-shipped-metadata` → `main` · +123/−36 across 5 files

Three documents in this repo were not merely incomplete — they were **actively wrong**, which is worse than silent. `README.md` told every forker to run `npm install` in a repo that pins `pnpm@10.32.1`, and pointed at `./components/lib/constants.ts`, a path that has never existed. `CLAUDE.md` — the first file every agent session reads — asserted an "edge middleware" deployment with no middleware file anywhere in the repo. `public/llms.txt` described the site as built with Svelte, deleted in #27.

| | before | after |
|---|---|---|
| `public/preview.jpg` | 2400×1600, 383,429 B | **1200×630, 54,485 B** (−85.8%) |
| README install steps | `npm install` / `npm run dev` | `pnpm install` / `pnpm dev` |
| README config path | `./components/lib/constants.ts` (never existed) | `src/lib/constants.ts` |
| CLAUDE.md deployment | "server-side rendering", "edge middleware" | static build, no adapter, no middleware |
| tests | 51 | 51 — **no code changed** |

`git diff --stat origin/main..HEAD -- src/ package.json pnpm-lock.yaml tests/` is **empty**.

## The job title: this plan was amended before it ran

As authored, Step 5a rewrote `llms.txt`'s title from "Business Systems Analyst" to "Founding Solutions Engineer". That was correct at authoring time — and `3f45874` inverted it. Running it verbatim would have **published a job title Calvin does not hold** to the file whose entire purpose is giving AI crawlers an authoritative bio.

Neither guard would have caught it: the drift probe reports *whether* a file changed, not whether the instruction still points the right way, and the plan's own verification would have **half**-passed. Step 5a now verifies line 3 against `CAREER[0]` instead of editing it. `git diff -- public/llms.txt` is exactly **1 insertion / 1 deletion, on line 7 only**.

## Three plan defects, all found and fixed here

**1. An anti-regression grep that could never pass.** `grep -nEi "npm (install|run)"` is unanchored, and `pnpm install` *contains* `npm install`:

```
$ printf "pnpm install\\n" | grep -nEi "npm (install|run)"
1:pnpm install
```

So the moment Step 3b mandates `pnpm install`, the check matches it. Unsatisfiable by construction, regardless of content. Now anchored to line start, so it matches real commands in fences but not prose and not `pnpm`. The same broken pattern was in the CLAUDE.md check, which passed only by luck.

**2. The README stated the wrong Netlify build command.** Step 3d said "Netlify's build command is `pnpm build`". It is `pnpm check && pnpm test`, from `netlify.toml` — the plan predates that file (#26). The wrong version understates the gate: it reads as though deploys skip the suite.

**3. `CLAUDE.md` named a file that no longer exists.** It claimed the Card system is `index.astro` **and `Content.astro`**; #28 deleted `Content.astro` in this same chain, and Step 4d explicitly said to leave that bullet alone — so this plan would have shipped a docs fix that leaves a dangling file reference in the first file every agent session reads.

All three are corrected in `plans/007-*.md` as well as in the files, so the plan stays a true record.

## Every new factual claim was checked against the repo

| claim | verified |
|---|---|
| `SKIP_BUILD=1` reuses an existing `dist/` | real — `tests/setup/build.ts:20` |
| icon names checked against installed collections | real — `ICON_COLLECTIONS = ["fa6-brands","ri"]` |
| "Animation: CSS animations only" | `@keyframes`/`animation:` present, no JS animation library |
| `robots.txt` shipped in build output | `public/robots.txt`, copied verbatim (#30) |
| `pnpm preview` serves on :4321 | returns **200** |
| theme set pre-paint by `<script is:inline>` | present, `BasicLayout.astro:64` |

The `CLAUDE.md` Memories contract about `src/lib/constants.ts` survives **verbatim** — other plans and agent sessions depend on it.

The resized `preview.jpg` was **viewed, not just byte-counted**: full page intact, no crop, and the `#111111` pillarbox is invisible against the page background.

## Left for the maintainer, deliberately

The screenshot is still the **August 2024** site — "Software Engineer", five social buttons, 1440.1 km. This plan only resized it. Regenerating means choosing a viewport, waiting for the right paint and judging the framing — decisions an executor cannot verify it got right, and a wrong one ships a broken card to every LinkedIn and Slack unfurl. Same for the 13-month-old `#cyclehome` line in `constants.ts`: it is Calvin's own voice, and an agent should not rewrite it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-33"></a>

## #33 — chore(plans): archive the completed run, leave a living index for the next one

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `c8fe10f35` · `chore/archive-completed-plans` → `main` · +409/−291 across 10 files

All eight plans are DONE, merged and live, so `plans/` had become a 6,306-line wall of finished work with no signal about what a **new** run should know. This restructures it around that question.

```
plans/
  README.md      151 lines — the living index: what still binds a future run
  done/
    README.md    the full verification log for plans 001–008
    001-*.md … 008-*.md
```

**Decisions stay at the top level; evidence moves to the archive.**

## Why move rather than delete

The improve skill is explicit — *"Don't delete plan files — they're the record."* Calvin's own convention (`CLAUDE.md`) archives completed plans to `plans/done/`. Those reconcile cleanly as **move, never delete**, which is what this does; git recorded all nine as renames, so history is intact.

The skill defines no archive directory of its own (checked), so the repo-owner convention wins.

## What the living index keeps

Only what a future run needs *before it audits anything*:

- **Numbering continues at `009`.** The skill requires monotonic numbering across runs — freeing up `001` was explicitly *not* a goal.
- **The six refuted findings**, verbatim, so an adversarially-vetted result is not re-derived at full cost.
- **The two deliberately-not-planned items** — the maintainer's call, not oversights.
- **A current architecture baseline** (18 deps, zero client JS, zero `<svg>`, 51 tests, static output, deploy gated on `pnpm check && pnpm test`) so a fresh audit starts from facts instead of re-deriving them — with an instruction to re-verify before relying on any of it.
- **The open items that are the maintainer's call** — the August 2024 screenshot, and `llms.txt` hand-duplicating `constants.ts`.

## The finding that matters most

The index now flags that the **standing autonomous run prompt contains a stale premise**:

> *"this repo has zero automated tests, so plan 001 must establish a regression safety net first"*

There are now **51 assertions** gating production via `netlify.toml`. Re-running that prompt verbatim would spend its first and most expensive plan rebuilding something that already exists — the exact stale-premise failure mode that produced 12 of the 13 defects in the last run.

## Verification

The risk in splitting a document is silent loss, so it was checked rather than eyeballed:

- Both preserved sections are **byte-identical** to the originals (1,875 and 898 chars) — extracted programmatically, not retyped.
- **Every `##`/`###` heading** from the old index was confirmed present in either the index or the archive; none lost.
- All eight verification-log entries confirmed present in the archive.
- Every internal markdown link resolves.
- `pnpm check` 0 errors · `pnpm eslint` 0 problems · `pnpm test` 51 passed · `pnpm build` exit 0 — `plans/` is not a build input, but proven rather than assumed.

## Deliberately not done

Cross-references *inside* the archived plans still read `plans/00N-*.md` rather than `plans/done/00N-*.md`. Rewriting 6,000 lines of archived record to fix a cosmetic staleness risks corrupting the evidence; the files all sit in one directory, so the reference stays unambiguous. A note in `done/README.md` says so.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-34"></a>

## #34 — docs(plans): add run-2 plans 009–010 and update the living index

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `82cef9d42` · `improve/run2-plans` → `main` · +536/−5 across 3 files

## Summary
Run 2 of the autonomous improve cycle, audited at `c8fe10f`. Nine read-only category auditors + an adversarial skeptic per finding returned **8 findings, 2 worth acting on** — five categories (security, performance, DX, docs, direction) returned zero, the expected outcome on this baseline.

## What this adds
- **Plan 009** — in-range lockfile refresh (`pnpm update --no-save`): clears 9 of 10 audit advisories (all 6 highs). Pre-verified empirically; the 1 residual moderate (`@opentelemetry/core`) is exact-pinned by `@netlify/otel@6.0.3` and documented as unreachable in-range.
- **Plan 010** — layout-head hardening: default `data-theme="light"` on `<html>` for no-JS visitors, delete the dead `|| METADATA.image_url` fallback, and add social-preview tag assertions to the dist suite.
- **plans/README.md** — run-2 refuted findings recorded (nationality coupling, llms.txt tripwire test, email_obfuscated deletion, eslint-plugin-astro 3.x / TS7 / lint-staged 17 upgrades, security headers, DX micro-items), baseline audit line corrected (6H+4M, no drift), numbering advanced to 011.

Docs-only: no source, test, or dependency changes in this PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-35"></a>

## #35 — chore(deps): refresh the lockfile in-range, clearing 9 of 10 audit advisories

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `c00dd73b0` · `improve/009-refresh-lockfile` → `main` · +901/−883 across 1 files

## Summary
Plan 009 (run 2). `pnpm update --no-save`: an in-range, lockfile-only refresh. No manifest, source, config, or test changes.

## Problem
`pnpm audit` reported 10 advisories (6 high, 4 moderate), all on transitive dev/build-only paths, all stale-lock rather than stuck-manifest. A 10-advisory floor makes the next real advisory illegible.

## Solution
Refresh the lockfile within declared ranges: fast-uri 3.1.4, tmp 0.2.7, js-yaml 4.3.0, brace-expansion 1.1.16/5.0.7, postcss 8.5.21, eslint 10.7.0, unocss 66.7.5, @typescript-eslint/parser 8.65.0, typescript 6.0.3. No major jumps: astro stays 7.1.3, eslint-plugin-astro stays 1.7.0.

**Residual (documented, accepted):** 1 moderate — `@opentelemetry/core <2.8.0` — cannot clear in-range because `@netlify/otel@6.0.3` (latest) pins it to exactly 2.7.1. No override added by design; it clears itself when @netlify/otel bumps.

## Test plan
- Executor: audit 10 → 1 moderate; `pnpm check` 0/0/2 hints; `pnpm eslint` 0 problems; `pnpm test` 51/51.
- Reviewer (independent worktree at `e4490f1`): full ladder re-run — identical results — plus `dist/index.html` and the emitted stylesheet are **byte-identical** to the pre-refresh build, so zero shipped-output change.
- Known non-blocking: pre-existing peer warning (eslint-plugin-jsx-a11y declares eslint ^3–^9, we run 10) — unchanged by this PR, lints clean.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-36"></a>

## #36 — fix(layout): default the theme for no-JS visitors, drop the dead og:image fallback, assert the social tags

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `1f06c2780` · `improve/010-harden-layout-head` → `main` · +21/−3 across 2 files

## Summary
Plan 010 (run 2). Two source edits in `BasicLayout.astro` plus two new assertions in the dist suite (51 → 53 tests).

## Problem
1. Every color token lives under `:root[data-theme=…]` and `data-theme` was set only by the pre-paint script — visitors with JS fully disabled got transparent, borderless cards (cosmetic robustness, honestly framed: a small but real slice of traffic).
2. `content={image || METADATA.image_url}` on og:image/twitter:image was pretend-defensive dead code — `image` is a template literal that is always truthy.
3. The og:*/twitter:* tags — the site's main sharing surface — had zero test coverage; deleting `twitter:image` would have shipped green.

## Solution
- `<html lang="en" data-theme="light">` — the synchronous pre-paint script still overrides for JS visitors before first paint, so nothing changes for them (no dark-mode flash).
- Deleted the unreachable fallback on both meta tags (output byte-identical).
- Two new `it` blocks in `tests/build-output.test.ts`: the theme default, and the five social-preview assertions (og:url asserted against the site origin, not the canonical — per plan 002's documented trailing-slash split).

## Test plan
- Executor: 53/53; `pnpm check` 0/0/2; `pnpm eslint` 0; dist tokenised diff shows exactly ONE delta (the `data-theme` attribute); both mutations each turned exactly the named test red.
- Reviewer: independent ladder re-run (53/53, check/eslint clean) and personally re-ran mutation 1 — exactly one test red, green on restore.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-37"></a>

## #37 — chore(plans): archive run 2 — both plans live, index and evidence updated

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `662561774` · `improve/run2-archive` → `main` · +97/−18 across 4 files

## Summary
Docs-only wrap-up of improve run 2. Plans 009 and 010 are merged (#35, #36) and verified live on production.

- `plans/009-*.md` and `plans/010-*.md` **move** to `plans/done/` (never deleted — they are the record).
- `plans/README.md` (living index): 009/010 marked DONE with merge SHAs, baseline updated (tests 53, audit 1 moderate residual with rationale), the standing-prompt staleness warning generalised, numbering already advanced to 011.
- `plans/done/README.md` (evidence): full run-2 verification log — the pre-flight catch on DEP-01's inverted "all 10 clear in-range" claim, the worktree-provisioning incident and its clean recovery, reviewer-independent ladder runs, mutation re-runs, and both preview-vs-production diffs.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-38"></a>

## #38 — chore(content): refresh preview.jpg from a current screenshot

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `4f39e651f` · `improve/refresh-preview-screenshot` → `main` · +8/−7 across 2 files

## Summary
Replaces the stale August 2024 `public/preview.jpg` (old title, five buttons, 1440.1 km) with a maintainer-provided screenshot of the current dark-theme site, resolving the open item recorded in `plans/README.md`.

## Processing
Same pipeline plan 007 established: fit into 1200×630 on a `#111111` pillarbox (sampled from the screenshot's own edges, so seams are invisible), mozjpeg q80 → **52,228 bytes** (was 54,485). Verified visually: full page, no crop; shows Business Systems Analyst, seven buttons, 2246.4 km.

## Scope
- `public/preview.jpg` — the README hero, `og:image` and `twitter:image` all resolve from this one filename; no code or markup changes.
- `plans/README.md` — open item marked resolved.

## Test plan
Full suite 53/53 (asset existence and og/twitter tag assertions included). HTML output is unchanged — only the image bytes behind the same URL.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-39"></a>

## #39 — chore(content): recompose preview.jpg as a hero-card crop filling the OG canvas

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `18f5670e9` · `improve/preview-hero-crop` → `main` · +9/−7 across 2 files

## Summary
Follow-up to #38, prompted by the maintainer: the canvas (1200×630 JPEG — the 1.91:1 og:image standard, fine for X's summary_large_image too) was already right, but pillarboxing the whole 1.44:1 page used only 76% of it and made the text tiny in unfurls.

## Solution
Crop the hero card (name, role lines, buttons, portrait) from the maintainer's screenshot and fill the canvas edge to edge: `extract(90,0,1647×800)` → `resize(1200×630, contain, #111111)` → mozjpeg q80. Text renders ~2× larger at share size; the crop ends in the gap between card rows so no stray card slivers appear. 52,228 → **45,646 bytes**.

## Test plan
53/53 (asset + social-tag assertions). No code/markup change — same filename, same URL.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-40"></a>

## #40 — chore(content): center the hero card in preview.jpg from a retaken screenshot

`merged` · opened 2026-07-21 by **calvindotsg** · merged 2026-07-21 as `719a78ed7` · `improve/preview-center-card` → `main` · +10/−6 across 2 files

## Summary
Follow-up to #39: the maintainer flagged the vertical asymmetry (card sat ~79px from the top but ~35px from the bottom — an artifact of cropping from y=0). Rebuilt from a retaken hero-card-only screenshot at higher resolution.

## Method
Detect the card's exact pixel bounds by scanning for non-#111111 rows/columns (2481×1060 at x79..2559, y133..1192), extract with a uniform 24px margin, `resize(1200×630, contain, #111111)` → mozjpeg q80. The contain letterbox now centers the card with equal ~52px bands top and bottom; both rounded card borders are fully visible. 45,646 → **42,946 bytes**.

## Test plan
53/53. Asset-only change — same filename and URL, no markup delta.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-41"></a>

## #41 — feat: add running goal card and generalize goal rendering

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `782622ef3` · `worktree-running-goal-card` → `main` · +141/−44 across 11 files

## Summary
- Adds a "My Running goal this year" card: 138 km of 1000 km, with last year shown as a dash (first year back at running)
- Generalizes the goal system: `GOAL` becomes a `GOALS` array with an exported `Goal` type; `Goal.astro` is now a prop-driven card and `index.astro` maps over the array
- Gives `ProgressBar` real accessibility semantics: `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax` and an `aria-valuetext` in km

## Problem
The goal card was hard-wired to a single sport via the `GOAL` constant. Adding a running goal would have meant duplicating the component, and there was no way to express "no comparable figure for last year". The progress bar also carried no ARIA semantics, and `METADATA.description` still advertised the outdated 3000 km cycling goal.

## Solution
- `src/lib/constants.ts`: `GOALS: Goal[]` with cycling (5000 km target) and running (1000 km target); `progress_last_year` is nullable and renders as a dash
- `uno.config.ts` safelist and all three test suites now derive from `GOALS`, so a future goal is one constants entry away
- `METADATA.description` updated to name both goals (within the 50–200 char SEO gate)

## Test Plan
- [x] `pnpm test` — 56/56 across constants, rendered-HTML, and build-output suites, including new per-goal figure and progressbar-ARIA assertions
- [x] Mutation check: rendering only the cycling card fails exactly the 3 tests guarding the new behavior
- [x] `pnpm check`, `pnpm eslint`, `pnpm build` all clean
- [x] Rendered DOM verified in a browser against `pnpm preview`: both progressbars carry correct values (44.9% / 13.8% fill); lg-grid simulation shows Running slotting directly under Cycling in column 4 with no structural regression vs production

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvin-heymax** — 2026-07-22

## Multi-agent review (26 agents: 5 dimension finders + adversarial skeptic per finding)

**21 findings judged: 16 confirmed, 1 downgraded, 4 refuted.** All confirmed findings are resolved in 1f596fa:

| Sev | Finding | Fix |
|---|---|---|
| major | Second goal card overfills the lg 4×8 grid; footer forced into a clipped implicit 9th row, shrinking all cards | `Now` card → `lg:row-span-1`; footer regains explicit row 8 col 4 |
| major | md auto-placement reshuffle renders Running + both Career cards as ~65px slivers (worsened a pre-existing pathology) | `IntroCard` → `md:col-span-2 lg:col-span-3`, eliminating the implicit md column entirely |
| major | `aria-valuemax` only checked for truthiness — a hardcoded `100` survived all 56 tests | Progressbar test pins exact `valuemin/valuemax/valuetext` + fill `--progress` per goal (mutation re-verified: now fails) |
| major | Null last-year dash rendering was unasserted — bare `{null}` interpolation and an empty fallback both survived | Positive composed-phrase assertions for both branches (mutation re-verified: now fails) |
| minor×6 | Tautological `'1000'` containment, ungated unit/emoji/percent/valuetext, description-drift gate missing | Composed phrases, exact-value ARIA asserts, new constants gates |
| minor×2, nit×2 (a11y) | Lone en dash silent to screen readers; "link" in aria-label; emoji inside progressbar | sr-only "first year back"; per-goal `Follow my <sport> on Strava` labels; `aria-hidden` emoji |
| nit×2 | Stale `GOAL` in CLAUDE.md; title/hero still cyclist-only | CLAUDE.md updated; title/hero left as editorial call |

**Downgraded** (follow-up, pre-existing site-wide idiom): `<button>` nested inside `<a>` across all 8 CTA instances — invalid HTML content model, best fixed in Button.astro for the whole site.

**Refuted** (correctly rejected by skeptics): duplicate "Follow me link" names (same destination → not a WCAG failure), unclamped aria-valuenow (unreachable: deploy gate runs the range test), safelist mutant (output-equivalent), 1000km prose "collision" (different sport/timescale).

Verified post-fix: 58/58 tests, `astro check`/eslint/build clean, both breakpoints re-measured in-browser (md: all cards 370px readable columns; lg: right column stacks Cycling→Running→Now→Footer within the 8 explicit rows, Career clipping identical to production).

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-42"></a>

## #42 — fix: restore Now card content at desktop by repacking the spare row

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `4e1567420` · `worktree-now-card-clipping` → `main` · +7/−3 across 3 files

## Summary
- Fixes the Now card's description being clipped at desktop (regression from the #41 review fix that shrank Now to `lg:row-span-1`)
- Now returns to two rows; the footer's explicit cell comes from About (`lg:row-span-3`), which has ~40px of content slack

## Problem
A one-row card is ~75px tall; with the card's `overflow-hidden`, the entire Now description vanished at `lg` (screenshot report). The #41 review correctly moved the footer out of a clipped implicit row, but paid for it with the wrong card.

## Solution
Repack the lg grid to exactly 32/32 explicit cells: About rows 5-7 col 1, Footer row 8 col 1, Now rows 7-8 col 4. `md` and mobile are untouched — the change is `lg:`-scoped on two `rowSpan` props.

## Test Plan
- [x] 58/58 tests, build clean, `lg:row-span-3` confirmed emitted in the built stylesheet
- [x] Placement verified in-browser under forced-lg: all cards land in the predicted explicit cells
- [x] Content-fit verified by cloning each card at real 264px desktop column width: Now needs 170px and gets 166px + 24px padding buffer; About 218px of 257px; Footer and careers unchanged from baseline

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvin-heymax** — 2026-07-22

## Multi-agent review (16 agents: 4 layout finders + adversarial skeptic per finding)

**12 findings judged: 8 confirmed, 3 downgraded, 1 refuted.** Verdict on the original 2-line repack: **placement is correct** — an independent cell-by-cell auto-placement simulation reproduced the claimed 32/32 explicit pack exactly (About r5-7c1, Now r7-8c4, Footer r8c1, no holes, footer explicit).

What the panel caught beyond that, now addressed in d72d427:

| Sev | Finding | Resolution |
|---|---|---|
| major→minor | Fit was verified only at the 800px cap — `lg:h-screen` shrinks rows on short laptops (1366×768 ≈ 663px inner), where Now still lost its last line and About picked up a new ~5px cut | `lg:min-h-[736px]` floor: short windows scroll a few px instead of clipping; 736px headlessly verified as the height where all 8 cards fit with ≥6px visible margin. Re-measured natively at a real 1041px lg viewport: all cards fit at the cap; with height forced below the floor the worst overrun (18px, Now) stays inside the 24px card padding |
| nit | A third goal card would push Now into a zero-height implicit row again (verified by simulation) | Advisory comment above the `GOALS.map` documenting the 32/32 pack |
| nit | Commit arithmetic: "166px + 24px buffer" double-counts padding (166px is already the padding box); About clone under-measured by ~18px | Corrected here: Now's content box is 118px + 24px padding before the clip edge; measured content ~112px → ~6-22px true slack. About needs 236px against 260px — fits |
| nit | Career tails' collapsed implicit rows still cost two 16px gutters (rows 76px, not 80px) — pre-existing on main | Left as follow-up: `lg:row-span-4` on Career would reclaim 32px but needs its own content-fit verification |

**Refuted**: one judge's row-math attack on the finder (the 9-gap arithmetic was right; the finder's target formula was mis-stated).

Verified post-fix: 58/58 tests, build clean, `lg:min-h-[736px]` emitted in the stylesheet.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-43"></a>

## #43 — docs(plans): run-3 plans 011–014 (emoji→icons, UnoCSS cleanup, stagger fix, coverage)

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `3ddf269c1` · `improve/run3-plans` → `main` · +1250/−13 across 5 files

## Summary
Run-3 planning artifacts: two maintainer-mandated items and the two findings that survived adversarial vetting in the nine-category audit.

- **011** — migrate all 8 remaining emojis to UnoCSS presetIcons icons (`ri` collection), with an emoji-lock test on the built output
- **012** — remove 9 evidence-verified no-op UnoCSS classes (tilt-effect relics) and add a class↔rule tripwire test
- **013** — fix the entrance-stagger off-by-one (8 cards, 7 delay rules — regressed by PR #41) and pin the ladder to the card count
- **014** — assert NOW.description and Career dates/company survive the render (currently deletable with a green suite)

## Test plan
Docs-only PR — no source changes. Each plan carries its own verification ladder and mutation checks, executed per-plan in follow-up PRs.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-44"></a>

## #44 — refactor: migrate every emoji to a UnoCSS presetIcons icon (plan 011)

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `79502035b` · `improve/011-emoji-to-icons` → `main` · +96/−27 across 11 files

## Summary
Maintainer-mandated migration: all 8 remaining emojis now come from the existing `ri` icon collection — zero new dependencies, zero `<svg>`, zero client JS.

- CAREER `emoji` field renamed to `icon` (`ri:tools-line`, `ri:search-line`), rendered via a new optional `titleIcon` prop on Card
- GOALS `goal_logo` now holds iconify ids (`ri:riding-line`, `ri:run-line`); the `scale-x-[-1]` flip is dropped — it mirrored the left-facing emoji, and the ri glyphs face right
- Hero 👋 → inline `ri:hand` (decorative, aria-hidden) via `WELCOME.greeting_icon`
- Footer ❤️ → `ri:heart-fill` + sr-only "love" (the heart is semantic); FOOTER split into `{prefix, icon, suffix}` with the words byte-identical
- ThemeSwitcher 🔆/🌙 CSS `content` → literal sun/moon icon spans toggled by `data-theme`
- New safelist entries + build-gating **emoji-lock test** scanning `dist/index.html` and the stylesheet for emoji codepoint ranges

## Test plan
- 61 tests pass (58 baseline + 3 new); `pnpm check`/`eslint`/`build` clean
- Mutation-tested twice (executor: FOOTER emoji; reviewer: goal_logo emoji) — each failed exactly the guarding tests, then green after revert
- Prose proved byte-identical modulo emoji programmatically

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-45"></a>

## #45 — docs(plans): mark plan 011 DONE

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `9ed1c3a2a` · `docs/011-done` → `main` · +1/−1 across 1 files

Index update after merging #44 (emoji→icons migration, squash `7950203`). Main re-verified green: 61 tests.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-46"></a>

## #46 — refactor: remove no-op UnoCSS classes left by the deleted tilt effect (plan 012)

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `6f0e24c4b` · `improve/012-remove-noop-unocss-classes` → `main` · +68/−16 across 6 files

## Summary
Maintainer-mandated cleanup, verified class-by-class against the built stylesheet: nine dead/no-op tokens removed — `card`, `group`, `perspective-1200`, `justify-start`, `flex-none`, `h-full`, two `z-20`s, `sm:gap-2`, and a bare `transform`. All are relics of the upstream 3D-tilt hover effect whose JS was deleted in plan 003.

**One removal was not a pure no-op**: `perspective-1200`'s stacking context was accidentally load-bearing — the intro-card portrait sits at `z-[-1]` at mobile and must stack above the card's opaque background. It is replaced by `isolate` (intent-revealing, same effect), with a frontmatter comment so it isn't re-flagged as dead. Caught by the plan's mandatory before/after screenshot check; the executor's STOP and the corrected root-cause analysis are recorded in the amended plan file.

A new **class↔rule tripwire test** fails the build if any class token in the shipped HTML has no rule in the emitted stylesheet.

## Test plan
- 62 tests pass (61 baseline + 1 tripwire); `pnpm check`/`eslint`/`build` clean
- Mutation-tested twice (executor: `unstyled-probe`; reviewer: `orchestrator-probe`) — each failed exactly the tripwire, green after revert
- Markup proved byte-identical modulo class attributes and the stylesheet content-hash
- Before/after headless-Chromium screenshots byte-identical at 375×667; 1280×800 differs only in the Pulse ping animation bbox

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-47"></a>

## #47 — docs(plans): mark plan 012 DONE

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `51514177a` · `docs/012-done` → `main` · +1/−1 across 1 files

Index update after merging #46 (no-op UnoCSS class removal, squash `6f0e24c`). Main re-verified green: 62 tests. Plan file on the branch carries the amended perspective-1200→isolate root-cause record.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-48"></a>

## #48 — docs: add .devin/wiki.json to steer DeepWiki generation

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `5b73719a9` · `worktree-devin-wiki-steering` → `main` · +102/−0 across 1 files

## Summary
- Add `.devin/wiki.json` steering DeepWiki to 8 curated pages (down from the ~30-page auto-generated structure) plus 8 `repo_notes` of global guidance
- Target audience: returning maintainer first (invariants, gotchas, "do not helpfully fix" ledger), recruiters/peers second (zero-JS architecture, test-gated deploys, governed agentic maintenance)
- `plans/` collapses to a single Engineering Log page; per-component pages, glossary, and archive boilerplate are excluded
- Evergreen revision (`ea486a1`): no frozen counts in titles or prose — run arc, plan statuses, suite/component counts, and grid arithmetic are derived from the repo at generation time, so the wiki stays correct as this work-in-progress repo evolves

## Problem
The auto-generated DeepWiki blended upstream-template knowledge into descriptions of this fork (Card `href`/`bgColor` props, an IntersectionObserver ProgressBar — neither exists), hit the 30-page cap on a ~30-source-file single-page site, and sprouted low-value archive pages from `plans/`.

## Solution
Multi-agent rethink: 3 understanding agents (repo inventory, default-config fact-check, DeepWiki value-prop), a 3-lens design panel (maintainer-first / showcase-first / minimalist) with judge synthesis, then one adversarial skeptic per page refuting every concrete claim in its purpose — 17 corrections applied (wrong commit hash, unconditional Umami tag described as gated, `NOW` lacking a rendered-HTML assertion, a paraphrase posing as a quote, etc.). Volatile facts (plan statuses, km figures, assertion counts) are delegated to generation-time reads per the repo's documented number-rot history.

## Test Plan
- [x] JSON parses and meets DeepWiki limits: 8 pages ≤ 30, 16 notes ≤ 100, max note 995 chars ≤ 10,000, unique non-empty titles
- [x] Spot-checked corrected claims at HEAD: `32071fe` is the static-output cutover, Umami tag unconditional at `BasicLayout.astro:62`, `GOALS` export is plural
- [ ] After merge: regenerate the wiki on deepwiki.com and confirm exactly the 8 specified pages are produced

## Related Issues
None — personal repo, no Linear workspace.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-22

## Fan-out review verdict (25 agents: 5 dimension finders → dedup → skeptic per finding)

**20 findings raw → 18 CONFIRMED, 2 DOWNGRADED to nit, 0 rejected.** Root cause of the cluster: main moved under the branch — plans 012–014 landed today (#46–#52), flipping three "current state" claims into falsehoods. Branch has since merged `origin/main` and all findings are fixed in `671eabe`.

| Sev | Dim(s) | Finding | Resolution |
|---|---|---|---|
| **major** | fact-check, method-audit, spec, coverage, generator-sim | NOW coverage gap frozen as fact + "report that gap" directive (×2 pages); plan 014 (#51) closed the gap mid-review, and the framing also denied the Career-dates gap | Both spots now derive the asserted export set from the suite at generation time |
| minor | fact-check ×4 | `plan 002, commit 32071fe` contradicts the execution table (`a4a3e0e`) the config declares authoritative; git proves `32071fe` IS the mainline prerender commit and `a4a3e0e` is a dangling pre-rebase hash | Kept the verified hash; removed the self-contradicting reconcile directive (history doesn't rot). **Out-of-band:** the table's plan-002 entry records a commit on no branch — worth fixing in plans/README.md |
| minor | method-audit | Stagger trap described as silent 0s-delay failure; plan 013 (#49) made it a deploy-gate failure | Recipe now cites the lockstep test |
| minor | method-audit, generator-sim | "DEAD_CLASSES is the *only* reintroduction catch"; plan 012 (#46) added the class↔rule gate | Enumerate gates at generation time |
| minor | fact-check | "icons converted *solely* by iconClass()" / "any icon not safelisted renders as nothing" — ThemeSwitcher's literal `i-ri-*` classes are the exception (build-verified) | Both claims scoped to constants-derived icons, exception named |
| minor | generator-sim | Engineering Log sourced run count/grouping from the execution table, which has no run column | Sourced from the dated `### Run N` headings + plan files' `Planned at` lines (both verified present) |
| minor | generator-sim | "both are literal test names" labels paraphrases as quotes (and "both" follows three claims) | The three exact test names now quoted |
| minor | coverage | sitemap/robots.txt owned by no page | Deploy Pipeline page now owns the crawler surface |
| nit | method-audit | `~10 small .astro files` violates the config's own no-frozen-counts rule | "a handful" |
| nit | generator-sim | Content diagram put rendered-html.test.ts downstream of `dist/` (it renders in-memory) | Diagram forks: Container render vs prerendered dist/ |
| nit | method-audit (downgraded) | Playbook stated 32/32 flatly while Architecture hedges the same figure | Aligned to quote-the-comment-at-generation-time |
| nit | generator-sim (downgraded) | Ladder derivation said "count children" but GOALS/CAREER `.map` fan-outs make JSX children ≠ rendered cards | Directive now says count map entries; lockstep test cited |

Post-fix validation: JSON valid, 8 pages / 16 notes / max note 1125 chars (limits 30/100/10k), all stale phrasings grep-confirmed gone, and the two newly introduced source claims (run headings, Planned-at lines) verified against the repo before committing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-49"></a>

## #49 — fix: extend the entrance stagger to the 8th card and pin the ladder (plan 013)

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `8036d3c8a` · `improve/013-entrance-stagger` → `main` · +16/−1 across 2 files

## Summary
Run-3 audit finding (reported independently by two auditors, skeptic-confirmed): PR #41 grew `<main>` to 8 direct children while the entrance-animation delay ladder stopped at `nth-child(7)`, so the footer card faded in on the same frame as the hero instead of last. Adds the missing `nth-child(8)` rung at 0.56s (the ladder's 0.08s progression) and a source-hygiene test comparing the ladder's max rung to `<main>`'s child count, so the next added card cannot silently fall off the cascade.

## Test plan
- 63 tests pass (62 baseline + 1); `pnpm check`/`eslint`/`build` clean
- Mutation-tested: deleting the `nth-child(8)` rung fails exactly the new test with "8 children but ladder stops at nth-child(7)"; green after restore

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-50"></a>

## #50 — docs(plans): mark plan 013 DONE

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `cca04fe85` · `docs/013-done` → `main` · +1/−1 across 1 files

Index update after merging #49 (entrance-stagger fix, squash `8036d3c`). Main re-verified green: 63 tests.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-51"></a>

## #51 — test: assert Now and Career dates/company survive the render (plan 014)

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `b7439e762` · `improve/014-rendered-coverage` → `main` · +11/−1 across 1 files

## Summary
Run-3 audit finding TESTS-01 (skeptic-confirmed): the constants tests validate `NOW.description` and Career's company/dates/URL, but nothing asserted they survive the render — deleting `<Now/>` or the Career dates/company block left the whole suite green. Pure test additions: the Career loop now checks dates, company, and the company_url anchor; a new test pins the Now card's status line to the body text (deliberately body-only, since NOW.description is a substring of METADATA.description which reaches only meta attributes).

## Test plan
- 64 tests pass (63 baseline + 1); `pnpm check`/`eslint` clean; zero source changes
- Mutation-tested four ways (executor: drop `<Now/>`, delete dates paragraph, break the anchor href; reviewer: hardcode the Now paragraph) — each failed exactly the covering test, green after revert

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-52"></a>

## #52 — docs(plans): archive run-3 plans 011–014 with the evidence log

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `60e324464` · `docs/run3-wrapup` → `main` · +119/−18 across 6 files

## Summary
Run-3 wrap-up: moves plans 011–014 to `plans/done/`, updates the living index (final baseline: 64 tests, zero emoji and zero ruleless class tokens — both test-locked; page-weight figures in gzip), and appends the per-plan verification log to `done/README.md`, including the plan-012 executor STOP and its corrected root cause.

## Test plan
Docs-only. Main verified green at 64 tests after the last merge.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-53"></a>

## #53 — fix(ui): center the goal progress icon and keep it inside a narrow fill

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `32fb69a37` · `worktree-fix-progress-icon-centering` → `main` · +2/−2 across 1 files

## Problem

Maintainer-reported (screenshot, 2026-07-22): the cycle/run icon in the goal progress bars sits visibly high, and the running icon is clipped at the fill's left rounded edge.

Root cause: plan 011 swapped the emoji glyph for a presetIcons mask box but kept the emoji-tuned offsets on the span (`absolute right-6 top-1.5 translate-x-1/2 -translate-y-1/4`):

- **Vertical**: `top-1.5` (6px) minus 25% of the 16px icon puts the icon top at **2px** in the 24px (`h-6`) bar — centered is 4px, so it rides 2px high.
- **Horizontal**: the anchor places the icon at `[fillWidth − 32px, fillWidth − 16px]`. At the running goal's 13.8% progress the fill is narrow enough that this range goes past the fill's left cap (negative on narrow cards), and the outer `overflow-hidden` clips it.

## Fix

Replace the absolute-positioning hack with flexbox on the fill: `flex items-center justify-end` (+ `shrink-0` on the icon). `items-center` centers exactly at any bar height; `justify-end` with the existing `px-2` keeps the icon's right edge 8px inside the fill's leading edge at every progress value, so it can no longer escape the fill.

## Evidence

Before/after screenshots at 375px viewport (4× crops of both bars) verified locally:
- **Before**: running icon overlapping/clipped at the fill's left cap, top of both icons at y=2px of 24px.
- **After**: both icons vertically centered (y=4–20px), running icon fully inside the 13.8% fill, cycling icon 8px inside the 44.9% fill's leading edge.

Ladder in the worktree: `pnpm check` 0 errors · `pnpm eslint` clean · `pnpm test` **64/64** · `pnpm build` green. The class↔rule tripwire test confirms every new utility token (`flex`, `items-center`, `justify-end`, `shrink-0`) has a generated rule; the rendered-html icon test confirms the `i-ri-*` token and `aria-hidden` survive.

Expected preview-vs-prod delta: confined to the class list of the `.progress-fill` div and its icon span (+ the corresponding stylesheet rules); visible text identical.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-54"></a>

## #54 — feat: automate goal progress from Strava via a daily bot-committed JSON

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `a4b419b0c` · `improve/015-strava-progress` → `main` · +810/−9 across 9 files

Executes `plans/015-automate-goal-progress-from-strava.md` (committed here), which
resolves the DIRECT-01 decision from `plans/README.md`.

## What changes

A daily GitHub Actions run (05:13 SGT) refreshes a Strava token, reads the
athlete's year-to-date ride and run totals, and commits
`src/data/strava-progress.json` **only when the numbers change**. `constants.ts`
imports that file for the two `current_progress` values. That replaces 38
commits' worth of manual bumps.

The site stays fully static: no runtime JS, no adapter, no Netlify functions.

## Where configuration lives

Per `README.md` "Configuration", every human-configurable value sits in one of
three homes — and `scripts/fetch-strava-progress.mjs` holds none of its own:

| Value | Home |
|---|---|
| `total_goal` (the targets) | `src/lib/constants.ts` |
| Athlete id | `STRAVA_ATHLETE_ID` repository **variable** (already set; public value) |
| Client id / secret / refresh token | Repository **secrets** (already set) |

The writer stores raw km; `constants.ts` clamps against `total_goal` via an
exported `clampToGoal`, so an overshot year is capped in exactly one place.

## Safety posture

- **Fail-loud tokens.** The rotated `refresh_token` in the token response is
  ignored by design. If Strava ever invalidates the stored one, the run goes red
  and the number freezes rather than silently self-healing. No PAT, no
  `gh secret set` from CI.
- **Deploy gate.** Netlify runs `pnpm check && pnpm test`, so non-finite,
  negative or shape-drifted data fails the deploy and the last good build keeps
  serving. `kmFromMeters` rejects the same garbage earlier, in the workflow.
- **No timestamp field** in the JSON — an always-changing key would turn
  commit-if-changed into a commit every day.

## Verification

- `pnpm check` 0 errors / 0 warnings / 2 hints · `pnpm eslint` exit 0 ·
  `pnpm test` 67 passed (64 baseline + 3) · `pnpm build` 1 page
- Rendered HTML byte-identical for the seeded values (`2246.4 km of 5000 km`,
  `138 km of 1000 km`) — the wiring is behaviour-neutral
- Seeded JSON is byte-identical to what the script writes, so the first run
  produces no cosmetic commit
- 5 mutations run; results and **two accepted coverage gaps** are recorded in
  the plan's step 7 rather than glossed over

## Follow-up for the maintainer (post-merge)

1. `gh api repos/calvindotsg/portfolio-v2/actions/workflows --jq '.workflows[] | {name, state, id}'`
   — this repo is a public **fork**, and GitHub disables scheduled workflows in
   forks by default. If `state` is `disabled_fork`, enable it
   (`gh api -X PUT .../actions/workflows/<id>/enable`), or the cron never fires.
2. Trigger `workflow_dispatch` once — the only true end-to-end proof, since the
   secrets are not available locally.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-22

## Review panel: 23 agents, 17 findings, 6 dimensions

Fan-out review — one finder per dimension over the diff, one adversarial reproduce-first skeptic
per finding. **5 confirmed, 9 downgraded, 3 refuted.**

### Confirmed → fixed

| Sev | Finding | Resolution |
|---|---|---|
| **major** | **Jan-1 YTD reset blocks every deploy.** `rendered-html.test.ts` located each progressbar by string-matching `aria-valuenow`. Bot-driven figures tie when Strava's YTD resets both goals to 0 on 1 Jan, so `find()` returned the Cycling bar for both goals and the `aria-valuemax` assertion failed. Netlify runs `pnpm check && pnpm test`, and the bot's commit lands on main *before* any gate — so this would have failed **every** deploy of main, not just the bot's, until a human edited the test. Raised independently by 4 of 6 dimensions. | Positional selection, asserting `aria-valuenow` instead of searching by it |
| minor | Bot push has no `concurrency` group: a manual run overlapping the cron pushes the same file from two checkouts, second one rejected | `concurrency: {group: strava-progress, cancel-in-progress: false}` |

The panel also caught that the *obvious* form of the major's fix is a regression: keeping
`expect(bar).toBeTruthy()` alongside positional selection makes it tautological, and a judge proved
it by deleting `aria-valuenow` from `ProgressBar.astro` and watching the suite stay green. The
assertion was replaced rather than left in place. Verified: 67/67 at live values **and** at `0/0`,
still red when either `aria-valuenow` or `aria-valuemax` is mutated away.

### Downgraded → doc corrections applied

- Jan-1 edge is no longer described in the plan as a "known benign edge"
- "All four step-7 mutations" → five
- Rollback recipe under-enumerated the diff (test imports, `clampToGoal`/`RAW_GOALS`, README item)
- The plan's claim that the `.mjs` sits "outside the gate twice over" — `pnpm check` does parse it,
  so a syntax error fails the Netlify build (outside the *lint* gate, inside the *build* gate)
- `CLAUDE.md` still named `constants.ts` as the only home for configurable values; now names all three

### Recorded, not fixed

`main()` in the writer is unexported and untested, so a ride/run field swap would pass the whole
suite. No live defect — the shipped mapping was verified by execution — and covering it means
refactoring `main()` for testability. Written into the plan as a known gap.

### Refuted (recorded because refutations are decisions)

- *"Required Strava scope is recorded nowhere"* — it is, twice, in the plan file shipped by this PR;
  the reporter's grep excluded `plans/`
- *"One of the 38 historical bumps is conventional-style"* — the counterexample (`2595328`) is a
  `2,246.4` → `2246.4` parse fix, not a bump
- *"Line citations are off by two"* — arithmetically true, but the plan anchors every citation to its
  own `Planned at: 32fb69a` header

### Separately settled

Our script POSTs the token refresh as `application/json` while Strava's docs show form-encoded.
Probed both with deliberately-bogus credentials: **byte-identical** structured field error
(`{"resource":"Application","field":"client_id","code":"invalid"}`), which proves the body was
parsed. Not a defect. The maintainer separately confirmed the full authenticated chain returns
`ytd_ride_km: 2246.449`, `ytd_run_km: 138.317`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-55"></a>

## #55 — docs(plans): record 015 as DONE and close out DIRECT-01

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `1bb32f62b` · `docs/015-plans-index` → `main` · +28/−13 across 1 files

The acceptance edits `plans/015-automate-goal-progress-from-strava.md` reserved for its reviewer,
now that the plan is merged (`a4b419b`) and its workflow has run green end-to-end.

## The two specified edits

- **Execution-order table**: `| 015 | Automate goal progress from Strava | P2 | M | — | DONE (a4b419b) |`
- **DIRECT-01** moves out of "Deliberately not planned". The bullet is *resolved in place* rather
  than deleted, so the reasoning survives for anyone who wonders why it sat undecided for three
  runs. Its original objection — "a build-time Strava fetch turns a static build into something
  that can fail on someone else's API" — is answered rather than overruled: the fetch happens in
  CI, and a bad or missing response simply produces no commit. DIRECT-04 stays open.

## Consistency fixes the above implies

These are not scope creep — each one is now false *because* of the two edits above:

- **"Numbering continues at `015`" → `016`.** Left alone, the next `improve` run would have
  numbered a new plan 015 and collided with the one this PR marks DONE. This is the load-bearing
  fix in the diff.
- The intro and the "deliberately not planned" preamble each counted **two** open direction
  findings; only DIRECT-04 is open now.
- Baseline block: **64 → 67 assertions**, and the two `current_progress` values are recorded as
  bot-owned (`total_goal` and `progress_last_year` are still hand-edited).
- The header said plans 001–014 are DONE with their files archived in `done/`. 015 is DONE too but
  its file is still in `plans/`, so the header now says so explicitly.

## Not done here

Plan 015's file has not been moved into `done/`. The archive carries its own README and evidence
log, so archiving it properly is a separate change rather than a `git mv` — happy to follow up.

## Verification

`pnpm check` 0 errors / 2 hints · `pnpm test` 67 passed · `pnpm build` 1 page. One file changed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-56"></a>

## #56 — docs(plans): archive plan 015 with its evidence log

`merged` · opened 2026-07-22 by **calvindotsg** · merged 2026-07-22 as `eec31289f` · `docs/015-archive` → `main` · +112/−6 across 3 files

Completes the plan lifecycle for 015 — merged as `a4b419b`, workflow verified green end-to-end,
index updated in #55. This is the archival step that was called out as not-done in that PR.

## What changes

- `plans/015-automate-goal-progress-from-strava.md` → `plans/done/` (git records it as a **100%
  rename**; the plan file's contents are untouched)
- `plans/done/README.md` gains the 015 evidence entry
- `plans/README.md` header drops the "pending archival" note

`plans/` is now just the index and `done/`, matching the state after every previous run.

## Why the evidence entry is worth its length

It records what the plan file alone does not:

- **DIRECT-01 was a maintainer decision, not an audit finding** — it sat undecided across three
  runs, so the archive says who resolved it and which four options were locked
- **A mid-execution directive forced a rework**: every human-configurable value must live in a repo
  secret, a repo variable, or `constants.ts`. That moved the athlete id to `STRAVA_ATHLETE_ID` and
  deleted a `CAPS_KM` duplicate of `total_goal` by relocating the clamp. Worth recording because
  the duplicate had a lockstep test guarding it and was *still* wrong — the fix was one home for
  the knob, not a better guard
- **The review panel's major**: bot-driven values tie every 1 January (Strava's YTD resets both to
  0), and the by-value progress-bar selector would then have failed *every* deploy of main, not
  just the bot's. The plan had called it a "known benign edge"
- **The judge's catch on the fix itself** — the obvious form leaves a tautological assertion that
  silently stops checking `aria-valuenow`
- **Post-merge activation**, down to the first bot commit (`ede28fa`) and the value it put on the
  live site
- **Two accepted coverage gaps** and the latent Netlify-billing / branch-protection risks, so a
  future run inherits them instead of rediscovering them

## Verification

`pnpm check` 0 errors / 2 hints · `pnpm test` 67 passed · `pnpm build` 1 page. No stale links to
the old path anywhere in the repo (grepped).

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-57"></a>

## #57 — fix(a11y): give the goal icon its own ink on the pink progress fill

`merged` · opened 2026-07-24 by **calvindotsg** · merged 2026-07-24 as `73713dac3` · `worktree-a11y-contrast-fixes` → `main` · +120/−1 across 3 files

## Summary

The sport icon inside the goal progress fill is near-white on light pink in dark mode — **1.89:1**, below the **3:1** that WCAG 2.2 SC 1.4.11 asks of graphical objects. Calvin reported it from the live site.

## Problem

The icon span carries no colour of its own, so it inherits `--text`. UnoCSS `presetIcons` paints the icon as a CSS mask with `background-color: currentColor`, which means whatever `color` reaches the span *is* the glyph. In dark mode `--text` is `#FAFAFA` and the fill is `--shadow` `#F3A3AA`.

Light mode was never affected: there `--text` is `#0B0B0B`, which already gives 7.14:1.

## Solution

Add an `--on-brand` ink token and declare it on the fill *surface*, so the surface owns the ink for anything painted on it. The icon span is untouched.

The token holds the same `#0B0B0B` in both themes on purpose: `--shadow` is a light pink in light **and** dark, so the ink that works on it is dark in both. In light mode that value is byte-identical to the `--text` it already resolved to, so **a light-mode regression is not representable by this diff**.

No geometry property changes (no width/padding/flex/font-size), so the earlier icon-offset regression class cannot recur. `--shadow` and `--accent` keep their exact hexes — nothing is rebranded.

## Measurements

| | before | after |
|---|---|---|
| dark: icon vs fill | 1.89:1 ❌ | **9.96:1** ✅ |
| light: icon vs fill | 7.14:1 ✅ | 7.14:1 ✅ (unchanged) |

Both confirmed twice: computed from the built stylesheet by the new test, and read back out of a real browser via `getComputedStyle` on the rendered page.

## Test plan

- [x] New `build-output` test resolves colours from the **built** stylesheet, not from source — so a utility UnoCSS fails to emit also turns it red.
- [x] Proven **RED before the fix**, with the exact reported value: `dark: icon #fafafa on fill #f3a3aa is 1.89:1`.
- [x] `pnpm test` 68/68 green after.
- [x] `pnpm check` 0 errors / 0 warnings; `pnpm eslint` clean.
- [x] Browser-verified in both themes against this branch's build.
- [x] The test reads no progress value, so the daily Strava commit cannot flip it.

## Known, deliberately out of scope

The fill still sits at **1.33:1 against the grey track** in dark mode (1.86:1 in light) — the progress boundary itself is faint. That is a separate colour decision about the track, not about the icon, so it is flagged rather than bundled here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-24

## Review panel verdict

17 agents across 5 dimensions (correctness, test-quality, a11y, design-regression, and a **method-audit** that reviewed my *verification* rather than the code), each finding then handed to an adversarial skeptic with a default-refute prior and a `fix_is_safe` check.

**12 findings — 7 confirmed, 4 downgraded, 1 refuted.** Two dimensions independently found the same major, which is the severity signal that mattered.

### Fixed in 99bf5e5

| sev | finding | resolution |
|---|---|---|
| **major** | The test resolved the icon ink **fill-first**, but CSS gives an element's own `color` priority over the inherited one. An ink utility on the icon span would render the original 1.89:1 defect with the suite green — and the span is exactly what an author reaches for when restyling an icon. | Swapped the two arms to cascade order. The skeptic proved it with pixel histograms; I re-verified both directions: span-ink mutation now **red** (was 68/68 green), fill-ink removal still **red**. |
| minor | The "under ~27px the icon overhangs onto the bare track" rationale is **factually wrong** — the fill's left edge is coincident with the track's, so the icon is clipped by `overflow-hidden`, never spilled onto grey. Found independently by 3 dimensions. | Comment corrected. The ink-vs-track assertion stays as a cheap guard against a future layout that *does* expose it, but no longer claims to describe a live case. |
| nit | The SC 1.4.11 framing **overstated** the requirement: the icon is `aria-hidden` and each card names its sport in the heading, so strict conformance is arguable. | Reworded to "the bar we hold" rather than a citation, in both the component and the test. |

### Accepted gaps (not closed — flagged so the next reviewer audits rather than rediscovers)

- **`paints()` models neither specificity nor source order.** It scans the class attribute left-to-right and takes the first token with a matching rule. The cascade-order fix closes the likeliest reintroduction path, not the general one: a span carrying *both* `text-[var(--on-brand)]` and `text-[var(--text)]` still passes while rendering 1.89:1. Closing it properly means a real CSS resolver in the test, which is more machinery than this guard is worth today.
- **Low progress clips the icon to ~32% of its glyph.** `box-border` + `px-2` floors the fill at 16px, so the glyph overflows left and is clipped. Real, but **pre-existing and byte-identical on `main`** — the skeptic refuted it as a regression from this PR.
- **forced-colors and print collapse the whole bar**, not just the icon (track and fill both become Canvas). Every claim reproduced — and reproduced identically on `origin/main`, so it is not a PR-57 defect.
- **A third theme** added without `--on-brand` would regress silently (the loop hardcodes light/dark). Downgraded to none: the scenario cannot occur today and the suggested fix broke CI.

### Refuted

One finding claimed the fix made the clipped low-progress stub conspicuous in dark mode. The skeptic measured the geometry as byte-identical before and after — the mechanism is real, the regression attribution is not.

### Out-of-band

A skeptic noticed my worktree's git **index** held a staged revert of all 109 lines — residue from the `git stash push -- src/` I used to prove the test red. Working tree matched HEAD so nothing shipped, but a bare `git commit` would have reverted the PR. Cleared.

### Gates after the fixes

`pnpm test` 68/68 · `pnpm check` 0 errors / 0 warnings · `pnpm eslint` clean · both commits signed.


---

<a id="pr-58"></a>

## #58 — fix(a11y): make the mobile hero type readable over the portrait

`merged` · opened 2026-07-24 by **calvindotsg** · merged 2026-07-24 as `72f4b1ef4` · `worktree-introcard-mobile-legibility` → `main` · +363/−5 across 4 files

## Summary

Below `md` the portrait sits behind the tagline. At 70% opacity as a flat rectangle it put mid-grey photo pixels under 20px/300 type — and washed out the face at the same time.

## Problem

Measured in headless Chromium against the **composited** background (screenshot each line's rect twice, once with the text hidden, then compute contrast against every background pixel):

| | worst pixel | pixels below 4.5:1 |
|---|---|---|
| light @360 "Road cyclist." | 2.61:1 | 55.1% |
| light @390 "Enthusiastic learner." | 2.75:1 | 45.8% |
| light @430 | fails on **four** lines incl. "Hi, I'm Calvin" | |
| dark @390 | 2.87:1 | |

Worth noting: **Lighthouse and axe both pass this page.** axe resolves backgrounds by hit-testing, and the portrait carries `pointer-events: none`, so it is invisible to `elementsFromPoint` — axe reads the card colour and reports ~18:1. That is why this needed a pixel harness, not an audit tool.

## Solution

One opacity value was doing two jobs badly. Split them:

- **The portrait keeps its three inner edges feathered** by a mask, so it dissolves into the card instead of cutting a rectangle out of it. With no seam to hide, it runs at **full opacity** — the face is the focal point again rather than a 70% wash.
- **A scrim on the type block** veils the photo only where the type sits, capping the photo's contribution behind text at 32%.

The scrim is a pseudo-element of the copy block, not a fixed-size overlay, so it tracks that block's real width and height — lengthen or add a `WELCOME.description` line and the protected area grows with it. The 32% cap is derived from the **theme tokens**, not tuned to this photograph: the worst pixel any image can contain (pure black under light text, pure white under dark) still clears 4.5:1.

Degraded modes are covered rather than assumed:
- **No `color-mix`** → falls back to an opaque card-coloured band. (An earlier draft fell back to the old 70% opacity, which would have silently reinstated the exact defect.)
- **forced-colors** → repainted as `Canvas`, because that mode drops `background-image` while leaving images unforced, which would drop the type straight onto the photograph.

## Results

All 30 line-checks pass — 3 widths x 2 themes x 5 lines, **0.0% of background pixels below floor** everywhere. Worst case rises from 2.25:1 to 8.51:1.

## Desktop is untouched — proven, not asserted

Full-page pixel diff against merged `main`:

| width | light | dark |
|---|---|---|
| 768 (the md boundary) | **0** differing px | **0** |
| 1024 | **0** | **0** |
| 1280 | **0** | **0** |
| 1440 | **0** | **0** |

## Test plan

- [x] New `tests/mobile-hero-contrast.test.ts` recomputes WCAG 1.4.3 from the **built stylesheet** against the worst pixel any photo can contain, then pins the four structural properties the arithmetic assumes: the scrim covers the type block, paints above the portrait, survives both degraded modes, and does not escape past `md`.
- [x] Proven **RED before the fix** — all 6 fail, with real values (`2.20:1` light, `1.87:1` dark). Reverted only the sources against the committed test, no stash.
- [x] `pnpm test` 74/74 · `pnpm check` 0 errors / 0 warnings · `pnpm eslint` clean.
- [x] Robust to a longer tagline and to swapping the photo — the guarantee is arithmetic over tokens.

## Also fixed

The `Card` comment no longer names a UnoCSS utility literally. I verified this footgun directly: a class named **only** inside an `.astro` frontmatter comment still emits a full real rule (probe: `rotate-47` shipped the entire transform stack for a class nothing uses).

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-24

## Review panel verdict

17 agents across 5 dimensions (method-audit, css-correctness, degraded-modes, design-regression, test-quality), each finding handed to an adversarial skeptic with a default-refute prior and a `fix_is_safe` check.

**12 findings — 11 confirmed, 1 downgraded, 0 refuted.** Fixed in `bf7d3e5`.

### Major — the test guarded the colour, not the geometry

Two dimensions found this independently. The suite pinned the 68% arithmetic but **nothing about the scrim's box**, so four ordinary one-number CSS tweaks all kept it at 74/74 green while real contrast collapsed:

| mutation | suite before | measured contrast |
|---|---|---|
| bottom fade `40px` → `120px` | 74/74 green | 3.14:1 |
| right ramp `44px` → `200px` | 74/74 green | 1.47:1 |
| `bottom: -56px` → `40px` | 74/74 green | **1.00:1** |
| `width: calc(100% + 76px)` → `calc(0% + …)` | 74/74 green | **1.00:1** |

1.00:1 is invisible text — worse than the 2.75:1 that motivated this PR. And it matters more than usual here: `netlify.toml` runs `pnpm check && pnpm test`, so **the suite is the deploy gate**. A silent hole ships.

vitest has no layout engine (linkedom only), so coverage genuinely cannot be computed in-suite. Instead all six numbers are pinned to the values pixel measurement validated, and the docstring now says plainly that it **pins rather than derives** them. **Geometry mutation score 1/5 → 5/5** — all four survivors now fail, control still fails.

### One change fixed three findings

Moving both soft edges from the gradient into the **mask**:
- **Theme-toggle flash** (minor, user-visible, introduced by this PR): a gradient is a `background-image`, which cannot transition — the scrim snapped while the card crossfaded, flashing a hard-edged panel over the copy on every toggle. Now a flat `background-color`; measured genuinely mid-crossfade at 120ms (`oklab(0.511…)`).
- **forced-colors hard edge** (2 nits): that mode forces `background-image` off, squaring the right edge into a line through the portrait. The mask survives, so the ramp does.

### Also fixed

- **`-webkit-mask-*` never shipped** — the minifier strips prefixed declarations against their unprefixed twins (3 authored, **0 shipped**), leaving `-webkit-mask-composite` dead. Removed; comment now says the no-support path is "no mask", which is the truth.
- **`/background:\s*canvas/` also matched `CanvasText`** — the one system colour that would paint the scrim the colour of the text. Anchored, plus an explicit negative assertion.
- **Two dead utility rules this PR itself introduced** — `.block` from the word in a comment, `.static` from a real declaration that cannot be reworded (blocklisted, with the reason). Exactly the footgun the PR claimed to fix.
- **The `Card` comment stated a rule the line above it broke** — it forbade naming utilities while naming `isolate`. Reworded to the real invariant.

### Downgraded

`sheet()` assumes a single CSS file in `dist/_astro`. True, but only reachable by adding a second page, which would split the bundle — a change that would break several existing tests first.

### Re-verified after the fixes

30/30 line-checks pass, worst still **8.51:1**, 0.0% of pixels below floor · desktop still **0 differing pixels** at 768/1024/1280/1440 in both themes · `pnpm test` 75/75 · `check` 0 errors/0 warnings · `eslint` clean.

> Note: this branch's latest commits are unsigned — the 1Password agent re-locked mid-run. A squash-merge keeps `main`'s history GitHub-authored.


---

<a id="pr-59"></a>

## #59 — fix(a11y): make the navigating controls anchors, not buttons in anchors

`merged` · opened 2026-07-24 by **calvindotsg** · merged 2026-07-24 as `c2a3cf9db` · `worktree-semantic-controls` → `main` · +143/−23 across 6 files

## Summary

Every social link and Strava CTA rendered `<a href><button>…</button></a>`. The HTML Standard says the `a` element's content model is *"Transparent, but there must be no **interactive content** descendant"* — and `button` is interactive content. All eight were invalid.

## Why it actually matters

Browsers "recover" by keeping both elements, so the page exposed **20 controls in the accessibility tree for 9 real ones**. Measured via CDP `Accessibility.getFullAXTree`:

| before | after |
|---|---|
| link "Github" **+** button "Github Profile" | link "Github Profile" |
| link "LinkedIn" **+** button "LinkedIn Profile" | link "LinkedIn Profile" |
| link "Follow my running on Strava" **+** button "Follow me" | link "Follow my running on Strava" |
| **20 controls** | **12 controls** |

Every social control announced twice. It is also what made Lighthouse's `target-size` audit score 0 — the `<a>` is 61px and the `<button>` inside covers 60 of them, leaving a 1.8px sliver.

## Solution

The element census is unambiguous: all eight navigate to a URL → anchors. The theme toggle runs a handler and has no URL → stays a button (and gains the `type="button"` it lacked). **Nine controls, nine elements, nine tab stops.**

`Button.astro` is **deleted**, not fixed. It declared no Props and spread nothing, so `<Button aria-label="x">` type-checked and rendered nothing — which is exactly *why* both call sites wrapped it in an anchor: there was nowhere to put an `href`. A better wrapper would have preserved that failure mode. (`plans/done/004` had already refused to add prop spreading to it.)

The shared look moves into UnoCSS `shortcuts`, which also absorbs the ~300-character class string `ThemeSwitcher` had copy-pasted with four deltas — the drift that made two elements need hand-syncing.

### Naming

With the wrapper gone, `aria-label` and the `sr-only` span land on the same element, where `aria-label` wins outright and would silently override this repo's sr-only naming mechanism. So the `aria-label`s go and sr-only stays. For the goal CTAs the sr-only string was the *worse* one (both said "Follow me"), so the label text is promoted into the span — the announced name is byte-identical to today.

## Verification

- **Pixel-identical to `main`: 0 differing pixels** at 320 / 360 / 390 / 412 / 430 / 640 / 768 / 1024 / 1280 / 1440, both themes, full-page.
- **Lighthouse accessibility 96 → 100.** `target-size` was the only failing audit; there are now none.
- No interactive content nested in any anchor in the built HTML (11 anchors, 1 button).
- New `control semantics` tests proven **RED before the fix** — all 4 fail on the unfixed sources.
- `pnpm test` 71/71 · `pnpm check` 0 errors / 0 warnings · `pnpm eslint` clean.

## Notes

- **This branch's commit is unsigned.** The 1Password SSH agent re-locked mid-run while Calvin was AFK, so signing and SSH push were unavailable; pushed over HTTPS instead. A squash-merge makes the commit that lands on `main` GitHub-authored, so no unsigned commit enters `main`'s history. Say the word and I will re-sign the branch instead.
- Branches from `main`, so it will need a rebase if #58 lands first — both touch `IntroCard.astro`, in different regions.
- **Follow-up, not silently changed:** "Resume Profile" is an awkward announced name. That string already ships today; renaming it is a content decision.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-24

## Review panel verdict

16 agents across 5 dimensions (method-audit, semantics-and-naming, unocss-shortcuts, interaction-regression, test-quality), adversarial skeptic per finding with `fix_is_safe`.

**11 findings — 8 confirmed, 3 downgraded, 0 refuted.** Fixed in `68433d0`.

### Major — the test guarding the goal CTAs guarded nothing

The control-surface test deduplicated targets by URL and asserted only `> 0` styled anchors per URL. But `GOALS[0].website_url`, `GOALS[1].website_url` and `LINKS[3].link` are **the same Strava URL** — so one styled social link satisfied the assertion for all three, and **both goal CTAs had zero coverage**. Unstyling a goal CTA stayed green.

This is the exact dedupe-by-data-value trap flagged in this repo before. Fixed: count anchors per href, require *every* one styled. Unstyling one CTA now → 2 failed.

### Naming was asserted nowhere

The widened test only checked a name was non-empty. Since this PR makes the `sr-only` span the *sole* accessible name, a reworded span or reinstated `aria-label` would have changed every announced name silently. Added an assertion comparing rendered names against `constants.ts` and asserting no `aria-label` survives. Four mutations now go red: unstyled CTA, reworded name, reinstated aria-label, re-nested button.

### Comment claims the panel disproved by measurement

Three dimensions independently found the `uno.config.ts` rationale was two-thirds wrong:
- `inline-block` on `control` is **inert** at both call sites (each blockifies the anchor anyway — 0 differing pixels when removed). Only `w-max` is load-bearing. Reworded so a maintainer does not protect the wrong token.
- The `control-compact`/sun-moon rationale was **impossible**: both theme icons are 18px, toggle measures 60.00px either way. Replaced with the real reason (max-content already equals the `max-w-[60px]` cap).
- The stretch figure was **understated**: measured worst case is 5.0px, not 4.4px, at the commonest phone widths.

### Also

The `INTERACTIVE` selector no longer claims to be the spec-complete interactive-content list — it now also catches hrefless `<a>` and states what it still omits.

### Downgraded (nits, flagged not fixed)

- **"Resume Profile"** — dropping `aria-label` makes the resume link announce "Resume Profile" (`sr-only` is `{name} Profile` for all six LINKS). A PDF is not a profile. This is a content decision in `constants.ts`, not a code fix — flagged for you.
- The focus ring now sits on the bordered anchor rather than an outer wrapper, so it paints over the 1px accent border instead of 1px outside it. Focus is still clearly visible in both themes; cosmetic.

### Merge with #58

This branch now merges current `main` (which includes #58). The only conflict was in `uno.config.ts` — #58 added `blocklist`, #59 added `shortcuts`, both after `safelist`; kept both. **Both features verified coexisting on the merged tree:**
- mobile-hero contrast (from #58) still passes at 360/430px
- semantic controls (from #59): 0 nested interactive, 1 button / 11 anchors
- **Lighthouse 100, 0 failing audits**
- **0 differing pixels vs main** at all 10 widths, both themes
- `pnpm test` **79/79**, check clean, eslint clean

> Latest commits are unsigned (1Password agent re-locked mid-run); squash-merge keeps `main` GitHub-authored.


---

<a id="pr-60"></a>

## #60 — feat(design): give the progress bar its own ink and make the controls cast their plate

`merged` · opened 2026-07-25 by **calvindotsg** · merged 2026-07-25 as `9266cdbaa` · `worktree-semantic-controls` → `main` · +638/−89 across 12 files

Implements the palette and shadow signature decided on 2026-07-25 after a 15-agent review panel demolished three earlier directions. Background, card, border and text tokens are untouched — this is surgical, not a repaint.

## The five changes

**1 · The progress bar gets its own two colours.** It used to paint `--shadow` over a shared UnoCSS grey, so re-toning the portrait's offset plate silently re-toned the data. New `--progress-fill` / `--progress-track`, per theme.

**2 · The controls actually cast their offset plate.** They never did. presetWind3 expands a geometry-only shadow to `--un-shadow: 2px 2px 0 var(--un-shadow-color)` with **no fallback**; nothing on the page defines that variable, so the whole `box-shadow` was invalid at computed-value time and resolved to `none`. Written as one complete arbitrary value it emits its own fallback. The portrait always did this and always worked — it is only recoloured here.

**3 · Light mode moves to a deeper ink.** `#EC7981` has a hard ceiling of **2.76:1 against pure white**, so any palette keeping `fill = --shadow` is mathematically forced to darken the track to buy separation — which is the backwards-bar defect again. Deepening the fill instead lets the track stay quiet. The same ink lands on `--accent`, fixing a **shipping** failure: hovering a control turned its icon `#F3A3AA` on `#FAFAFA`, 1.89:1.

**4 · The bento cards lose their hover border.** None of the eight is interactive; the accent edge promised an affordance that does not exist.

**5 · The résumé control announced as "Resume Profile".** The template suffixed every `LINKS` name with `" Profile"` regardless of destination. Entries now carry their whole accessible name, so the announced string is visible to whoever edits it. "View", not "Download" — the PDF opens in a tab.

## Tokens

| role | light | dark |
|---|---|---|
| `--progress-fill` | `#A82334` | `#F9CDD3` |
| `--progress-track` | `#E3B3B8` | `#462F32` |
| `--on-brand` (ink on fill) | `#FAFAFA` | `#0B0B0B` |
| `--accent` (border + hover) | `#A82334` | `#F9CDD3` |
| `--shadow` (offset plate only) | `#A82334` | `#F3A3AA` |

## Measured on the rendered page

Sampled from screenshot pixels with transitions and animations frozen, not computed from source. Matches the token arithmetic exactly.

| | light | dark |
|---|---|---|
| dominance — fill vs card **must exceed** track vs card | **6.52 › 1.69** | **12.55 › 1.46** |
| fill vs track | 3.86 | 8.58 |
| ink on fill | 6.81 | 13.78 |
| hover accent vs surface | 6.81 *(was 1.89)* | 13.22 |
| track vs card (quiet channel) | 1.69 | 1.46 |

`getComputedStyle` before → after on `a.control`: `none` → `rgb(168, 35, 52) 2px 2px 0px 0px` (light), `rgb(243, 163, 170) 2px 2px 0px 0px` (dark). Card border on hover: `rgb(229,229,229)` → `rgb(229,229,229)`, i.e. unchanged. axe-core: zero violations and zero needs-review items in both themes — noted for completeness, not as evidence; axe scored this page clean before the 1.89:1 fix too.

**Geometry at data extremes.** The bar was driven to 0 / 0.5 / 1 / 2 / 5 / 100 % in a real browser: at every value the glyph overflows the fill's **start** edge and is clipped by the track, `onTrackPx: 0` throughout. The glyph never paints on bare track, which is why it does not need a ratio against it.

## Why an assertion was removed

The old test required the glyph to clear 3:1 against the **track** as well as the fill. Its own comment said this was "defensive, not a live case", and it is not satisfiable once the fill flips polarity per theme: the only way one ink clears both regions is to drive the track toward the opposite pole from its own card, which makes the *unfilled* remainder the loudest mark — the exact defect this change fixes. SC 1.4.11 asks for contrast against *adjacent* colours and never required fill-vs-track. The structural reason the case was dead (glyph inside the fill, `justify-end`, coincident clipped start edge) is now asserted directly, and verified in a browser at the extremes above.

## Tests: 79 → 87

Every new gate was mutation-tested; **14 of 14 mutations killed**. Three survived the first pass and each exposed a real gap, now closed:

- re-coupling the fill to `--shadow` — the polarity test read `--progress-fill` out of the theme block, so it validated a token the element had stopped using; it now resolves through the element's own classes and asserts which custom property the colour arrived by
- reinstating the cards' hover border — nothing gated it; every hover rule in the sheet is now matched back to the elements wearing it, each of which must be interactive or inside something that is
- reverting `--accent` — now gated at 3:1 against its surface in both themes

The plate assertion was also tightened: checking only for "has a colour" let the *other* dead form through (`--un-shadow: var(--shadow)`, a colour with no offsets, equally invalid), so it matches the whole shape.

## Noted, not changed

At 0 % progress the fill still renders a ~16 px stub rather than nothing, because the 16 px glyph is `shrink-0` inside it. Pre-existing and unchanged by this PR; the deeper light fill makes it slightly more visible.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (2)

**calvindotsg** — 2026-07-25

**Self-found during review prep: `596a591`.**

Diffing the emitted stylesheet against `origin/main` (rather than trusting the suite) showed a selector that should not have been there:

```
new:  .bg-[var(--progress-fill)]  .bg-[var(--progress-track)]  .grow
```

`.grow{flex-grow:1}` — no element wears it. The cause was a comment I had just written in `Card/index.astro` explaining the hover removal: *"the accent-coloured border it used to **grow** on hover"*. UnoCSS extracts from `.astro` frontmatter, so an ordinary English word that happens to be a utility name ships a real rule. The file's own comment warns about exactly this; I walked into it anyway.

Reworded, and gated. The new check is the converse of the existing "no class without a rule" test — **no rule without a wearer** — which is the only thing that can see this class of defect, since the markup is fine and the CSS is valid. It would also have caught the dead `perspective` rule that survived an earlier cleanup for the same reason.

Six pre-existing orphans (`ease`, `inline`, `inline-block`, `me`, `my`, `transition`, ~180 B uncompressed) are **recorded, not fixed** — they come from `<style>` declarations and from Calvin's own copy in `constants.ts` ("my latest cycling challenge"), and the available fix is blocklisting real utilities, which has its own cost. A second assertion makes the list a ratchet: an entry that stops being an orphan must be deleted, so it cannot rot into a blanket excuse.

Both gates mutation-verified. Emitted-selector delta vs `origin/main` is now exactly the four intended changes. Suite 87 → 89.

**calvindotsg** — 2026-07-25

## Review panel

16 agents in isolated worktrees (5 dimensions → one adversarial skeptic per finding, default-refute). **12 findings: 9 confirmed, 2 downgraded, 0 refuted.** ~1.17M subagent tokens, ~34 min.

The headline number is the second one: **10 of 11 remedies were judged unsound.** The skeptics agreed with almost every diagnosis and rejected almost every proposed fix — usually after building it and measuring that it did not work. What is committed in `cb59318` is the corrected remedies, each re-mutated after applying.

### Majors

| # | Finding | Resolution |
|---|---|---|
| 1 | **The clip test pinned tokens, not layout.** It asserted `justify-end` was in the fill's class list — which is meaningless without `flex`, a token it never checked. Removing `flex` left the suite green while putting 8 px of glyph on bare track at **1.76:1** light / **1.61:1** dark. Since this test is the sole replacement for the deliberately-removed colour gate, that reinstates the original defect through the deploy gate. | Fixed, but **not** as proposed. The finder's fix (assert the emitted `display`/`justify-content`) was tested by the skeptic and walked through by a single extra token, `flex-row-reverse` — it swaps a three-string blacklist for a five-string one. The fill now **clips its own overflow**, so no direction, display type or writing mode can put ink on the track. The test resolves `overflow: hidden` from the built sheet; leading-edge placement became its own separate assertion. |
| 2 | **The plate assertion was a shape regex.** `2px 2px -1px var(…)` (negative blur → invalid) and `0 0 0 var(…)` (hidden behind the border box) both passed while painting nothing. Its docstring promised to "fail loudly rather than quietly certify a shadow nobody can see"; it did the opposite. | Fixed. It parses the numbers now: unparseable, negative blur/spread, or zero-offset-*and*-zero-spread. Kept as a stylesheet parse — the skeptic rejected the browser-based alternative because `netlify.toml` runs `pnpm test` as the **deploy gate**, and a chromium download does not belong in a zero-client-JS production build. |
| 3 | **"`--shadow` (offset plate only)" was false.** `Pulse.astro` paints the Now card's live dot with `--shadow` and its halo with `--accent`. The status indicator was riding both re-toned tokens, undisclosed in the PR body, in the token role comment, *and* in one of this PR's own new test comments. | Fixed, and it mattered more than filed. The skeptic found the dot had been sitting at **2.53:1** against its card on `main` — a shipping SC 1.4.11 failure that this PR was silently *fixing*, with nothing to keep it fixed. The indicator now owns `--status-live` / `--status-halo` (same hexes → zero pixel change), and a gate holds it at 3:1 resolving through the element's own classes. Measured after: **6.52:1** light, **9.08:1** dark. |

### Minors

- **The hover guard only saw `.token:hover`.** An Astro scoped `<style>` — the idiomatic form here, `ProgressBar` already ships one — put the accent border back on all eight cards as `div[data-astro-cid-…]:hover` with the suite green. Now matches on selectors. The finder's implementation was rejected: it stripped `:hover` unanchored, which corrupts escaped UnoCSS tokens and **turned the build red on a legitimate `md:hover:` utility**. Both cases are now covered by mutations.
- **The profile-name guard keyed on a leading slash.** Moving the résumé to an absolute URL — a hosting change, not a content change — would have silently re-admitted "Resume Profile". Keys on the file extension now.
- `CLAUDE.md` and `.devin/wiki.json` both still described the `uno.config.ts` `theme` block this change deleted. Corrected. (The skeptic refuted half the supporting argument: the CLAUDE.md sentence was already misleading before this PR, not broken by it.)
- **The plate snaps during a theme change while the border fades.** *Downgraded.* The skeptic measured the border troughing **lower** than the plate ever does (1.01:1 vs 1.11:1) and the label at 1.31:1 at the same instant — the card sweeps through mid-grey and everything washes out together. They then built the proposed fix and found it causes a worse, far more frequent regression: the plate re-inflates over 300 ms after **every click** while the transform snaps back instantly. Documented in `uno.config.ts` instead of transitioned.
- **The PR body misattributed the 0 % stub** to the glyph being `shrink-0`. It is the padding floor — the skeptic removed the glyph entirely and the stub stayed 16 px, then zeroed the padding with the glyph present and it went to 0. Corrected below.
- The `.grow` dead rule (found and fixed pre-review in `596a591`) was independently confirmed by two dimensions.

### Verification of the fixes

- **22 mutations, all killed** — 11 against the new gates, 7 re-running the originals to prove no fix reopened an old hole, the panel's own scoped-`<style>` bypass, and a false-positive check confirming a legitimate `md:hover:` utility on a real anchor stays green.
- **Pixel-diff against the pre-fix branch:** 0 differing pixels on both full pages in both themes at 1280 and 430; bar close-ups differ by exactly 1 pixel at max channel delta 1 (antialiasing on the fill's new rounded clip edge) at low progress, 0 at 24 % and 100 %.
- Emitted-selector delta is exactly `bg-[var(--accent)]`/`bg-[var(--shadow)]` → `bg-[var(--status-halo)]`/`bg-[var(--status-live)]`.
- Re-measured from rendered pixels: dominance **6.52 › 1.69** / **12.55 › 1.46**, fill-vs-track 3.86 / 8.58, live dot 6.52 / 9.08, control plate `rgb(168,35,52) 2px 2px 0px 0px` / `rgb(243,163,170) 2px 2px 0px 0px`.

Tests **79 → 91**.

### Corrections to this PR's body

- The token table's `--shadow` row said "offset plate only". That was false when written; it is true as of `cb59318`, and the light status dot changed from `#EC7981` to `#A82334` as a result — fixing a pre-existing 2.53:1 failure that no claim in the original body disclosed.
- "Noted, not changed" attributed the 0 % stub to the glyph. Correct version: the fill's `px-2` padding sets the floor, since a border-box width cannot fall below padding plus border. It holds with the glyph removed from the DOM and under either box model, and pins the fill at 16 px for anything under ~8.4 % of the 190 px track. Pre-existing and unchanged here; the lever, if it is ever worth pulling, is the fill's horizontal padding — not `shrink-0`, not `box-border`, not `min-width`.

### Known trade accepted

The orphan-rule gate added in `596a591` means `pnpm test`, which is the deploy gate, can go red on an English word in an `.astro` file. It has already caught three dead rules this PR would otherwise have shipped — all three from comments I wrote, two of them written *while fixing the previous one*. The failure names the token and the fix is a reword or a `blocklist` entry. `constants.ts` prose is not scanned, so your own copy cannot trip it. Say the word if you would rather not carry that.


---

<a id="pr-61"></a>

## #61 — fix(design): one control box, no clipped cards at md, one Strava name

`merged` · opened 2026-07-26 by **calvindotsg** · merged 2026-07-26 as `779392e61` · `worktree-uniform-controls` → `main` · +1335/−53 across 16 files

## Summary

Three changes to the controls and the boxes that hold them. The first two were the
open items left over from the control-uniformity work; the third is what the
investigation into them turned up.

1. **The nine styled controls are one declared 64×48 box.** They rendered at five
   different sizes.
2. **Cards no longer clip their own content between 768px and 1023px.** They did,
   live, and nothing could scroll to recover it — up to 98px lost.
3. **The one Strava destination is named once**, instead of three times with three
   different accessible names.

`public/preview.jpg` was regenerated for (1). Two new test files, 91 → **108**
assertions, and a shared `tests/helpers/css.ts`.

---

# 1 · Every styled control is one box

Measured against `a5c8a43` in Chromium 149 and WebKit (Safari 26.2) — identical to
the sub-pixel in both, animations and transitions frozen before sampling:

| control | before | after |
|---|---|---|
| theme toggle | **60 × 40**, icon squashed to 18×20 | 64 × 48, icon 20×20 |
| github, telegram | 61.40 × 46 | 64 × 48 |
| linkedin, instagram | 59.59 × 46 | 64 × 48 |
| strava (intro) | **57.00 × 46** | 64 × 48 |
| resume PDF | **62.00 × 46** | 64 × 48 |
| the two goal-card CTAs | 57.00 × 46 | 64 × 48 |

Four widths across the anchors, five distinct boxes over nine elements. Three
independent causes:

1. **Nothing declared a width.** With a max-content width plus horizontal padding
   each button came out as `42px + its icon's width`, and `presetIcons` emits every
   icon at the *artwork's* aspect ratio (`.75em` strava, `.88em`
   linkedin/instagram, `.97em` github/telegram, `1em` for all three Remix icons —
   sun, moon, and the résumé PDF glyph, which is why that link was the widest
   anchor). The icon's proportions leaked into the button's.
2. **The toggle wore a second, narrower variant.** Its 40px height came from that
   variant's `max-height`, *not* its padding — both call sites make a control a
   grid or flex item, so the height came from stretching and the padding was inert.
   And its `max-width` was **below the button's own content width** (2px border +
   40px padding + a 20px icon = 62px), so under `box-sizing: border-box` the icon
   child shrank and the sun/moon artwork shipped **squashed 10% horizontally**. The
   comment in `uno.config.ts` read that backwards — it called it "an 18px icon" —
   which is why it survived.
3. **Ragged grid tracks.** `repeat(4, auto)` sized every column to its own widest
   item while the items did not stretch, so gaps were unequal and row 2 did not
   align with row 1.

The 40px toggle was the one control below WCAG 2.2 SC 2.5.5's 44×44 (all nine
cleared SC 2.5.8's 24×24 minimum).

## What it is now

`uno.config.ts` has **one** `control` shortcut — the base and the variant are both
deleted — declaring a 64×48 border-box with no horizontal padding, centred by the
container, pinned with `flex-shrink: 0`. 64×48 is **2px larger on each axis than
the widest button that shipped before, so nothing shrank.**

Two things that each cost a round to find:

- **`flex-shrink` outranks a declared width.** The two goal CTAs are flex items and
  still measured **47.80px at lg** after the width was declared. The surface and
  the icon spans are both pinned now.
- **The box is in px, not rem, and that is deliberate.** Cards do not grow with the
  root font-size and every card clips, so a control that grows under text-only zoom
  is sheared off. Worst bottom shear at 1440×900 — base / a 3rem box / this 48px
  box: root 20px **0 / 16.0 / 0**; root 22px 25.5 / 57.5 / 21.5; root 24px 55 / 99
  / 51. The px box is the only one of the three that never does worse than what
  shipped, at any root size.

`.button-grid` keeps its `auto` tracks: with one control size they come out equal
on their own, so the width is stated in one place.

---

# 2 · Cards clipped their own content across the whole `md` range

**This was live, and it was silent.** `<body>` carried an exact viewport height
from the medium breakpoint up, while the single-screen bento contract it was
serving is defined on `<main>` against the **large** breakpoint. Between 768px and
1023px the grid is two columns, so the same content is ~1160px tall; the implicit
`auto` rows were compressed to fit the viewport instead, and every card's own
`overflow-hidden` ate the difference.

Measured on **production** at 768×900, animations frozen, rect-based:

| what | lost |
|---|---|
| intro card — its entire second row of controls | **98.45px** |
| Now card — the closing line of its copy | 9.23px |
| each goal card — the "last year's" line and part of the CTA | 5.86px |

Six of the eight cards at 768px, four at 800–1023px, worst 98 → 63px. The severity
is in one detail: the body was *exactly* as tall as the viewport, so
`scrollHeight` never exceeded it and **the page could not be scrolled**. That
content was not below the fold, it was unreachable — including for a tablet held in
portrait at exactly 768×1024, which loses 40.61px.

The `md:max-h-[300px]` on the intro copy column, which looked like the culprit, is
**not** — the clipper is the card itself, at `height: 183.55px` with
`max-height: none`, sized by a grid row that had been compressed.

And it gets worse as the viewport gets shorter, which the 900px row above
understates. At **768×400** the base build clips **76 elements**: 169px off the
career card and the button grid in its entirety — all three of its controls, 100px
— against **0** on this branch. Same instrument, same origin, both fingerprinted.

## Proof it is the height lock, and only that

Two elimination experiments, both on a base build:

- **Height sweep** at a fixed 768px width. Clipping falls monotonically with
  viewport height and reaches **zero at 1200px** tall, where `main` settles at
  1159px. Intrinsically-too-tall content would not care how tall the viewport is.
- **In-page override** of that one declaration and nothing else. At 768/800/900/1023
  clipped cards go **6 → 0** and **worst 98 → 0**, and the page becomes scrollable.
  No residual, so the lock is the whole cause in that range.

## The same lock also broke lg on short viewports — found late, fixed by the same line

This was missed on the first pass and is worth stating plainly, because it makes
the defect wider than the description above. `<main>` carries a 736px floor, so on
a viewport shorter than that the exact-height body could not contain it. The body
centres its children, so the overflow was split **top and bottom** — and the top
half sits above the scroll origin, where no scrolling can reach it.

Measured on **live production**, `document.scrollingElement` at rest:

| viewport | first card above the scroll origin | reachable? |
|---|---|---|
| 1024×500 | −94px | no |
| 1024×550 | −69px | no |
| 1024×600 | −44px | no |
| 1024×650 | −19px | no |
| 1024×700 and up | 0 | yes |

Identical at 1024, 1100, 1280, 1440 and 1920 wide, so it is a function of viewport
**height** alone. A laptop showing ~650px of viewport after browser chrome is
squarely inside that range. On this branch it is **0px unreachable at every one** of
those viewports, because the body grows to 736px instead of locking to 600px.

## The fix, and what it does and does not move

A **minimum** instead of an exact height. The body still stretches to the full
viewport, so the centring still centres, and `<main>` is still capped at lg. Where
content genuinely needs more room the page now grows and scrolls.

Geometry diff, **12 viewports × 2 themes**, body + main + all eight card rects:

- **1024, 1280, 1440, 1920 at 768px tall and above — the only property that differs
  is the body's resolved `min-height`.** `body`, `main` and all eight card rects
  byte-identical, both themes. Those ten boxes are the scope of that claim; *inside*
  the intro card geometry does change, because that is what the control fix is for —
  the button grid's rows go 46px → 48px, so it gains 4px and the copy block gives up
  the same 4px, leaving the column total and therefore the card unchanged at 270px.
  The desktop card layout did not move by a subpixel.
- **lg below 736px tall: the layout does change**, and that is the fix above — the
  body's resolved height goes 600 → 736px at 1024×600 and the unreachable content
  becomes reachable. An earlier revision of this description claimed the change was
  inert at lg; that claim was only ever measured at ≥768px tall and is corrected
  here.
- 768–1023: clipping 102.45 → **0**, page scrolls.
- Below md: identical.

Verified on the **deployed preview**, not just locally: 0 overflowing elements at
768/800/900/1023/1024/1440, where production reproduces the defect at all four md
widths.

The 72px right-edge overflow below md is the intro portrait's deliberate bleed
(`right-[-72px]`), unchanged, and it is horizontal — no text is involved.

---

# 3 · One Strava destination, named once

The Strava URL was written out **three times** in `constants.ts` — the social link
and both goal cards — so it had three homes, against this repo's rule that a
configurable value has exactly one. Nothing kept the three accessible names in
step, and they had drifted:

| control | announced before | after |
|---|---|---|
| social row | "Strava Profile" | "Strava Profile" |
| running goal CTA | "Follow my running on Strava" | "Strava Profile" |
| cycling goal CTA | "Follow my cycling on Strava" | "Strava Profile" |

One `STRAVA` constant now supplies the URL and the name, so they agree
structurally rather than by coincidence, and changing the athlete id is one edit.
**Nothing visible changes** — all three controls are icon-only and the name is
`sr-only`.

**To be clear about what was and was not wrong: no success criterion was
violated.** SC 3.2.4 Consistent Identification is scoped to a *set* of web pages
and this site is one page — Understanding 3.2.4 says it "only addresses consistency
within a set of web pages", and F31's procedure begins "In a set of web pages".
2.4.4 and 2.4.9 are per-link and each name stated its purpose. F31 also notes
consistent text is "not always identical", and its own example blesses "Print
receipt" beside "Print invoice" — the pattern the two goal CTAs followed. So this
is best practice, not a conformance fix. What tips it is the guidance for links
whose destination really *is* the same: Understanding 3.2.4's Example 6 asks for
identical text "so that when users encounter the second one, it is clear that it
goes to the same place as the first", Understanding 2.4.9 wants names that survive
being read out of context in a links list, and GOV.UK's editorial guidance states
it outright.

**Verified while deciding this, so nobody repeats the search: Strava has no public
per-sport URL for an athlete**, so pointing the two goals at different meaningful
destinations is not available. `?activity_type=Run` and `?activity_type=Ride`
return byte-identical bodies (SHA-256 equal over 544,386 normalised characters),
every sport-scoped subpath 404s or redirects to `/login`, and the profile's own 82
links contain zero sport-filtered variants. A logged-out visitor gets a login wall
either way, as they do for the LinkedIn and Instagram links beside it.

---

# The silhouette question: 64×48 stays, and why

A 48×48 square was built and measured before deciding: all nine controls land
48.000 × 48.000, icons undeformed, tracks 48px, 108/108 green, no clipping at any
width. It is one token (`w-[48px]`).

The two are **accessibility-equivalent**, which is the part worth recording. Both
clear SC 2.5.8 (AA, 24px) and SC 2.5.5 (AAA, 44px) on bounding-box measurement,
and 48 lands exactly on Android's and Material's 48dp while clearing Apple's 44pt.
Nothing in the literature favours either aspect ratio — the one study that varies
width and height independently (MacKenzie & Buxton, CHI '92) yields two co-equal
models that disagree, and it explicitly rejects the "bigger total area is easier"
model. The single geometric asymmetry is thin and leans the other way: under
`rounded-lg` (8px), a 48×48 box inscribes only a 43.31px axis-aligned square where
64×48 inscribes 48 — but that construction is only stated under the 24px criterion
and no shipping tool computes it.

So the choice rests on grounds outside WCAG, i.e. it is purely aesthetic, and the
wider-than-tall silhouette is the one that shipped. Left as-is, with the reasoning
recorded in `uno.config.ts` so it is not re-litigated. **Flip the width token if
the square is wanted** — `public/preview.jpg` has to be regenerated with it.

**Correction to something I wrote in an earlier commit here**: 48px does *not*
"clear the 48-CSS-px finger Lighthouse's tap-target audit uses". That audit, with
its `FINGER_SIZE_PX = 48`, was deleted in Lighthouse v12.0.0 (`acfd1fb5ea`,
2024-04-01) and replaced by the axe-backed `target-size` audit measuring against
24px. Fixed in the test docstring.

---

# Test plan

**108 assertions, 6 files** (91 at branch point). `pnpm check` 0 errors / 2 hints,
unchanged. `pnpm eslint` clean.

### `tests/control-geometry.test.ts` — new
The defect class had **no** coverage; not one existing assertion read a box metric
of any control. It discovers controls by the surface's own signature (offset plate
+ accent border) rather than by class name, so a rename stays covered and a second
divergent variant is caught rather than missed. Its central assertion is **exactly
one rule in the sheet may declare a control's box**, checked by walking every rule
that matches a control element at any at-rule depth, from any source.

### `tests/page-fit.test.ts` — new
States the structural precondition the clipping defect needed: **the outermost box
may not be pinned to the viewport while its content is free to exceed it.** It says
plainly what it cannot do — linkedom does not lay out, so it cannot recompute the
98px; those numbers are **pinned from browser measurement, not derived**, with a
pointer to the harness that must be re-run.

### `tests/helpers/css.ts` — extracted
The rule parser and the paren-balanced pseudo-stripper, which both files need. Too
subtle to keep two copies of — a skeptic already defeated one version. Its
`minWidthOf` matches **both** `min-width:` and the modern `(width>=768px)` range
form the minifier actually emits; a regex for the legacy spelling alone returns
null for every rule in this sheet and would have made every breakpoint assertion a
silent no-op.

### Mutations — 24 vectors, all red, each in the expected file
- **page-fit (10)**: revert the fix; delete the floor entirely; the lock in `dvh`;
  a viewport *maximum* beside the floor; the floor ungated; clipping the body so
  growth is unreachable; the exact height moved onto `<main>` at md; a fixed row
  template on `<main>` at md; a viewport maximum on `<main>` at md; and dropping
  `overflow-hidden` from the cards — the cheap fix, rejected on purpose.
- **control-geometry (14)**: re-run after the parser moved into the helper. A
  content-sized width, a second variant, no centring, an unpinned control, unpinned
  icons, a 40px box, a `max-height` cap, hard-coded tracks, a padding squeeze, a
  media-query variant in the shortcut, an extra box utility on the element, a
  scoped `<style>`, an icon squashed by a utility, icons hidden outright.
- **the shared-name invariant (3 red, 1 correctly green)**: rebuilding the name
  from a sentence, one goal naming the shared destination differently, and dropping
  the `sr-only` span all go red; giving the cycling goal its own destination *and*
  its own name correctly stays **green**, because distinct destinations may differ.

Two harness corrections worth noting, since they weaken earlier claims:
- The previous mutation harness restored files with `git checkout --` inside a
  scratch copy that **has no `.git`**, so it silently failed and two vectors ran
  compounded with earlier mutations. Now restores from backups; both are red in
  isolation.
- One "surviving" mutation was an **invalid** mutation, not a survivor — a perl
  replacement containing `${...}` was interpreted by perl and never applied. Redone
  literally: 3 tests red.

### Rendered verification
- Chromium and WebKit at 320/390/640/768/1024/1440 CSS px in **both themes**: all
  nine controls measure exactly 64.000×48.000 in all 12 runs, tracks all 64px, no
  icon deformed. Before: five distinct boxes in all 12 runs.
- Zoom swept at root 16/18/20/22/24/32 against a fresh base build; no root size is
  worse than base.
- **Selector-set diff** against a `git archive` build of `a5c8a43`: **5 removals, 1
  addition**, every one accounted for — the retired variant and its
  `:hover`/`:active`, the exact-height utility, `.my`, and the height-floor utility
  added. **Zero unintended additions.**
- Toggle still functions: click flips `data-theme`, persists to `localStorage`, and
  the moon icon now measures a true 20.00×20.00.

### Page weight, over the wire
Deploy preview against production, both served `content-encoding: br` (confirmed,
not assumed), five samples each — all five identical on both origins:

| | production | preview | delta |
|---|---|---|---|
| stylesheet | 6,842 B | 6,738 B | **−104 B** |
| markup | 3,244 B | 3,360 B | **+116 B** |
| | | | **net +12 B** |

Read the net as **neutral, not a cost**, and here is the reason to distrust the
sign: production's compressed markup measured **3,277 B** earlier the same day and
**3,244 B** now, for byte-identical content on an unchanged `main` — a 33 B
cross-session swing in the compressed artifact alone. A 12 B net delta sits inside
that band. The stylesheet's −104 B is outside it and is attributable: the sheet lost
five selectors and gained one.

### Two things that changed as a consequence, not by choice
- **`my` came off the known-orphan list.** The goal CTA's sr-only name was the last
  lowercase "my" in any `.astro` file, so UnoCSS stopped emitting `.my` and the
  list-cannot-rot guard demanded the entry go. `me` stays — "About me" is still a
  card title. Exactly the rot that pair of assertions exists to prevent.
- One existing assertion changed from matching an icon span's **whole class
  attribute** to matching its **tokens**, so the icons could be pinned. The icon
  allowlist in the geometry file is what closes the gap that opened.

---

## Notes

- `public/preview.jpg` was stale beyond the buttons — it still showed the
  pre-migration **emoji** greeting and the flat borders that predate the offset
  plate. Recaptured from this build: same 1200×630 canvas and composition, dark
  theme, sharper than what it replaces despite identical dimensions (downscaled
  from a 4× clip; the old file was upscaled from a 1×). **GitHub's image diff on
  that file is the before/after of the control change.**
- It is **not** regenerated again for the later commits. Checked rather than
  assumed: the capture is deterministic (two runs, zero delta), the control
  geometry is identical between the branch head and now, and a fresh capture from
  either revision differs from the committed file by the same 1,121 channel samples
  out of 2,268,000 — max delta 18/255, in a region that is visually
  indistinguishable. That difference predates these commits, so the file is left
  alone rather than committing binary churn.
- `CLAUDE.md` and `.devin/wiki.json` still named the deleted shortcut; `CLAUDE.md`
  is loaded into every agent's context, so that one mattered.
- `plans/README.md`'s assertion count was **already stale by 24** before this
  branch (it claimed 67; the suite was 91 at branch point). Now flagged as
  unverified with the real number, plus a note that neither fix consumed a plan
  number so numbering still continues at `016`.


### Discussion (1)

**calvindotsg** — 2026-07-26

## Adversarial review panel — 20 agents, 21 findings, 5 dimensions

Five finders (method-audit, layout, tests, a11y, PR-body fact-check), each in its own worktree,
then one adversarial skeptic per finding told to **reproduce, not re-read**, with a default-refute
prior and separate verdicts for the diagnosis and the proposed remedy.

**7 CONFIRMED · 6 DOWNGRADED · 2 REFUTED**, and **13 of 15 proposed remedies judged unsound** — the
diagnoses were mostly right and the fixes mostly weren't, so what shipped is the *corrected* remedy
in almost every case.

Every finding landed on the assertions this branch added, or on prose this branch wrote. None
landed on the shipped page: the pristine build measured clean at every viewport throughout.

### Majors — coverage holes in this branch's own new guards

| # | Finding | Verdict | Resolution |
|---|---|---|---|
| 1 | `page-fit` skipped **every max-width-gated rule**, so a lock scoped to exactly the md range was never read. UnoCSS compiles a range variant to *nested* queries — `@media (width<=1023.9px){@media (width>=768px){…height:100vh}}` — and the guard saw "has a max-width, cannot matter". Reachable with one idiomatic token, `lt-lg:h-screen`. | CONFIRMED major | `isMaxWidthGated` **deleted**, replaced by `appliesBelow(rule, width)` which consults only the *lower* bound, because only the lower bound decides it. Judge's corrected remedy was "drop the exemption entirely, do not keep it for rules with no min-width" — that is what shipped. |
| 2 | The height guard recognised only **viewport-relative** units, so an absolute `height: 900px` beside the floor reinstated the defect. | CONFIRMED major | Now keys on **definiteness**, not units. |
| 2b | …and a unit *list* leaks by construction: `100dvb`, `100vb`, `50vi`, `100svb` all still passed. | CONFIRMED (2nd round) | Predicate **inverted** — everything is definite except the keywords that let a box size to its content. An unanticipated unit now reads as capping, which is the safe direction. |
| 3 | The control-box denylist named `scale`, which **UnoCSS never emits** (`scale-125` compiles to `transform`), so a scaled control shipped green. | CONFIRMED major | Adding `transform` was proven unsound by two judges — its emitted value is *byte-identical* to the control's own `:active` press translate, so it reds the gate on a 3px nudge. The real signal is the `--un-scale-*` custom property; `scalesTheBox()` reads that, plus a literal `scale()`/`matrix()` for hand-written CSS. `rotate`/`translate` deliberately absent: same compilation, and neither changes a box. |
| 4 | The comment **directly above the changed line** still claimed the fix left the lg layout untouched. | CONFIRMED major | It doesn't — it fixes a real lg defect. Corrected, and the `736px` literal replaced by the invariant, since `index.astro` owns that number. |
| 5 | `uno.config.ts` still justified 48px with Lighthouse's tap-target audit, which **this branch itself documents as removed in v12.0.0**. | DOWNGRADED minor | Clause deleted; the number now stands on SC 2.5.5 and on nothing shrinking. |

### My own measurement error, caught by the panel

**"Six of the eight cards" is four.** The PR description contradicted its own table, which listed
exactly four. Correct figures, descendant border box against each card's *padding* box:

| viewport | cards clipping | worst |
|---|---|---|
| 768×900 | **4 of 8** | 98.45px (intro), 9.23 (Now), 5.86 (each goal) |
| 800–1023×900 | 2 of 8 | 76.13px → 62.58px |
| 768×1024 | 1 of 8 | 36.61px (not 40.61 — that was the taller controls, not production) |

The six came from a `scrollHeight − clientHeight` probe, which over-reports because an inline-block
icon inflates the scrollable-overflow rectangle. **That probe was retired for exactly this reason
and its number was kept anyway.** Retiring an instrument means re-deriving every figure it produced.

### Refuted — recorded because refusals are decisions

- **"The Strava URL has no single home."** Refuted: on `origin/main` the athlete id lived in
  **four** places (`constants.ts` ×3 plus the `STRAVA_ATHLETE_ID` variable); this PR takes it to
  two. Not introduced here and strictly improved. The cross-reference sentence was kept anyway —
  the judge verified it safe — because updating only the CI variable would publish a new athlete's
  distances while every link still pointed at the old profile, and nothing can catch that.
- **"The new invariant inverts AccName precedence."** Refuted: `rendered-html.test.ts:229` already
  forces `aria-label` to equal any `sr-only` name across **every** `a[href], button`, so the
  resolution order cannot matter. The reordering was kept as spec alignment, not as a fix — the
  judge is right that it is a no-op.

### Deferred, with the reason stated

**The theme toggle announces no state.** `aria-live="polite"` is inert — everything inside that
changes on activation is `aria-hidden`, and there is no `aria-pressed` or state-bearing name. Two
judges confirmed the facts against Chrome's own AX tree (`nameFrom: aria-label`, the `sr-only` span
marked *superseded*, accessible subtree invariant across activation). Downgraded to a nit because
it is **entirely pre-existing** — this branch changed only that button's class — and the remedy
changes announced copy, which is a maintainer decision rather than part of this PR's three
concerns. Recorded in `plans/README.md` so it is not rediscovered as new.

### Also closed

The inline-`style` route into a control box; a **false red** where a fractional `@keyframes` stop
(`33.3%` contains a dot, so it defeated the offset filter) threw `Unmatched selector: %` and would
have reddened the deploy gate on legal CSS; the one-sided floor gate — though the judge was right
that asserting it per-rule forbids a harmless redundant floor, so the lower bound stays per-rule
and the upper bound moved to the set; `KNOWN_ORPHANS`' stale count, now count-free; the
`byte-identical pages` overclaim (it was SHA-256 equality over *normalised* text); and
`plans/README.md` scoping the defect to the md range alone.

### Verification

Every adopted fix was re-mutated, each vector isolated from a pristine backup and confirmed to
change the built output first — a mutation that changes nothing is an invalid mutation, not a
survivor.

- **Red:** 4 md-range gating vectors, 3 `lt-lg:` vectors, 4 unit-leak vectors, 4 absolute/`calc`
  height vectors, 4 scaling vectors, 3 floor-gate vectors, 2 inline-style vectors, the URL-drift
  vector in both directions, and the fractional keyframe stop without its skip.
- **Still green (no false reds):** the unmutated build, the legitimate `lg` lock, a redundant
  second floor, and `translate-x-2` / `rotate-45` / `scale-100`.
- **The original revert still fails 2 assertions** — closing the new holes did not reopen the old one.
- 109 assertions / 6 files. `pnpm check` 0 errors, 0 warnings, 2 hints (both pre-existing —
  identical on a base build). `pnpm eslint` clean. Stylesheet **byte-identical** and the emitted
  selector set unchanged at 182, checked after every prose edit because `src/**` comments are
  UnoCSS-scanned.

**Measured on the deployed preview, not just locally** — its stylesheet is byte-identical to the
local build (`index.CQKPaIAN.css`, md5 `ebd968f4…`):

| | deploy preview | live production |
|---|---|---|
| overflowing elements, 768×400 / 1023×400 / 768×900 / 1023×900 | **0 / 0 / 0 / 0** | 76 / 72 / 33 / 15 |
| unreachable above scroll origin at 1024×500 / 600 / 650 | **0 / 0 / 0** | 94px / 44px / 19px |
| scroll range at 768×900 | 261px | **0** — content existed and could not be reached |

All nine controls measure exactly **64.000 × 48.000** at every viewport in **both** themes, against
four distinct boxes on production (61.391 / 59.594 / 57.000 / 62.000 × 46).

### Scope note

15 of the 21 findings were judged — the top three per dimension, to bound the run. The other six
were ranked 4th/5th by their own finder and every one was still addressed; they are the nits and
minors listed under *Also closed*. No finding was dropped silently.


---

<a id="pr-62"></a>

## #62 — feat(design): one Strava link, brand-ink heart, a toggle that reports its state

`merged` · opened 2026-07-26 by **calvindotsg** · merged 2026-07-26 as `a192a8994` · `worktree-footer-heart-and-one-strava` → `main` · +726/−249 across 14 files

Four things Calvin asked for, two of them judgement calls left open by the PR #61 review.

## 1. One Strava link, not three

The two goal cards no longer carry a call to action. Both pointed at the same profile the intro card's social link already reaches, and a logged-out visitor meets a login wall there whichever URL they are given — 25 sport-scoped path shapes all 404 or redirect to `/login`, and `?activity_type=Run` and `=Ride` serve the same page. `GOALS[]` loses `website_url`, `cta_label` and `cta_logo` with them; `uno.config.ts` loses the `cta_logo` safelist entry; the `STRAVA` object collapses to a plain `STRAVA_PROFILE_URL`.

**What moves, measured.** Below the large breakpoint the two goal cards lose exactly 12px of height and the cards after them shift up 12px (768) / 24px (375); widths never change. At **every** large-breakpoint viewport — 1024×768, 1280×800, 1440×900, 1920×1080, and a height sweep at 1024 from 500 to 768 — **zero boxes changed**, light and dark. Clipping is identical (only the intended sub-`md` 72px portrait bleed) and nothing is unreachable in either build.

One visible bonus: with the button gone the text under each bar stops wrapping, so "N km of M km" and "Last year's" sit on one line each instead of two.

**A consistency question for you, not acted on.** By the login-wall argument the LinkedIn and Instagram controls beside it are equally login-walled — `constants.ts` says so in prose. You asked only about Strava, so those are untouched.

## 2. The footer heart carries the theme's brand red

A new `--brand-ink` token: `#A82334` on light at **6.519:1**, `#F3A3AA` on dark at **9.075:1**, both measured against the composited card background the glyph actually sits on, transitions frozen. ΔE00 against the surrounding prose is 35.2 / 26.7, far above the just-noticeable threshold, so it reads as a colour rather than as slightly-off text.

It is deliberately **not** `--accent`. That token is the interactive affordance — control border, hover ink — and nothing about the heart responds to a pointer; re-toning what a button does on hover must not re-tone a word in a sentence. That is the coupling `--progress-fill` was split out to break.

The utility sits on a **wrapper** around the glyph, not on the glyph. An icon is a mask box whose own rule sets `color: inherit`, at the same specificity as a colour utility — put both on one element and the winner is decided by stylesheet emission order alone (it happens to be right today, by about nine kilobytes). On an ancestor the two cooperate. `ProgressBar.astro` already colours its icon from an ancestor for the same reason.

## 3. The theme toggle reports its state

Closes the first judgement call. `aria-pressed`, kept in step by the script the button already had, with one state-independent name in `constants.ts`. The inert `aria-live` and the duplicate `aria-label` are gone — that live region could never fire, because everything inside the button that changes on activation is decorative and its one text node never changed.

A per-theme changing name was built first and **rejected on measurement, not taste**. WAI-ARIA's toggle-button guidance sanctions either but forbids both together ("if the design were to call for the button label to change from 'Mute' to 'Unmute,' the `aria-pressed` attribute would not be needed"), and Sarah Higley's screen-reader survey found a name change announced in roughly half of reader/browser combinations against `aria-pressed` in all of them — "use state for all other toggle buttons".

Verified in Chrome's accessibility tree, not inferred: name "Dark theme", role button, `pressed` false→true→false across real clicks; a **stored** dark preference and a **system** dark preference both load reporting `pressed: true`; with scripts disabled the server ships `data-theme="light"` and `aria-pressed="false"`, consistent. That load-order case is the one sharp edge of this approach and it is the one I measured hardest.

**Deliberate residual:** nothing announces at the moment of the press beyond what `aria-pressed` gives. A real live region needs JS and an extra element, which is out of proportion here. Recorded in `plans/README.md` rather than left looking like an oversight.

## 4. The athlete-id note has one home

Closes the second judgement call. The skeptic was right that `constants.ts` is the wrong place to explain a CI variable, and wrong that the note was redundant — the coupling breaks in both directions. So `README.md` keeps the explanation and `constants.ts` keeps a pointer, beside the literal that would go stale.

## Tests: 109 → 120

Two assertions changed **shape** rather than being deleted, and this is the part worth a second look. The name↔destination bijection pair took its non-vacuity evidence *from* the three Strava anchors sharing one href. With one anchor left both guards became unsatisfiable — they would have gone red for a reason unrelated to the rule. Deleting the tests would have dropped a real invariant. So they now assert against the rendered page and take their can-this-fail evidence from a two-anchor **fixture**: a positive control instead of a coverage claim. A separate assertion pins the decision itself — the page links to Strava exactly once.

Also added: the heart's ink contrast read from the shipped stylesheet in both themes (deleting `--brand-ink` leaves the rule emitted and the class worn while `color` silently falls back to inherited), and a guard that the emitted script still writes `aria-pressed` from the live theme.

## Verification

- **120/120** across 6 files; `pnpm check` 0 errors; `pnpm eslint` 0 problems.
- **Selector-set diff** vs an `origin/main` build: exactly one removal (`.ml-4`) and one addition (`.text-[var(--brand-ink)]`). Declaration-level diff: those two plus the two `--brand-ink` declarations, nothing else. The extractor was positive-controlled against a planted nested rule inside a range-syntax media query and a fractional keyframe stop.
- **11 mutation vectors, all killed** — including the two that break the bijection checkers, which the fixtures catch, and the one that moves the ink utility back onto the glyph.
- **`public/preview.jpg` is not regenerated**, deliberately: it is a clip of `main > div:first-child`, and the intro card's rect is unchanged at every viewport measured.
- **Deploy preview vs production, fact by fact:** 33 token-level differences after normalising away the preview-only injections and the origin, and every one is an intended change — the stylesheet hash, the toggle's attributes and name, the toggle's script, the two removed CTAs, and the heart's wrapper span. JSON-LD, canonical, og/twitter and the sitemap link are byte-identical.
- **Page weight over the wire**, both origins served `content-encoding: br` (confirmed, not assumed), three samples each and all three identical on both: markup 3,239 → 3,341 B (**+102**), stylesheet 6,790 → 6,752 B (**−38**), net **+64 B**. That is a real if small cost and it is wider than the 33 B cross-session swing this repo has seen in Netlify's stored artifact for byte-identical content, so I am not writing it off as noise. It is attributable: the two deleted anchors were near-duplicate markup that brotli compressed to almost nothing, while the added script logic is novel text that compresses poorly — raw markup actually *fell* 434 B. Local `gzip -9` puts the same change at roughly neutral, which is why only the transfer number is quoted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (2)

**calvindotsg** — 2026-07-26

## Review panel: 25 agents, 5 dimensions, ~1.7M tokens

**20 findings judged — 19 survived the skeptic pass, 1 refuted.** They collapse to **13 distinct defects** (three dimensions independently reported the same toggle-guard hole, and two each reported the stale suite count, the dead import and the `wiki.json` staleness).

Consistent with the last panel: **every finding landed on the assertions and prose this change added. None landed on the shipped page** — the built output measured clean throughout, and the emitted selector set is still exactly one removal and one addition.

### The one that mattered

**My guard for item 3's headline behaviour was a string grep, and it did not work.** The assertion looked for `aria-pressed` and `dataset.theme` in the emitted bundle. Three mutations ship a bundle containing both strings and leave the suite green: deleting the once-on-load `report()` call, hard-coding `"false"` while the click handler still reads the theme, and replacing the script with one that writes a constant. A judge drove Chrome against each and confirmed all three leave a dark-preferring visitor with `pressed: false` under an active dark theme — the exact inversion the test's own docstring claimed to protect against. Downgraded to minor because the shipped code was always correct; the defect was the guard.

Now **executed, not grepped**: the emitted module runs against a linkedom stub for a dark visitor and a light one, asserting state before and after a click. Both directions are needed — a dark visitor alone is satisfied by a script hard-coding `"true"`. Kills all three vectors plus a polarity inversion the a11y dimension flagged separately as uncovered.

### Assertion strength (5 defects, all fixed)

| finding | fix |
|---|---|
| Toggle sync guard passed with the sync removed | Execute the shipped module; assert both visitor directions |
| `accessibleName` precedence untested — inverting it left the suite green | Two fixtures pinning aria-label precedence both ways; dropped the redundant `.sr-only` branch (name-from-content already concatenates it, and a dedicated branch is accname-*incorrect* for an anchor with visible text) |
| `links to Strava exactly once` hard-coded `"Strava Profile"` | Derived from `LINKS`. Renaming the link in its sanctioned single home no longer reds the gate — verified: that mutation now correctly **survives** |
| Heart ink read by token **name**, not through the wearer's classes | Resolved via `painted()` walking the glyph and its ancestors, asserting `via === "--brand-ink"`. The old form certified a hex nothing was guaranteed to paint — the same shape as the 1.89:1 defect the palette work fixed |
| Heart placement guard accepted `ancestors.some(...)` | Pinned to the glyph's own wrapper, which must paint nothing else. "Some ancestor" was equally satisfied by the `<p>`, the card, `<main>` or `<body>` — every character of the footer sentence turning brand red, suite green. Screen-reader-only descendants stay exempt |

Plus `it("is announceable")`, which was strictly implied by the assertion below it. Replaced with the one hazard nothing caught: a state word in the name. `"Dark theme on"` passes every other assertion here and would announce the state twice, contradicting itself when not pressed.

### Prose that had gone false (7 defects, all fixed)

- **`CLAUDE.md` still said "all nine controls wear it"** — measured seven. I updated five other documents and missed the one that steers every future session.
- **`.devin/wiki.json` still steered the public DeepWiki page** to quote the removed toggle name and a removed safelist field. Regenerated daily and read by outsiders. The safelist sentence is now a derive-at-generation-time instruction rather than a frozen list, so the next added or removed field cannot falsify it again.
- Dead `GOALS` import in `control-geometry.test.ts` (took a `pnpm check` hint with it, 3 → 2), a test comment still counting nine controls, `plans/README.md`'s pointer saying "further down" when the section is above, and `Goal.astro` overclaiming a principle it applied to exactly one token.
- The suite count in `plans/README.md` — reported as 118, then 120, now **122**. Third time it has gone stale in this PR; every count in that file is worth distrusting.

### Refuted (1)

**"In light mode the sun icon and the fixed name 'Dark theme' describe different things."** The measurement reproduced; both premises failed. The skeptic fetched the sentence *after* the one I quoted from Higley — *"This one edge case does not take away the general recommendation to change the aria-pressed state, and not the name, for other toggle buttons"* — so the article prescribes exactly what this PR does. And there is no mismatch: sun = light active, and `"Dark theme"` + `pressed=false` = light active. Worth having, because it stopped a fix for a non-defect.

### Verification after the fixes

- **122/122**, `pnpm check` **0 errors** (2 hints, down from 3), `pnpm eslint` 0 problems. Two TypeScript errors in my own new test code were caught by running the *full* gate rather than just the suite — `netlify.toml` runs `pnpm check && pnpm test`, so they would have blocked the deploy.
- **11 mutation vectors re-run: 10 killed, 1 correctly survived** (the constants.ts rename, which must not fail).
- **Emitted selector set unchanged** by the fixes: still `.ml-4` removed, `.text-[var(--brand-ink)]` added, and nothing else. My new `.astro` comment prose emitted no rule.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

**calvindotsg** — 2026-07-26

## Merged and verified on production — plus a correction to my page-weight number

`a192a899`, signature verified, tree-diff containment empty, `pnpm check && pnpm test` green in the main checkout at **122/122** (asserted the pull moved HEAD first — a stale checkout would have reported 120).

**Production verified live**, not inferred: stylesheet md5 identical to the build I measured; the toggle's accessibility tree correct on all four visitor paths (stored dark → `pressed: true`, stored light → `false`, system dark → `true`, scripts disabled → server's `data-theme` and `aria-pressed` agree); the heart painting `rgb(168,35,52)` on light and `rgb(243,163,170)` on dark against the measured card background, rect unchanged; zero clipping and zero unreachable content across 20 viewport × theme configurations, with only the intended sub-`md` 72px portrait bleed; head integrity intact; all assets 200.

### Correction: the wire delta is **−62 B**, not +64 B

I reported "+64 B on the wire (markup +102, stylesheet −38)". That was **wrong in direction**, and the cause is my measurement, not the change.

I compared the **deploy-preview origin** against production. A deploy preview injects 220 raw bytes of Netlify markup (`<div data-netlify-deploy-id …>`) that production never serves — I normalised that away for the token diff but not for the byte measurement. Stripped of it, preview and production markup are within 1 byte of each other, so the two origins were never comparable for page weight.

Production-before against production-after, three identical brotli samples each:

| | before | after | delta |
|---|---|---|---|
| markup | 3,239 B | 3,217 B | **−22 B** |
| stylesheet | 6,790 B | 6,750 B | **−40 B** |
| **net** | | | **−62 B** |

So the change is a small net *reduction*, and the "added script logic compresses poorly" story I offered for the phantom increase was an explanation for an artefact. The stylesheet's −40 B is the real, attributable component: one selector removed, one added.

Generalising for next time: **page weight cannot be measured on a deploy preview at all.** Measure production before the merge and production after it, or subtract the injection explicitly.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-63"></a>

## #63 — fix(cards): let a card take its content's height, not its grid area's

`merged` · opened 2026-07-26 by **calvindotsg** · merged 2026-07-26 as `ebcf8efee` · `worktree-goal-card-whitespace` → `main` · +1576/−16 across 10 files

Closes the empty band under the two goal cards, the same defect on the three other
cards that had it, and three follow-ups from review: the cards are stacked rather than
spread, every card heading reserves the same space beneath it, and an icon in a line of
text is centred on that text's capitals instead of riding above them.

A six-dimension review panel then found 15 major issues in this branch. **Almost all of
them were in the tests and the prose, not the page** — assertions that could not fail,
and numbers that measured something other than what their sentence said. One was a real
regression and is fixed. Everything is corrected below, and the section at the end says
what changed and how it was verified.

## What was wrong

At the large breakpoint a card's height comes from the page's eight rows, never from
its content, and a grid item stretches to fill its area by default. Every pixel of the
difference collected under the last line. **One metric for every figure here:** the
distance from the bottom of the last text line to the card's **content-box** bottom, so
the 24px of padding beneath it is excluded. Against the outer padding edge each figure
is 24px larger, and quoting the wrong edge is the easiest way to look wrong in this PR.

| card | before | after |
|---|---|---|
| My Running goal this year | 63px | **9px** |
| My Cycling goal this year | 63px | **9px** |
| I'm a Business Systems Analyst (NCS) | 111px | **1px** |
| I'm a Founding Business Systems Analyst (HeyMax) | 43px | **1px** |
| About me | 24px | **2px** |

Three cards are not in that table because they had no band to reclaim. Now's content
wanted 2px **more** than its box and the footer's 6px more; the intro card is measured
differently and is discussed under its exemption below.

I own part of this. PR #62 removed the two goal cards' Strava buttons, which took
content out of cards whose boxes I had verified as unchanged, and let the figures text
un-wrap from two lines to one. That PR's body called the un-wrapping a "visible bonus";
it was also this.

## Why re-spanning cannot fix it

The bands sit in different columns, so they cannot be pooled and spent elsewhere. In
the right-hand column — the one the report was about — the three cards want 206, 206
and 170px, and each needs three rows: **nine rows for the eight the column has.**

The row height is a **continuum, not a short list**. `main` takes the viewport height
clamped between 736 and 800px, and eight rows share what is left after 48px of padding
and nine 16px gaps (the eight explicit tracks plus two implicit zero-height ones make
ten), so a row is `(clamp(736,vh,800) − 48 − 144) / 8` — anything in 68…76px, for a row
cost of 84…92px including its gap. Measured: 68px at the 736px floor, **69.75px** at a
750px viewport (a fractional row height, which is what makes an enumeration of values
wrong rather than merely incomplete), 76px from 800px up. The column is over-subscribed
at every one of them.

Cutting a goal card to two rows gives it 168px and pushes its last line **29px past its
content-box edge, of which 5px falls outside the clip** and is ink the reader loses. An
earlier version of this PR called the 29px "sliced off the last line" — that was the
outer-edge mistake again; 24px of it is padding.

Reclaiming the two empty rows that the role cards' six-row spans create does not help,
it hurts: their 32px of gaps go back into the eight real rows, every row grows to 80px,
and the goal band goes **63px → 75px**.

## What ships

**1. A card sizes to its content.** Two tokens: it start-aligns in its grid area and
caps its block size at 100%.

Be exact about what the cap can reach, because the first version of this PR was not. A
percentage max-height resolves against the **containing block**, which is the grid area
only for the five cards that are direct grid items. For the three cards inside the
right-hand stack the containing block is the stack — 720px at 1440x900, more than 500px
above what any of them asks for — so **the cap cannot bind there at all**, and what
keeps those three inside their column is the stack, not the cap. Where it does bind:
remove it at 1440x900 and exactly one card changes, the footer, 76px → 82px; at
1024x600, where the rows are shortest, it also holds About me and the HeyMax card. The
tests still require the cap on every non-exempt card, because which cards are direct
grid items is a property of the wrapper, not of the cards.

**2. The right-hand column is its own stack.** Content-sized cards alone were not
enough, because grid rows are shared across every column: that column's row heights are
decided by the intro and role cards beside it, so its cards ended up **70px and 70px
apart** (an earlier version said 74 and 53 — reproduced on the previous revision with
the fix injected and no wrapper, both gaps measure 70px; the problem is that they are
four times the page gap, not that they are unequal). Wrapping the three of them in one
grid item makes their spacing theirs to set — measured **16px and 16px**, with **106px**
collecting beneath the last of them. The wrapper is 720px tall against 582px of cards,
so 138px is unspent, but 32px of that is the two gaps *between* the cards and only the
remaining 106px pools at the foot. An earlier version quoted the 138.

**3. The heading reserves the same space beneath itself.** This was inconsistent and
measurably so: the goal cards had 16px between heading and body — supplied by the
progress bar's own top margin, which is why they looked right — while About me and both
role cards had **1px**. The space now belongs to the heading, and the bar's own margin
came off so the goal cards do not end up with 32px.

It reaches **the five cards that pass a title to `Card`**, not "every titled card": Now
hand-rolls its own heading inside a flex wrapper, so the rule never reaches it and it is
unchanged at 11px on both revisions. That is a real inconsistency this PR does not
close, and it is deliberate — Now is the card Calvin cited as looking *right*.

**One card opts out** of (1): the intro card, the only card with no band to reclaim.
Its inner row asks for its height as a percentage, which needs a parent height already
decided; sized to its own content there is none, so its two halves stack at their
natural heights and its content asks for 355px inside a 318px box. What then falls
outside the clip edge is **the bottom row of three controls — Strava, Telegram and the
résumé link — by 6px at 1024x600**. *Not* the portrait: an earlier version of this PR
said 5.5px of the portrait was sheared, and that is wrong. The portrait renders at its
275px attribute height with the exemption or without it and stays 3px inside the clip
edge either way.

**4. An inline icon is centred on its text's capitals.** `presetIcons` renders an icon
as an inline-block one em tall, and an inline-block's *bottom* sits on the text baseline
— but capitals only reach cap-height above it, 0.705em in the face this stack resolves
to. So the box overhung the cap line by (1em − cap)/2. Reported on the two job titles;
it was one defect in four places at two font sizes, a uniform **0.1477em**:

| host | font | rode high by | after (root 16) |
|---|---|---|---|
| "Hi, I'm Calvin" greeting | 20px | 2.954px | **0.06px** |
| "I'm a Founding Business Systems Analyst" | 20px | 2.954px | **0.06px** |
| "I'm a Business Systems Analyst" | 20px | 2.954px | **0.06px** |
| footer heart | 12px | 1.772px | **0.04px** |

The residual is a fixed fraction of the em, so it has to be quoted with a root size: the
20px hosts leave 0.06 / 0.07 / 0.09px at root 16 / 20 / 24 and the heart 0.04 / 0.04 /
0.05px. An earlier version quoted 0.06px for all three.

One declaration at the emission point, `vertical-align: -0.145em`, which is the
mechanism `presetIcons` documents for this — it is the example property in its own
"extra CSS properties" section. The mechanism is from the docs; the value is measured.
-0.145em is the midpoint of the ideal `(1 − cap/em)/2` for the faces this stack can
resolve — cap/em measured at 0.705 for the system face, 0.717 Helvetica, 0.716 Arial —
so it is not tuned to one machine, and it holds within a third of a pixel for any cap
ratio in 0.68–0.73.

Three alternatives were built and measured against the live page first:

- **`middle`** adapts per font but centres on half the *X*-height, not the cap band:
  **1.83px low**. Trading high for low is not a fix. (It is also the value the UnoCSS
  docs use illustratively, so it needed ruling out explicitly.)
- **`-0.125em`**, the constant Font Awesome and Bootstrap Icons ship, leaves 0.45px. It
  is **Font Awesome's own font descent** — 64 of 512 units in FA5, exactly 0.125em —
  not "a 0.75em cap assumption" as an earlier version of this PR claimed, and FA ships
  it on its SVG selector, not its webfont classes. FA6 kept -0.125em after moving its
  descent to 0.1465em, which a cap-derived number would not do.
- **`calc((1cap − 1em)/2)`** is exact by construction and Chromium accepts it: it
  computed −2.9541px against an ink-measured 2.954, two independent instruments agreeing
  to four decimals. Rejected on support — the `cap` unit needs **Chrome/Edge 118, Safari
  17.2 or Firefox 97**, and it only became Baseline Widely Available on 2026-06-11, six
  weeks ago. An earlier version of this PR said Chrome 111 / Safari 16.4; those belong
  to *other* units (the `rex`/`rch`/`ric`/`rlh` family and `lh`/`rlh`). Roughly 10% of
  tracked traffic lacks `cap`, which is not the sliver the wrong numbers implied.

**It is live on four icons and does nothing to the other ten.** Those ten sit in flex
containers, so they are blockified — computed `display: block`, whatever the sheet
declares — and `vertical-align` has no effect on a block-level box outside an inline
formatting context. Measured rather than argued: forcing an absurd `-3em` on all
fourteen moves the four inline ones by 57px and 34px and leaves nine of the ten flex
ones exactly where they were relative to their parent. The tenth is whichever toggle
glyph the current theme hides, which is `display:none` and has no box to move.

## Responsive and mobile

- **320–767px (one column):** the band cannot occur — rows size to their content, so no
  card is stretched.
- **768–1023px (two columns):** exactly one card had it, the NCS role card, because it
  shares a six-row span with the taller HeyMax card. It is width-dependent: 79px at
  exactly 768px wide, 111px by 900px wide. Both are 1px after.

**The wrapper does change the smaller layouts, and an earlier version of this PR said
it did not.** `display: contents` generates no box, so the three cards stay grid items —
but grid auto-placement is **DOM-order driven**, and the three cards being wrapped were
not contiguous siblings, so wrapping them moves Now up past About me and both role
cards. Measured, with the card sizing held constant so the wrapper is the only variable:
at md **five cards re-place and the footer moves from the right column to the left**;
at 390px Now moves up 670px; page height at 768x900 goes 1165 → 1191px. Nothing is
clipped or unreachable by it, and reading order still follows the markup, but it is a
visible change at md that was previously undisclosed.

## Evidence

- **Containment:** 8 cards found in every configuration, **zero ink lost and zero
  unreachable content at the default text size**, across a viewport × theme sweep.
- **Emitted selector set**, cold build vs cold build of `origin/main`: **10 added, 0
  removed** (`.self-start`, `.max-h-full`, `.contents`, `.mt-0`, `.mb-[16px]` and the
  five `lg:` utilities that place and stack the wrapped column). The icon fix adds none
  — it changes existing icon rules rather than emitting a class, which is also why a
  selector-set diff cannot see it and the declarations had to be diffed instead.
- **Transfer cost**, cold vs cold: **+283 B brotli markup, +76 B stylesheet (+359 B).**
  13 B of the stylesheet figure is the icon fix, which costs ~690 raw bytes because
  `presetIcons` also writes the property as an attribute into each mask data URI, where
  it is inert; the repetition compresses away.
- **`public/preview.jpg` retaken**, because it is a crop of the intro card and the
  greeting icon moves inside it — the card's rect does not move, but the image still
  goes stale. GitHub's image diff on that file is the before/after evidence. Checked
  rather than assumed: the same recipe run against a build of the previous revision
  produces an image indistinguishable from the committed one, and the amplified
  difference between the two renders is a single blob at the greeting icon, with
  portrait, type and all six control plates identical.
- **Mutation-tested throughout**, and this is where the panel's value showed up. See
  below.
- `pnpm check` clean, `pnpm test` **137/137** (122 before this branch).

## Text-only zoom: a real regression, found by the panel and fixed

The disclosure in the first version of this PR was wrong in the direction that matters.
It said "at the default root size nothing is lost anywhere" — true — and then quoted two
figures at 1440x900, root 20 and root 24. **Root 20 at that viewport is the one place
the branch improves.** The panel swept properly and found the branch losing content at
root **17**, where main loses none.

The cause: the heading's reserved space was `1rem`, so every titled card became one
root-unit less tolerant of enlarged text than main, while a card's height comes from the
grid and does not scale. Fixed by pinning that space to an absolute length. Measured
total page loss, main vs branch-before vs branch-after:

| root | viewport | main | branch (1rem) | branch (shipped) |
|---|---|---|---|---|
| 16 | any | 0 | 0 | **0** |
| 17 | 1024x800 | **0** | 8px | **7px** |
| 18 | six viewports | **0** | 3.5px | **1.5px** |
| 20 | 1440x900 | 24px | 14px | **10px** |
| 22 | 1152x800 | 610px | 670px | **640px** |
| 24 | 1440x900 | 408px | 480px | **440px** |

So: identical at the default size, better than the 1rem version at every size above it,
still worse than main at root 17–18 by a few pixels of one card's last line, and better
than main at root 20. Above root 22 both revisions are badly broken — main loses 610px
at 1152x800 — so the branch being 30px worse there is not the interesting fact.

**The residue is a pre-existing architectural defect, not something this PR can close.**
A card cannot get taller because the lg grid is height-capped, so the honest fix is to
let the page stop being single-screen when text is enlarged. That is a design decision,
not a bug fix, so it is documented in the code and left for you.

I also declined one remedy the panel proposed. Giving the three stacked cards
`shrink-0` does reduce their clipping at root 22+, but it pushes 63–155px of overflow
onto `main`'s own clip instead — trading card clipping for page clipping, in a range
where both revisions are already broken.

## What the review panel found, and what it cost

Six dimensions, then a skeptic per finding: 35 findings, 15 major. Then four fixers on
disjoint file sets, each with its own adversarial verifier. The four confirmed test
holes and the two majors that reproduced were all of one kind — **an assertion that
could not fail**:

- The icon test had **no at-rule or width filter at all**, so gating the whole fix
  behind a non-matching at-rule restored the defect on screen with every assertion
  green. Its winning-value walk also matched only selectors exactly equal to the icon
  class, so any higher-specificity override reinstated the defect silently, and its
  premise assertion had the same narrow walk — a call-site utility could make the icon
  32px tall.
- `card-fill` evaluated the cascade at **exactly one width, 1024px**. A `lg:lt-xl` range
  gate satisfied every assertion while the band returned in full at 1440x900, the
  viewport every figure in the file is measured at.
- The wrapper's three grid-placement tokens were **unpoliced**: dropping the row-span
  alone collapsed the right-hand column and clipped 148px of a goal card, suite green.
- `page-fit`'s card-clipping assertion was breakpoint-blind *and* order-blind, so gating
  the clipping to lg passed while every card stopped clipping below that breakpoint and
  the intro portrait spilled 71px past its own border box with nothing clipping it.
- Smaller: the stacked column's gap was only asserted *defined*, so zero passed; the
  heading's space was never sized, so 2px everywhere passed; the second-helping guard
  read one element, so an intermediate wrapper defeated it.

Two more were found while fixing, because **a width sweep is a list of sample points**
and this repo has been bitten by enumeration before: a rule pair gated at max-width
800px and min-width 1000px satisfies every swept width while leaving 801–999px carrying
100% of the defect (verified both ways — 137/137 green without the new assertion, three
failures with it), and an inline `style` attribute outranks every rule the tests read
while leaving the sheet byte-identical. Both are closed; the second matches a guard
`control-geometry` already had.

Every number in this PR body, in the commit messages and in the code comments was
re-derived by the panel, and the corrections are folded in above rather than listed
here. Two of the panel's own claims did not survive checking, and I have not acted on
them: one headlined a real flex-shrink mechanism as happening "at a text size where main
loses nothing anywhere", where main loses 610px, and one proposed a remedy that moves
overflow rather than removing it.

## Not done, deliberately

Now and the footer still end a couple of px inside their own bottom padding; they have
no spare height to give and lose no ink. The unused height still collects at the foot of
each column — that is where it has to go once the cards are packed. Now's heading
spacing is still 11px measured against the other five cards' 16px, because Now is the
card you cited as looking right. (11px is the measured ink-to-ink gap; the 8px on its
wrapper is a declared margin, and mixing the two is exactly the error this PR spent a
round correcting.) And the honest way to fill a card that is genuinely short of
content is content: a pace figure, a percentage, an "updated" line on the goal cards.
That is a content decision, so it is proposed rather than implemented.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-64"></a>

## #64 — docs: correct two documents that assert false things about this repo

`merged` · opened 2026-07-27 by **calvindotsg** · merged 2026-07-27 as `96c99975c` · `worktree-docs-stale-claims` → `main` · +4/−4 across 2 files

Two documents assert things about this repo that are false. Neither affects the shipped
site, and nothing tests either file — both were found by auditing, not by reading.

## `.devin/wiki.json` — the Card prop contract is stale

It states, **twice** and as a contract "verified at authoring time", that Card has ONLY
the props `{title?, titleIcon?, colSpan?, rowSpan?}`. PR #63 added `fillsArea?: boolean`,
the prop that lets the intro card keep filling its grid area while every other card sizes
to its content.

Both occurrences — one in `repo_notes`, one in `pages` — are hand-written steering text,
so the daily regeneration does not fix them. A stale *verified contract* is worse than no
note at all, because it steers the generator toward the wrong answer.

## `plans/README.md` — two entries cite commits that exist on no branch

The 002 defect has been on file since the PR #48 review; auditing every hash in the table
turned up a second one nobody had recorded.

| plan | recorded | actual | why |
|---|---|---|---|
| 001 | `4144f81` | **`6b2cfde`** | dangling pre-rebase duplicate — **trees identical**, so only the hash was wrong |
| 002 | `a4a3e0e` | **`32071fe`** | `a4a3e0e` is *"chore: pin the Netlify build command to run checks and tests"* — **not the same work** |

002 is the worse of the two: it did not merely name a rewritten SHA, it named an unrelated
commit, so anyone verifying that plan against its recorded hash would have read the wrong
diff. The remaining 13 hashes were checked for reachability in the same pass and all are on
`main`.

## Deliberately not touched

The wiki's note that the lg grid is packed **32/32 cells**. The wrapper added in #63 makes
the right-hand column one grid item instead of three, so the *composition* changed even if
the total did not, and the failure mode the note describes — auto-placement pushing Now
into a zero-height implicit row — now reads differently because Now sits inside that
wrapper.

I could not measure the cell arithmetic reliably enough to rewrite it: a first attempt
mis-parsed the responsive span variants and reported 17 of 32, which is my instrument being
wrong rather than the page. Editing a claim on the strength of a number I don't trust is the
exact error this PR exists to correct, so it is left alone and flagged instead.

## Evidence

- Every `**DONE**` hash in the ledger re-checked with `git merge-base --is-ancestor <h> origin/main`;
  after the fix, zero dangling.
- The two replacements confirmed by subject **and** tree comparison, not by subject alone.
- `.devin/wiki.json` still parses; edited as literal text so the JSON formatting is untouched.
- `pnpm check` clean, `pnpm test` **137/137**. No source file touched, so the built site is
  unchanged.

Commit is signed (`%G?` = G).

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-65"></a>

## #65 — fix(a11y): let the page grow with the reader's text instead of clipping it

`merged` · opened 2026-07-27 by **calvindotsg** · merged 2026-07-27 as `73d3cf136` · `worktree-text-zoom-growth` → `main` · +504/−80 across 12 files

## The defect

A visitor who has asked their browser for larger text was losing content — not pushed below the fold, **deleted**. `<main>` was clamped between two absolute lengths (`736px`/`800px`), so the grid could not get taller while everything inside the cards scaled with the root font-size, and every card clips. The page stayed exactly as tall as the viewport, so there was no scrollbar to recover any of it.

Measured as ink past each card's clip edge, summed over the eight cards:

| root | 1024x800 | 1440x900 | 1024x600 | 1024x768 |
|---|---|---|---|---|
| 16px | 0 | 0 | 0 | 0 |
| 17px | 4.8 | 0 | 30.5 | — |
| 18px | 196 | 0 | 292 | — |
| 20px | 457 | 7 | 615 | 535 |
| 22px | 966 | 163 | 1118 | — |
| 24px | 1596 | 372 | 1748 | 2216 |
| 40px | — | — | — | 8315 |

At a 20px root and 1024px wide the footer loses "Gianmarco", About me is sliced mid-sentence at "Join me in my", and the cycling card's "km" is cut in half.

## One class, not four choices

Four absolute lengths, and three of them were only absolute *because of* the fourth:

| | before | after |
|---|---|---|
| `main`'s height clamp | `736px` / `800px` | `46rem` / `50rem` |
| card heading gap | `16px` | `1rem` |
| control box | `64x48px` | `4rem x 3rem` |
| intro copy-column cap | `300px` | `18.75rem` |

Each of the last three shipped with a comment explaining it *had* to be absolute because a card could not get taller — `uno.config.ts` ended "until that changes a growing control only buys a clipped one". Fixing the budget is what changes it, so all four move together. **Every one is the same number it was at the 16px root every browser ships.**

## The breakpoints had to move too

Freeing the height alone was not enough. The four-column grid needs roughly 64 characters of width; at a 24px root a 1024px viewport offers about 42, and it was still being handed four columns — every line wrapped, and 846px of ink was still lost after the budget was free.

`theme.breakpoints` now restates presetWind3's own five defaults as `40/48/64/80/96rem`, and the three hand-written media queries in `.astro` files moved in the same pass (two for `.button-grid`, one that deliberately mirrors `md`).

A media-query `rem` resolves against the reader's own default font size. An author setting `font-size` on `:root` moves every rem **length** and no rem **media query** — which matters here because that is also the easiest way to write a probe, and the instrument this repo already had did exactly that, so it could not have seen this fix work. Both mechanisms were checked against a synthetic page with a known answer before anything was measured.

## Result

**0 ink lost at every configuration swept** — 13 viewports from 320 to 2560 wide, root sizes 16 through 40 — where `main` loses up to 8315px.

## Nothing changes at the default text size

- Body, `main`, all eight card rects (parent-relative, so an ancestor reflow cannot masquerade as a card responding) and **every ink rect on the page**: identical across **186 configurations** — 31 widths from 320 to 2560, three viewport heights, both themes. Zero differences.
- The 1440x900 retina screenshot is **byte-identical by md5**.
- Emitted selector set: 217 rules before and after, with exactly four swapped one-for-one for their rem spellings.
- Wire cost: 23 bytes smaller raw, 1 byte smaller brotli. Nothing.

The `vh` term in the middle of the clamp stays `vh` and must — it is what makes the page single-screen at all. A `50rem` floor instead would push a 760px-tall viewport into scrolling at the *default* text size, which is a regression dressed as a fix.

## Tests, 137 -> 142

Two new invariants and three inverted ones, each stated as "not an absolute length" rather than as a list of allowed units, because an enumeration leaks by construction:

- `main`'s height budget may contain no absolute length, **and** both ends of the clamp must exist at `lg` and be font-relative — deleting the clamp satisfies the negative half on its own, so non-vacuity is asserted separately.
- Every width bound in the whole **sheet** must be font-relative. This is the one that catches a desync: a single px query left among rem ones does not fail loudly, it parts company with its variant siblings the moment a reader enlarges the text.
- Nothing inside a clipping card may carry an absolute height cap, with an exemption list keyed on the **element** rather than the selector. Keyed on the selector first, which excused nothing — the portrait's cap is declared by a utility class, not by `.portrait`.
- The heading gap and the control box must both be font-relative.

**The helper needed the same treatment.** `minWidthOf`/`maxWidthOf` matched `px` literally, so the moment the breakpoints became rem every `lg`-gated rule read as unconditional. Five tests failed loudly — and others could have passed for the wrong reason. Bounds now resolve any unit and **throw** on one they cannot read, because a null bound reads as "not width-gated" and silently turns its assertion into a no-op. That failure shape has bitten this file twice now, once on the syntax and once on the unit.

## Mutation-tested

14 vectors, all as predicted. 12 red: reverting each of the four lengths, dropping the clamp, dropping the breakpoint theme key, reverting **one** breakpoint to px, reverting either hand-written query, spelling a cap in points rather than pixels, and a width bound in a unit the parser cannot read. 2 green controls — an equivalent `em` spelling, and a wider but still font-relative cap — so the assertions are not merely brittle. Restores verified by file snapshot rather than by git, since the worktree held uncommitted work.

## One measurement artefact worth recording

`Page.captureScreenshot` with `captureBeyondViewport` **resets** `Page.setFontSizes` to 16px, and the pixels are produced after the reset. The first enlarged-text screenshots therefore showed a page with no defect at all while the DOM said 457px was being clipped. Captures now grow the emulated viewport instead, and assert the root font-size both before and after the shot.

## Known trade, disclosed rather than discovered

`.button-grid`'s two column-count bounds were tuned with slack against a px control, so at enlarged text they drop a column slightly before the controls stop fitting. That costs a row of card height the page can now afford, and no ink. Not worth leaving a px bound behind to part company with every other breakpoint.

## Not touched

The wiki's "lg grid is packed 32/32 cells" note is still unverified — this PR changes no grid spans, so it is left exactly as PR #64 left it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-66"></a>

## #66 — fix(now): move the explainer into the card's corner, so Now inherits its heading

`merged` · opened 2026-07-27 by **calvindotsg** · merged 2026-07-27 as `6321acfda` · `worktree-now-info-icon` → `main` · +578/−32 across 12 files

## The defect, and why the symptom points at the wrong thing

The Now card broke the heading-to-body convention the other five cards keep. Measured ink-to-ink at 1440x900, the gap under its heading was **9px against 20px** on about-me and both role cards — which looks like a spacing value someone got wrong.

It was not a spacing value at all. `Card` owns that space and gives it to every card that passes a `title`, and this card *could not pass one*: the "what's that ?" link **shared the heading's row**, stacked under it in a flex column with the live dot pushed to the far end. A heading written out in the component inherits nothing from `Card`.

Fix the structure and the spacing arrives on its own. Nothing in `Now.astro` sets a spacing value any more.

| | before | after |
|---|---|---|
| Now's heading-to-body gap | 9px | 20px |
| cards reserving that space | five of six | six of six |

## What the link became

An icon in a new `corner` slot on `Card`, beside the live dot. The slot exists because those two marks belong to the *card*, not to any line of its copy — and the offset is the card's own padding, written in `Card` because a caller does not know what this component pads by and a caller that guessed would drift the moment it changed.

**Why the corner and not after the title.** An adornment inside the heading was the first shape tried and it is worse for the reason that matters most about a heading: a link inside the heading element becomes part of that heading's accessible name, so screen-reader heading navigation would announce *"Now What's a /now page?"* instead of *"Now"*. The corner keeps the heading's name exactly one word — verified on the built page.

**The live dot moves 6px down** (25px below the card's top edge → 31px), and that is the slot working rather than a side effect. Two marks in a row share a centre line, and the taller of the two is the 24px explainer. It also lands the dot *better* against the heading: its centre is now 37px below the card's top against the heading's optical centre at 36px, where it used to sit 5px high. Horizontal position unchanged, 227px in from the card's left edge in both.

## The name is the whole announcement

There are no visible words left, so the accessible name is all a screen reader gets. It moved to `constants.ts` along with the URL and the icon id — the URL was a literal in the markup before, which is not one of the three places configuration is allowed to live here.

"What's a /now page?" replaces "what's that ?". The old wording reads fine sitting under the word "Now" and says nothing at all in a list of links read out of context — which is exactly the context an icon link is read in.

## Target size: 24x24, and deliberately not 48

The plated controls are 48px. This is 24, and the inconsistency is real enough to state rather than hide.

24x24 is exactly WCAG 2.2 SC 2.5.8 (Minimum, AA), and the number axe's `target-size` audit measures. SC 2.5.5 (Enhanced, AAA) asks 44 and this does not meet it. The reason is position, not principle: at 44px the box would run from the card's top padding edge down into the first line of body copy, and sideways past where a longer card title can reach — measured, the heading's text can extend to 176px from the card's left edge and a 44px box would start at 172. The controls are a card's primary affordances in a grid of their own and have the room; this is a supplementary link in a corner.

The box is `w-6 h-6`, i.e. font-relative, for the reason PR #65 established: a target that stays 24px while the reader's text doubles has halved. It is **inline-flex** rather than a padded inline anchor, because an inline box's vertical padding paints and hit-tests but adds nothing to the line box — that shape would have reported a 24px target while overlapping whatever sat above it.

## Consequences elsewhere

- The card is 16px shorter (170 → 154 at lg), so the right-hand stack's unspent height at its foot grows 106px → 122px.
- Below `lg`, where the cards are in one flow, everything after Now shifts up 16px and the page is 16px shorter.
- **Nothing clips anywhere**: 0 ink lost across 13 viewports from 320 to 2560 wide at every root size from 16px to 40px, same as before.
- The explainer's glyph joins the **flex**-hosted icon group, not the inline one — its anchor is inline-flex, so the glyph is blockified and centred by its container, and there is no cap line in a card corner for the baseline nudge to centre it on.

## Tests, 144 → 146

- The explainer must have an sr-only name from `constants.ts`, **no visible words of its own** (having both announces the name twice), and an aria-hidden glyph.
- Now's heading must be a **direct child of the card**, i.e. rendered by `Card`. That is the structural half and the one that catches this regressing — a heading nested in a row of the card's own is exactly the shape that caused the report.
- A rot guard that the words "what's that" survive nowhere in the page.
- The explainer's box must resolve to ≥24px on both axes **and** be font-relative, resolved over every rule that can reach the element rather than the first one that agrees.
- `explainer_url` must be absolute, `explainer_icon` must name an installed collection, and the name must name its subject — pinned as "contains 'now page'" rather than as a literal string, so a better rewrite is admitted and "what's that ?" is not.
- One premise corrected: `card-fill`'s heading-space test now covers six cards rather than five, because Now qualifies for the first time. Its docstring said "five of six, with the sixth deliberately outside the rule".

## Mutation-tested

12 vectors, all as predicted. **9 red**: dropping the name, un-hiding the glyph, putting visible words back, shrinking the target, sizing it in device pixels, hand-rolling the heading again, a vague name, a relative URL, dropping the corner slot from `Card`. **3 green controls** — a larger font-relative target, a differently-worded but still specific name, and a different info glyph — so none of this is pinned to the exact choice made here. Restores verified by file snapshot, not by git.

## Docs

`.devin/wiki.json`'s two claims this makes stale are corrected in the same pass: `Card`'s contract now includes the `corner` slot, and the list of places an icon is the sole content includes this link.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvin-heymax** — 2026-07-27


---

## Panel review round: 23 findings, 20 survived, one major found three times over

A six-dimension adversarial panel with a skeptic per finding reviewed `f21cadd`. Everything below is fixed in `686d738`.

### The major: the corner marks painted over the heading and stole its clicks

They were absolutely positioned at the card's padding edge, with the heading given `4rem` of right padding to keep clear. Both lengths scale with the reader's text; **a card's width does not** — a card is as wide as the viewport allows. At 320px and a 34px root the heading's content box has collapsed to nothing, the word "Now" overflows right, and an out-of-flow box cannot be pushed aside.

Measured with my own probe (`elementFromPoint` over the heading's ink, heading scrolled into view):

| 320px viewport | root 34 | root 36 | root 40 |
|---|---|---|---|
| heading-ink points covered | 92 | 336 | **891** |

`elementFromPoint` over the word returns the **link** — a tap on the card's own heading navigated off-site. Zero on the previous revision across 36 configurations, and zero on production.

**Nothing in this repo could have caught it**, and that is the part worth keeping: occlusion by a later-painted sibling costs no rect and clips no ink, so the ink-loss sweep this PR leaned on was correctly reporting zero the whole time.

**The fix:** the marks sit **in flow**, in a row they share with the heading, and the row **wraps**. Where the two cannot sit side by side the marks drop to their own line — instead of overlapping the heading (absolute) or being sheared off by the card's own clipping (an unwrapped row, which was measured and deletes the live status dot entirely at 320px/root 40, worse than the overlap it would replace). Verified: **0 occluded points across all 42 configurations**, dot 100% inside its clip box, anchor hit-reachable at every sample point. The heading now comes first in the DOM, which also fixes a second finding three dimensions raised — the marks were announced and copied ahead of the heading they annotate.

At the default text size nothing moves: **0 of 186 configurations differ**, card height 154px, heading gap 20px, anchor and dot horizontal positions identical. The dot sits 2px lower, putting its centre at 39px against the heading's optical centre of 38.96px.

### Five majors in my own new assertions, each with the suite still green

A method audit broke them one at a time and showed the output:

- **at-rule blind** — `lg:w-6 lg:h-6` left every phone and tablet declaring no box at all, a 16px target exactly where SC 2.5.8 bites. Now resolved per width over [320, 375, 768, 1024, 1440]. This file's own header already recorded the same hole in the control path.
- **`max-*` unread** — a `max-w-4` below the declared width wins the used value outright. That is the theme-toggle defect this file was written for.
- **inline `style` unread** — `style="width:16px"` walked straight past a sheet-only walk.
- **`display:none` on the marks group** removed both marks from the page *and* the accessibility tree, green. The paint check now walks the ancestor chain, because in that case no rule reaching the link declares anything.
- **`pointer-events:none` / `tabindex="-1"`** each left a correctly-sized target that cannot be clicked or tabbed to.

Three minors from the same audit, also closed: the accessible name was checked with `toContain`, so extra hidden text concatenated into what is announced ("Link Link Link. What's a /now page?" passed); "no visible words" classified direct children by class token, so a visible span nested under an `sr-only` wrapper painted "huh ?" undetected; and the rot guard ran over `textContent`, so `title="what's that ?"` survived in the shipped markup.

### One silent coverage loss — caused by the fix above

`card-fill` selects card headings by **direct** child, so nesting Now's heading in a row dropped it from six to five while `toBeGreaterThan(2)` stayed green, undoing this PR's own headline. Both selectors now match any heading in the card, and the count is pinned at 6.

### Claims corrected

The one that matters beyond this PR: **"0 ink lost across 13 viewports × root 16–40" measured only each card's BOTTOM clip edge.** The right edge is not zero, and **PR #65 made it worse**. Putting the control box in rem lets two controls plus their gap exceed a narrow card, pushing the intro card's copy column wider than the card and shearing the hero text:

| right-edge loss | 320px | 360px | 375px | 414px |
|---|---|---|---|---|
| root 40, before #65 | 34.6 | 0 | 0 | 0 |
| root 40, after #65 | **136.8** | **96.8** | **81.8** | **42.8** |
| root 32, before #65 | 0 | 0 | 0 | 0 |
| root 32, after #65 | **47.4** | **7.4** | 0 | 0 |

Freeing the height budget does not free the width. Recorded in `index.astro`, `BasicLayout.astro` and `Card/index.astro`, and **being fixed in a separate PR** rather than left implied by a sweep that could not see it.

Also corrected: the heading's optical centre is 38.96px not 36px (so the dot was 8px high, not 5); "tests 144 → 146" — the base suite is 142; "at 44px the box would run down into the first line of the body copy" is false, a 44px mark ends exactly on that line box's top and clears its ink by 1px, so the binding constraint is horizontal only; 176/172 → 175/171 (derived without the card's 1px border); "the plated controls are 48px" — they are 64x48, and only the short axis bears on target size; the `inline-flex` rationale cited a hazard that cannot occur here, since the marks group is itself a flex container so the anchor computes to `flex` either way — right token, wrong reason; "the other eleven" flex-hosted icons is ten of eleven, and `Now.astro`'s "nine" is right for the set it means; and the docstring I claimed to fix in `card-fill.test.ts` is in `src/components/Card/index.astro`, a file this PR never touched.

`Now.astro`'s own comment said "11px against 16px" — measured, 9px against 20px, contradicting this PR body, its commit message and `Card`'s comment simultaneously.

### Mutation-tested

33 vectors across four harnesses, **all as predicted**: 12 on the original change, 7 on the in-flow layout (reverting to absolute, dropping `flex-wrap`, reordering the marks ahead of the heading, hand-rolling the heading, reverting card-fill's selector), 8 on the target-size holes, 6 on the accessible name. Six green controls among them, so none of this is pinned to the exact choices made here. Restores verified by file snapshot rather than by git.

**Suite 142 → 147.**

### Refuted, not acted on

`target="_blank"` without `rel` is what all six existing controls do; the hover colour reading as a second status light; and the absence of a tooltip for sighted mouse users.


---

<a id="pr-67"></a>

## #67 — fix(a11y): let the control ladder reach one column, so a narrow card stops shearing

`merged` · opened 2026-07-27 by **calvindotsg** · merged 2026-07-27 as `8f71f0de2` · `worktree-fix-horizontal-clip` → `main` · +566/−35 across 5 files

PR #65 put the control's box in rem and shipped a defect on the axis its sweep did
not measure. Two text-relative controls plus their gap are 9rem. A CARD'S WIDTH IS
NOT TEXT-RELATIVE — it is as wide as the viewport allows and no wider — so past a
certain text size two controls stop fitting, and `.button-grid`'s column ladder
stopped at two. The grid then held the intro card's copy column open at its own
min-content width, and the card's clipping sheared the hero copy.

Measured on cold, fingerprint-verified builds; the previous revision's stylesheet is
byte-identical to the one production is serving, so these are production-before
against production-after and not a preview:

  root 40   320px  136.84 -> 0     360px  96.84 -> 0
            375px   81.84 -> 0     414px  42.84 -> 0
  root 32   320px   47.44 -> 0     360px   7.44 -> 0

Root 32 is 200% text-only zoom, the WCAG 1.4.4 bracket. All six go to zero. The
ladder gains one rung — a single column below 13rem — and the control box stays
text-relative, which is the whole point: reverting the box to device pixels fixes
the same six figures and gives up the tap target that grows with the type. Both
were built and measured before choosing.

WHY 13rem, since the number is the load-bearing part. The bound has to clear the
9rem the controls need PLUS the card's own padding, which is text-relative too and
so cannot be paid for out of a rem budget: at a 40px root it is 60.00 per side, and
a 320px viewport hands this card 158.00 to lay out in. 13rem covers that with slack,
and slack is the right direction to be wrong in — an early rung costs height the
page can scroll, a late one costs ink.

IT CANNOT REACH THE DEFAULT TEXT SIZE, by construction rather than by luck: 13rem is
208 CSS pixels at a 16px root, and only reaches the 320px of the narrowest real
viewport once the root passes 24.6px. Verified by rect-diffing every element against
the previous revision across 40 configurations — 8 differ, and all 8 are root 32 or
40 at 414px or narrower, exactly where the rung fires. Every configuration at roots
16, 20 and 24, and every configuration at 768px and wider, is identical in both
element count and rect. What the rung costs where it does fire is height: 6032 ->
6584 at 320px and a 32px root, scrolled rather than clipped. 414/32 is the one
configuration where it fires though two columns would still have fitted; that is the
slack above, and it costs 496px of scroll and no ink.

A THIRD OPTION WAS MEASURED AND NOT TAKEN, recorded so it is not rediscovered as
new. Making the grid wrap by itself — `flex-wrap`, no column queries at all — is the
principled fix: it deletes two hand-maintained media queries and fits exactly as
many controls as there is room for, and it scores the same zero on all six figures.
It also changes the layout at the DEFAULT text size, putting three controls per row
at 360 and 375px where two ship today and four at 414px where three do. That is a
visible change to the page rather than a correctness fix, so it is Calvin's call and
not mine. It is the right thing to reach for if these queries ever need touching
again.

THE TEST THAT WOULD HAVE CAUGHT THIS asserts the ladder's shape and its arithmetic:
it must reach a single column, column counts must not decrease as the viewport
widens, and each rung must be able to seat the columns it grants at the narrowest
width it still governs. The arithmetic is normalised to a 16px root, which is only
root-invariant while the bounds and the control's box scale together — so the unit
of each is a stated precondition that fails loudly, since an absolute box under
text-relative bounds satisfies the inequality at a 16px root and violates it at 40.
That is precisely the shape of the defect. It is a NECESSARY condition, not a
sufficient one: it compares against the viewport where the real budget is the card's
content box, and browser measurement remains the other half.

Mutation-tested, 14 vectors, all as predicted after I corrected one of my own
expectations — the vector labelled "reorder" actually deleted the two-column rung,
which is a genuine defect (three columns granted down to 208px where they need 224),
so it is RED for the right reason and recorded as such. Three GREEN controls among
the 14 — the bound at 14rem, the control at 5rem, and a real source reorder — so
none of this is pinned to today's numbers.

Also swept for the defect class rather than the instance. A general occlusion probe
over every text node on the page, not just card headings: 0 stolen points across 40
configurations and ~1.8M samples on both revisions, positive control 7/7 throughout.
That check is here because this change makes the control grid taller and IntroCard
already records that the tagline can overlap the button row — and because occlusion
is invisible to every clip-edge instrument in this repo.

CLAIMS CORRECTED, all of them mine:

- uno.config.ts predicted the exact opposite of what happened. It said these queries
  "drop a column slightly before the controls actually stop fitting", costing height
  and no ink. They dropped one far too late and cost ink. Both readings rest on
  comparing a rem bound against a rem control, and the sweep that appeared to
  confirm the optimistic one measured the bottom edge while the damage was on the
  right.
- "the whole sweep measures 0 ink lost from a 16px root to a 40px one" now names the
  edge it measured, in that file and in three others. A one-edge probe cannot support
  a claim phrased "nothing clips".
- the three files that recorded this defect as outstanding no longer say so, and each
  now points at where it was closed.
- uno.config.ts said there are two hand-written queries for this grid. There are
  three.
- the residual is attributed correctly for the first time: 34.58 at 320px and a 40px
  root is one hero word against this card's own padding spending 120 of the 320, not
  the control row. It is unchanged by this rung, unchanged by reverting the box to
  device pixels, and it is outside the 1.4.4 bracket — at a 32px root the page loses
  nothing.

Suite 147 -> 148. Page weight, production-before against production-after: the
stylesheet grows 73 raw bytes and shrinks 14 brotli, 13 fewer on the wire in total —
a rung built entirely from tokens the sheet already contained.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvin-heymax** — 2026-07-27

## Review record — two audits, 38 findings, 0 refuted

**Panel 1** (5 dimensions, 13 agents): 25 findings raised, 8 verified, **all 8 survived the skeptic**. Every one landed on the new test or on my prose; the shipped fix held up under independent re-measurement throughout. Five mutations shipped the defect with the gate green — CSS source order, the `grid-template` shorthand, an Astro scoped `<style>`, a `min-width` floor on the control, `grid-auto-flow` in an inline style — plus a budget hole that accepted any bound in `[9rem, ~11.56rem)`.

**Panel 2** (focused method audit of the rewritten test): **11 of 13 mutations** still shipped a browser-measured defect with the gate green, across six root causes — non-width media conditions and `@layer`, the shorthand's rows slot read as columns, `grid-auto-flow` in the stylesheet, a budget walk blind at both ends and to margins, unreadable lengths charged as free space, and a gap sampled at one width.

### What changed as a result

The assertion no longer walks rungs; it resolves the **effective** declaration at each of ~650 sampled widths and charges the real chrome from the grid to the document root. Crucially, **what it cannot model is now refused rather than approximated**: an allowlist rejects any declaration on that chain which decides the grid's used width and which the budget does not model, and a rung's media prelude must be a bare width condition or the test refuses to reason about it.

### The finding that mattered most, which no dimension filed

Every clipping figure in this PR came from a sweep that walks **text nodes** — so it cannot see a clipped **button**. Resolving a disagreement between two dimensions exposed it. Measured against the same clip edge:

| config | text ink lost | control box lost |
|---|---|---|
| 320 / 40 | 136.84 | 142 |
| 360 / 40 | 96.84 | 102 |
| 375 / 40 | 81.84 | 87 |
| 414 / 40 | 42.84 | 48 |
| 320 / 32 | 47.44 | 50 |
| 360 / 32 | 7.44 | 10 |
| 320 / **28** | 0 | **4** |

So the onset is a **28px root**, not the 32 I had written in four documents, and the fix takes control-box clipping to **0 at every configuration** — including 320/root 40, where 34.58 of one hero word still overflows for an unrelated reason (the card's own padding). The axis that matters most for SC 1.4.4 — functionality — was the one I never reported.

### Claims corrected

- "all six go to zero" was false for one of six, and contradicted three sentences later by the same comment.
- The page-weight figure was a `brotli -q11` artifact. Production serves this sheet at 6,885 B; at q4–q10 it **grows** 6–10 B. Raw +73 B, wire delta inside the ~33 B noise band — **neutral**, not a saving.
- Occlusion sweep: 20 configurations per revision, 1.66M samples.
- "at a 32px root the page loses nothing" holds at ≥320px, the floor this page is designed to; not below it.

### Verification

34 mutation vectors across both harnesses, 0 unexpected, including green controls that must **not** red (a looser bound, the tightest bound the budget allows, and reducing the card's padding). Occlusion: 0 stolen points, positive control 7/7. Rect-diff: bit-identical at every root 16/20/24 configuration and every viewport ≥768px.

### Deliberately not done

`flex-wrap` with no column queries at all is the better engineering — it deletes two hand-maintained media queries and scores the same zeros — but it changes the layout at the **default** text size (3 controls per row at 360/375px where 2 ship today). That is an aesthetic call, so it is @calvindotsg's, not mine. Recorded as the thing to reach for if these queries are touched again.


---

<a id="pr-68"></a>

## #68 — feat(controls): wrap the control row, deleting three hand-tuned column queries

`merged` · opened 2026-07-27 by **calvindotsg** · merged 2026-07-27 as `add7b6c0d` · `worktree-flex-wrap-controls` → `main` · +848/−392 across 8 files

The intro card's control row was a grid with a hand-maintained ladder of three
`max-width` queries granting 4/3/2/1 columns. It is one wrapping row now, and all three
queries are gone.

```diff
-    .button-grid {
-        display: grid;
-        grid-template-columns: repeat(4, auto);
-        justify-content: start;
-        gap: 1rem;
-    }
-    @media (max-width: 40rem) { .button-grid { grid-template-columns: repeat(3, auto) } }
-    @media (max-width: 25rem) { .button-grid { grid-template-columns: repeat(2, auto) } }
-    @media (max-width: 13rem) { .button-grid { grid-template-columns: repeat(1, auto) } }
+    .control-row {
+        display: flex;
+        flex-wrap: wrap;
+        gap: 1rem;
+    }
```

## Why, and it is not that it is tidier

A column count is an approximation of "how many fit", and it was wrong in **both
directions in turn**. Two controls plus their separation are a fixed 9rem, because the
control's box is text-relative; a card's width is not, because a card grows vertically
with its content and never horizontally. So past some reader text size any fixed count
exceeds the card, the row held the copy column open at its own minimum width, and the
card sheared the hero copy and the controls both. #67 fixed that by adding a fourth rung
at a bound derived from a fitted budget — a number that has to be re-derived whenever
either side of it moves.

A wrapping row's minimum content width is its **largest item**, not the sum of a row of
them. Every item here is one declared box, so that minimum is exactly one control at
every viewport and every text size. That is the defect class rather than an instance of
it, and there is no bound left to keep in step with anything.

## Measured, against the ladder it replaces rather than the defect both of them fix

| quantity | ladder (#67) | this |
|---|---|---|
| text ink past a card's RIGHT clip edge | 34.58 at 1 of 35 | **34.58 at 1 of 35** |
| text ink past a card's BOTTOM clip edge | 0 at all 35 | **0 at all 35** |
| control boxes past the RIGHT clip edge | 0 at all 32 | **0 at all 32** |
| control boxes past the BOTTOM clip edge (desktop incl.) | 0 at all 27 | **0 at all 27** |
| portrait size at every viewport ≥ md | 275×275 | **275×275** |
| occlusion, controls hit-testable | — | **0 stolen / 7 of 7 at 20 configurations** |
| sheet, local `brotli -q9` | 6880 B | **6840 B** (−40) |

That weight row is a LOCAL estimate and is labelled as one: production does not serve q9 —
it serves the current sheet at 6922 B over the wire, against 6880 locally at q9 — so the real
delta is production-before vs production-after and will be checked once this is merged. Raw,
the sheet is 263 bytes smaller; `index.html` grows 28.

The one residual is unchanged and is not this row's doing: at 320 wide and a 40px root
one unbreakable hero word ("Enthusiastic learner.") overruns by 34.58, which is the
card's own padding spending 120 of 320.

**The instruments were shown to be measuring**, rather than assumed to be: a positive
control with #67's rung deleted reproduces that PR's figures exactly — 4 / 50 / 142 / 10
/ 102 / 87 / 48 px of control box at 320/28, 320/32, 320/40, 360/32, 360/40, 375/40,
414/40.

## The separation can no longer cost a pixel of WIDTH — which is not the same as safe

An earlier version of this PR body claimed here that "an entire class of change stopped
being able to delete functionality" and called it the strongest argument for the shape.
**That was measured on one edge and generalised to both, and the review panel refuted it.**
It is corrected rather than quietly dropped:

| `gap: 6rem` | RIGHT clip edge | BOTTOM clip edge |
|---|---|---|
| under the column grid | clips at **12 of 32**, worst **89px**, incl. **12px at 414 and the DEFAULT text size** | — |
| under this wrapping row | **0 at all 32** | **174px at 1024×768**, and the résumé control **hidden outright** at 768×1024, 1024×768, 1024×900 |

The horizontal half holds: a separation only applies between items sharing a line, and the
minimum here is one item on a line by itself, so it can make this row taller and never
*wider*. That is why the predecessor's per-width gap resolution is gone.

Taller is not free, though — above `md` this card's height comes from its grid row and
`overflow: hidden` clips the bottom too. The gate is green throughout, because no assertion
in this repo reads a bottom edge and a stylesheet test cannot lay out. So `gap: 6rem` is
recorded in the mutation suite as **green and NOT harmless — a known coverage gap**, not a
pass.

## It changes the default text size, on purpose

| viewport (16px root) | before | after | document height |
|---|---|---|---|
| 320 | 2 per row | 2 per row | unchanged |
| 360 | 2 per row / 4 rows | **3 / 3** | 1856 → 1792 |
| 375 | 2 per row / 4 rows | **3 / 3** | 1836 → 1772 |
| 414 | 3 per row / 2 rows | **4 / 2** | 1648 → 1584 |
| 768 | 4 per row | **5** | 1175 → 1128 |

Wider viewports gain more, because the old top rung capped every one of them at 4 — at
1024 and a 24px root all seven controls now sit on one row. **14 configurations get
shorter, by up to 160px.** Element count is identical (128) at all 40 configurations, so
nothing appeared or vanished.

### Seven get taller, and the reason is the trade rather than a wrinkle in it

An earlier version of this body said **two**, from a five-root sweep where the clipping
sweep uses eight — the same coarse-grid error that once put the shearing onset at a 32px
root when it is 28. On a ten-root grid: **+434 at 375/28** (worst), +403 at 360/26, +385 at
414/28, +372 at 320/24, +357 at 375/26, +330 at 360/24, +264 at 320/22. All seven are
narrow-to-mid viewports between 150% and 175% text zoom, where the row seats one control
and the ladder seated two. 28 configurations get shorter; 35 are identical. Measured,
because the mechanism is not what it looks like: the ladder was not fitting two controls into the room available, it was
**demanding** room for two and getting it. Its minimum of 216 held the copy column open
to 216, which at that text size still landed 42px inside the clip edge. A wrapping row
demands nothing, so the column shrinks to the 174 actually on offer.

That demand does not separate into a good half and a bad half — it is one behaviour. The
same "hold the column open to N controls regardless of the room" that won 372px of height
there is exactly what sheared **142px of button** at 320 and a 40px root. Nothing is
clipped at either configuration; the page scrolls, which is what it has been designed to
do since #65.

Worth knowing for whoever wants that height back: below `md` the portrait is positioned
out of flow, but its wrapper is still an in-flow sibling of the copy column and spends
**48 of the card's 222 content-box pixels** there. (Those read 24 and 198 in an earlier
version — *derived* arithmetically instead of measured, and wrong in the direction that
inverted the conclusion: two controls at a 24px root need 216, which 222 accommodates and
198 does not.) Recovering the 48 would seat two controls at both configurations. That is a
fix to the mobile hero, not to this row, and is deliberately not made here.

## The test keeps the machinery and swaps the arithmetic

`tests/control-geometry.test.ts` encodes two method audits. The ladder's per-width
inequality is replaced by the invariant's three preconditions — every rendered child of
the row **is** a control, nothing reaching an item can raise its minimum contribution,
and the chain from the viewport leaves room for one control — while everything hard-won
stays: the effective-declaration resolution, the ancestor-chain budget (margins charged,
both ends of the chain, the card's LEFT padding only because clipping is at the padding
box), the loud failure on an unreadable length, and the unmodelled-property allowlist.

Two things got strictly stronger:

- **the row is discovered from the controls rather than named**, so the rename cannot
  make any assertion vacuous, and the Astro scoped-selector hole cannot reopen;
- **asserting the layout is unconditional replaces the media-prelude grammar** and closes
  `@media`, `@layer`, `@supports` and `@container` in one line. The predecessor needed a
  prelude parser *plus* a separate guard for the other three, and still let
  `@media (max-width: 13rem) and (pointer: coarse)` look live while the browser never
  applied it.

Also **self-calibrates `page-fit`'s non-vacuity floor**, which hard-coded "at least five
width conditions" and went red on a *correct* sheet once deleting these queries dropped
the count to four. It now scans the sheet a second way and requires every width-mentioning
prelude to be accounted for — which additionally catches a bound whose *syntax* the helper
cannot read (an interval like `(400px <= width <= 800px)` matches neither `min-width:` nor
`width>=`, and an unreadable bound reads as unconditional, silently and green). That is
the failure the literal was aiming at and could not express.

## Expired premises corrected in place

- `uno.config.ts`: the hand-written-query count (four → one), the ladder paragraphs, and
  the claim that the row "deliberately keeps `auto` tracks".
- `uno.config.ts`: **`shrink-0` on the control was inert and is load-bearing again.** It
  was added for a measured failure (two flex-item CTAs at 47.80px), went inert when those
  were removed and all seven controls became grid items, and an earlier draft argued for
  keeping it anyway because "the next control dropped into a flex row would silently lose
  its box". That is exactly what happened, to all seven at once.
- `BasicLayout.astro:51`, `index.astro:97`, `Card/index.astro:170`: prose citing the
  ladder as where the right-edge shear was closed.

## Verification

- `pnpm check` 0 errors / 2 hints (baseline), `pnpm test` **148 passed**
- **23 mutation vectors, 0 unexpected.** Red: nowrap, deleted `flex-wrap`,
  `wrap-reverse`, `flex-direction: column`, a `flex-flow` saying nowrap, a full revert to
  the 2-column grid, the revert in **nested** syntax, wrapping behind a media query,
  wrapping inside `@layer`, `min-width` on the row and the same in `em`, `p-6` respelled
  `p-[1.5em]`, `padding-inline`/`margin-inline` start-end pairs and the 3-value form, a
  `border-left` **shorthand** and the 4-value `border-width`, a non-control child, an
  inline `style`, `order-last` on the toggle, `justify-content: center`, and an absolute
  root `font-size`
- **exactly one GREEN vector, and it is labelled green-and-NOT-harmless** — `gap: 6rem`,
  the known bottom-edge coverage gap above. A green vector is only evidence once the
  mutation is verified harmless, and this one is not; recording it as a pass would have
  been the same one-edge error as the claim it sits under

## Review round

A five-dimension panel produced 31 findings; 25 unique after collapsing cross-dimension
duplicates, **14 re-verified by an independent skeptic each and all 14 confirmed** (5
downgraded with measured reasons, 0 refuted, 0 left unjudged). Three were regressions this
change introduced — the portrait shrinking 26% at md, the legibility scrim dragging across
it, and the portrait's mask feather truncated by the now-shorter card — all three fixed and
measured. Five were claims in this PR's own prose that measurement does not support, all
corrected in place with the wrong version named. The rest were pre-existing holes in the
assertions this change rewrote: nested at-rules invisible to `parseRules`, `effectiveDecl`
resolving by caller-array position, `border()` blind to every shorthand, `edge()` reading a
logical inline shorthand as physical, `order` ungoverned, packing unasserted, and an
absolute root font-size defeating every "font-relative" assertion. The second commit has
the detail.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-27

**Correction to this PR's body, measured on what shipped.**

The "It changes the default text size" table was measured before the second commit pinned
the portrait's wrapper with `shrink-0`. Pinning it narrowed the copy column, which moved the
per-row counts at the two widest rows of that table — so those two rows described a build
that never shipped. The fix and the figures touch the same box, which is the tell I missed.

| viewport (16px root) | body claimed | production actually does |
|---|---|---|
| 768 | 4 → **5** per row, 1175 → 1128 | **unchanged at 4 per row**, docH 1175 |
| 1024 | (implied gain) | **unchanged at 4 per row** |
| 1440 | — | 4 → **5** per row |

The narrow rows are unaffected and stand as published: 320 unchanged at 2, 360 and 375 go
2 → 3, 414 goes 3 → 4. So do the "seven get taller" figures (worst +434 at 375/28) and
every clipping result — control boxes 0 past both clip edges at all configurations on
production, portrait 275×275 everywhere, text ink 0 but for the documented 34.58px residual.

The gains at 768 and 1024 are real, they just sit at larger text: 768/20 goes 3 → 6,
1024/20 goes 4 → 5, 1024/24 goes 4 → all seven on one row.

Also, the page-weight row was flagged in the body as needing a post-merge check. Measured
production-before vs production-after over the wire: **6922 → 6891 bytes, −31** (the local
`brotli -q9` estimate said −40; production does not serve q9).

#69 corrects the same two figures in the code comment.


---

<a id="pr-69"></a>

## #69 — docs(controls): correct two figures measured before the portrait was pinned

`merged` · opened 2026-07-27 by **calvindotsg** · merged 2026-07-27 as `293435949` · `docs-shipped-numbers` → `main` · +16/−4 across 1 files

Two figures in the control-row note were measured on a build that **did not ship**, and I
did not re-derive them after fixing the thing that changed them.

They were taken before `shrink-0` pinned the portrait's wrapper — i.e. while the row was
still taking width from the photo. Pinning it narrowed the copy column, which moved the
per-row counts at 768 and 1024. The fix and the figures touch the same box, which is the
tell I missed.

| the note said | production actually does |
|---|---|
| "14 of the swept configurations get shorter" | **13 of 35** shorter, 2 taller — and the count now names its grid (26 / 7 on the 70-configuration grid) |
| "Wider viewports gain more, because the old top rung capped every one of them at 4" | 768 and 1024 are **unchanged at 4 per row** at a 16px root; the gains sit at larger text — 768/20 → 6, 1024/20 → 5, **1024/24 → all seven on one row**, 1440/16 → 5 |

Measured against the pre-change tree at `8f71f0d` and the sheet production is serving
(`index.CME3NecC.css`).

Comment-only — the built stylesheet is **byte-identical** to production's. `pnpm check`
0 errors / 2 hints, `pnpm test` 149 passed.

Follows #68.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-70"></a>

## #70 — feat(goals): show the rate each goal still needs, and date the figures

`merged` · opened 2026-07-27 by **calvindotsg** · merged 2026-07-27 as `deb2cff5a` · `feat/goal-projection-dateline` → `main` · +852/−15 across 7 files

## What this adds

- **One line per goal card**: `71 km/wk to go` (cycling), `18 km/wk to go` (running).
- **One dateline**, in the footer card: `Updated 27 July 2026`. One timestamp covers both sports, so it renders once rather than twice.

## Why it is a required rate and not a projection

The obvious thing to show is a projected year-end total. It is wrong here, and wrong in a way that reads as authoritative.

**The double count.** 318.72 km of races were already ridden this year, and those kilometres are inside the bot's `cycling_km`. So they are already inside the observed pace — and adding the 1,143.98 km of *booked* races on top counts race riding twice. That single error is the entire source of the naive formula's verdict:

| model | cycling | verdict |
|---|---|---|
| pace only, races ignored | 4,000 km | short 1,000 |
| **naive + races (double-counts)** | **5,144 km** | **"on track, +144"** |
| pace de-raced + races | 4,904 km | short 96 |
| also accounting for tour days displacing training | 4,810 km | short 190 |

Three defensible models, landing on **both sides of the 5,000 km line**, and the closest of them flips from "short" to "on track" after **55 km** — about six days' riding. A card printing one of those numbers is not reporting a fact about the year; it is reporting a modelling choice in the voice of a measurement.

**The required rate extrapolates nothing.** `(goal − ridden − booked) / weeks remaining` has no pace term, so the composition of what is already banked cannot corrupt it, and it claims nothing about future behaviour. It still carries the point that motivated this: counting booked races takes cycling from **121 km/wk to 71 km/wk**, a 42% reduction.

**Rounding is `ceil`, and that is correctness rather than taste.** Cycling needs 70.28 km/wk; floor and round both give 70, which over the remaining 22.43 weeks delivers 1,570 km against the 1,576.32 needed — a rate that, followed exactly, *misses*. One km/wk is 0.45% of the cycling goal but **3.74%** of the running goal.

**If a comparator pace is ever shown beside this**, it must be the de-raced 66 km/wk, never the observed 77. The required rate already has future race km subtracted; pairing it with a pace that still contains past race km reimports the double count by juxtaposition. The three figures are 65.99 < **70.28** < 76.72 — the requirement sits *between* the two paces, which is exactly why picking the wrong one flips the story.

## The bot's write contract changed

`updated_at` is **read-then-preserved**, and re-stamped only when a km value actually moves. Stamping it every run makes the file differ by construction, which defeats the workflow's `git diff --quiet` gate and turns a conditional deploy into a **commit-push-deploy every night**. Verified by running that gate command directly.

It is stamped from `Asia/Singapore`: the cron fires 21:13 UTC, which is 05:13 the next morning in Singapore, so a UTC-derived stamp is a day behind for the only reader this site has. The field ships in this PR so the first bot run does not commit on unchanged km.

Semantics: `updated_at` means **the day the kilometres last moved**, not the day they were last checked. Three flat days correctly leave it three days old.

## Layout: the footer's second row is load-bearing

The footer was a one-row card. Adding a line without buying space **shears 5px of real glyphs at the default 16px text size**, at every viewport whose height puts `main` on its 46rem floor. `lg:row-span-2` fixes it and is free — the grid already computes two implicit zero-height rows from the career cards' six-row spans, so the second row spends only a 16px gap that was being spent on nothing.

Measured, branch vs production, **48 configurations in 2 themes = 96 renders** (8 viewports x 6 root sizes):

- **zero configurations where this branch loses more ink than production**, on any of the four edges
- **four cards change box, the rest are byte-identical.** Running 264x206 -> 264x226; Cycling 264x206 @y296 -> 264x226 @y316; **Now moves y518 -> y558** (height unchanged); footer 76 -> 92. Intro, About me and both career cards are identical. (An earlier revision of this body claimed *every* non-footer card was byte-identical — that is true of the row-span-only variant, not of this branch, which also adds a line to both goal cards.)
- the footer alone grows 76 → 92px (1440×900) and 68 → 84px at the tight configurations
- right-hand stack free height 58 → **18px** at its tightest, still positive; the Now card's height is **unchanged everywhere**

**One line per goal card is the budget, not a preference.** A second line takes that 18px to zero, at which point the flex column shrinks all three cards — including the Now card, which nothing was added to.

## Correcting two figures from the earlier analysis

- The footer's 6/14/17px `scrollHeight - clientHeight` was described as a live defect. **It cuts no ink** — that is the last line's leading and descender space inside 24px of padding, and the card has 11–19px of real headroom. The true statement is that a dateline needs ~16px the card did not have.
- ~~The goal card's text column is 110.02px, not 158px.~~ **This "correction" was itself wrong and is retracted.** The budget is the ROW content width: **158px at 1024, 177 at 1100, 190 from 1152 up** — the figure the recon panel gave. 110.02px is the *running* card's inner `max-content` column; it widens with its own content (to 121.06 under a longer string) and the *cycling* card's is 125.89px.

## Verification

`pnpm check` 0 errors · `pnpm eslint` clean · `pnpm test` **176 passed** (149 → 176, 27 new).

**A green suite is not evidence here, and that is itself a finding.** The suite has no layout engine, so every broken variant built during this work — including ones losing glyphs at the default text size — ran 149/149 green. The layout facts are pinned as bounds on strings derived from browser measurements, plus the sweep above.

**All eight new invariants were mutation-tested** — each mutation applied, the expected test watched failing, then reverted:

| mutation | caught by |
|---|---|
| `updated_at` stamped unconditionally | preserves-bytes test |
| `ceil` → `floor` | rounds-up test |
| projection reads clamped progress | reads-raw test |
| `parseIsoDate` drops its round-trip | rejects `2026-02-30` |
| multi-day event booked whole | pro-rates test |
| `covered` copy reverted to the wrapping wording | measured-literals test |
| footer loses `lg:row-span-2` | second-row test |
| Singapore date → UTC | timezone test |

One copy change came out of this: `Booked races cover it` became `Races cover it`. **The stated reason was wrong** — it does *not* wrap; it renders as one line at 1024/1100/1152/1440 with the card height unchanged. The shorter wording ships on plainness. The literals are pinned against their measured widths so new copy must be re-measured deliberately.

## The load-bearing assumption — CONFIRMED by the site owner

This analysis rested on one fact the repo cannot check: whether the **318.72 km of July DCR races is inside the 2,279.7 km Strava figure**. The script fetches only YTD aggregates, so activity-level data would have been needed to verify it. The owner has now confirmed it directly: **it is inside.**

That closes the question in the direction that matters. The double count is real, not hypothetical, and the naive model's "on track, +144 km" is a flattering falsehood produced entirely by counting race riding twice. The corrected models — 96 km short, or 190 short once tour days are treated as displacing ordinary riding — are the ones describing the year.

**No figure in this PR changes**, because none of them depended on it. The required rate is `(goal − ridden − booked) / weeks remaining`; past-race distance is not a term in it, which is precisely the property it was chosen for. Cycling stays 71 km/wk and running 18 km/wk.

What the confirmation does change is the strength of the argument for *not* shipping a projection: the discarded model was not merely uncertain, it was optimistic in a way the reader could not have detected.

## January checklist

`GOAL_YEAR` is pinned rather than derived, so the rollover is a deliberate edit: bump `GOAL_YEAR`, set `progress_last_year` from the closing totals, add the new year's races to `EVENTS`. A test asserts the bot's stamp year matches `GOAL_YEAR`, so step one is gated — but nothing in the repo knows last year's closing total, so step two is not.

🤖 Generated with [Claude Code](https://claude.com/claude-code)




---

## Review round — what a six-dimension adversarial panel found

18 majors raised, **11 confirmed, 7 downgraded, 0 refuted**. Two were merge blockers, both now fixed in `dc54ce4`.

### Blocker 1 — the suite would have broken the next bot deploy

`tests/projection.test.ts` asserted the literals `71` and `18` against **live bot-owned data**, and `netlify.toml` runs `pnpm check && pnpm test` as the build command. So an ordinary ride reddens the suite and fails a production deploy pushed by a bot with no human in the loop — and the failure freezes the very `Updated …` dateline this PR adds, because the blocked deploy is the one that would refresh it.

Measured, not projected: `cycling_km: 2309.7` (one 30 km ride) already failed, and the Round the Island booking drains out of `bookedAhead` on **3 August**, taking the required rate 71 → 74 → 80.

Now pinned to fixed inputs, and re-verified against simulated bot pushes:

| simulated push | result |
|---|---|
| today, unchanged | 176/176 |
| one 30 km ride (2026-07-28) | 176/176 |
| after Round the Island (2026-08-03) | 176/176 |
| a big month (2026-10-01) | 176/176 |
| goal met, overshoot | 176/176 |
| 2027 rollover | **1 failed — the deliberate January tripwire, now labelled** |

`EVENTS` stays live on purpose: it is human-edited, so a red test there is wanted feedback.

### Blocker 2 — a filter naming a string the code cannot emit

The one-status-line assertion filtered on `Booked races cover it` — the *rejected* wording — and omitted `Races cover it`, which ships. The `covered` branch was therefore unchecked, and on 31 December, when both goals close and both lines are `null`, it would have failed with a message about stack height, sending an implementer after a layout regression that does not exist. It is driven from the generator now.

### Also fixed

- The **January checklist** lived at a README section that does not exist; it is now in the `GOAL_YEAR` doc comment, with the ungated step called out.
- The **pro-rata value is pinned**, killing two surviving mutants — one of which reinstated booking the whole tour on day one, the exact defect `end_date` exists to prevent.
- The **fresh-stamp test** now moves both km values; it only moved cycling, leaving the running comparison unexercised.

### Open, and deliberately not changed: is the answer 71 or 70?

`bookedAhead` treats the stamped day as **unridden**; `daysRemaining` **excludes** it. Exactly one is wrong, and the bot's own semantics point at `daysRemaining`: the cron fires 21:13 UTC = 05:13 SGT *the next morning*, so the stamped day is one whose riding is entirely still ahead. On that reading the honest figure is **70, not 71**, and 31 December should read `final` rather than `closed`.

Left as-is because it errs conservative — 71 asks for slightly more than needed, never less — and because flipping it changes a rendered number and a behaviour, which is the author's call rather than the reviewer's. **Do not read the merge as settling that 71 is unambiguously right.**


---
