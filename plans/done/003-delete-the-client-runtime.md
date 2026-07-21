# Plan 003: Delete the client-side runtime — Svelte and motion out, Astro and CSS in

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4550e1f..HEAD -- src/ astro.config.mjs package.json svelte.config.js tests/`
> Changes from plans 001 and 002 are EXPECTED here: `tests/` and
> `vitest.config.ts` exist (001), `package.json` gained `test` scripts,
> `vitest`, `linkedom` and `sharp` and lost `@astrojs/netlify` (001+002), and
> `astro.config.mjs` now has `output: "static"` with no adapter (002). Anything
> ELSE — in particular any change to `src/components/*.svelte`,
> `src/layouts/*.astro`, `src/pages/index.astro`, `src/components/Goal.astro`
> or `src/components/IntroCard.astro` — must be compared against the "Current
> state" excerpts below before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — this plan touches the most visible behaviour on the site
  (theme selection, the entrance animation, the progress bar). Every
  replacement was already built and measured green in a spike worktree, so the
  risk is transcription error, not design error.
- **Depends on**: `plans/001-regression-safety-net.md` AND
  `plans/002-*.md` (static output). Both must be merged to `main` before
  starting. Step 1 verifies this.
- **Category**: perf + bug + tech-debt
- **Planned at**: commit `4550e1f`, 2026-07-21
- **Findings**: CORRECT-01, CORRECT-04, PERF-02, PERF-03, PERF-04, PERF-05,
  DEP-02, DEP-03, TECHDEBT-02, TECHDEBT-03, DX-03

## Why this matters

Today the page ships **6 external JavaScript files totalling 106,861 bytes**
(motion 63,370 · Astro island runtime 40,102 · ThemeSwitcher 1,303 ·
ProgressBar 1,051 · Svelte glue 925 · legacy 110) to do three things: fade six
cards in, flip a `data-theme` attribute, and set one width percentage. After
this plan the site ships **0 external JS files and ~539 bytes of inline
script** (a pre-paint theme script and a toggle click handler).

*(Byte figures re-measured on the current lockfile at commit `b8d2673`. An
earlier draft of this plan quoted 95,031 bytes from the spike worktree, whose
`node_modules` resolved ~12% smaller; the file **count** was correct in both.
The plan's assertions are on counts, not bytes, so nothing downstream changes.)*

The same JS also causes three real, production-verified defects that this plan
fixes:

1. **An invisible full-viewport click trap** (CORRECT-01 / PERF-05).
   `src/layouts/Layout.astro:13-17` renders an empty `<div class="loader …">`
   styled `fixed top-0 bottom-0 right-0 left-0 w-screen h-screen z-50` with no
   CSS rule of its own and no `pointer-events-none`. The built stylesheet
   contains zero `.loader` rules, and the only code that ever disables its
   hit-testing is `loader.style.pointerEvents = 'none'` inside a
   `setTimeout(…, 100)` at `src/pages/index.astro:46-48` — registered *after*
   `animate()` runs, inside an async function called without `await` or
   `.catch` at line 71. Because `--background` is undefined at first paint (see
   defect 2) the overlay is *transparent*: with JS disabled, blocked, or the
   61 KB motion chunk failing, the page looks completely normal while every
   link, the theme toggle and all six social buttons are silently dead. Even on
   the happy path the page is un-clickable for the whole download+parse of the
   largest JS asset on the site. The highest z-index anywhere in content is
   z-20, so the z-50 sheet sits above everything.

2. **Every CSS custom property is undefined at first paint** (CORRECT-04 /
   PERF-04). All six design tokens (`--background`, `--card-background`,
   `--card-border`, `--shadow`, `--accent`, `--text`) are defined *only* under
   `:root[data-theme='light']` / `:root[data-theme='dark']`
   (`src/layouts/BasicLayout.astro:101-117`); there is no unqualified `:root`
   fallback. `data-theme` is set exclusively inside
   `ThemeSwitcher.svelte`'s `onMount` — i.e. after the 30 KB Svelte runtime
   hydrates. Production HTML ships `<html lang="en">` with no `data-theme`, so
   every visitor paints a white, borderless, shadowless page and then watches a
   full-page recolor; dark-mode visitors get a white flash on every load, and
   the SSR'd toggle always shows 🔆 before flipping. The fix is the canonical
   Astro pattern: a `<script is:inline>` in `<head>` that sets the attribute
   before first paint.

3. **The `.svelte` files are invisible to every gate** (DX-03). `pnpm eslint`
   globs `src/**/*.{js,astro}`, lint-staged uses the same glob, and
   `astro check` + `astro build` were experimentally shown to pass with
   `const bad = notDefinedAnywhere();` injected into `ThemeSwitcher.svelte` —
   the broken call was compiled verbatim into the shipped client bundle. The
   file that all site styling depends on has zero static analysis. Deleting
   the `.svelte` files removes the blind spot instead of papering over it.

The plan also removes three direct dependencies (`svelte`, `@astrojs/svelte`,
`motion`), one integration, one config file (`svelte.config.js`) and one
pass-through layout (`src/layouts/Layout.astro`). To a visitor the site looks
and behaves the same afterwards, **except** where a defect is deliberately
fixed: no first-paint flash, no dead-click window, correct toggle glyph from
first paint, a working progress bar without JS, and a slightly quicker CSS
entrance stagger (0.08 s/card vs motion's 0.3 s — note motion 12 ignores
`duration` when `stiffness`/`damping` are set, so the current perceived timing
was never what the code literally reads).

## Current state

All excerpts are from the real repo at commit `4550e1f`. Plans 001/002 do not
touch these files, so they should match verbatim when you start.

### Files involved

- `src/layouts/Layout.astro` (19 lines) — pass-through layout whose only added
  value is the loader div; sole consumer is `src/pages/index.astro:2`. **Deleted.**
- `src/layouts/BasicLayout.astro` — the real layout: head tags, JSON-LD, the
  global `<style is:global>` with the theme variables. **Edited (3 edits).**
- `src/pages/index.astro` — the only page; contains the 61-line motion script.
  **Rewritten.**
- `src/components/ThemeSwitcher.svelte` (28 lines) — hydrated `client:load` at
  `IntroCard.astro:19`. **Deleted, replaced by `ThemeSwitcher.astro`.**
- `src/components/ProgressBar.svelte` (33 lines) — hydrated `client:visible` at
  `Goal.astro:12`. **Deleted, replaced by `ProgressBar.astro`.**
- `src/components/IntroCard.astro`, `src/components/Goal.astro` — import swaps
  only. **Edited (2 lines each).**
- `astro.config.mjs`, `package.json`, `svelte.config.js` — Svelte/motion
  toolchain removal.
- `tests/rendered-html.test.ts`, `tests/build-output.test.ts` (created by plan
  001, possibly extended by plan 002) — renderer removal + 3 new assertions.

### The loader overlay (deleted by this plan)

```astro
// src/layouts/Layout.astro:12-19
<BasicLayout title={title} description={description}>
    <div
            slot="loader"
            class="loader bg-[var(--background)] text-[var(--text)] text-3xl font-black uppercase flex justify-center items-center w-screen h-screen z-50 fixed top-0 bottom-0 right-0 left-0"
    >
    </div>
    <slot/>
</BasicLayout>
```

Its slot target, and the body it sits in:

```astro
// src/layouts/BasicLayout.astro:65-70
<body
        class="bg-[var(--background)] md:h-screen flex flex-col justify-center items-center"
>
<slot name="loader"/>
<slot/>
</body>
```

### The motion script (deleted by this plan)

```astro
// src/pages/index.astro:12-16 (script runs to line 73)
<script>
import { animate, stagger, spring } from "motion";

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.querySelector('.loader') as HTMLElement | null;
```

```ts
// src/pages/index.astro:46-48 — the ONLY place the click trap is disarmed
            setTimeout(() => {
                (loader as HTMLElement).style.pointerEvents = 'none';
            }, 100);
```

```ts
// src/pages/index.astro:71 — un-awaited, uncaught
    runAnimations();
```

### The theme variables (kept, but currently unreachable at first paint)

```css
/* src/layouts/BasicLayout.astro:100-108 (dark block mirrors at 110-117) */
    /* Theme Variables */
    :root[data-theme='light'] {
        --background: #FAFAFA; /* grey-50 */
        --card-background: #F5F5F5; /* grey-100 */
        --card-border: #E5E5E5; /* grey-200 */
        --shadow: #EC7981; /* primary-300 */
        --accent: #F3A3AA; /* primary-200 */
        --text: #0B0B0B; /* darkslate-900 */
    }
```

### The Svelte islands (deleted by this plan)

```svelte
// src/components/ThemeSwitcher.svelte:12-17 — the only initial-paint writer of data-theme
    onMount(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        theme = localStorage.getItem('theme') || systemTheme;
        document.documentElement.setAttribute('data-theme', theme);
    });
```

```svelte
// src/components/ProgressBar.svelte:26-28 — an IntersectionObserver exists to set this one width
<div bind:this={progressBarContainer} class="overflow-hidden bg-gray-300 rounded-full h-6 mt-4">
    <div class="h-full bg-[var(--shadow)] rounded-full transition-all duration-[1500ms] delay-[300ms] ease-in-out px-2 box-border relative"
         style="width: {progressWidth}%">
```

Their consumers:

```astro
// src/components/IntroCard.astro:6,19
import ThemeSwitcher from "./ThemeSwitcher.svelte";
                <ThemeSwitcher client:load/>
```

```astro
// src/components/Goal.astro:6,12
import ProgressBar from './ProgressBar.svelte';
            <ProgressBar client:visible
```

### The toolchain entries (removed by this plan)

```js
// astro.config.mjs:8 and :23 (line numbers may have shifted after plan 002
// removed the adapter — match on content)
import svelte from "@astrojs/svelte";
    svelte(),
```

```json
// package.json — dependencies (line numbers may have shifted after 001/002)
    "@astrojs/svelte": "^9.0.1",
    "motion": "^12.38.0",
    "svelte": "^5.55.1"
```

`svelte.config.js` is 5 lines existing solely for `vitePreprocess()`.

### The test harness lines this plan owns (from plan 001)

```ts
// tests/rendered-html.test.ts — imports
import {getContainerRenderer} from "@astrojs/svelte/container-renderer";
import {loadRenderers} from "astro:container";
```

```ts
// tests/rendered-html.test.ts — inside beforeAll
    const renderers = await loadRenderers([getContainerRenderer()]);
    const container = await AstroContainer.create({renderers});
```

Plan 001's maintenance notes explicitly schedule this plan to delete those
three lines — they exist only to render the two Svelte islands.

### Repo conventions that apply

- 4-space indent, double quotes, semicolons; components under
  `src/components/`, layouts under `src/layouts/`.
- All user-configurable content stays in `src/lib/constants.ts` (`CLAUDE.md`
  mandate). This plan reads `GOAL.*` through props exactly as before — no
  content moves.
- Conventional-commit messages, e.g. `fix(constants): remove thousands
  separator breaking the build`, `chore: prune dead template dependencies…`.

### Structural fact you need

`<main>` in `index.astro` lists 6 component tags, but `Career.astro` maps
`CAREER` (2 entries) into **2 sibling `<Card>`s**, so `main` has exactly
**7 element children**: IntroCard, Goal, AboutMe, Career-card ×2, Now, footer
Card. The CSS stagger below therefore has `:nth-child(1)`–`:nth-child(7)`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0 (2 pre-existing warnings: unused `colorText` in `Card/index.astro`, unused `index` in `IntroCard.astro` — leave them; plans 004/005 own them) |
| Tests | `pnpm test` | exit 0, all pass |
| Build | `pnpm build` | exit 0, `Complete!` |

**Use `pnpm` for everything. Never `npm`.** (`packageManager` pins
`pnpm@10.32.1`.)

## Scope

**In scope** (the only files you may create, modify or delete):

- `src/components/ThemeSwitcher.astro` (create)
- `src/components/ProgressBar.astro` (create)
- `src/components/ThemeSwitcher.svelte` (delete)
- `src/components/ProgressBar.svelte` (delete)
- `src/layouts/Layout.astro` (delete)
- `src/layouts/BasicLayout.astro` (3 edits: head script, loader slot, entrance CSS)
- `src/pages/index.astro` (rewrite: drop the script, import BasicLayout)
- `src/components/IntroCard.astro` (2-line import/directive swap)
- `src/components/Goal.astro` (2-line import/directive swap)
- `astro.config.mjs` (remove `svelte` import + integration only)
- `svelte.config.js` (delete)
- `package.json` + `pnpm-lock.yaml` (via `pnpm remove svelte @astrojs/svelte motion`)
- `tests/rendered-html.test.ts` (remove 3 renderer lines, add 2 assertions)
- `tests/build-output.test.ts` (add 1 assertion)

**Out of scope** (do NOT touch, even though they look related):

- `src/components/Card/index.astro` — plans 004 and 006 own it (dead `href`
  branch, unused props, the only static `astro-icon` reference).
- The `<Icon …>` usages and `astro-icon` imports in `IntroCard.astro` and
  `Goal.astro` — **keep them exactly as they are.** Plan 006 replaces
  `astro-icon` with UnoCSS `presetIcons`. (The spike worktree already contains
  the plan-006 version of these files; copy only the two lines named in Step 5,
  not the whole files.)
- `uno.config.ts` — plan 005 owns it. Its `filesystem` globs mention
  `.svelte`; they are dead config and 005 deletes the whole block.
- The JSON-LD block, canonical/OG tags and everything else in
  `BasicLayout.astro`'s `<head>` beyond inserting the theme script — plan 004
  owns the markup defects there (nested `sameAs`, wrong `worksFor.name`).
- `README.md`, `CLAUDE.md` — plan 007 owns docs. Yes, `CLAUDE.md` still says
  "Svelte components" and "Motion library" after this plan; leave it stale.
- `astro-robots-txt`, `postcss.config.cjs`, `src/pages/robots.txt.ts` — other
  plans own them.
- `output`, `site`, `sitemap()`, `UnoCSS(...)`, `icon()` in `astro.config.mjs`
  — only the two svelte lines may change.

## Git workflow

- Branch from up-to-date `main`: `003-delete-the-client-runtime` (or the
  worktree branch you were dispatched on).
- Conventional commits; suggested: one commit for the component/layout rewrite,
  one for the test updates, one for the dependency removal — e.g.
  `refactor: replace Svelte islands and motion with CSS-first Astro components`,
  `test: assert zero client JS and pre-paint theme script`,
  `chore: remove svelte, @astrojs/svelte and motion`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Verify dependencies have landed and record the baseline

This plan is written against the state after plans 001 and 002 merged. Confirm:

```bash
grep -n '"output"\|output:' astro.config.mjs
grep -c '@astrojs/netlify' package.json || true
test -f tests/rendered-html.test.ts && echo tests-present
pnpm install
pnpm test
```

**Verify**:
- `astro.config.mjs` shows `output: "static"` and `grep -c '@astrojs/netlify' package.json` prints `0` (plan 002 landed).
- `tests-present` prints (plan 001 landed).
- `pnpm test` exits 0. **Write down the exact passing-test count** — call it
  `BASELINE` (it is 32 from plan 001 plus however many plan 002 added). Every
  later test run must show `BASELINE` until Step 6, then `BASELINE + 3`.

If any of these fail, STOP — a dependency plan has not landed.

### Step 2: Create `src/components/ThemeSwitcher.astro`

Create the file with exactly this content (taken verbatim from the measured
spike):

```astro
---
// The icon is chosen in CSS from the `data-theme` attribute that the inline
// script in BasicLayout sets before first paint — so it never flashes wrong.
---

<button
        id="theme-toggle"
        type="button"
        aria-label="Toggle Theme"
        aria-live="polite"
        class="theme-toggle flex justify-center items-center text-xl max-h-[40px] max-w-[60px] shadow-custom shadow-[var(--shadow)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] text-[var(--text)] px-5 py-1 border border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-300 ease-in-out bg-[var(--background)] cursor-pointer rounded-lg"
>
    <span class="sr-only">Toggle Theme</span>
</button>

<style is:global>
    .theme-toggle::before {
        content: "🔆";
    }

    :root[data-theme="dark"] .theme-toggle::before {
        content: "🌙";
    }
</style>

<script>
    document.getElementById("theme-toggle")?.addEventListener("click", () => {
        const root = document.documentElement;
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        localStorage.setItem("theme", next);
    });
</script>
```

Accessibility/behaviour parity notes (do not deviate): the button keeps
`aria-label="Toggle Theme"`, `aria-live="polite"` and the `sr-only` text from
the Svelte original; the long UnoCSS class string is the original's
byte-for-byte with only `theme-toggle` prepended; the emoji comes from CSS
`::before` keyed off `data-theme`, so a dark-mode visitor sees 🌙 from first
paint instead of the SSR'd 🔆 the Svelte version always showed. Stored theme
still wins over the OS preference, exactly as before.

**Verify**: `pnpm check` → `0 errors` (the new file typechecks; nothing imports
it yet).

### Step 3: Create `src/components/ProgressBar.astro`

Create the file with exactly this content. It is the spike file with **one
deliberate change**: the keyframe is named `progress-grow`, not `grow` — UnoCSS
scans `<style>` blocks for utility-looking tokens, and `@keyframes grow` made
it emit a stray `.grow{flex-grow:1}` rule in the spike. Never name a keyframe
after a utility class.

```astro
---
interface Props {
    currentProgress: number;
    totalGoal: number;
    goalLogo: string;
}

const {currentProgress, totalGoal, goalLogo} = Astro.props;

const percent = Math.max(0, Math.min(100, (currentProgress / totalGoal) * 100));
---

<div class="overflow-hidden bg-gray-300 rounded-full h-6 mt-4">
    <div
            class="progress-fill h-full bg-[var(--shadow)] rounded-full px-2 box-border relative"
            style={`--progress: ${percent}%`}
    >
        <span class="absolute right-6 top-1.5 translate-x-1/2 -translate-y-1/4 transform scale-x-[-1] text-base">
            {goalLogo}
        </span>
    </div>
</div>

<style>
    .progress-fill {
        width: var(--progress);
        animation: progress-grow 1.5s ease-in-out 0.3s backwards;
    }

    @keyframes progress-grow {
        from {
            width: 0;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .progress-fill {
            animation: none;
        }
    }
</style>
```

What changed vs the Svelte version, on purpose: the width is computed at build
time and clamped to [0, 100] (the SSR HTML used to ship `style="width: 0%"`, so
a no-JS visitor was told 0 km next to text saying "2246.4 km of 3000 km"); the
`IntersectionObserver` + `transition-all duration-[1500ms] delay-[300ms]`
becomes a CSS `@keyframes` with the same 1.5 s duration and 0.3 s delay; the
track/fill/emoji markup and classes are otherwise identical. The reveal no
longer waits for scroll-into-view — the card is above the fold, and
`prefers-reduced-motion` now disables the animation (the JS version never did).

**Verify**: `pnpm check` → `0 errors`.

### Step 4: Rewire the layout — head script in, loader out, CSS stagger in

Three edits to `src/layouts/BasicLayout.astro`, one file deletion, one page
rewrite. Do them together; the build is broken only within this step.

**4a.** In `src/layouts/BasicLayout.astro`, insert the pre-paint theme script
as the last element of `<head>`. Find:

```html
    <link rel="sitemap" href="/sitemap-index.xml"/>
</head>
```

Replace with:

```html
    <link rel="sitemap" href="/sitemap-index.xml"/>
    <script is:inline>
        (() => {
            const stored = localStorage.getItem("theme");
            const theme = stored === "light" || stored === "dark"
                ? stored
                : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
            document.documentElement.dataset.theme = theme;
        })();
    </script>
</head>
```

`is:inline` is load-bearing: it stops Astro from bundling/deferring the
script, so it executes synchronously in `<head>` before first paint. The
precedence (stored value beats `prefers-color-scheme`) reproduces the Svelte
`onMount` exactly; the added `=== "light" || === "dark"` guard just rejects
garbage stored values.

**4b.** In the same file, delete the loader slot. Find:

```html
<slot name="loader"/>
<slot/>
```

Replace with:

```html
<slot/>
```

**4c.** In the same file, append the card entrance CSS at the end of the
`<style is:global>` block — insert immediately before the final `</style>`
(after the closing brace of the `@media (max-width: 400px)` block):

```css
    /* Card entrance — replaces the JS stagger. Pure CSS, no client bundle. */
    main > * {
        animation: card-in 0.4s ease-out backwards;
    }

    main > *:nth-child(1) { animation-delay: 0.00s; }
    main > *:nth-child(2) { animation-delay: 0.08s; }
    main > *:nth-child(3) { animation-delay: 0.16s; }
    main > *:nth-child(4) { animation-delay: 0.24s; }
    main > *:nth-child(5) { animation-delay: 0.32s; }
    main > *:nth-child(6) { animation-delay: 0.40s; }
    main > *:nth-child(7) { animation-delay: 0.48s; }

    @keyframes card-in {
        from {
            opacity: 0;
            transform: translateY(40%);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        main > * {
            animation: none;
        }
    }
```

(`card-in` is not a UnoCSS utility name — verified in the spike; do not rename
it to anything that is, per the Step 3 note. `backwards` fill keeps cards
hidden during their delay, so the animation is purely additive: with CSS
loaded but JS absent, cards still end fully visible.)

**4d.** Delete `src/layouts/Layout.astro`:

```bash
rm src/layouts/Layout.astro
```

**4e.** Replace the entire content of `src/pages/index.astro` with (verbatim
from the spike — the motion script is gone and the import now points at
`BasicLayout.astro`; everything inside `<main>` is unchanged from `main`):

```astro
---
import Layout from "../layouts/BasicLayout.astro";
import Card from "../components/Card/index.astro";
import Career from "../components/Career.astro";
import Goal from "../components/Goal.astro";
import IntroCard from "../components/IntroCard.astro";
import AboutMe from "../components/AboutMe.astro";
import Now from "../components/Now.astro";
import {FOOTER, METADATA} from "../lib/constants";
---

<Layout
        title={METADATA.title}
        description={METADATA.description}
>
    <main
            class="text-[var(--text)] m-auto p-2 grid gap-2 max-w-6xl overflow-hidden relative w-full sm:p-4 sm:gap-2 md:grid-cols-2 md:gap-3 md:p-6 lg:h-screen lg:grid-rows-8 lg:grid-cols-4 lg:gap-4 lg:max-h-[800px]"
    >
        <IntroCard/>
        <Goal/>
        <AboutMe/>
        <Career/>
        <Now/>
        <Card colSpan="md:col-span-1" rowSpan="md:row-span-1">
            <p class="text-xs">
                {FOOTER.footer}
            </p>
        </Card>
    </main>
</Layout>
```

If plan 002 made any change inside `index.astro`'s `<main>` (unexpected —
its scope is config-level), STOP instead of overwriting it.

**Verify** (all three):
- `pnpm build` → exit 0, `Complete!`
- `pnpm test` → `BASELINE` tests pass (the Svelte islands still exist and
  render; nothing content-visible changed).
- `grep -c "dataset.theme" src/layouts/BasicLayout.astro` → `1`, and
  `grep -rn "loader" src/` → **no matches**.

### Step 5: Point the two consumers at the new components; delete the .svelte files

**5a.** In `src/components/IntroCard.astro` make exactly two changes — keep the
`Icon` import and everything else untouched:

```diff
-import ThemeSwitcher from "./ThemeSwitcher.svelte";
+import ThemeSwitcher from "./ThemeSwitcher.astro";
```

```diff
-                <ThemeSwitcher client:load/>
+                <ThemeSwitcher/>
```

**5b.** In `src/components/Goal.astro` make exactly two changes — keep the
`Icon` import and everything else untouched:

```diff
-import ProgressBar from './ProgressBar.svelte';
+import ProgressBar from './ProgressBar.astro';
```

```diff
-            <ProgressBar client:visible
+            <ProgressBar
```

(The `currentProgress`/`totalGoal`/`goalLogo` props on the following lines stay
exactly as they are; the new component's `Props` interface matches them.)

**5c.** Delete the Svelte components:

```bash
rm src/components/ThemeSwitcher.svelte src/components/ProgressBar.svelte
```

**Verify** (all three):
- `pnpm check` → `0 errors`
- `pnpm test` → `BASELINE` tests pass (the renderer registration in the test
  file is now unused but still harmless — it is removed next step).
- `grep -rn "svelte" src/` → **no matches**.

### Step 6: Update the test suite — drop the Svelte renderer, lock in the fixes

**6a.** In `tests/rendered-html.test.ts`, delete the two Svelte imports:

```diff
 import {experimental_AstroContainer as AstroContainer} from "astro/container";
-import {getContainerRenderer} from "@astrojs/svelte/container-renderer";
-import {loadRenderers} from "astro:container";
 import {parseHTML} from "linkedom";
```

**6b.** In the same file's `beforeAll`, drop the `renderers` argument:

```diff
-    const renderers = await loadRenderers([getContainerRenderer()]);
-    const container = await AstroContainer.create({renderers});
+    const container = await AstroContainer.create();
```

**6c.** Same file: the comment above the wrapper re-parse says the rendered
string "begins with a hoisted `<script>` tag" — that was the motion script,
which no longer exists. Keep the wrapper (it is robust either way) but replace
the three comment lines with:

```ts
    // Re-parse the markup inside a real body so textContent is reliable
    // regardless of any leading non-element content in the rendered string.
```

**6d.** Same file: append this describe block at the end, locking in the fixes
this plan makes:

```ts
describe("no client runtime", () => {
    it("sets data-theme from an inline script in <head>", () => {
        const inline = [...doc.querySelectorAll("script")].filter((s) => !s.getAttribute("src"));
        expect(inline.some((s) => (s.textContent ?? "").includes("dataset.theme"))).toBe(true);
    });

    it("renders no loader overlay", () => {
        expect(doc.querySelector(".loader")).toBeNull();
    });
});
```

**Verify**: `pnpm test` → exit 0, exactly **`BASELINE + 2`** tests pass.

> The third new test — "ships zero external JavaScript files" — is deliberately
> NOT added here. It is added in Step 7d, because it cannot pass until Step 7
> removes the `svelte()` integration. See the note at the top of Step 7.

### Step 7: Remove the Svelte and motion toolchain

> **Why the "zero external JS" test lives here and not in Step 6.**
> `@astrojs/svelte` emits its client hydration runtime as a `client.svelte.*.js`
> chunk **purely because the integration is registered** — it does not check
> whether any `.svelte` component or `client:*` directive still exists. Verified
> by elimination during the 003 run: at the end of Step 5 the tree had zero
> `.svelte` files and zero `client:` directives, yet `pnpm build` still emitted
> `client.svelte.n7m6oswU.js` (29,694 bytes) deterministically across a full
> clean rebuild (`rm -rf dist .astro node_modules/.astro node_modules/.vite`);
> deleting **only** the two `svelte()` lines from `astro.config.mjs`, changing
> nothing else, took `dist/_astro` to zero `.js` files. So the assertion is only
> satisfiable after 7b. Every step in this plan ends with a fully green suite —
> do not add a test at a point where it must be red.

**7a.** Remove the dependencies:

```bash
pnpm remove svelte @astrojs/svelte motion
```

**7b.** In `astro.config.mjs`, delete these two lines (and nothing else):

```js
import svelte from "@astrojs/svelte";
```

```js
    svelte(),
```

**7c.** Delete the Svelte config:

```bash
rm svelte.config.js
```

**7d.** Now that the integration is gone, add the third new test. In
`tests/build-output.test.ts`, inside the existing `describe("dist/", …)` block
(after the "emits exactly one stylesheet" test):

```ts
    it("ships zero external JavaScript files", () => {
        const js = readdirSync("dist/_astro").filter((f) => f.endsWith(".js"));
        expect(js).toEqual([]);
    });
```

(`readdirSync` is already imported in that file.)

**Verify** (all of them):
- `pnpm install` → exit 0
- `grep -n "svelte" astro.config.mjs package.json` → **no matches**
- `pnpm check` → `0 errors`
- `pnpm eslint` → exit 0 (the 2 pre-existing warnings only)
- `pnpm test` → exit 0, `BASELINE + 3` pass

### Step 8: Final artifact verification

```bash
pnpm build
find dist/_astro -name '*.js' | wc -l
grep -o "dataset.theme" dist/index.html | wc -l
grep -o 'class="loader' dist/index.html | wc -l
grep -o "astro-island" dist/index.html | wc -l
```

**Verify**:
- `find … | wc -l` → `0` — zero external JS files (was 6 / 95,031 bytes).
- `grep -o "dataset.theme" … | wc -l` → `2` or more (the head script sets it;
  the inlined toggle handler reads and sets it).
- both remaining greps → `0` (no loader, no hydration islands).

Then `git status --porcelain` must list only the in-scope files from the Scope
section (deletions included).

## Test plan

- **3 new tests**, asserting the three outcomes this plan exists for: the
  pre-paint inline theme script is present in the rendered head (Step 6d); no
  `.loader` element renders (Step 6d); `dist/_astro` contains zero `.js` files
  (Step **7d** — it cannot pass before the `svelte()` integration is removed;
  see the note opening Step 7). Modelled on the existing suites they extend.
- **3 deleted lines**: the Svelte container-renderer wiring in
  `tests/rendered-html.test.ts`, scheduled for deletion by plan 001 itself.
- **Everything existing must stay green unmodified** (except the renderer
  lines and one stale comment): content, JSON-LD, links, portrait, constants
  and dist-artifact assertions all prove the visitor-facing page survived the
  rewrite. Run: `pnpm test` → `BASELINE + 3` passing.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm test` exits 0 with `BASELINE + 3` tests passing
- [ ] `pnpm check` exits 0 with `0 errors`
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `find dist/_astro -name '*.js' | wc -l` → `0`
- [ ] `grep -rn "svelte" src/ astro.config.mjs package.json` → no matches
- [ ] `grep -rn 'from "motion"' src/` → no matches, and `grep -n '"motion"' package.json` → no matches
- [ ] `grep -rn "loader" src/` → no matches
- [ ] These files no longer exist: `src/components/ThemeSwitcher.svelte`,
      `src/components/ProgressBar.svelte`, `src/layouts/Layout.astro`,
      `svelte.config.js`
- [ ] `grep -rn "client:" src/` → no matches (no hydration directives remain)
- [ ] `git status --porcelain` lists only in-scope files
- [ ] `plans/README.md` status row updated (unless a reviewer maintains it)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 shows plan 001 or 002 has not landed (`output` is not `"static"`,
  `@astrojs/netlify` still present, or `tests/` missing).
- Any "Current state" excerpt does not match the live file — especially if
  `BasicLayout.astro`, `index.astro`, either `.svelte` file, `IntroCard.astro`
  or `Goal.astro` differ from the quoted code. Plans 001/002 should not have
  touched them.
- After Step 7, `pnpm test` fails with `NoMatchingRenderer` — that means a
  `.svelte` import survived somewhere; report the file rather than
  re-adding the renderer.
- After Step 8, `find dist/_astro -name '*.js'` is non-empty. The spike
  measured zero; an emitted JS file means a script lost its inlining (or a
  hydration directive survived). Report which file and its contents.
- Any *content* assertion from the existing suite fails — the page changed in
  a way this plan does not intend; do not edit the assertion to match.
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file (most tempting:
  `Card/index.astro`, `uno.config.ts`, `CLAUDE.md` — all owned by later plans).

## Maintenance notes

- **Plan 004 rewrites parts of `BasicLayout.astro`'s head** (JSON-LD
  `sameAs`/`worksFor`). The `<script is:inline>` theme block added here must
  survive that edit — it is now the only thing standing between visitors and
  an unthemed first paint. The new "sets data-theme from an inline script"
  test guards it.
- **Plan 006 owns the `Icon` usages** deliberately left in `IntroCard.astro`
  and `Goal.astro`, and the spike worktree
  (`.claude/worktrees/spike-static`) contains their post-006 form (`i-…`
  spans) — do not "sync" those files from the spike before 006.
- **Keyframe naming trap**: UnoCSS scans `<style>` blocks and emits rules for
  utility-looking tokens. `@keyframes grow` produced a stray
  `.grow{flex-grow:1}` in the spike; that is why this plan uses
  `progress-grow` and `card-in`. Check any future keyframe name against the
  built stylesheet.
- **`:nth-child` delays stop at 7.** If a card (or third `CAREER` entry) is
  ever added, `main` gets an 8th child that animates with zero delay; extend
  the delay list.
- **Deferred hardening, on purpose**: the inline theme script calls
  `localStorage.getItem` unguarded. In a browser that throws on storage access
  the script aborts and the page renders unthemed — the *identical* failure
  mode the Svelte `onMount` had, so behaviour parity is preserved. Wrapping it
  in `try/catch` with a `matchMedia` fallback is a two-line follow-up if it
  ever matters; it was left out to keep the script byte-identical to the
  measured spike (343 B).
- **What a reviewer should scrutinize**: the long UnoCSS class strings on the
  toggle button and progress bar — they must be character-identical to the
  originals (plus the `theme-toggle`/`progress-fill` hooks and minus the
  Svelte-only `transition-all duration-[1500ms] delay-[300ms] ease-in-out`
  utilities that the keyframe now replaces); and that no `client:*` directive
  or `.svelte` file survives.
- **Visual parity check** (manual, optional but cheap): `pnpm dev`, load the
  page in dark and light OS modes — correct colors on first paint, no flash,
  toggle shows 🌙/🔆 correctly and persists across reload, progress bar fills
  to ~74.9%, cards stagger in, and everything is clickable immediately.
- `CLAUDE.md` still documents Svelte/motion/loader after this plan — that
  staleness is deliberate; plan 007 rewrites the docs against the final
  architecture.
