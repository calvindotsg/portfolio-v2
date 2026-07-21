# Plan 005: Delete the dead configuration and template cruft

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **This plan is pure subtraction.** It deletes dead config, dead files and
> duplicate declarations. It must not add a feature, rename a component, or
> change what a visitor sees. The only intended visible change in the whole
> plan is one line disappearing from `/robots.txt` (see Step 3), and that line
> is redundant with the sitemap index it sits next to.
>
> **Drift check (run first)**:
> ```bash
> git diff --stat 4550e1f..HEAD -- uno.config.ts astro.config.mjs package.json src/layouts/BasicLayout.astro src/pages/robots.txt.ts postcss.config.cjs tsconfig.eslint.json jsx.d.ts .mcp.json
> ```
> Plans 001–004 have already landed, so **`astro.config.mjs`, `package.json` and
> `src/layouts/BasicLayout.astro` are expected to appear in that list** — those
> plans own those changes. What must **not** appear in that list is
> `uno.config.ts`, `src/pages/robots.txt.ts`, `postcss.config.cjs`,
> `tsconfig.eslint.json`, `jsx.d.ts` or `.mcp.json`. If any of those six shows a
> diff, compare the "Current state" excerpts below against the live files before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW — every deletion in this plan has been empirically proven to
  change zero bytes of emitted output, except the one intended `robots.txt`
  line and one duplicated CSS rule. Nothing here changes behaviour.
- **Depends on**: `plans/001-regression-safety-net.md`,
  `plans/002-*.md`, `plans/003-*.md`, `plans/004-*.md` — **all four must be
  merged to `main` before you start.** Plan 001 gives you the 32-test regression
  net this plan leans on; plans 002–004 have already rewritten
  `astro.config.mjs`, `package.json` and `src/layouts/BasicLayout.astro`.
- **Category**: tech-debt
- **Planned at**: commit `4550e1f`, 2026-07-21

## Why this matters

Roughly 47 of the 60 lines in `uno.config.ts` have no effect on a single byte of
emitted CSS, and one of them — a comment claiming to "narrow scope to specific
directories" — actively misdescribes what the block does. Alongside it sit four
tracked configuration files that declare nothing, a 110 KB PDF nothing imports, a
`robots.txt` with two competing producers that emit *different* content, and a
font stack written out three times in one stylesheet.

None of this is a bug a visitor can see. The cost is entirely on the reader: on a
~700-line single-page portfolio, every one of these artifacts must be opened,
evaluated, and dismissed before anyone can reason about the build. The
`robots.txt` duplication has already cost real time — a route was written in
2024 that has had zero effect in production ever since, because a 2023
integration silently overwrites it on every build.

After this plan the build configuration says only what is true, and every file
in the repo root does something.

## Current state

### Files this plan touches, and their role today

| File | Role today |
|---|---|
| `uno.config.ts` | 60 lines of UnoCSS config; ~47 of them dead (see audit below) |
| `astro.config.mjs` | registers the `astro-robots-txt` integration (one of two robots.txt producers) |
| `src/pages/robots.txt.ts` | the *other* robots.txt producer, emitting different content |
| `public/robots.txt` | **does not exist yet** — this plan creates it |
| `postcss.config.cjs` | declares `plugins: {}` — an empty PostCSS config |
| `tsconfig.eslint.json` | 3 lines; exists only to `include: ["jsx.d.ts"]`; nothing references it |
| `jsx.d.ts` | redefines the global `JSX.Element` as `HTMLElement`; nothing in `src/` uses it |
| `.mcp.json` | `{"mcpServers": {}}` — an empty Claude Code MCP config |
| `src/assets/Calvin_Loh_Solutions_Engineer_Resume.pdf` | 112,670 tracked bytes; nothing imports it |
| `src/layouts/BasicLayout.astro` | its `<style is:global>` block repeats one font stack three times |

### `uno.config.ts` as it exists at `4550e1f`

```ts
// uno.config.ts:1-13
// uno.config.ts
import {defineConfig, presetUno, presetWebFonts} from "unocss";

export default defineConfig({
    content: {
        filesystem: [
          // Narrow scope to specific directories
          "src/**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}}",
          "src/components/**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}}",
          "src/pages/**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}}",
          "src/layouts/**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}}"
        ],
    }, theme: {
```

```ts
// uno.config.ts:14-24
        boxShadow: {
            custom: `2px 2px 0`, "custom-hover": `1px 1px 0`,
        }, fontFamily: {
            sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", "sans-serif"],
            serif: ["Georgia", "serif"],
            mono: ["Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
        }, gridTemplateRows: {
            "auto-250": "repeat(auto-fill, 250px)",
        }, gridTemplateColumns: {
            "4-minmax": "repeat(4, minmax(150px, 1fr))",
        }, colors: {
```

```ts
// uno.config.ts:59-60
    }, presets: [presetUno(), presetWebFonts({})],
});
```

Between lines 24 and 58 sit three colour palettes: `gray` (10 shades),
`darkslate` (10 shades) and `primary` (9 shades).

### Why the `content.filesystem` block is dead — read this before you delete it

Every glob ends in a **doubled brace** (`…,astro}}`). After brace expansion those
patterns require a filename whose final character is a literal `}`, which no file
has. Run against `tinyglobby` — the exact resolver `@unocss/vite` uses — the
doubled-brace patterns match **0 files**; the single-brace versions match 17.

But that typo is *not* why the block has no effect, and this distinction matters:

- `content.filesystem` is an **additive include list**, not a scope limiter. In
  `@unocss/vite`, the whole filesystem extractor is guarded by
  `if (content?.filesystem)`; with the key absent it simply never runs, and
  UnoCSS's real default scanning (the Vite transform pipeline, a separate
  `content.pipeline` key) is untouched. So the block cannot "narrow" anything —
  its inline comment on line 7 is wrong.
- Fixing the typo would therefore produce **byte-identical CSS**, because all 17
  `src/` files already flow through the Vite transform.
- **Do NOT "fix" the globs instead of deleting them.** Commit `feb8e77` ("Fix
  EMFILE error, refine content scanning scope") introduced the doubled braces
  *replacing* a correctly-spelled glob, and the EMFILE crash went away precisely
  because the new globs match nothing. Restoring a correct glob restores the
  crash risk for zero benefit.

**The proof that both this block and `presetWebFonts({})` are dead**: in the
architecture spike, deleting the *entire* `content` block **and**
`presetWebFonts({})` produced a **byte-for-byte identical stylesheet** — 13,876
bytes, zero diff across the sorted rule list.

`presetWebFonts({})` is inert for its own reason: with no `fonts` entry, the
preset's `options.fonts || {}` yields an empty font list and an empty provider
list, so its preflight emits `""` and it makes no network request and no theme
extension.

### Theme-token usage audit (each row verified by grep at `4550e1f`)

| Token | Used? | Proof |
|---|---|---|
| `colors.gray.300` | **YES** | `bg-gray-300` on the progress-bar track |
| `colors.gray` — other 9 shades | no | no `*-gray-{50,100,200,400…900}` class anywhere in `src/` |
| `colors.darkslate.*` (10) | no | `grep -rnE "darkslate\|primary-" src/` hits **only `/* comments */`** in `src/layouts/BasicLayout.astro:105-115` |
| `colors.primary.*` (9) | no | same — comments only, never a class |
| `boxShadow.custom` | **YES** | `shadow-custom` ×2 (`Button.astro`, the theme toggle) |
| `boxShadow["custom-hover"]` | no | `grep -rn "custom-hover" src/` → nothing |
| `fontFamily.{sans,serif,mono}` | no | `grep -rnE "font-(sans\|serif\|mono)" src/` → nothing |
| `gridTemplateRows["auto-250"]` | no | `grep -rnE "auto-250\|4-minmax" src/` → nothing |
| `gridTemplateColumns["4-minmax"]` | no | same |

`colors.gray.300` overrides the preset's stock `#d1d5db` with `#D4D4D4`, and it
is the sole consumer of the whole `colors` block. **It must be preserved**, or
the progress-bar track visibly changes shade.

### `presetUno` is deprecated

`pnpm check` at `4550e1f` reports exactly two `ts(6385)` hints, both for
`presetUno`:

```
uno.config.ts:2:23  - warning ts(6385): 'presetUno' is deprecated.
uno.config.ts:59:18 - warning ts(6385): 'presetUno' is deprecated.
```

`presetWind3` is the drop-in successor. This is provably a no-op swap — in
`@unocss/preset-uno@66.6.8`, `presetUno` is literally:

```js
const presetUno = definePreset((options = {}) => {
    return { ...presetWind3(options), name: "@unocss/preset-uno" };
});
```

i.e. `presetWind3` with a different `name` field. **Do NOT use `presetWind4`** —
it is a genuinely different preset with different generated CSS, and switching to
it is out of scope.

### The trap that will turn `pnpm check` red if you do this in the wrong order

`presetWebFonts` widens `theme.fontFamily`'s type. With the preset removed but
the `fontFamily` block still present, `pnpm check` reports **three new errors**:

```
ts(2322): Type 'string[]' is not assignable to type 'string'.
```

one for each of `sans`, `serif` and `mono`. They are pre-existing type errors the
preset had been masking. **Deleting the dead `fontFamily` block resolves all
three.** Do the whole `uno.config.ts` rewrite as one edit (Step 2) — do not
remove the preset first and the theme second.

### The two robots.txt producers

```mjs
// astro.config.mjs:4
import robotsTxt from "astro-robots-txt";
```

```mjs
// astro.config.mjs:15-20
    robotsTxt({
      sitemap: [
        "https://calvin.sg/sitemap-index.xml",
        "https://calvin.sg/sitemap-0.xml",
      ],
    }),
```

```ts
// src/pages/robots.txt.ts:1-16
import type {APIRoute} from 'astro';

const robotsTxt = `
User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', import.meta.env.SITE).href}
`.trim();

export const GET: APIRoute = () => {
    return new Response(robotsTxt, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
};
```

The integration emits **two** `Sitemap:` lines; the route emits **one**. Which one
lands in `dist/robots.txt` depends on build ordering — the integration runs on
`astro:build:done`, i.e. after page generation, so on a *successful* build it
overwrites the route's output. When a build fails partway, the route's version
survives. Production today serves the integration's 109-byte version:

```
User-agent: *
Allow: /
Sitemap: https://calvin.sg/sitemap-index.xml
Sitemap: https://calvin.sg/sitemap-0.xml
```

Note on framing: `astro-robots-txt` is genuinely unmaintained (v1.0.0, last
published 2023-09-08, its own devDependency pins `astro: ^3.0.11` against this
repo's `^7.1.3`, and it declares no peer dependency on Astro). But removing it
does **not** de-duplicate `zod` from the tree, as was once claimed — `zod@3` also
arrives via `@netlify/zip-it-and-ship-it`. The reason to remove it is that a
static text file needs no dependency and no code, not that it is dragging in
weight.

### The four dead config files

```js
// postcss.config.cjs (whole file)
// postcss.config.cjs
module.exports = {
  plugins: {},
};
```
`grep -rln postcss` across the repo (excluding `node_modules`, `dist`, `.astro`,
`.netlify`) matches only this file and `pnpm-lock.yaml`. UnoCSS runs as a Vite
plugin, not a PostCSS one. A build with this file removed emits a
**byte-identical** stylesheet (same content hash).

```json
// tsconfig.eslint.json (whole file)
{
  "extends": "./tsconfig.json",
  "include": ["jsx.d.ts"]
}
```
`grep -rn "tsconfig.eslint"` returns **zero** hits, and `eslint.config.js` sets no
`parserOptions.project`, so nothing ever loads it.

```ts
// jsx.d.ts (whole file)
import "astro/astro-jsx";

declare global {
  namespace JSX {
    // type Element = astroHTML.JSX.Element // We want to use this, but it is defined as any.
    type Element = HTMLElement;
    interface IntrinsicElements extends astroHTML.JSX.IntrinsicElements {}
  }
}
```
`grep -rn "JSX" src/` returns **zero** hits. This file is **inert**, not harmful:
`astro check` produces a diagnostic-identical result with and without it (same
diagnostics; only the file count drops by one), because Astro typechecks `.astro`
templates through `astroHTML.JSX`, not through the global `JSX` namespace this
file declares. `tsconfig.eslint.json` exists only to include it, so the two go
together.

```json
// .mcp.json (whole file)
{
  "mcpServers": {}
}
```
Emptied by commit `033f2ea` ("chore(mcp): drop unused sequential-thinking +
context7 MCP servers"), leaving a residual shell. Claude Code treats an absent
`.mcp.json` and an empty one identically.

### The orphaned resume PDF

`src/assets/Calvin_Loh_Solutions_Engineer_Resume.pdf` is 112,670 bytes, tracked
(added by `47a3d96`, 2025-08-24), and `grep -rn "Calvin_Loh" src/ public/
README.md CLAUDE.md` returns **zero** hits. The resume the site actually links is
`public/resume.pdf`:

```ts
// src/lib/constants.ts:16
    {link: "/resume.pdf", logo: "ri:file-pdf-2-line", name: "Resume"},
```

Git history is unambiguous about which is current: the link was originally added
pointing at `/src/assets/Calvin_Loh_Solutions_Engineer_Resume.pdf` (a path Astro
never serves), fixed the same day in `9ece4c6`, and `public/resume.pdf` has been
revised three times since (2025-09-24 ×2, 2025-10-16) while the `src/assets` blob
has not been touched since 2025-08-24. **This is housekeeping, not a hazard** —
do not "compare the two PDFs and keep the newer one". Delete the orphan.

Note honestly what this does and does not buy: the working tree shrinks by 110 KB.
The blob stays in git history, so `git clone` still downloads it. No history
rewrite is in scope.

### The triplicated font stack

```css
/* src/layouts/BasicLayout.astro:74-94 (line numbers at 4550e1f; plans 002–004
   have shifted them — locate by content, not by number) */
    body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", Ubuntu, Cantarell, "Fira Sans", "Droid Sans", Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        background-color: var(--background);
        color: var(--text);
        transition: background-color 0.3s ease, color 0.3s ease;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", Ubuntu, Cantarell, "Fira Sans", "Droid Sans", Helvetica, Arial, sans-serif;
    }

    p {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", Ubuntu, Cantarell, "Fira Sans", "Droid Sans", Helvetica, Arial, sans-serif;
    }
```

The `h1..h6` and `p` declarations are provably redundant. `astro.config.mjs`
enables `UnoCSS({injectReset: true})`, and `@unocss/reset/tailwind.css` sets
`font-family` on only three selector groups: `html,:host` (line 37),
`code,kbd,samp,pre` (line 116), and `button,input,optgroup,select,textarea`
(`font-family: inherit`, line 173). Its `h1..h6` rule resets `font-size` and
`font-weight` only, and it has no `p` rule at all. So headings and paragraphs
inherit from `body` either way, and the two extra declarations are inert.

`uno.config.ts:17` holds a fourth, slightly drifted copy (`Helvetica Neue`
instead of `Helvetica, Arial`) which emits no CSS at all — Step 2 deletes it.

The minifier already merges the two redundant declarations into a single rule in
the built stylesheet:

```
h1,h2,h3,h4,h5,h6,p{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica,Arial,sans-serif}
```

That is **153 bytes**, and it is the *entire* expected CSS delta of Step 7.

### Repo conventions to match

- 4-space indentation in `.ts` and `.astro`, double quotes, semicolons.
- `uno.config.ts` uses brace-hugging import style: `import {a, b} from "x";`.
- Conventional commits — see `git log`: `chore: prune dead template dependencies
  ahead of the Astro 7 sync (#25)`, `fix(constants): remove thousands separator
  breaking the build`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0 (pre-existing warnings tolerated) |
| Tests | `pnpm test` | exit 0, `Tests  32 passed (32)` |
| Build | `pnpm build` | exit 0, `Complete!` |
| Remove a dep | `pnpm remove astro-robots-txt` | exit 0 |

**Use `pnpm` for everything. Never `npm`.** (`packageManager` is pinned to
`pnpm@10.32.1`.)

### The stylesheet-comparison command (used repeatedly — read this once)

Several steps require proving that a deletion changed **zero** CSS. The built
stylesheet is minified onto one line and its filename is content-hashed, so a
plain `diff` is useless. Use this: it asserts there is exactly one stylesheet,
splits it into rules, sorts them so rule *ordering* changes don't create noise,
and writes the result to a labelled file outside the repo.

```bash
snapshot_css() {
  node -e '
    const fs = require("node:fs"), d = "dist/_astro";
    const f = fs.readdirSync(d).filter((x) => x.endsWith(".css"));
    if (f.length !== 1) throw new Error("expected exactly 1 stylesheet, got " + f.length);
    const css = fs.readFileSync(d + "/" + f[0], "utf8");
    const rules = css.split("}").map((s) => s.trim()).filter(Boolean).sort().join("\n");
    fs.writeFileSync(process.argv[1], rules + "\n");
    console.log(f[0], fs.statSync(d + "/" + f[0]).size, "bytes,", rules.split("\n").length, "rules");
  ' "$1"
}
```

Paste that function into your shell once (it is a throwaway helper — **do not
commit it to the repo**), then use it as `pnpm build && snapshot_css
/tmp/plan005-<label>.rules`, and compare snapshots with
`diff /tmp/plan005-a.rules /tmp/plan005-b.rules`.

If defining a shell function is awkward in your environment, inline the same
`node -e '…' /tmp/plan005-<label>.rules` command directly instead. The `/tmp`
files are deliberately outside the repository so `git status` stays clean.

## Scope

**In scope** (the only files you may create, modify or delete):

- `uno.config.ts` — rewrite (Step 2)
- `public/robots.txt` — **create** (Step 3)
- `src/pages/robots.txt.ts` — **delete** (Step 3)
- `astro.config.mjs` — remove *only* the `astro-robots-txt` import and its
  integration entry (Step 3)
- `package.json` + `pnpm-lock.yaml` — *only* via `pnpm remove astro-robots-txt` (Step 3)
- `postcss.config.cjs` — **delete** (Step 4)
- `.mcp.json` — **delete** (Step 4)
- `tsconfig.eslint.json` — **delete** (Step 5)
- `jsx.d.ts` — **delete** (Step 5)
- `src/assets/Calvin_Loh_Solutions_Engineer_Resume.pdf` — **delete** (Step 6)
- `src/layouts/BasicLayout.astro` — remove *only* the `h1..h6` and `p`
  `font-family` declarations from `<style is:global>` (Step 7)

**Out of scope** (do NOT touch, even though they look related):

- **`@typescript-eslint/parser` in `package.json` — do NOT remove it.** It looks
  unused (`grep -n "typescript-eslint" eslint.config.js` returns nothing) and a
  previous audit proposed removing it. That audit was **refuted**.
  `eslint-plugin-astro` resolves the parser at lint time via
  `createRequire(path.join(process.cwd(), "__placeholder__.js"))("@typescript-eslint/parser")`
  and then switches its processor on whether it resolved
  (`processor: hasTypescriptEslintParser ? "astro/client-side-ts" : "astro/astro"`).
  Removing it was reproduced empirically and takes `pnpm eslint` from 0 errors to
  **6 parse errors** (`Parsing error: The keyword 'interface' is reserved`,
  `Parsing error: Unexpected token as`), because `.astro` frontmatter is
  TypeScript.
- **`@unocss/reset` in `package.json` — do NOT remove it.** `@unocss/astro`
  injects the bare specifier `import "@unocss/reset/tailwind.css"` into a virtual
  module resolved from the **project root**, and pnpm's isolated linker only puts
  `@unocss/reset` on the root resolution path because it is a direct
  devDependency. Removing it breaks the reset.
- `astro-icon`, `@iconify-json/fa6-brands`, `@iconify-json/ri`, and any
  `presetIcons` / `safelist` addition to `uno.config.ts` — **plan 006 owns them.**
  Leave `astro-icon` registered in `astro.config.mjs`.
- `README.md`, `CLAUDE.md`, `public/llms.txt` — **plan 007 owns the docs.**
  `CLAUDE.md`'s "Styling System" section currently advertises "Predefined colors
  (gray, darkslate, primary), shadows, and grid templates"; Step 2 makes that
  stale, and plan 007 fixes the sentence. Do not edit it here.
- `public/resume.pdf` — this is the live resume. Keep it.
- `tsconfig.json` — keep as is (`include: ["**/*"]` is correct).
- `eslint.config.js`, `.husky/`, and the `lint-staged` glob in `package.json`.
- Everything plans 002–004 already changed: `output`/`adapter` in
  `astro.config.mjs`, the theme script, the JSON-LD block, the components under
  `src/components/`, `src/pages/index.astro`.
- **Do not "fix" the `uno.config.ts` globs instead of deleting them** — see
  "Current state"; the correctly-spelled glob is what caused the EMFILE crash
  that `feb8e77` was written to fix.
- **Do not switch to `presetWind4`.** `presetWind3` only.
- `tests/` — no test file needs to change in this plan. If you believe one does,
  that is a STOP condition.

## Git workflow

- Branch: `advisor/005-delete-dead-config-and-cruft`, cut from an up-to-date
  `main` that already contains plans 001–004.
- One commit per step, conventional-commit style. Suggested messages:
  - Step 2: `chore(unocss): delete dead content globs and unused theme tokens`
  - Step 3: `chore: serve a static robots.txt and drop astro-robots-txt`
  - Step 4: `chore: delete empty postcss and mcp configs`
  - Step 5: `chore: delete the unused jsx.d.ts shim and its tsconfig`
  - Step 6: `chore: delete the orphaned resume PDF in src/assets`
  - Step 7: `refactor(css): collapse the triplicated font stack onto body`
- Do **not** push or open a PR unless the operator instructed it.

## Steps

### Step 1: Establish the baseline

Confirm you are starting from a green tree, and capture the stylesheet you will
compare everything against.

```bash
pnpm install
pnpm check
pnpm eslint
pnpm test
pnpm build
snapshot_css /tmp/plan005-baseline.rules
```

Also record the pre-existing `robots.txt` for comparison in Step 3:

```bash
cp dist/robots.txt /tmp/plan005-robots-before.txt
```

**Verify**, all of:
- `pnpm check` → `0 errors`
- `pnpm test` → `Tests  32 passed (32)`
- `pnpm build` → exit 0
- `snapshot_css` prints exactly one filename and a rule count (no "expected
  exactly 1 stylesheet" error)
- `git status --porcelain` → empty

If `pnpm test` is not green **before you change anything**, stop — see STOP
conditions.

### Step 2: Rewrite `uno.config.ts`

First, re-prove the two token facts this step depends on, on the *current* code
(plans 002–004 rewrote the components, so re-run these rather than trusting the
table above):

```bash
grep -rnE '\b(bg|text|border|from|via|to|ring|divide|outline|accent|caret|shadow)-gray-[0-9]{2,3}' src/
grep -rn "custom-hover" src/
grep -rnE "font-(sans|serif|mono)" src/
grep -rnE "auto-250|4-minmax" src/
grep -rn "shadow-custom" src/
```

Expected:
- the first grep prints **exactly one match**, and it is `bg-gray-300` on the
  progress-bar track;
- `custom-hover`, `font-sans|serif|mono`, `auto-250|4-minmax` each print
  **nothing** (exit 1);
- `shadow-custom` prints **at least one** match.

If the first grep shows any gray shade other than `300`, that shade must be kept
too — add it to the `colors.gray` object below rather than dropping it.

Now replace the **entire contents** of `uno.config.ts` with exactly:

```ts
import {defineConfig, presetWind3} from "unocss";

export default defineConfig({
    theme: {
        boxShadow: {custom: "2px 2px 0"},
        colors: {gray: {300: "#D4D4D4"}},
    },
    presets: [presetWind3()],
});
```

That is 60 lines → 9. What went and why:
- `content.filesystem` — additive include list whose globs match zero files;
  removing it is a proven no-op.
- `presetWebFonts({})` — no fonts configured, emits nothing.
- `presetUno()` → `presetWind3()` — `presetUno` is `presetWind3` with a different
  `name`; this clears both `ts(6385)` hints.
- `boxShadow["custom-hover"]`, `fontFamily`, `gridTemplateRows`,
  `gridTemplateColumns`, `colors.darkslate`, `colors.primary`, and the nine
  unused `colors.gray` shades — no class in `src/` references any of them.
- `colors.gray.300` and `boxShadow.custom` are **kept** because they are used.

`colors: {gray: {300: …}}` is a partial override: UnoCSS deep-merges it over the
preset palette, so `gray-50`…`gray-900` still resolve (to stock values) if anyone
adds one later.

**Verify**, in order:

1. `pnpm check` → `0 errors`, and **no `ts(6385)` and no `ts(2322)` lines**:
   ```bash
   pnpm check 2>&1 | grep -E "ts\(6385\)|ts\(2322\)" ; echo "exit=$?"
   ```
   → prints nothing, `exit=1`.

   *If you see three `ts(2322): Type 'string[]' is not assignable to type
   'string'` errors, you removed `presetWebFonts` but kept the `fontFamily`
   block. Delete `fontFamily`; the errors go away.*

2. The stylesheet is unchanged:
   ```bash
   pnpm build && snapshot_css /tmp/plan005-after-uno.rules
   diff /tmp/plan005-baseline.rules /tmp/plan005-after-uno.rules
   ```
   → **no output**, exit 0. A zero-line diff is the whole point of this step.

3. `pnpm test` → `Tests  32 passed (32)`
4. `wc -l uno.config.ts` → `9`

### Step 3: Replace both robots.txt producers with one static file

**3a.** Create `public/robots.txt` with exactly these 69 bytes (4 lines, blank
line third, trailing newline):

```
User-agent: *
Allow: /

Sitemap: https://calvin.sg/sitemap-index.xml
```

**3b.** Delete the route:
```bash
git rm src/pages/robots.txt.ts
```

**3c.** In `astro.config.mjs`, delete the import line and the integration entry.
Locate them by content (plan 002 has shifted the line numbers):

- delete the line `import robotsTxt from "astro-robots-txt";`
- delete the whole `robotsTxt({ … })` entry from the `integrations` array,
  including its two hard-coded sitemap URLs

Leave every other integration (`sitemap()`, `UnoCSS(...)`, `icon()`, and anything
plans 002–004 left there) untouched.

**3d.** Drop the dependency:
```bash
pnpm remove astro-robots-txt
```

**Why a static file rather than keeping one of the two producers**: it is zero
dependencies and zero logic, and `public/` is copied verbatim into `dist/` in
both static and server output modes, so it cannot be shadowed or overwritten by
anything.

**Intended visible change**: `dist/robots.txt` loses the
`Sitemap: https://calvin.sg/sitemap-0.xml` line. This is deliberate and harmless
— `sitemap-index.xml` already lists `sitemap-0.xml`, and every crawler follows
the index. It is the only visitor-observable change in this plan.

**Verify**, all of:

```bash
grep -rn "astro-robots-txt" astro.config.mjs package.json ; echo "exit=$?"
```
→ prints nothing, `exit=1`.

```bash
test ! -f src/pages/robots.txt.ts && echo ok
```
→ `ok`

```bash
pnpm build
wc -c dist/robots.txt
cat dist/robots.txt
```
→ `69` bytes, and the four lines above verbatim.

```bash
diff /tmp/plan005-robots-before.txt dist/robots.txt
```
→ exactly one deleted line: `< Sitemap: https://calvin.sg/sitemap-0.xml`
(plus whitespace-line differences from the blank line). Nothing else may differ.

```bash
pnpm test
```
→ `Tests  32 passed (32)`. This is the load-bearing check for this step: plan
001's `tests/build-output.test.ts` asserts `dist/robots.txt` exists, matches
`/User-agent:\s*\*/`, contains `Sitemap:`, and contains
`new URL("sitemap-index.xml", METADATA.site_url).href` — i.e.
`https://calvin.sg/sitemap-index.xml`. The new static file satisfies all four.
**If that test fails, you got the file contents wrong — fix the file, never the
test.**

Also confirm the stylesheet did not move:
```bash
snapshot_css /tmp/plan005-after-robots.rules
diff /tmp/plan005-after-uno.rules /tmp/plan005-after-robots.rules
```
→ no output.

### Step 4: Delete `postcss.config.cjs` and `.mcp.json`

```bash
git rm postcss.config.cjs .mcp.json
```

`postcss.config.cjs` declares zero plugins and nothing in the repo references
PostCSS; a build without it was verified to emit a byte-identical stylesheet with
the same content hash. `.mcp.json` is an empty Claude Code MCP config — a
residual shell left by commit `033f2ea`, which removed the last server; Claude
Code treats absent and empty identically.

**Verify**:

```bash
grep -rln "postcss" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=.astro --exclude-dir=.netlify .
```
→ only `pnpm-lock.yaml` (that hit is `eslint-plugin-astro`'s own transitive
`postcss` dependency, unrelated to this config).

```bash
pnpm build && snapshot_css /tmp/plan005-after-configs.rules
diff /tmp/plan005-after-robots.rules /tmp/plan005-after-configs.rules
```
→ no output.

```bash
pnpm check && pnpm test
```
→ `0 errors`; `Tests  32 passed (32)`.

### Step 5: Delete `jsx.d.ts` and `tsconfig.eslint.json`

These two go together: `tsconfig.eslint.json` exists solely to `include:
["jsx.d.ts"]`, and nothing loads `tsconfig.eslint.json` in the first place.

```bash
git rm jsx.d.ts tsconfig.eslint.json
```

**Verify**:

```bash
grep -rn "tsconfig.eslint" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . ; echo "exit=$?"
grep -rn "JSX" src/ ; echo "exit=$?"
```
→ both print nothing, `exit=1` each.

```bash
pnpm check
```
→ `0 errors`. The reported **file count drops by exactly one** versus Step 4's
run (that one file is `jsx.d.ts` itself) and the diagnostic list is otherwise
identical. If any *new* diagnostic appears, stop — see STOP conditions.

```bash
pnpm eslint && pnpm test
```
→ exit 0 (pre-existing warnings only); `Tests  32 passed (32)`.

### Step 6: Delete the orphaned resume PDF

```bash
git rm src/assets/Calvin_Loh_Solutions_Engineer_Resume.pdf
```

Do **not** touch `public/resume.pdf` — that is the file
`src/lib/constants.ts` links, and the one that has actually been kept up to date.

**Verify**:

```bash
grep -rn "Calvin_Loh" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . ; echo "exit=$?"
```
→ prints nothing, `exit=1`.

```bash
pnpm build
test -f dist/resume.pdf && echo ok
find dist -iname "*.pdf"
```
→ `ok`; `find` lists exactly `dist/resume.pdf`.

```bash
pnpm test
```
→ `Tests  32 passed (32)` (plan 001 asserts `dist/resume.pdf` exists).

### Step 7: Collapse the triplicated font stack

In `src/layouts/BasicLayout.astro`'s `<style is:global>` block, delete the two
redundant rules — the `h1, h2, h3, h4, h5, h6 { font-family: … }` rule and the
`p { font-family: … }` rule — in full, braces included. **Leave the `body` rule
exactly as it is**, including its `font-family` line; headings and paragraphs
inherit from it.

Locate them by content:
```bash
grep -n "font-family" src/layouts/BasicLayout.astro
```
→ before the edit: **3** matches. After the edit: **1** match, and it is the one
inside the `body { … }` rule.

Do not touch the `b { font-weight: 700 !important; }` rule that follows, the
theme-variable blocks, or anything plans 002–004 added to this `<style>` block.

**Verify**:

```bash
grep -c "font-family" src/layouts/BasicLayout.astro
```
→ `1`

```bash
pnpm build && snapshot_css /tmp/plan005-final.rules
diff /tmp/plan005-after-configs.rules /tmp/plan005-final.rules
```
→ **exactly one deleted line and nothing else**:

```
< h1,h2,h3,h4,h5,h6,p{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica,Arial,sans-serif}
```

(The minifier merges the two source rules into that one 153-byte rule, which is
why the delta is a single line rather than two. The stylesheet shrinks by ~153
bytes.) The `body{…font-family:-apple-system,…}` rule must still be present in
`/tmp/plan005-final.rules` — confirm with:

```bash
grep -c "^body{.*apple-system" /tmp/plan005-final.rules
```
→ `1`

If the diff shows any *other* changed rule, or if the `body` rule lost its
`font-family`, revert the edit and stop.

```bash
pnpm check && pnpm eslint && pnpm test
```
→ `0 errors`; exit 0; `Tests  32 passed (32)`.

### Step 8: Final gate and scope audit

```bash
pnpm install
pnpm check
pnpm eslint
pnpm test
pnpm build
git status --porcelain
```

**Verify**:
- `pnpm check` → `0 errors`
- `pnpm test` → `Tests  32 passed (32)`
- `pnpm build` → exit 0
- `git status --porcelain` lists **only** the files named in "In scope" — nothing
  else, and no stray `/tmp` helper files inside the repo.
- Whole-plan CSS delta is one rule:
  ```bash
  diff /tmp/plan005-baseline.rules /tmp/plan005-final.rules
  ```
  → exactly one `<` line, the `h1,h2,h3,h4,h5,h6,p{font-family:…}` rule. Nothing
  added, nothing else removed.

## Test plan

**No new tests.** This plan removes code; it does not add behaviour that needs
covering, and plan 001's suite already asserts everything at risk here. Adding
tests for deleted files would be dead weight.

The load-bearing existing assertions, and what each one protects in this plan:

| Existing test (from plan 001) | Protects |
|---|---|
| `tests/build-output.test.ts` → "emits a robots.txt that points crawlers at the sitemap" | Step 3 — the new `public/robots.txt` must still match `/User-agent:\s*\*/`, contain `Sitemap:`, and contain `https://calvin.sg/sitemap-index.xml` |
| `tests/build-output.test.ts` → "emits exactly one stylesheet" | Steps 2, 4, 7 — the UnoCSS and PostCSS config deletions must not split or duplicate the stylesheet |
| `tests/build-output.test.ts` → "copies the public assets the page links to" | Step 6 — `dist/resume.pdf` must survive deleting the `src/assets` orphan |
| `tests/build-output.test.ts` → "emits a sitemap index referencing the deployed origin" | Step 3 — removing `astro-robots-txt` must not disturb `@astrojs/sitemap` |
| `tests/rendered-html.test.ts` (all 12) | Steps 2 and 7 — the page still renders all configured content after the theme prune and the CSS edit |

Beyond the suite, the **sorted-rule stylesheet diff** described in "Commands you
will need" is this plan's primary evidence: it is what turns "I deleted 47 lines
of config" into "I proved those 47 lines emitted nothing".

Verification: `pnpm test` → `Test Files  3 passed (3)`, `Tests  32 passed (32)`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0 and reports `0 errors`
- [ ] `pnpm check 2>&1 | grep -E "ts\(6385\)|ts\(2322\)"` returns **no matches**
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0 and reports `Tests  32 passed (32)`
- [ ] `pnpm build` exits 0
- [ ] `wc -l uno.config.ts` → `9`
- [ ] `grep -rn "presetUno\|presetWebFonts\|filesystem\|darkslate\|custom-hover\|auto-250\|4-minmax" uno.config.ts` returns **no matches**
- [ ] `grep -rn "presetWind4" uno.config.ts` returns **no matches**
- [ ] `grep -rn "astro-robots-txt" astro.config.mjs package.json` returns **no matches**
- [ ] `test -f public/robots.txt && wc -c public/robots.txt` → `69`
- [ ] `test ! -f src/pages/robots.txt.ts` succeeds
- [ ] `test ! -f postcss.config.cjs && test ! -f tsconfig.eslint.json && test ! -f jsx.d.ts && test ! -f .mcp.json` succeeds
- [ ] `test ! -f src/assets/Calvin_Loh_Solutions_Engineer_Resume.pdf` succeeds
- [ ] `test -f public/resume.pdf` succeeds
- [ ] `grep -c "font-family" src/layouts/BasicLayout.astro` → `1`
- [ ] `grep -n "@typescript-eslint/parser" package.json` still returns a match (it must NOT be removed)
- [ ] `grep -n "@unocss/reset" package.json` still returns a match (it must NOT be removed)
- [ ] `diff /tmp/plan005-baseline.rules /tmp/plan005-final.rules` shows exactly one removed rule, the merged `h1,h2,h3,h4,h5,h6,p{font-family:…}` rule
- [ ] `git status --porcelain` lists only files from the "In scope" list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- **`pnpm test` is not already 32/32 green before Step 2.** This plan's entire
  safety argument is that the suite is green before and after. If it is red on
  arrival, plans 001–004 have not all landed, or something else is broken; that
  is not yours to fix.
- **The stylesheet rule-diff in Step 2, 3, 4 or 6 is non-empty.** Those steps are
  proven no-ops for CSS. A non-empty diff means a token you deleted *was* in use,
  or `presetWind3` is not behaving as `presetUno` did in this version. Report the
  diff verbatim; do not "just add the token back and move on" without saying so.
- **The first grep in Step 2 shows a gray shade other than `300`, or shows zero
  matches.** Zero matches means the progress-bar markup changed and you should
  confirm what replaced it before dropping `colors.gray` entirely.
- **`pnpm check` reports `ts(2322): Type 'string[]' is not assignable to type
  'string'` and deleting the `fontFamily` block does not clear it.**
- **Step 5's `pnpm check` produces any diagnostic that was not present in Step
  4's run** (other than the file count dropping by one).
- **`pnpm eslint` starts reporting `Parsing error:` anything.** That is the
  signature of `@typescript-eslint/parser` having gone missing. Restore it
  immediately (`pnpm add -D @typescript-eslint/parser`) and report.
- **`dist/robots.txt` is not exactly the 69 bytes specified**, or plan 001's
  robots.txt test fails. Fix the file; never edit the test.
- **Any step appears to require touching a file in the "Out of scope" list** —
  in particular `astro-icon`, `README.md`, `CLAUDE.md`, `public/llms.txt`, or
  `tests/`.
- **You are tempted to make the site look or behave differently.** This plan is
  subtraction only. Any visual change other than the removed `robots.txt` line
  is a defect in your execution, not an improvement.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- **`public/robots.txt` now hard-codes `https://calvin.sg/sitemap-index.xml`.**
  It no longer derives from `METADATA.site_url` or `astro.config.mjs`'s `site`.
  If the domain ever changes, this file must be edited by hand — and plan 001's
  `tests/build-output.test.ts` will catch it, because that assertion is built
  from `METADATA.site_url`. That failing test is the intended alarm, not a bug.
- **`CLAUDE.md` is now stale in two places** and plan 007 fixes it: its "Styling
  System" section still advertises "Predefined colors (gray, darkslate, primary),
  shadows, and grid templates", and its Deployment section still lists
  "Robots.txt generation" as an integration feature. Left deliberately for 007.
- **`uno.config.ts` will grow again in plan 006**, which adds `presetIcons` and a
  `safelist` derived from `src/lib/constants.ts` in order to retire `astro-icon`.
  The 9-line file this plan produces is the base it builds on — keep the
  `presetWind3()` entry and the two theme tokens.
- **`colors.gray` is now a single-shade partial override.** If a future component
  uses another gray utility it will silently resolve to the UnoCSS stock palette
  rather than the old hand-written one. That is fine (they were never used), but
  worth knowing if a shade looks slightly off.
- **What a reviewer should scrutinise in the PR**: (1) that the sorted-rule CSS
  diff across the whole branch really is one line; (2) that `dist/robots.txt` is
  the 69-byte static file and not the integration's 109-byte output; (3) that
  `@typescript-eslint/parser` and `@unocss/reset` are still in `package.json`.
- **Deliberately deferred**: the 112,670-byte PDF blob remains in git history.
  Removing it needs a history rewrite (`git filter-repo` + a force push), which
  is far out of proportion to a 110 KB checkout saving on a solo repo. Not
  planned.
- **Also deliberately not done**: `@unocss/astro` could be replaced by
  `unocss/astro` (the `unocss` package already exports that path), collapsing one
  direct dependency. It is manifest golf with zero observable effect and was
  judged not worth a change.
