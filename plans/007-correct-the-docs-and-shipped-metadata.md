# Plan 007: Correct the documentation and the shipped metadata so they describe the site that actually exists

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 4550e1f..HEAD -- README.md CLAUDE.md public/llms.txt public/preview.jpg`
> Expected: **no output**. Plans 001–006 do not touch any of these four files.
> If any of them changed, compare the "Current state" excerpts below against the
> live files before proceeding; on a mismatch, treat it as a STOP condition.
>
> The drift check deliberately does **not** cover `src/`. Plans 002–006 rewrite
> `src/` heavily by design; Step 1 below probes the resulting architecture
> directly instead.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW — four files, none of them build inputs. `public/preview.jpg` is
  the only non-text change and it is a lossy re-encode of an image that is
  already stale; the failure mode is a worse-looking share card, not a broken
  site.
- **Depends on**: `plans/001-regression-safety-net.md` through
  `plans/006-*.md`. **All six must be merged to `main` before this plan runs.**
  Every doc correction here describes the architecture *after* the refactor, so
  running it early would replace true-today text with false-today text.
- **Category**: docs
- **Planned at**: commit `4550e1f`, 2026-07-21

## Why this matters

Three documents in this repo are not merely incomplete — they are **actively
wrong**, which is worse than silent. `README.md` tells every forker to run
`npm install` in a repo that pins `pnpm@10.32.1` and ships only a
`pnpm-lock.yaml` (npm ignores that lockfile and resolves a different dependency
graph), and it points them at `./components/lib/constants.ts`, a path that has
never existed. `CLAUDE.md` is the first file every agent session reads and it
asserts an "edge middleware" deployment for which no middleware file exists
anywhere in the repo. `public/llms.txt` exists specifically so AI crawlers get an
authoritative bio, and it gives the owner a job title he left in August 2023,
attached to the wrong employer.

Plans 002–006 also invalidate a second layer of these docs: they delete Svelte,
the Motion library, the SSR adapter and the loader layout, all of which the Tech
Stack sections still name. After this plan lands, a contributor following the
README gets a working checkout, an agent reading `CLAUDE.md` gets an accurate
architecture, and an AI crawler reading `llms.txt` gets the right job title.

Separately, `public/preview.jpg` is 2400×1600 and 383,429 bytes — the single
largest file shipped to `dist/` — while the social cards it feeds render at about
1200×630. Resizing it is a pure win with no editorial judgment involved.

**The site must look and behave identically to a visitor after this plan**, with
one intentional exception: the Open Graph / Twitter share image is smaller and
therefore loads faster. No HTML, CSS, or JavaScript changes.

## Current state

### Files involved

- `README.md` (88 lines) — the public entry point; explicitly solicits forks at
  `README.md:70` and `README.md:83`. Contains the wrong package manager, a
  nonexistent constants path, and a Tech Stack list naming deleted dependencies.
- `CLAUDE.md` (79 lines) — agent-facing architecture doc. Contains the
  edge-middleware claim, the `pnpm preview` claim, and the same stale Tech Stack.
- `public/llms.txt` (14 lines) — hand-maintained AI-crawler bio, served live at
  `https://calvin.sg/llms.txt`. Nothing imports it, nothing generates it, no test
  covers it.
- `public/preview.jpg` — 2400×1600, 383,429 bytes. Consumed as the README hero
  image and as `og:image` / `twitter:image`.
- `src/lib/constants.ts` — **read-only for this plan.** It is the authority for
  every fact `llms.txt` states. Do not edit it.

### The exact wrong lines

`README.md:27-35` — Tech Stack (Svelte and Motion are deleted by plan 003):

```markdown
## Tech Stack

- [Astro](https://astro.build)
- [Svelte](https://svelte.dev/)
- [UnoCSS](https://unocss.dev/)
- [Umami](https://umami.is/)
- [Motion](https://motion.dev/)
- [Font Awesome](https://fontawesome.com/)
- [Netlify](https://www.netlify.com/)
```

`README.md:49-57` — the install steps (shown between `~~~` so the README's own
backtick fences are visible):

~~~markdown
3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
~~~

`README.md:59-62` — the configuration section (the path does not exist; there is
no top-level `components/` directory):

```markdown
## Configuration

1. Update your personal details in `./components/lib/constants.ts`.
2. Modify the `site` and other relevant properties in `astro.config.mjs`.
```

`CLAUDE.md:25` — false once the site is static (there is no adapter to break
`astro preview`):

```markdown
Note: `pnpm preview` is not supported due to the Netlify adapter configuration. Use `pnpm build` and deploy to Netlify for production testing.
```

`CLAUDE.md:27-34` — Tech Stack:

```markdown
## Tech Stack & Architecture

- **Framework**: Astro with server-side rendering
- **UI Components**: Mix of Astro and Svelte components
- **Styling**: UnoCSS (atomic CSS framework)
- **Icons**: Astro Icon with Font Awesome 6 brands
- **Animation**: Motion library
- **Deployment**: Netlify with edge middleware
```

`CLAUDE.md:38-41`, `CLAUDE.md:48-56`, `CLAUDE.md:69-75` — component structure,
styling system, layout hierarchy, and the deployment section:

```markdown
### Component Structure
- **Astro Components**: Main UI components (`.astro` files) for static content
- **Svelte Components**: Interactive components like `ThemeSwitcher.svelte` and `ProgressBar.svelte`
- **Card System**: Reusable card layout in `src/components/Card/` with `index.astro` and `Content.astro`
```

```markdown
### Styling System
- **UnoCSS**: Atomic CSS with custom theme configuration in `uno.config.ts`
- **Theme Support**: Dark/light mode via CSS custom properties and Svelte theme switcher
- **Custom Design System**: Predefined colors (gray, darkslate, primary), shadows, and grid templates

### Layout Hierarchy
- `BasicLayout.astro` → `Layout.astro` → page components
- Loader functionality built into layout system
- Responsive bento grid layout for different screen sizes
```

```markdown
## Deployment

The site is configured for Netlify deployment with:
- Server-side rendering enabled
- Edge middleware support
- Automatic sitemap generation
- Robots.txt generation
```

`public/llms.txt:3` and `public/llms.txt:7`:

```markdown
> Business Systems Analyst at HeyMax, a loyalty and travel rewards platform in Singapore. Builds docs-as-code platforms, workflow automation, and AI-powered operations tooling.
```

```markdown
- [calvin.sg](https://calvin.sg): Personal website built with Astro and Svelte
```

### Why `llms.txt:3` is wrong, from the repo's own data

`src/lib/constants.ts:27-37` — `CAREER[0]`:

```ts
    company: "HeyMax",
    company_url: "https://www.heymax.ai",
    ...
    end_date: "Present",
    job_name: "Founding Solutions Engineer",
    start_date: "Aug 2023",
```

`src/lib/constants.ts:38-48` — `CAREER[1]`:

```ts
    company: "NCS Group",
    ...
    end_date: "Aug 2023",
    job_name: "Business Systems Analyst",
    start_date: "Jun 2022",
```

`src/lib/constants.ts:108` corroborates:

```ts
    title: "Calvin - Founding Solutions Engineer | Road Cyclist | Enthusiastic Learner",
```

So "Business Systems Analyst" is the **NCS Group** role that ended Aug 2023, and
`llms.txt` pairs it with HeyMax. The correct current title is
**"Founding Solutions Engineer"**. Three independent places in the repo say so
(`constants.ts:35`, `constants.ts:83`, `constants.ts:108`); `llms.txt` is the
single dissenter.

### Repo conventions that apply

- Markdown files use two-space list indentation and fenced code blocks with a
  language tag. Match the surrounding style exactly; do not reflow untouched
  paragraphs.
- `CLAUDE.md:79` states: *"Any user configurable variable are implemented and
  configured in `src/lib/constants.ts`"*. **That contract is still true and still
  load-bearing after the refactor — preserve that line verbatim.**
- Conventional-commit subjects. Recent examples from `git log`:
  `chore: prune dead template dependencies ahead of the Astro 7 sync (#25)`,
  `fix(constants): remove thousands separator breaking the build`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0; `0 errors` |
| Lint | `pnpm eslint` | exit 0 |
| Test | `pnpm test` | exit 0; all tests pass |
| Build | `pnpm build` | exit 0; `Complete!` |

**Use `pnpm` for everything. Never `npm`.** (`package.json` pins
`"packageManager": "pnpm@10.32.1"`.)

All commands are run from the repository root.

## Scope

**In scope** (the only files you may modify):
- `README.md`
- `CLAUDE.md`
- `public/llms.txt`
- `public/preview.jpg` (resize / recompress in place, same filename)

**Out of scope** (do NOT touch, even though they look related):

- **`src/lib/constants.ts`** — read it, never write it. In particular:
  - `ABOUT_ME.description[1]` at `src/lib/constants.ts:56` reads *"Join me in my
    latest cycling challenge 1000km in 5 weeks, helping vulnerable teens
    #cyclehome"*. That campaign line has been live and unchanged for 13 months,
    so "latest" is stale. **Do not rewrite it.** It is the owner's personal voice
    describing his own charity ride; an agent must not edit someone's
    self-description. It is flagged for the maintainer in "Maintenance notes".
  - `GOAL.current_progress` at `src/lib/constants.ts:71` is hand-edited and goes
    stale between rides. Automating it from Strava is a separate product
    decision, not a docs fix.
  - Plan 001's `tests/constants.test.ts` asserts `METADATA.description` length
    bounds; any edit here can break the suite for no benefit.
- **`src/`, `astro.config.mjs`, `uno.config.ts`, `package.json`,
  `eslint.config.js`** — plans 002–006 own all of these. This plan changes no
  code and adds no dependency.
- **`tests/`** — plan 001 owns the suite. This plan adds no tests; the existing
  suite is the regression gate.
- **`plans/README.md`** — update only your own status row, per the executor
  instructions at the top.
- **Taking a fresh screenshot of the site** — see Step 5; deliberately deferred.
- **`METADATA.image_url` / the `og:image` markup** — the image keeps its filename
  and path, so nothing that references it needs to change.

## Git workflow

- Branch: `advisor/007-correct-the-docs-and-shipped-metadata`
- One commit per step is fine; a single squashed commit is also fine. Suggested
  subjects: `docs: fix README setup steps, paths and tech stack`,
  `docs: correct CLAUDE.md architecture after the static refactor`,
  `fix(llms.txt): correct the job title and drop the Svelte claim`,
  `perf(assets): resize preview.jpg to 1200x630`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Probe the repo state the docs are about to claim

Every sentence you are about to write asserts something about the code. Verify
those assertions before writing them. Run, from the repo root:

```bash
node -e "
const fs = require('fs');
const p = require('./package.json');
const all = {...p.dependencies, ...p.devDependencies};
const cfg = fs.readFileSync('astro.config.mjs', 'utf8');
const out = {
  svelte: 'svelte' in all || '@astrojs/svelte' in all,
  motion: 'motion' in all,
  netlifyAdapter: '@astrojs/netlify' in all,
  sharp: 'sharp' in all,
  outputStatic: /output:\s*[\"']static[\"']/.test(cfg),
  adapterLine: /adapter\s*:/.test(cfg),
  svelteFiles: fs.readdirSync('src/components').filter(f => f.endsWith('.svelte')).length,
  layoutAstro: fs.existsSync('src/layouts/Layout.astro'),
  middleware: fs.existsSync('src/middleware.ts') || fs.existsSync('src/middleware.js'),
  testScript: Boolean(p.scripts && p.scripts.test),
  astroIcon: 'astro-icon' in all,
};
for (const [k, v] of Object.entries(out)) console.log(k + ': ' + v);
"
```

**Verify**: the output must be exactly

```
svelte: false
motion: false
netlifyAdapter: false
sharp: true
outputStatic: true
adapterLine: false
svelteFiles: 0
layoutAstro: false
middleware: false
testScript: true
astroIcon: false
```

Two of these are **informational, not gates** — proceed even if they differ, but
note the value, because Step 3 and Step 4 branch on them:

- `layoutAstro` — if `true`, plans 002–006 kept `src/layouts/Layout.astro`; use
  the alternate wording given in Step 4.
- `astroIcon` — either value is fine; the replacement wording is true both ways.

**Every other line differing from the expected output is a STOP condition** (see
"STOP conditions"). Do not "fix" the code to match — this plan changes no code.

### Step 2: Confirm the existing gates are green before you start

You are about to edit documentation only, so any failure here pre-dates your
work and must be reported rather than absorbed.

**Verify**, all four:

- `pnpm install` → exit 0
- `pnpm check` → exit 0, `0 errors`
- `pnpm test` → exit 0, `Test Files` all passed
- `pnpm build` → exit 0, `Complete!`

Record the test count printed by `pnpm test`. It must be identical at the end of
this plan.

### Step 3: Fix `README.md`

Keep the file's existing structure, heading order, badges (lines 8–11) and the
`![Portfolio Preview](public/preview.jpg)` hero at line 17. Make exactly these
four edits plus the new section in Step 6.

**3a. Tech Stack.** Replace the whole `## Tech Stack` list (currently
`README.md:29-35`) with:

```markdown
- [Astro](https://astro.build)
- [UnoCSS](https://unocss.dev/)
- [Iconify](https://iconify.design/) (Font Awesome 6 Brands + Remix Icon sets)
- [Umami](https://umami.is/)
- [Vitest](https://vitest.dev/)
- [Netlify](https://www.netlify.com/)
```

The `Svelte` and `Motion` entries are deleted because plan 003 removed both
dependencies. `Font Awesome` becomes `Iconify` because the icons are consumed
from the `@iconify-json/fa6-brands` and `@iconify-json/ri` collections — true
whether or not `astro-icon` is still installed.

**3b. Install and dev steps.** Replace `README.md:49-57` with the following
(delimited by `~~~` here; write real backtick fences into the README):

~~~markdown
3. Install dependencies (this repo pins pnpm; `npm install` would ignore
   `pnpm-lock.yaml`):
   ```bash
   pnpm install
   ```

4. Copy the environment template — `UMAMI_ID` enables the analytics snippet and
   can be left as-is for local development:
   ```bash
   cp .env.example .env
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```
~~~

Note this renumbers the list: the existing steps 1 and 2 (clone, `cd`) stay as
they are, and the new `.env` step becomes step 4, pushing the dev server to 5.

**3c. Configuration path.** Replace `README.md:61` (`1. Update your personal
details in \`./components/lib/constants.ts\`.`) with:

```markdown
1. Update your personal details in `src/lib/constants.ts` — every piece of site
   content (links, career, about, cycling goal, footer, SEO metadata) lives
   there.
```

Leave `README.md:62` (the `astro.config.mjs` line) unchanged.

**3d. Deployment section.** In `## Deployment`, immediately under
`### Deploy on Netlify`, the current text is `To deploy on Netlify:`. Replace
that single line with:

```markdown
The site builds to a fully static `dist/` directory — no adapter, no serverless
function. Netlify's build command is `pnpm build` and its publish directory is
`dist`. To deploy your own copy:
```

Leave the numbered fork/link steps and the Deploy-to-Netlify button unchanged.

**Verify**:

```bash
grep -nEi "npm (install|run)|components/lib/constants\.ts|svelte|motion" README.md; echo "exit=$?"
```

→ prints only `exit=1` (grep found nothing).

### Step 4: Fix `CLAUDE.md`

**4a. Development Commands.** Add a test entry to the fenced block at
`CLAUDE.md:11-23`, after the `pnpm check` entry:

```bash
# Tests (renders the page and asserts on the output)
pnpm test
```

**4b. The preview note.** Replace `CLAUDE.md:25` entirely with:

```markdown
Note: `pnpm preview` serves the built `dist/` directory locally on
http://localhost:4321 — the site is a static build with no adapter, so the
preview is byte-identical to what Netlify serves.
```

**4c. Tech Stack & Architecture.** Replace the list at `CLAUDE.md:29-34` with:

```markdown
- **Framework**: Astro with static output (`output: "static"`) — every page is
  prerendered at build time; there is no adapter and no server runtime
- **UI Components**: Astro components only — no client-side UI framework
- **Styling**: UnoCSS (atomic CSS framework)
- **Icons**: Iconify collections `@iconify-json/fa6-brands` and `@iconify-json/ri`
- **Animation**: CSS animations only
- **Deployment**: Netlify, serving the prerendered `dist/` directory
```

**4d. Component Structure.** Replace the `- **Svelte Components**: ...` bullet at
`CLAUDE.md:40` with nothing (delete the line). Leave the `Astro Components` and
`Card System` bullets as they are.

**4e. Styling System.** Replace `CLAUDE.md:50-51` with:

```markdown
- **Theme Support**: dark/light mode via CSS custom properties defined in
  `src/layouts/BasicLayout.astro`; the active theme is written to
  `<html data-theme>` by an inline `<script is:inline>` in `<head>` before first
  paint
- **Custom Design System**: theme tokens (colors, shadows) defined in
  `uno.config.ts`
```

(The old text named "darkslate, primary" colors and "grid templates" that plan
005 deleted from `uno.config.ts`.)

**4f. Layout Hierarchy.** Replace `CLAUDE.md:54-55` (the two bullets
`- \`BasicLayout.astro\` → \`Layout.astro\` → page components` and
`- Loader functionality built into layout system`) with **one** bullet.

- If Step 1 reported `layoutAstro: false` (the expected case), use:
  ```markdown
  - `src/layouts/BasicLayout.astro` wraps the single page `src/pages/index.astro`
  ```
- If Step 1 reported `layoutAstro: true`, use instead:
  ```markdown
  - `BasicLayout.astro` → `Layout.astro` → page components
  ```

Leave the `- Responsive bento grid layout for different screen sizes` bullet
unchanged.

**4g. Deployment section.** Replace `CLAUDE.md:71-75` with:

```markdown
The site is a fully static build deployed to Netlify:
- Every page is prerendered to `dist/` at build time
- No adapter, no serverless function, and no middleware
- Automatic sitemap generation
- `robots.txt` shipped in the build output
```

**4h. Preserve the Memories section verbatim.** `CLAUDE.md:77-79` must still read:

```markdown
## Memories

- Any user configurable variable are implemented and configured in `src/lib/constants.ts`
```

**Verify**, all four:

```bash
grep -nEi "npm (install|run)|svelte|motion|edge middleware|server-side rendering" CLAUDE.md; echo "exit=$?"
```
→ prints only `exit=1`.

```bash
grep -c "src/lib/constants.ts" CLAUDE.md
```
→ `3` or more (the Configuration bullet, the Content Management heading line, and
the Memories line all reference it).

```bash
grep -n "Any user configurable variable are implemented and configured in \`src/lib/constants.ts\`" CLAUDE.md
```
→ exactly one match.

```bash
grep -n "is:inline" src/layouts/BasicLayout.astro
```
→ at least one match, proving the pre-paint theme script the doc now describes
actually exists. **If this returns nothing, revert edit 4e's Theme Support bullet
to a claim you can verify, and report it.**

Then prove the `pnpm preview` claim in 4b is true:

```bash
pnpm build > /dev/null 2>&1
pnpm preview > /tmp/astro-preview.log 2>&1 &
PREVIEW_PID=$!
sleep 8
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/
kill $PREVIEW_PID 2>/dev/null
```

→ prints `200`. If it prints `000`, check `/tmp/astro-preview.log` for a
different port and retry against that port once; if preview genuinely does not
serve the site, that is a STOP condition (the doc line would be false).

### Step 5: Fix `public/llms.txt`

Two single-line edits. **Do not add, remove or reword anything else in this
file** — the remaining sentences are the owner's own description of his work and
projects, and this plan has no authority to rewrite them.

**5a.** On line 3, change only the job title. Before:

```
> Business Systems Analyst at HeyMax, a loyalty and travel rewards platform in Singapore. Builds docs-as-code platforms, workflow automation, and AI-powered operations tooling.
```

After:

```
> Founding Solutions Engineer at HeyMax, a loyalty and travel rewards platform in Singapore. Builds docs-as-code platforms, workflow automation, and AI-powered operations tooling.
```

The new title is copied verbatim from `src/lib/constants.ts:35`. Everything after
`at HeyMax,` is untouched.

**5b.** On line 7, drop the Svelte claim. Before:

```
- [calvin.sg](https://calvin.sg): Personal website built with Astro and Svelte
```

After:

```
- [calvin.sg](https://calvin.sg): Personal website built with Astro
```

**Do not** convert this file into a generated `src/pages/llms.txt.ts` route. A
new route and its prerender configuration is more machinery than a 14-line static
file that changes once every few years deserves, and it is out of scope.

**Verify**:

```bash
node -e "
const fs = require('fs');
const txt = fs.readFileSync('public/llms.txt', 'utf8');
const c = fs.readFileSync('src/lib/constants.ts', 'utf8');
const title = c.match(/job_name:\s*\"([^\"]+)\"/)[1];
console.log('title from constants:', title);
console.log('llms.txt states it:', txt.includes(title + ' at HeyMax'));
console.log('stale title gone:', !txt.includes('Business Systems Analyst'));
console.log('svelte claim gone:', !/Svelte/i.test(txt));
console.log('line count:', txt.trimEnd().split('\n').length);
"
```

→

```
title from constants: Founding Solutions Engineer
llms.txt states it: true
stale title gone: true
svelte claim gone: true
line count: 14
```

(The regex takes the **first** `job_name` in `constants.ts`, which is
`CAREER[0]` — the current role. The line count proves you did not add or delete
lines.)

### Step 6: Add a Testing section to `README.md`

Insert a new `## Testing` section between `## Configuration` and
`## Deployment`. The block below is delimited with `~~~` so the README's own
backtick fences show through literally — write real backtick fences into the
README:

~~~markdown
## Testing

```bash
# Run the full suite once
pnpm test

# Re-run on change
pnpm test:watch
```

Three suites, all under `tests/`:

- `tests/rendered-html.test.ts` — renders `src/pages/index.astro` in-process with
  Astro's Container API and asserts on the result: page title, meta description,
  canonical link, the JSON-LD block, and that every entry in
  `src/lib/constants.ts` (welcome lines, about bullets, career entries, links,
  goal figures, footer) reaches the page.
- `tests/constants.test.ts` — data invariants for `src/lib/constants.ts`: link
  URLs are absolute or root-relative, icon names come from an installed Iconify
  collection, the cycling figures are finite and within range, and the SEO title
  and description stay within useful lengths.
- `tests/build-output.test.ts` — asserts on what `pnpm build` actually emits into
  `dist/`: `robots.txt` pointing at the sitemap, the sitemap index, exactly one
  stylesheet, and the public assets the page links to.

`pnpm test` runs `pnpm build` once as a global setup so the build-output suite
has real artifacts. Set `SKIP_BUILD=1` to reuse an existing `dist/` while
iterating.
~~~

**Verify**:

```bash
grep -n "^## " README.md
```

→ the headings appear in this order: `## Overview`, `## Features`,
`## Tech Stack`, `## Getting Started`, `## Configuration`, `## Testing`,
`## Deployment`, `## Contact`, `## Support 💗`, `## Acknowledgements`.

```bash
grep -c "pnpm test" README.md
```
→ `2` or more.

### Step 7: Resize `public/preview.jpg` to 1200×630

`public/preview.jpg` is 2400×1600 and 383,429 bytes. Social platforms render the
card at roughly 1200×630, so every share currently downloads ~4× more image than
it displays, and it is the largest single file in `dist/`.

The source is 3:2 and the target is ~1.91:1, so a center crop would slice the
`👋 Hi, I'm Calvin` heading off the top. Use `fit: "contain"` with a `#111111`
background — that is the exact colour of the screenshot's own page background
(sampled from its top-left pixel), so the pillarbox is invisible.

`sharp` is already a devDependency (plan 002 added it for Astro's static image
service), so no install is needed. Run this from the repo root:

```bash
node -e "
const sharp = require('sharp');
sharp('public/preview.jpg')
  .resize(1200, 630, {fit: 'contain', background: '#111111'})
  .jpeg({quality: 82, mozjpeg: true})
  .toFile('public/preview.1200x630.jpg')
  .then(r => console.log(JSON.stringify(r)));
"
```

It writes to a **temporary filename** on purpose — never re-encode a JPEG in
place, because a failure halfway leaves you with no original and the file is
tracked in git.

Then inspect the result before committing to it:

```bash
node -e "
const sharp = require('sharp');
const {statSync} = require('fs');
sharp('public/preview.1200x630.jpg').metadata().then(m => {
  console.log('width', m.width, 'height', m.height, 'format', m.format);
  console.log('bytes', statSync('public/preview.1200x630.jpg').size);
  console.log('original bytes', statSync('public/preview.jpg').size);
});
"
```

**Verify**: `width 1200 height 630 format jpeg`, and `bytes` between **30000 and
150000**. The reference run of this exact command produced **54,485 bytes**
(85.8 % smaller than the 383,429-byte original).

If — and only if — both checks pass, replace the original:

```bash
mv public/preview.1200x630.jpg public/preview.jpg
```

**Verify**:

```bash
node -e "
const sharp = require('sharp');
const {statSync, existsSync} = require('fs');
console.log('temp file removed:', !existsSync('public/preview.1200x630.jpg'));
sharp('public/preview.jpg').metadata().then(m =>
  console.log('preview.jpg', m.width + 'x' + m.height, statSync('public/preview.jpg').size, 'bytes'));
"
```

→ `temp file removed: true` and `preview.jpg 1200x630 <30000..150000> bytes`.

Then confirm the build still ships it:

```bash
pnpm build > /dev/null 2>&1 && node -e "
const {statSync} = require('fs');
console.log('dist/preview.jpg', statSync('dist/preview.jpg').size, 'bytes');
"
```

→ prints a byte count equal to the `public/preview.jpg` size. (Plan 001's
`tests/build-output.test.ts` also asserts `dist/preview.jpg` exists.)

**What this step does NOT do:** the screenshot still shows the *2024* site —
"Software Engineer" instead of "Founding Solutions Engineer", 1440.1 km instead
of the current figure, five social buttons instead of six, and none of the
refactored layout. **Do not attempt to regenerate it.** Taking a fresh screenshot
requires launching a browser, choosing a viewport, waiting for the right paint,
and judging whether the framing looks good — all of which are human decisions an
executor cannot verify it got right, and a wrong one ships a broken share card to
every LinkedIn and Slack unfurl of calvin.sg. This step therefore does the
mechanical, checkable half only. The screenshot refresh is handed to the
maintainer in "Maintenance notes".

### Step 8: Re-run every gate

**Verify**, all five:

- `pnpm check` → exit 0, `0 errors`
- `pnpm eslint` → exit 0
- `pnpm test` → exit 0, **the same test count recorded in Step 2**
- `pnpm build` → exit 0, `Complete!`
- `git status --porcelain` → lists exactly four paths and nothing else:
  ```
   M CLAUDE.md
   M README.md
   M public/llms.txt
   M public/preview.jpg
  ```

## Test plan

**No new tests.** This plan changes documentation and one binary asset; there is
no behaviour to assert that plan 001's suite does not already cover.

The existing suite is nevertheless a real gate here, in two specific ways:

1. `tests/constants.test.ts` asserts `METADATA.title` and `METADATA.description`
   length bounds. If you drift into editing `src/lib/constants.ts` — which this
   plan forbids — the suite catches it.
2. `tests/build-output.test.ts` asserts `dist/preview.jpg` exists. If Step 7
   corrupts or deletes the image, the suite catches it.

Verification: `pnpm test` → exit 0 with the identical test count from Step 2.
A **changed count is a STOP condition**, not something to reconcile.

The one behavioural claim this plan introduces — that `pnpm preview` works — is
verified directly by the curl check in Step 4 rather than by a test, because a
test that boots a preview server is more machinery than a one-line doc claim
justifies.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -nEi "npm (install|run)|components/lib/constants\.ts|svelte|motion" README.md` returns no matches (exit 1)
- [ ] `grep -nEi "npm (install|run)|svelte|motion|edge middleware|server-side rendering" CLAUDE.md` returns no matches (exit 1)
- [ ] `grep -n "src/lib/constants.ts" README.md` returns at least one match
- [ ] `grep -n "Any user configurable variable are implemented and configured in \`src/lib/constants.ts\`" CLAUDE.md` returns exactly one match
- [ ] `grep -n "^## Testing" README.md` returns one match, and `grep -c "pnpm test" README.md` is ≥ 2
- [ ] `grep -c "Business Systems Analyst" public/llms.txt` returns `0`
- [ ] `grep -c "Founding Solutions Engineer at HeyMax" public/llms.txt` returns `1`
- [ ] `grep -ci "svelte" public/llms.txt` returns `0`
- [ ] `public/llms.txt` is still 14 lines (`wc -l < public/llms.txt` → `14`)
- [ ] `node -e "require('sharp')('public/preview.jpg').metadata().then(m=>console.log(m.width,m.height))"` prints `1200 630`
- [ ] `public/preview.jpg` is between 30,000 and 150,000 bytes
- [ ] `test -f public/preview.1200x630.jpg` → false (no leftover temp file)
- [ ] `pnpm check` exits 0 with `0 errors`
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0 with the same test count as Step 2
- [ ] `pnpm build` exits 0
- [ ] `git status --porcelain` lists only `README.md`, `CLAUDE.md`,
      `public/llms.txt`, `public/preview.jpg` — **no file under `src/`, no
      `package.json`, no `pnpm-lock.yaml`**
- [ ] `git diff --stat -- src/ package.json pnpm-lock.yaml` produces no output
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- **Step 1 reports `svelte: true`, `motion: true`, `netlifyAdapter: true`,
  `adapterLine: true`, `svelteFiles` > 0, or `outputStatic: false`.** Plans
  002–006 have not all landed, and every doc sentence in Steps 3, 4 and 5 would
  be *newly* false rather than corrected. Do not delete the dependencies yourself
  — that is the job of plans 002 and 003. Report which flags are wrong.
- **Step 1 reports `sharp: false`.** Step 7 depends on it. Do **not** run
  `pnpm add -D sharp` — `package.json` is out of scope for this plan. Skip Step 7,
  complete the rest, and report that the image resize is blocked.
- **Step 1 reports `middleware: true`.** A middleware file appeared after this
  plan was written; the CLAUDE.md deployment text in 4g would then be wrong.
  Report it.
- **Step 1 reports `testScript: false`.** Plan 001 has not landed; the README
  Testing section in Step 6 would document commands that do not exist.
- **The sharp output in Step 7 is not exactly 1200×630, or its size falls outside
  30,000–150,000 bytes, or the command errors.** Leave `public/preview.jpg`
  untouched, delete any `public/preview.1200x630.jpg`, and report. A mangled
  `og:image` is worse than an oversized one, and this is the one step whose
  output you cannot fully judge from a command.
- **`pnpm test` reports a different count at Step 8 than at Step 2.** You touched
  something you should not have. Do not adjust a test to make it pass.
- **`git status --porcelain` shows any file outside the four in scope.** Revert it.
- **The `pnpm preview` curl check in Step 4 does not return 200 on any port.**
  The doc line you wrote would be false; report rather than shipping it.
- **You find yourself wanting to edit `src/lib/constants.ts`** — for the stale
  `#cyclehome` campaign line, the cycling progress number, or anything else.
  That is out of scope by explicit decision, not by oversight.
- **You find yourself wanting to take a screenshot, launch a browser, or install
  a screenshot tool.** Step 7 deliberately excludes this.

## Maintenance notes

For the human who owns this repo after the change lands:

- **The `preview.jpg` screenshot is still from August 2024** (commit `5de4389`).
  It shows the hero as "Software Engineer. Enthusiastic learner. Road cyclist.",
  a career card titled "I'm a Software engineer", five social buttons (no
  Resume), and "1440.1 km of 3000 km" — none of which match the current
  `src/lib/constants.ts` or the refactored layout. This plan only resized it.
  **Please take a fresh 1200×630 screenshot of the rebuilt site and overwrite
  `public/preview.jpg` at the same path** — the README hero, `og:image` and
  `twitter:image` all resolve from that one filename, so no code change is
  needed. Until then, every LinkedIn/Slack/X unfurl of calvin.sg shows a
  two-year-old page.
- **`src/lib/constants.ts:56` needs your editorial judgment.** It reads *"Join me
  in my latest cycling challenge 1000km in 5 weeks, helping vulnerable teens
  #cyclehome"* and has been unchanged since 2025-06-17 — a five-week campaign
  described as "latest" for 13 months. It was left untouched on purpose: it is
  your own voice describing your own charity ride, and no agent should rewrite
  that. A one-line edit retires it. (`NOW.description` and the `sive.rs/nowff`
  link were checked and are **still accurate** — `CAREER[0].end_date` is
  `"Present"` — so nothing there needs attention.)
- **`GOAL.current_progress` at `src/lib/constants.ts:71`** is hand-edited (43
  commits touch that one line). Whether to automate it from Strava is a product
  decision that was deliberately kept out of this plan.
- **`public/llms.txt` is a hand-maintained duplicate of facts in
  `src/lib/constants.ts`** with nothing keeping them in sync — that is exactly how
  the job title went stale in the first place. It was fixed by hand rather than
  generated, because a `src/pages/llms.txt.ts` route is more machinery than a
  14-line file justifies. **Add it to your checklist when you change jobs.**
- **What a reviewer should scrutinise in the PR**: (1) that the diff touches
  exactly four files and nothing under `src/`; (2) that the resized
  `preview.jpg` still shows the whole page with no crop — view it, do not just
  read the byte count; (3) that `CLAUDE.md`'s Memories line about
  `src/lib/constants.ts` survived verbatim, since other plans and agent sessions
  depend on that contract.
- **When the architecture next changes** — a new adapter, a UI framework, a
  client-side island — `CLAUDE.md`'s "Tech Stack & Architecture" and "Deployment"
  sections and the README "Tech Stack" list must be updated in the same PR.
  Nothing in CI checks that these documents remain true; they went wrong here
  precisely because nothing did.
