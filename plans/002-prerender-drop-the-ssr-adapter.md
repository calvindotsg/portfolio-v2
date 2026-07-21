# Plan 002: Prerender the site to static HTML and delete the SSR adapter

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 4550e1f..HEAD -- astro.config.mjs package.json src/layouts/BasicLayout.astro src/pages/`
> `tests/` will legitimately show as *added* (plan 001 created it) — that is
> expected and is not drift. If `astro.config.mjs`, `package.json`
> (beyond plan 001's `test` scripts and `vitest`/`linkedom` devDependencies),
> `src/layouts/BasicLayout.astro` or anything under `src/pages/` changed since
> this plan was written, compare the "Current state" excerpts against the live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — this changes the *deployment shape* of a live site
  (https://calvin.sg) from an SSR serverless function to plain static files.
  Every repo-side check in this plan is automated, but the final cutover must be
  seen on a Netlify deploy preview before it reaches production.
- **Depends on**: `plans/001-regression-safety-net.md` — **must be merged and
  green before you start.** This plan edits the test suite that plan 001
  creates; if `tests/build-output.test.ts` does not exist, plan 001 has not
  landed and you must STOP.
- **Category**: perf / tech-debt
- **Planned at**: commit `4550e1f`, 2026-07-21
- **Findings covered**: PERF-01, DEP-01, TECHDEBT-01, CORRECT-03, DX-02, and the
  deployment half of SEC-02.

## Why this matters

This is a one-page portfolio whose HTML is byte-identical for every visitor, and
it is served by a serverless function on **every single request**. That is not a
guess — it was measured against production:

- `curl -sI https://calvin.sg/` returns `cache-control: no-cache` together with
  `cache-status: "Netlify Durable"; fwd=bypass` and `cache-status: "Netlify
  Edge"; fwd=miss`. The CDN is explicitly told not to cache the document.
- Five timed document requests gave TTFB 0.290 / 0.292 / 0.478 / 0.281 / 0.280 s
  (median ≈ 290 ms). The same origin's edge-cached stylesheet
  (`/_astro/index.sHumPbhd.css`, `cache-status: "Netlify Edge"; hit`) returns in
  0.025–0.034 s (median ≈ 34 ms). That is **~256 ms of avoidable latency on the
  request that gates every other request on the page**, paid on every visit.
- `pnpm build` today emits a **2.4 MB Netlify SSR function** under
  `.netlify/v1/functions/ssr`, plus an `.netlify/v1/edge-functions/middleware/`
  directory that is **empty** — because `middlewareMode: 'edge'` is configured
  and **there is no `src/middleware.ts` anywhere in this repository**. It has
  always been configuring nothing.
- `dist/` today contains **no `index.html` at all**. The page exists only inside
  the function bundle.

Nothing in this repo needs on-demand rendering. A repo-wide grep for
`Astro.request`, `Astro.cookies`, `Astro.locals`, `Astro.session`,
`Astro.redirect`, `Astro.clientAddress`, `getStaticPaths` and `prerender`
returns **zero hits**. The only dynamic API in use is `Astro.url`, and that is
the second reason to do this:

**CORRECT-03 gets fixed for free.** `src/layouts/BasicLayout.astro:10,47,60`
derive the OG image, `og:url` and `rel=canonical` from the *incoming request*.
Under `output: "server"` that produces, verified live:

- `curl -s 'https://calvin.sg/?utm_source=newsletter'` →
  `<link href="https://calvin.sg/?utm_source=newsletter" rel="canonical">` — the
  query string is echoed into the self-canonical.
- `curl -s https://calvindotsg.netlify.app/` →
  `<meta property="og:url" content="https://calvindotsg.netlify.app">` and
  `<link href="https://calvindotsg.netlify.app/" rel="canonical">`, alongside
  `<meta name="robots" content="index, follow">` — the deploy host
  self-canonicalises as a fully indexable duplicate.

Be honest about the severity: `rel=canonical` is a hint search engines often
reconcile on their own, and the sitemap already points only at
`https://calvin.sg/`. **This is not a live attack and there is no evidence of
harm today** — a related security-framed finding (SEC-03) was *refuted* as a
duplicate that a static build resolves anyway. The point is simply that in a
static build these values are baked from the configured `site` at build time, so
the defect disappears without anyone writing a fix. This was proven in a spike:
its built `dist/index.html` contains `og:url" content="https://calvin.sg"` and
`<link href="https://calvin.sg/" rel="canonical"`.

**Three more measured wins:**

1. **The image gets smaller and faster.** Production serves the portrait through
   the adapter-provided Netlify Image CDN at
   `/.netlify/images?url=_astro%2Fme.D44fd81e.webp&fm=webp&w=275&h=275&dpl=…`
   — a *runtime re-encode of an already-WebP file*, 42,314 bytes on the wire.
   The static build optimises it once at build time:
   `▶ /_astro/me.D44fd81e_1hBdqr.webp (before: 41kB, after: 8kB)`. That is
   42,314 → 8,892 bytes, with no runtime service in the path. (Note: neither
   version emits a `srcset`, so the `sizes` attribute on the `<img>` is inert
   either way. That is not this plan's problem.)
2. **The dependency surface shrinks.** `@astrojs/netlify` pulls 33
   `@netlify/*` lock entries, `@vercel/nft`, a second `esbuild` and a second
   `vite` — 17 MB in `node_modules`. It is also the audit-reported path to the
   repo's only CRITICAL advisory (`tar`, via
   `@astrojs/netlify > @netlify/vite-plugin > @netlify/dev >
   @netlify/edge-functions-dev > @netlify/edge-bundler > tar`) plus HIGH `tmp`
   and HIGH `brace-expansion`. **Do not overclaim this**: other high advisories
   (`fast-uri` via `@astrojs/check`, `js-yaml` via `astro` itself, `devalue` via
   `svelte`) survive this change, and `tar` is also reachable via `astro-icon`,
   which plan 006 owns. Removing the adapter is a real reduction, not a
   clearance.
3. **`pnpm preview` starts working.** Today `pnpm preview` exits 1 with
   `[preview] The @astrojs/netlify adapter does not support the preview
   command.` — a script that can never succeed. Be accurate about the cost: this
   finding (DX-02) was **downgraded**, because `pnpm dev` already renders the
   full page locally and plan 001's Container-API tests already render it
   in-process. So this is a dead script coming back to life, not the unblocking
   of a workflow. It is a nice side effect, not a justification.

**The visitor-facing result must be identical**, with exactly two intended
differences: the canonical/`og:url`/OG-image values become the configured
`https://calvin.sg/` constants regardless of which host served the page, and the
portrait is a smaller prebuilt file instead of a runtime CDN URL. Nothing else
about the page's appearance or behaviour may change.

## Current state

### Files involved

- `astro.config.mjs` — 27 lines. Imports and configures the Netlify adapter and
  sets `output: "server"`.
- `package.json` — `"@astrojs/netlify": "^8.1.2"` sits in `dependencies`
  (line 18 at the planned-at commit). `"preview": "astro preview"` is declared
  and currently always fails.
- `src/layouts/BasicLayout.astro` — the only layout with request-derived head
  tags. **You will NOT edit this file in this plan** (plan 004 owns its
  defects); it is listed so you understand why the canonical assertion becomes
  possible.
- `tests/build-output.test.ts` — created by plan 001; you will extend it.
- There is **no `netlify.toml`** in the repo. Netlify's build settings live in
  the dashboard and were read with `netlify api getSite`: build command
  `pnpm build`, publish directory `dist`.
- `.netlify/` is gitignored. It holds build artifacts (`v1/`, `build/`,
  `functions-serve/`, `blobs-serve/`) **and `state.json`, which links this
  checkout to the Netlify site.** Never delete `state.json`.

### `astro.config.mjs` — full current content (27 lines)

```js
// astro.config.mjs:1-27
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import netlify from "@astrojs/netlify";
import robotsTxt from "astro-robots-txt";
import UnoCSS from "@unocss/astro";
import icon from "astro-icon";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  site: "https://calvin.sg/",
  integrations: [
    sitemap(),
    robotsTxt({
      sitemap: [
        "https://calvin.sg/sitemap-index.xml",
        "https://calvin.sg/sitemap-0.xml",
      ],
    }),
    UnoCSS({ injectReset: true }),
    icon(),
    svelte(),
  ],
  output: "server",
  adapter: netlify({ middlewareMode: 'edge' }),
});
```

Note this file uses **2-space indent and unquoted keys** — it does not follow the
4-space convention used in `src/`. Match the file you are editing.

### The request-derived head tags (read-only context)

```astro
// src/layouts/BasicLayout.astro:10
const image = `${Astro.url.origin}/preview.jpg`;
```

```astro
// src/layouts/BasicLayout.astro:47
    <meta property="og:url" content={Astro.url.origin}/>
```

```astro
// src/layouts/BasicLayout.astro:60
    <link href={Astro.url.href} rel="canonical"/>
```

Under `output: "static"` Astro resolves `Astro.url` at build time against
`site: "https://calvin.sg/"`, so `rel=canonical` becomes exactly
`METADATA.site_url`. **Do not "improve" these three lines here** — plan 004 owns
`BasicLayout.astro`.

### The analytics environment variable

```astro
// src/layouts/BasicLayout.astro:62
    <script defer src="https://cloud.umami.is/script.js" data-website-id={import.meta.env.UMAMI_ID}></script>
```

`import.meta.env.UMAMI_ID` is inlined by Vite **at build time in both output
modes**, so this is not a behaviour change — but it is the one value that only a
real deploy can confirm, so it is in the post-deploy checklist. `.env.example`
declares `UMAMI_ID`; the real value lives in the Netlify dashboard. It is a
public analytics website id, not a secret. **Do not copy any value of it into
code, tests, or commit messages.**

### Existing constants used by the new assertions

```ts
// src/lib/constants.ts:108-115 (inside METADATA)
    title: "Calvin - Founding Solutions Engineer | Road Cyclist | Enthusiastic Learner",
    description: "Building things at a startup, probably cycling when you find me. Join my 3000km cycling goal this year.",
    site_url: "https://calvin.sg/",
```

Neither string contains a character that HTML-escapes, so raw-string
`toContain` assertions are safe against them.

### One parsing quirk you must know about

`dist/index.html` will begin `<!DOCTYPE html><script type="module" src="/_astro/index.astro_astro_type_script_index_0_lang.…js"></script><html lang="en">`
— the `motion` bundle is hoisted **above** `<html>`. (Verified in the production
HTML; plan 003 removes that script.) When `linkedom` parses that, it treats the
`SCRIPT` as `documentElement` and leaves `document.body` empty.

**Consequence**: `doc.querySelector(...)` element queries work fine (plan 001's
suite already relies on this), but `document.body.textContent` does not. So in
this plan: use `querySelector` for elements and plain string `toContain` for
text — **never** `document.body.textContent` on `dist/index.html`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0; `0 errors` |
| Lint | `pnpm eslint` | exit 0 (2 pre-existing warnings tolerated) |
| Test | `pnpm test` | exit 0; **38 tests passed** |
| Build | `pnpm build` | exit 0; `Complete!` |
| Preview (newly working) | `pnpm preview` | serves `dist/` on `http://localhost:4321/` |

**Use `pnpm` for everything. Never `npm`.** (`packageManager` is pinned to
`pnpm@10.32.1`.)

## Scope

**In scope** (the only files you may create or modify):

- `astro.config.mjs` — remove the adapter import, the `adapter:` line, and
  switch `output`
- `package.json` — remove `@astrojs/netlify`, add `sharp` as a devDependency
- `pnpm-lock.yaml` — regenerated by pnpm
- `netlify.toml` (create)
- `tests/build-output.test.ts` — extend with 6 new assertions

**Out of scope** (do NOT touch, even though they look related):

- `src/layouts/BasicLayout.astro` — **plan 004 owns it.** Its `Astro.url`
  expressions become correct on their own under static output; rewriting them to
  `METADATA.site_url` here would produce identical bytes and collide with plan
  004's edits to the same file.
- `src/components/*.svelte`, `src/pages/index.astro`'s `motion` script,
  `src/layouts/Layout.astro` — **plan 003 owns them.** Svelte and `motion` stay
  installed and working through this plan.
- `uno.config.ts`, `postcss.config.cjs` — **plan 005 owns them.**
- `astro-icon`, `@iconify-json/*`, `eslint.config.js` — **plan 006 owns them.**
- `src/pages/robots.txt.ts` and the `robotsTxt()` integration in
  `astro.config.mjs` — there are two robots.txt producers and they disagree, but
  **plan 006 owns that**. Both emit `https://calvin.sg/sitemap-index.xml`, so
  plan 001's existing assertion stays green either way. Leave the
  `robotsTxt({...})` block in `astro.config.mjs` exactly as it is.
- `README.md`, `CLAUDE.md` — **plan 007 owns them.** `CLAUDE.md:25` currently
  says `pnpm preview` is unsupported and will become wrong after this plan. Do
  not fix it here; note it in your report.
- `.netlify/state.json` — Netlify CLI site linkage. Never delete.
- Any GitHub Actions workflow. **The maintainer explicitly declined a CI
  workflow on 2026-07-21** (recorded in project memory). Do not add `.github/`.

## Git workflow

- Branch: `refactor/002-prerender-static` off `main`.
- Conventional-commit messages, matching `git log` on this repo
  (`chore:`, `fix:`, `feat:`, `refactor:`). Suggested commits:
  1. `refactor: prerender to static output and drop the Netlify SSR adapter`
  2. `test: assert the static build emits dist/index.html and no SSR function`
  3. `chore: pin the Netlify build command to run checks and tests`
- Do **not** push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm plan 001 has landed

```bash
test -f tests/build-output.test.ts && test -f vitest.config.ts && echo ok
```

If this does not print `ok`, **STOP** — plan 001 is a hard prerequisite.

Then establish the green baseline before you change anything:

**Verify**: `pnpm test` → `Test Files  3 passed (3)` and `Tests  32 passed (32)`

### Step 2: Install `sharp` BEFORE touching the config

**This step is mandatory and non-obvious. Do it first.** The `@astrojs/netlify`
adapter supplies the image service that `astro:assets` uses. The moment you
remove it, Astro falls back to its default static image service, which requires
`sharp` to be installed explicitly. In the spike, skipping this produced a hard
build failure:

```
MissingSharp: Could not find Sharp. Please install Sharp (`sharp`) manually into your project…
```

Install it as a devDependency (it is build-time only; Netlify installs
devDependencies during builds):

```bash
pnpm add -D sharp
```

**Verify**: `pnpm ls sharp` → lists `sharp` (expect `0.35.x`), exit 0.

### Step 3: Switch `astro.config.mjs` to static output

Make exactly three edits to `astro.config.mjs`:

1. Delete line 3, `import netlify from "@astrojs/netlify";`
2. Change `output: "server",` to `output: "static",`
3. Delete the line `adapter: netlify({ middlewareMode: 'edge' }),`

Leave `site`, `sitemap()`, `robotsTxt({...})`, `UnoCSS({ injectReset: true })`,
`icon()` and `svelte()` untouched. The file must end up as **exactly** this
(25 lines, 2-space indent preserved):

```js
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import UnoCSS from "@unocss/astro";
import icon from "astro-icon";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  site: "https://calvin.sg/",
  integrations: [
    sitemap(),
    robotsTxt({
      sitemap: [
        "https://calvin.sg/sitemap-index.xml",
        "https://calvin.sg/sitemap-0.xml",
      ],
    }),
    UnoCSS({ injectReset: true }),
    icon(),
    svelte(),
  ],
  output: "static",
});
```

`static` is Astro's default, but keep it written out — it makes the intent
explicit to the next reader.

**Verify**:
```bash
grep -c "netlify" astro.config.mjs
```
→ `0`

### Step 4: Remove the adapter dependency and rebuild from a clean slate

```bash
pnpm remove @astrojs/netlify
rm -rf dist .netlify/v1 .netlify/build .netlify/functions-serve .netlify/blobs-serve
pnpm build
```

The `rm -rf` matters: `.netlify/v1/functions` is a *stale build artifact* from
the previous SSR build, and leaving it there would make Step 6's assertion pass
or fail for the wrong reason. **`.netlify/state.json` must survive** — it is the
Netlify CLI's link to the site, not a build output. Verify it did:

```bash
test -f .netlify/state.json && echo state-ok
```
→ `state-ok`

**Verify**, all four:
```bash
grep -c "@astrojs/netlify" package.json          # → 0
test -f dist/index.html && echo html-ok           # → html-ok
test -d .netlify/v1/functions && echo BAD || echo no-function   # → no-function
grep -o '_astro/me[^"]*' dist/index.html          # → e.g. _astro/me.D44fd81e_1hBdqr.webp
```

The build log should also now contain a line like
`▶ /_astro/me.<hash>.webp (before: 41kB, after: 8kB)` and must **not** contain
`Generated SSR Function` or `Enabling sessions with Netlify Blobs`.

If `pnpm build` fails with `MissingSharp`, you skipped Step 2 — run it now.

### Step 5: Confirm `pnpm preview` works again

```bash
pnpm preview > /tmp/preview-002.log 2>&1 &
PREVIEW_PID=$!
sleep 5
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4321/
kill $PREVIEW_PID
grep -c "does not support the preview command" /tmp/preview-002.log
```

**Verify**: the `curl` prints `200`, and the final `grep -c` prints `0`.

(If port 4321 is already taken, read the actual port from
`/tmp/preview-002.log` and curl that instead.)

### Step 6: Extend `tests/build-output.test.ts`

Open `tests/build-output.test.ts` (created by plan 001) and make two changes.

**6a.** Add `linkedom` to the imports at the top — it is already a devDependency
from plan 001. The import block becomes:

```ts
import {readFileSync, readdirSync, existsSync} from "node:fs";
import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

import {METADATA} from "../src/lib/constants";
```

**6b.** Append these two `describe` blocks to the end of the file, after the
existing `describe("dist/", …)` block. Do not modify the existing block.

```ts
/**
 * These assertions only became possible once `output: "static"` replaced the
 * Netlify SSR adapter (plan 002). Before that, `pnpm build` emitted no
 * `dist/index.html` at all — the page lived inside a 2.4 MB serverless function.
 *
 * NOTE: `dist/index.html` starts with a hoisted <script> above <html>, which
 * makes linkedom treat that script as documentElement and leaves document.body
 * empty. Element queries work; whole-document textContent does not. Assert text
 * with plain string `toContain` and elements with `querySelector`.
 */
describe("dist/index.html is prerendered", () => {
    const doc = () => parseHTML(read("dist/index.html")).document;

    it("is emitted by the build", () => {
        expect(existsSync("dist/index.html")).toBe(true);
    });

    it("carries the configured title and description", () => {
        const html = read("dist/index.html");
        expect(html).toContain(`<title>${METADATA.title}</title>`);
        expect(html).toContain(METADATA.description);
    });

    it("self-canonicalises to the configured site URL, not a request URL", () => {
        const href = doc().querySelector('link[rel="canonical"]')?.getAttribute("href");
        expect(href).toBe(METADATA.site_url);
    });

    it("serves the portrait as a build-emitted asset, not a runtime image CDN URL", () => {
        const src = doc().querySelector("main img")?.getAttribute("src") ?? "";
        expect(src).toMatch(/^\/_astro\//);
        expect(src).not.toContain(".netlify");
    });
});

describe("no on-demand rendering output", () => {
    it("emits no Netlify serverless or edge function", () => {
        expect(existsSync(".netlify/v1/functions"), "the SSR adapter is gone; no function may be emitted").toBe(false);
        expect(existsSync(".netlify/v1/edge-functions")).toBe(false);
    });

    it("emits no server bundle inside dist/", () => {
        expect(existsSync("dist/_worker.js")).toBe(false);
        expect(existsSync("dist/server")).toBe(false);
    });
});
```

Two things that will bite you if you deviate:

- **`METADATA.site_url` is `"https://calvin.sg/"` with a trailing slash**, and
  the emitted canonical is exactly that. `og:url` is *not* — it renders as
  `https://calvin.sg` with no trailing slash, because it comes from
  `Astro.url.origin`. Do not add an `og:url` equality assertion; it will fail
  and it is plan 004's business.
- **`dist/` must be freshly built** before these run. Plan 001's `globalSetup`
  (`tests/setup/build.ts`) already runs `pnpm build` once per suite, so
  `pnpm test` handles this. Do not run these with `SKIP_BUILD=1` against a stale
  SSR-era `dist/`.

**Verify**: `pnpm test` → `Test Files  3 passed (3)`, `Tests  38 passed (38)`

### Step 7: Create `netlify.toml`

There is no `netlify.toml` today and Netlify's build settings live only in the
dashboard, where they are already `command = pnpm build`, `publish = dist`
(read via `netlify api getSite`). Two reasons to pin them in the repo now:

1. **The deploy pipeline should run the new test suite, not just a build.** The
   maintainer explicitly declined a GitHub Actions CI workflow on 2026-07-21, so
   adding a second pipeline is out of the question. Reusing the pipeline that
   already exists is the whole point.
2. `pnpm test`'s `globalSetup` **already runs `pnpm build`**, so
   `pnpm check && pnpm test` is *one* build that additionally gates on
   typechecking and 38 assertions. No extra build, no new CI system.

The publish directory is unchanged from the dashboard value, so this is not a
cutover risk.

Create `netlify.toml` at the repo root with exactly this content:

```toml
# Pinned in the repo so the deploy pipeline runs the same gates a developer does.
# `pnpm test` builds the site itself (see tests/setup/build.ts globalSetup), so
# this is one build that also gates on typechecking and the assertion suite.
[build]
  command = "pnpm check && pnpm test"
  publish = "dist"
```

**Verify**:
```bash
test -f netlify.toml && pnpm check && pnpm test
```
→ exit 0, `0 errors`, `Tests  38 passed (38)`, and `dist/index.html` exists
afterwards (that is what Netlify will publish).

### Step 8: Re-run every gate

**Verify**, all four:
- `pnpm check` → `0 errors`
- `pnpm eslint` → exit 0 (the 2 pre-existing warnings about unused `colorText`
  in `src/components/Card/index.astro:18` and unused `index` in
  `src/components/IntroCard.astro:16` are expected — leave them alone)
- `pnpm build` → `Complete!`
- `pnpm test` → `Tests  38 passed (38)`

And confirm nothing outside scope moved:

```bash
git status --porcelain
```
→ lists only `astro.config.mjs`, `package.json`, `pnpm-lock.yaml`,
`netlify.toml`, `tests/build-output.test.ts`. **No file under `src/`.**

### Step 9: Hand off the deploy-preview checklist

You cannot verify production from this machine, and you must not deploy. Write
these four checks into your final report so the maintainer runs them on the
Netlify deploy preview before merging to `main`:

1. `curl -sI <preview-url>/` → the response should carry a cacheable
   `cache-control` and an `etag`, and must **not** show
   `cache-status: "Netlify Durable"; fwd=bypass`.
2. `curl -s <preview-url>/ | grep -o 'data-website-id="[^"]*"'` → the Umami id
   must be present and non-empty. This is the one value only a real Netlify
   build can confirm, because it is injected from the dashboard environment.
   **Do not paste the value into any file, commit, or report** — report only
   "present / non-empty".
3. `curl -s <preview-url>/ | grep -o 'src="[^"]*me[^"]*"'` → must be an
   `/_astro/…webp` path, not `/.netlify/images?…`.
4. Diff the preview HTML against production
   (`curl -s https://calvin.sg/`). The only expected differences are the asset
   hashes / `?dpl=` query strings, the portrait URL (item 3), and — on the
   preview host only — `og:url`, `og:image`, `twitter:image` and `canonical`
   now reading `https://calvin.sg…` instead of the preview origin. **That last
   one is the intended CORRECT-03 fix**, not a regression.

## Test plan

Extends `tests/build-output.test.ts` only; the other two suites from plan 001 are
untouched.

| Suite | Before | After | What the new tests catch |
|---|---|---|---|
| `tests/rendered-html.test.ts` | 12 | 12 | unchanged |
| `tests/constants.test.ts` | 16 | 16 | unchanged |
| `tests/build-output.test.ts` | 4 | **10** | a regression back to SSR output; a missing/renamed `dist/index.html`; head metadata dropped from the prerendered page; a request-derived canonical creeping back; the portrait reverting to a runtime image-CDN URL |

New tests, all in `tests/build-output.test.ts`, modelled structurally on that
file's existing `describe("dist/", …)` block:

1. `dist/index.html` exists (the single most load-bearing fact this plan
   changes).
2. `dist/index.html` contains `METADATA.title` and `METADATA.description`.
3. `link[rel=canonical]` equals `METADATA.site_url` exactly.
4. `main img[src]` starts with `/_astro/` and does not contain `.netlify`.
5. `.netlify/v1/functions` and `.netlify/v1/edge-functions` do not exist.
6. `dist/_worker.js` and `dist/server` do not exist.

Expected total after this plan: **38 passing tests**.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -c "netlify" astro.config.mjs` → `0`
- [ ] `grep -c '"@astrojs/netlify"' package.json` → `0`
- [ ] `grep -c '"output": *"static"\|output: "static"' astro.config.mjs` → `1`
- [ ] `pnpm ls sharp` lists `sharp` under devDependencies
- [ ] `pnpm build` exits 0 and `test -f dist/index.html` is **TRUE**
- [ ] `test -d .netlify/v1/functions` is **FALSE**
- [ ] `test -f .netlify/state.json` is **TRUE** (you did not delete the site link)
- [ ] `test -f netlify.toml` is **TRUE** and it contains `publish = "dist"`
- [ ] `pnpm check` exits 0 with `0 errors`
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0 and reports `Tests  38 passed (38)`
- [ ] `pnpm preview` serves `http://localhost:4321/` with HTTP 200
- [ ] `git status --porcelain` lists only `astro.config.mjs`, `package.json`,
      `pnpm-lock.yaml`, `netlify.toml`, `tests/build-output.test.ts`
- [ ] `plans/README.md` status row updated (unless a reviewer told you they
      maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- **`tests/build-output.test.ts` or `vitest.config.ts` does not exist.** Plan 001
  has not landed; this plan cannot be executed against a repo with no test
  suite.
- **`pnpm build` fails with anything other than `MissingSharp`.** `MissingSharp`
  has one known fix (Step 2). Any other failure means the static conversion hit
  something this plan did not anticipate — report the full error rather than
  reinstating the adapter, adding `prerender = true` exports, or introducing a
  different adapter.
- **`dist/index.html` is not emitted even though the build succeeded.** Something
  is still forcing on-demand rendering. Report it; do not go hunting through
  `src/`.
- **A test from plan 001 that was green in Step 1 turns red.** In particular:
  if `dist/robots.txt` or `dist/sitemap-index.xml` stops being emitted, or if
  `dist/_astro` suddenly contains more than one `.css` file, the static build has
  changed integration ordering in a way this plan did not predict. Report the
  exact failing assertion. **Do not edit a plan-001 assertion to make it pass.**
- **The new canonical assertion fails** because the emitted value is not exactly
  `https://calvin.sg/`. Report the actual value — do not "fix" it by editing
  `src/layouts/BasicLayout.astro`, which is out of scope and owned by plan 004.
- **You conclude the fix requires touching anything under `src/`.** It does not.
  This plan changes configuration, dependencies and tests only.
- **`pnpm remove @astrojs/netlify` or `pnpm add -D sharp` cannot resolve**
  (offline / registry failure). `sharp` ships platform-specific optional
  binaries; if none installs for this platform, report it rather than switching
  to `--no-optional` or a different image service.
- **Anything tempts you to add a `.github/workflows/*.yml`.** The maintainer
  declined CI on 2026-07-21. `netlify.toml` is the entire CI story for this plan.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- **`netlify.toml` overrides the dashboard.** From now on, the deploy command
  lives in the repo. The dashboard's `pnpm build` / `dist` settings become
  inert for `command`, and `publish` is unchanged. If a future plan removes or
  renames `tests/setup/build.ts`'s `globalSetup`, **the Netlify build will stop
  producing `dist/` and deploys will fail with an empty publish directory** —
  at that point change the command to
  `pnpm check && pnpm test && pnpm build`.
- **`sharp` is now load-bearing, not optional.** Anyone who prunes
  devDependencies "because they are only dev tools" will break the production
  build with `MissingSharp`. It is the image optimiser for `astro:assets`.
- **What a reviewer should scrutinise**: the deploy preview, not the diff. The
  diff is five lines of config; the risk is entirely in how Netlify serves the
  result. Confirm items 1–4 of Step 9 on the preview URL before approving.
- **Plan 001's done criterion `grep -rn "dist/index.html" tests/` returns no
  matches is now intentionally void** — this plan is the one that introduces
  those assertions. Plan 001's own maintenance notes anticipate this.
- **Deliberately deferred out of this plan:**
  - Rewriting `Astro.url.origin` / `Astro.url.href` in
    `src/layouts/BasicLayout.astro` to read from `METADATA` (plan 004). After
    this plan they already produce the correct bytes, so the rewrite is
    clarity-only.
  - Removing Svelte, `motion` and the `.loader` overlay (plan 003) — the site
    still ships ~95 KB of client JS after this plan.
  - Replacing `astro-icon` (plan 006), which is the remaining path to the
    CRITICAL `tar` advisory. `pnpm audit` will still report
    `1 critical / 10 high` after this plan; that is expected, not a failure.
  - `CLAUDE.md:25` ("`pnpm preview` is not supported due to the Netlify adapter
    configuration") and `CLAUDE.md`'s "Edge middleware support" claim are both
    false after this plan. Plan 007 fixes the docs.
  - The `calvindotsg.netlify.app` deploy alias remains an indexable duplicate of
    `calvin.sg`. That is a Netlify dashboard redirect, not repo code, and no
    plan owns it. Worth a one-line note to the maintainer.
