# Plan 006: Render icons with UnoCSS `presetIcons` and delete the `astro-icon` dependency

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4550e1f..HEAD -- src/components/IntroCard.astro src/components/Goal.astro src/components/Card/index.astro uno.config.ts astro.config.mjs package.json`
> Plans 001–005 have already landed, so this diff **will** be non-empty — that is
> expected. What matters is the *preflight* checks in Step 0: they assert the
> exact state this plan was written against. Run them before touching anything.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED — icon rendering changes from `<svg>` elements to CSS mask rules.
  The failure mode is silent (icons vanish or resize) rather than a build error,
  which is why this plan adds two assertions that make it loud.
- **Depends on**: `plans/001-regression-safety-net.md`, `002`, `003`, `004`, `005`.
  All must be merged to `main` first. Specifically:
  - **001** created `tests/` and the `pnpm test` script that this plan extends.
  - **005** minimised `uno.config.ts` and switched `presetUno()` → `presetWind3()`;
    this plan edits that minimised file.
  - **004** deleted the dead `href` branch in `src/components/Card/index.astro`,
    which contained the repo's only *static* `<Icon>` reference.
- **Category**: security / tech-debt
- **Planned at**: commit `4550e1f`, 2026-07-21

## Why this matters

`astro-icon` is an 84 KB package that pulls `@iconify/tools` (2.0 MB) and
`cheerio` (1.5 MB) into the install graph. Once plans 002–003 have removed the
Netlify adapter and Svelte, that subtree becomes the **last remaining path** to
the single `critical` advisory `pnpm audit` reports (`tar`, decompression DoS,
reached via `astro-icon > @iconify/tools > tar`) and the only path to three `high`
`undici` advisories (via `@iconify/tools > cheerio > undici`).

Be precise about what this buys, because the original audit finding overstated it
and was downgraded on review: **none of these advisories is reachable at runtime.**
This site renders author-authored constants and, after plan 002, deploys as static
files with no server. The exposure is *build-time and developer-machine* supply
chain — code that executes during `pnpm install` / `pnpm build` on the maintainer's
laptop and in the Netlify build container that holds the deploy credentials. That
is worth reducing; it is not a live vulnerability, and this plan must not be
described as fixing one.

The replacement costs nothing: `unocss` is **already a direct dependency**, and it
ships `presetIcons`, which reads the *same* `@iconify-json/*` collections (pure
JSON packages, zero transitive dependencies) and emits each icon as a CSS mask
rule. No runtime component, no extra integration, one fewer direct dependency.

Measured on the validated prototype: `pnpm audit` goes from `{critical: 1, high: 12}`
on the original `main` to `{critical: 0, high: 6, moderate: 4, low: 0}`, and every
survivor sits in a build/dev-only path (`@astrojs/check`, `eslint-plugin-jsx-a11y`,
`@typescript-eslint/parser`, and `astro` itself). Total installed packages drop to
772.

**Visitor-visible outcome: none.** The page must look and behave exactly as it did
before. Step 4 pins the icon geometry so that it does.

## Current state

### Files involved

- `src/components/IntroCard.astro` — renders the six social/resume buttons from
  `LINKS`; imports `Icon` from `astro-icon/components`.
- `src/components/Goal.astro` — renders the "Follow me" CTA button from
  `GOAL.cta_logo`; imports `Icon` from `astro-icon/components`.
- `src/components/Card/index.astro` — plan 004 removed its `href` branch and the
  `<Icon name="ri:arrow-right-up-line">` inside it. **It may still carry an
  orphaned `import {Icon} from "astro-icon/components";` on line 2** — Step 0
  tells you how to check, and Step 3 removes it if so.
- `src/components/Button.astro` — the `<button>` wrapper the icons live inside.
  You do **not** modify it, but its `text-xl` class is load-bearing for icon
  sizing (see Step 4).
- `uno.config.ts` — minimised by plan 005.
- `astro.config.mjs` — registers the `icon()` integration.
- `src/lib/constants.ts` — the single source of truth. `LINKS[].logo` and
  `GOAL.cta_logo` hold Iconify ids.
- `tests/rendered-html.test.ts`, `tests/build-output.test.ts` — created by plan 001.

### The icon ids, verified at `src/lib/constants.ts`

```ts
// src/lib/constants.ts:5-17
}[] = [{
    link: "https://github.com/calvindotsg/", logo: "fa6-brands:github", name: "Github"
}, {
    link: "https://www.linkedin.com/in/calvin-loh/", logo: "fa6-brands:linkedin", name: "LinkedIn"
}, {
    link: "https://www.instagram.com/calvindotsg/", logo: "fa6-brands:instagram", name: "Instagram"
}, {
    link: "https://www.strava.com/athletes/37641259/", logo: "fa6-brands:strava", name: "Strava"
}, {
    link: "https://t.me/calvindotsg/", logo: "fa6-brands:telegram", name: "Telegram"
}, {
    link: "/resume.pdf", logo: "ri:file-pdf-2-line", name: "Resume"
},];
```

```ts
// src/lib/constants.ts:76
    cta_logo: "fa6-brands:strava",
```

Seven references, **six distinct icons** — `fa6-brands:strava` appears twice (once
in `LINKS`, once as `GOAL.cta_logo`). Do not write an assertion that expects seven
distinct classes.

### The call sites as they exist today

```astro
<!-- src/components/IntroCard.astro:5 -->
import {Icon} from 'astro-icon/components';
```

```astro
<!-- src/components/IntroCard.astro:20-25 -->
{LINKS.map(({link, logo, name}) => (<a href={link} aria-label={name} target="_blank">
    <Button aria-label={name}>
        <Icon name={logo} class="h-6"/>
        <span class="sr-only">{name} Profile</span>
    </Button>
</a>))}
```

```astro
<!-- src/components/Goal.astro:5 -->
import {Icon} from 'astro-icon/components';
```

```astro
<!-- src/components/Goal.astro:24-29 -->
<a href={GOAL.website_url} target="_blank" aria-label="Follow me link" class="ml-4">
    <Button aria-label="Follow me button">
        <Icon name={`${GOAL.cta_logo}`} class="h-6" />
        <span class="sr-only">Follow me</span>
    </Button>
</a>
```

```js
// astro.config.mjs:6
import icon from "astro-icon";
```

```json
// package.json:24
    "astro-icon": "^1.1.5",
```

### The accessible name does not come from the icon

`Button.astro` declares only `interface Props { rounded?: boolean }` and does not
spread rest props, so the `aria-label` passed to `<Button>` is **dropped** — this
is pre-existing and not yours to fix. The `<button>`'s accessible name comes from
its contents, i.e. the sibling `<span class="sr-only">{name} Profile</span>`. The
`astro-icon` `<svg>` has no `<title>` and contributes nothing to it today.
Therefore marking the replacement `<span>` `aria-hidden="true"` **preserves the
accessible name exactly**. Verified in the prototype's built HTML:

```html
<button class="custom-btn text-xl …"><span class="i-fa6-brands-github" aria-hidden="true"></span><span class="sr-only">Github Profile</span></button>
```

### The one hard part: UnoCSS only sees literal class names

UnoCSS extracts class names by scanning source text. The icon names are computed
from `src/lib/constants.ts` at render time, so **no literal `i-…` class ever
appears anywhere in the source** and UnoCSS would generate zero icon rules. The
fix — validated on the prototype — is to safelist the classes, deriving them from
the same constants the components read. That also keeps the `CLAUDE.md` contract:

> "Any user configurable variable are implemented and configured in
> `src/lib/constants.ts`"

Adding a link to `LINKS` must keep Just Working with no second edit. It does,
because the safelist is computed from `LINKS`.

### Repo conventions to match

- 4-space indentation, double quotes, semicolons (see `src/lib/constants.ts`).
- Components are `.astro` under `src/components/`; shared TS lives in `src/lib/`.
- Conventional-commit messages (`feat:`, `fix:`, `chore:`, `refactor:`) — see
  `git log --oneline`.
- `tsconfig.json` is `{"include": [".astro/types.d.ts", "**/*"], "exclude": ["dist"]}`,
  so `uno.config.ts` **is** typechecked by `pnpm check`.
- `pnpm eslint` globs only `src/**/*.{js,astro}` — it does not read `.ts` files, so
  it will not check `uno.config.ts` or `src/lib/icons.ts`. `pnpm check` is your
  gate for those.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Remove a dep | `pnpm remove astro-icon` | exit 0; `package.json` + lockfile updated |
| Typecheck | `pnpm check` | exit 0; `0 errors` |
| Lint | `pnpm eslint` | exit 0 (pre-existing warnings tolerated) |
| Tests | `pnpm test` | exit 0; all pass |
| Single test | `pnpm exec vitest run <file> -t "<name>"` | `1 passed` |
| Build | `pnpm build` | exit 0; `Complete!` |
| Audit | `pnpm audit --audit-level=critical` | exit 0 (**after** this plan) |
| Trace a dep | `pnpm why cheerio` | see Step 6 |

**Use `pnpm` for everything. Never `npm`.** (`packageManager` is pinned to
`pnpm@10.32.1`.)

## Scope

**In scope** (the only files you may create or modify):

- `src/lib/icons.ts` — **create**
- `uno.config.ts`
- `src/components/IntroCard.astro`
- `src/components/Goal.astro`
- `astro.config.mjs` — **only** the two `icon()` lines
- `src/components/Card/index.astro` — **only** to delete a leftover
  `import {Icon} from "astro-icon/components";` line, and only if Step 0 finds one
- `package.json`, `pnpm-lock.yaml` — via `pnpm remove astro-icon`
- `tests/rendered-html.test.ts`, `tests/build-output.test.ts` — add one test each

**Out of scope** (do NOT touch, even though they look related):

- `src/lib/constants.ts` — the icon ids stay exactly as they are. This plan reads
  them; it does not restructure them. Plan 001's `tests/constants.test.ts` already
  asserts every `logo` names an installed collection (`fa6-brands` / `ri`) —
  **do not duplicate that assertion.**
- `src/components/Button.astro` — plan 004 owns it. Its `text-xl` is deliberately
  left alone; Step 4's sizing arithmetic depends on it.
- `@iconify-json/fa6-brands` and `@iconify-json/ri` in `package.json` —
  **keep both.** `presetIcons` reads these collections; removing them breaks every
  icon. Also do **not** move them to `devDependencies`: Netlify installs
  `devDependencies` anyway, so the move has zero security effect and only churns
  the lockfile.
- `@astrojs/check` in `dependencies` — the audit finding suggested moving it to
  `devDependencies`; the reviewer established that this has **no** security effect
  for the same reason. Leave it.
- `eslint.config.js`, `.husky/`, `README.md`, `CLAUDE.md` — not this plan.
- `src/components/ProgressBar.astro` — it uses `h-6` for the progress track. That
  keeps the `.h-6` rule alive after Step 4 removes `h-6` from the icons; do not
  "clean it up".
- Adding any CI workflow or `pnpm audit` gate. A blocking `--audit-level=high`
  gate would be red on day one from advisories in `astro` core and the ESLint
  devDependencies, which nothing in this plan can remove. Explicitly deferred.

## Git workflow

- Branch: `advisor/006-preset-icons` (create from an up-to-date `main`).
- One commit per logical unit; conventional-commit style, e.g.
  `refactor(icons): render icons via UnoCSS presetIcons` and
  `chore(deps): drop astro-icon`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 0: Preflight — confirm plans 002–005 landed and the code matches

Run each of these and compare against the expected result.

```bash
grep -n "astro-icon" package.json astro.config.mjs
grep -rn "astro-icon" src/
```

Expected:
- `package.json` → one line, `"astro-icon": "^1.1.5",`
- `astro.config.mjs` → one line, `import icon from "astro-icon";`
- `src/` → `src/components/IntroCard.astro:5` and `src/components/Goal.astro:5`,
  **and possibly** `src/components/Card/index.astro:2`.

```bash
grep -rn "<Icon" src/
```

Expected: exactly two hits — `IntroCard.astro` and `Goal.astro`. **If
`src/components/Card/index.astro` still contains an `<Icon` element, plan 004 did
not land — STOP.** (A leftover *import* with no `<Icon` usage is fine and is
handled in Step 3.)

```bash
cat uno.config.ts
```

Expected: a short file (~15 lines) using `presetWind3()`, with no `content.filesystem`
block and no `presetWebFonts`. **If it is the original 60-line file with
`presetUno()` and the full `theme` block, plan 005 did not land — STOP.**

```bash
pnpm why cheerio | grep -c "@iconify/tools"
```

Expected: `1` — `cheerio` is currently reached through `astro-icon`.

**Verify**: all five checks match. `pnpm test` → exit 0 (the suite is green before
you change anything).

### Step 1: Create the shared icon-class helper

The safelist in `uno.config.ts` and the class rendered in the components **must
produce byte-identical strings**, or UnoCSS silently generates a rule nobody uses
and the page shows nothing. Put the derivation in one place.

Create `src/lib/icons.ts`:

```ts
/**
 * Maps an Iconify id (`collection:name`, as stored in `src/lib/constants.ts`) to
 * the UnoCSS `presetIcons` utility class that renders it.
 *
 * Both the `safelist` in `uno.config.ts` and the components that render icons
 * must call this — UnoCSS only generates rules for class names it can see
 * literally, so a mismatch here produces an icon with no CSS rule.
 */
export const iconClass = (logo: string): string => `i-${logo.replace(":", "-")}`;
```

**Verify**:

```bash
test -f src/lib/icons.ts && node -e 'const l="fa6-brands:github"; console.log("i-" + l.replace(":","-"))'
```

→ `i-fa6-brands-github`

### Step 2: Wire `presetIcons` and the safelist into `uno.config.ts`

Edit `uno.config.ts` (plan 005 left it minimal). The result must be exactly this
file:

```ts
import {defineConfig, presetIcons, presetWind3} from "unocss";

import {GOAL, LINKS} from "./src/lib/constants";
import {iconClass} from "./src/lib/icons";

export default defineConfig({
    /** Icon classes are derived from constants at render time, so UnoCSS never
     *  sees them literally in source — every configured icon is safelisted here. */
    safelist: [...LINKS.map((l) => iconClass(l.logo)), iconClass(GOAL.cta_logo)],
    theme: {
        boxShadow: {custom: "2px 2px 0"},
        colors: {gray: {300: "#D4D4D4"}},
    },
    presets: [
        presetWind3(),
        // `display` is NOT part of presetIcons' default output. Without it the
        // icon <span> stays an inline box, width/height are ignored, and the icon
        // renders at zero size — i.e. invisibly. This line is load-bearing.
        presetIcons({scale: 1, extraProperties: {display: "inline-block"}}),
    ],
});
```

Keep whatever `theme` block plan 005 actually left behind if it differs from the
two entries above — **do not** revert plan 005's work. The only additions you are
making are: the two imports, the `safelist` array, and the `presetIcons(...)`
entry appended to `presets`.

`scale: 1` is deliberate — see Step 4 for the arithmetic. Do not change it.

**Verify**:

```bash
pnpm check
```

→ `0 errors`. (`tsconfig.json` includes `**/*`, so a bad import here is a
typecheck failure, not a silent one.)

### Step 3: Remove the `astro-icon` integration and any orphaned import

In `astro.config.mjs`, delete both of these lines:

```js
import icon from "astro-icon";
```

```js
    icon(),
```

If Step 0 found `import {Icon} from "astro-icon/components";` in
`src/components/Card/index.astro`, delete that line too — and nothing else in that
file.

**Verify**:

```bash
grep -rn "astro-icon" astro.config.mjs src/
```

→ exactly two hits remain: `src/components/IntroCard.astro:5` and
`src/components/Goal.astro:5`. (Step 4 removes those.)

### Step 4: Replace the two `<Icon>` call sites

In `src/components/IntroCard.astro`, delete line 5
(`import {Icon} from 'astro-icon/components';`) and add, alongside the existing
imports:

```astro
import {iconClass} from "../lib/icons";
```

Then replace the icon element:

```astro
<!-- before -->
<Icon name={logo} class="h-6"/>
<!-- after -->
<span class={iconClass(logo)} aria-hidden="true"></span>
```

In `src/components/Goal.astro`, delete line 5 the same way, add the same import,
and replace:

```astro
<!-- before -->
<Icon name={`${GOAL.cta_logo}`} class="h-6" />
<!-- after -->
<span class={iconClass(GOAL.cta_logo)} aria-hidden="true"></span>
```

#### Why `h-6` is dropped, and why you must not put it back

This is the one place where a plausible-looking "improvement" produces a visible
regression, so the reasoning is spelled out.

`astro-icon` renders a real `<svg>` with intrinsic dimensions. Production today
emits, for example, `<svg width="0.97em" height="1em" class="h-6" …>` — `h-6`
(`height: 1.5rem` = 24 px) forces the *box* to 24 px tall, and the SVG's
`preserveAspectRatio` letterboxes the glyph inside it, so the drawn glyph is
`0.97em × 1em` = **19.4 × 20 px** at the button's `text-xl` font size (20 px).

`presetIcons` emits a CSS mask, not a replaced element, with
`mask-size: 100% 100%` — the glyph **stretches to fill the box exactly**, with no
aspect-ratio preservation. So the box dimensions *are* the glyph dimensions:

| config | emitted rule | rendered at `text-xl` (20 px) |
|---|---|---|
| `scale: 1.5` + `h-6` | `width: 1.46em; height: 1.5em` then `height: 1.5rem` | 29.2 × 24 px — **50 % wider, aspect distorted** |
| `scale: 1`, no `h-6` | `width: 0.97em; height: 1em` | **19.4 × 20 px — identical to today** |

Those `em` widths were generated and read off directly: `presetIcons({scale: 1})`
produces `0.97em` for `fa6-brands:github`, `0.88em` for `linkedin` and
`instagram`, `0.75em` for `strava`, `0.97em` for `telegram`, `1em` for
`ri:file-pdf-2-line` — byte-for-byte the same widths `astro-icon` puts on its
`<svg>` elements in production.

Button height is unaffected: the button's `text-xl` line-height is `1.75rem`
(28 px), which exceeds both the old 24 px box and the new 20 px box, so the line
box height — and therefore the button — is unchanged.

`color: inherit; background-color: currentColor` in the generated rule reproduces
`astro-icon`'s `fill="currentColor"`, so the `hover:text-[var(--accent)]` colour
change on the button still tints the icon.

**Verify**:

```bash
grep -rn "astro-icon\|<Icon\|h-6" src/
```

→ **only** `src/components/ProgressBar.astro` (the progress-bar track). No
`astro-icon`, no `<Icon`, no `h-6` in `IntroCard.astro` or `Goal.astro`.

### Step 5: Drop the dependency and rebuild

```bash
pnpm remove astro-icon
pnpm build
```

**Verify**, all four:

```bash
grep -c "astro-icon" package.json          # → 0
pnpm why cheerio | grep -c "@iconify/tools" # → 0
pnpm check                                  # → 0 errors
pnpm eslint                                 # → exit 0
```

### Step 6: Prove every icon in the HTML has a CSS rule

This is the single most likely regression: a safelist that stops matching leaves
the class in the markup with no rule behind it, and the icons vanish without any
error. Cross-check the built artifacts directly.

```bash
node -e '
const fs = require("fs");
const html = fs.readFileSync("dist/index.html", "utf8");
const sheet = fs.readdirSync("dist/_astro").find((f) => f.endsWith(".css"));
const css = fs.readFileSync("dist/_astro/" + sheet, "utf8");
const used = [...new Set([...html.matchAll(/class="([^"]*)"/g)]
    .flatMap((m) => m[1].split(/\s+/))
    .filter((c) => c.startsWith("i-")))].sort();
const missing = used.filter((c) => !css.includes("." + c + "{"));
console.log("icon classes in HTML:", used.length, used.join(" "));
console.log("missing a CSS rule:", missing.length, missing.join(" "));
'
```

**Verify**: expected output, exactly:

```
icon classes in HTML: 6 i-fa6-brands-github i-fa6-brands-instagram i-fa6-brands-linkedin i-fa6-brands-strava i-fa6-brands-telegram i-ri-file-pdf-2-line
missing a CSS rule: 0
```

Six, not seven — `fa6-brands:strava` is used twice.

If `missing a CSS rule` is anything other than `0`, **STOP** (see STOP conditions).

Also confirm the advisory improvement:

```bash
pnpm audit --audit-level=critical; echo "exit=$?"
```

**Verify**: `exit=0`. (`pnpm audit` without the flag should now report
approximately `{low: 0, moderate: 4, high: 6, critical: 0}`. Advisory databases
move, so treat the exact counts as informational; `critical: 0` is the gate.)

### Step 7: Lock it in with two tests

#### 7a — `tests/rendered-html.test.ts`

Add to the import block at the top of the file:

```ts
import {iconClass} from "../src/lib/icons";
```

`GOAL` and `LINKS` are already imported from `../src/lib/constants` by plan 001;
do not re-import them. Add this test inside the existing
`describe("page content", …)` block:

```ts
    it("renders a decorative icon element for every configured icon", () => {
        const wanted = [...LINKS.map(({logo}) => iconClass(logo)), iconClass(GOAL.cta_logo)];
        for (const cls of wanted) {
            const el = doc.querySelector(`span[class~="${cls}"]`);
            expect(el, `no element carries the icon class ${cls}`).toBeTruthy();
            expect(el?.getAttribute("aria-hidden"), `${cls} must be aria-hidden so the sr-only label remains the accessible name`).toBe("true");
        }
    });
```

**Verify**: `pnpm exec vitest run tests/rendered-html.test.ts -t "decorative icon"`
→ `1 passed`.

#### 7b — `tests/build-output.test.ts`

Add to the import block:

```ts
import {GOAL, LINKS} from "../src/lib/constants";
import {iconClass} from "../src/lib/icons";
```

(`METADATA` is already imported by plan 001; extend that import rather than
duplicating it if `GOAL`/`LINKS` fit on the same line.)

Add this test inside the existing `describe("dist/", …)` block:

```ts
    it("emits a usable CSS rule for every safelisted icon class", () => {
        const sheet = readdirSync("dist/_astro").find((f) => f.endsWith(".css"));
        expect(sheet, "dist/_astro must contain a stylesheet").toBeTruthy();
        const css = read(`dist/_astro/${sheet}`);
        const wanted = new Set([...LINKS.map(({logo}) => iconClass(logo)), iconClass(GOAL.cta_logo)]);
        for (const cls of wanted) {
            const rule = css.match(new RegExp(`\\.${cls}\\{([^}]*)\\}`))?.[1];
            expect(rule, `${cls} has no CSS rule — the safelist in uno.config.ts stopped matching`).toBeTruthy();
            expect(rule, `${cls} must be inline-block or it renders at zero size`).toMatch(/display:\s*inline-block/);
            expect(rule, `${cls} must carry a mask image`).toContain("--un-icon:url(");
        }
    });
```

The `display: inline-block` assertion is not cosmetic — it is the guard against
the exact failure mode described in Step 2.

**Verify**: `pnpm exec vitest run tests/build-output.test.ts -t "safelisted icon"`
→ `1 passed`.

### Step 8: Full gate

**Verify**, all four:

```bash
pnpm check    # → 0 errors
pnpm eslint   # → exit 0
pnpm build    # → Complete!
pnpm test     # → exit 0, all files passed
```

`pnpm test` must report **two more tests than before this plan** (plan 001's
baseline was 32; plans 002–005 may have changed it, so compare against the count
you recorded in Step 0, not against an absolute number).

## Test plan

Two new tests, both targeting the same silent failure from opposite ends:

| File | Test | Risk it covers |
|---|---|---|
| `tests/rendered-html.test.ts` | `renders a decorative icon element for every configured icon` | A component stops emitting the icon `<span>`, or drops `aria-hidden` and starts polluting the button's accessible name. Also fails if someone adds a link to `LINKS` and the render path does not pick it up. |
| `tests/build-output.test.ts` | `emits a usable CSS rule for every safelisted icon class` | The `uno.config.ts` safelist silently stops matching (class in HTML, no rule in CSS → invisible icons), or `extraProperties.display` is dropped (rule present, still invisible). |

Model both after the existing tests in those files: they read expected values from
`src/lib/constants.ts` rather than hard-coding strings, so adding or changing a
link in the constants file does not break the suite.

No test asserts icon *pixel* geometry — that is not observable from the DOM. Step 4
carries the arithmetic instead, and a reviewer should eyeball the six buttons once
in a browser.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "astro-icon" src/ astro.config.mjs package.json` returns **no matches**
- [ ] `grep -rn "<Icon" src/` returns **no matches**
- [ ] `pnpm why cheerio | grep -c "@iconify/tools"` → `0`
- [ ] `pnpm audit --audit-level=critical` exits 0
- [ ] `grep -c "@iconify-json/fa6-brands" package.json` → `1` and
      `grep -c "@iconify-json/ri" package.json` → `1` (both kept)
- [ ] The Step 6 node one-liner prints `icon classes in HTML: 6` and
      `missing a CSS rule: 0`
- [ ] `pnpm check` exits 0 with `0 errors`
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `pnpm test` exits 0 and the total is exactly 2 higher than the Step 0 baseline
- [ ] `git status --porcelain` lists only: `src/lib/icons.ts`, `uno.config.ts`,
      `src/components/IntroCard.astro`, `src/components/Goal.astro`,
      `astro.config.mjs`, `package.json`, `pnpm-lock.yaml`,
      `tests/rendered-html.test.ts`, `tests/build-output.test.ts`, and — only if
      Step 0 found the orphaned import — `src/components/Card/index.astro`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- **An icon class appears in `dist/index.html` but has no rule in the built
  stylesheet** (Step 6 prints a non-zero `missing a CSS rule`). This means the
  safelist derivation and the render-time derivation have diverged. Report the
  missing class names. **Do not** "fix" it by hard-coding literal `i-…` class
  strings into a component or into the safelist array — that breaks the
  `constants.ts`-is-the-source-of-truth contract and hides the real bug.
- `src/components/Card/index.astro` still contains an `<Icon …>` **element**
  (not just an import): plan 004 has not landed, and removing `astro-icon` will
  break the build.
- `uno.config.ts` is still the original ~60-line file with `presetUno()`: plan 005
  has not landed. Do not do plan 005's work as a side effect.
- `pnpm check` reports errors that mention `uno.config.ts` importing
  `src/lib/constants` or `src/lib/icons`. Report the full error rather than
  duplicating the constants into the config.
- The rendered HTML loses the `<span class="sr-only">…</span>` siblings, or plan
  004 changed `Button.astro` such that the accessible name now depends on the icon
  element. In that case `aria-hidden="true"` would remove the button's accessible
  name — stop and report instead of dropping the attribute.
- `pnpm audit` still reports `critical: 1` after Step 5. That means a path to the
  advisory exists that is **not** `astro-icon` — run `pnpm why tar`, report the
  chain, and do not attempt to remove whatever else is in it.
- Any verification fails twice after one reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **Adding an entry to `LINKS` requires no config change.** The `uno.config.ts`
  safelist is computed from `LINKS`, so a new `logo` is picked up automatically —
  provided its collection is one of the installed `@iconify-json/*` packages.
  Plan 001's `tests/constants.test.ts` enforces that (`ICON_COLLECTIONS`), and
  that list must be updated in lockstep if a third collection is ever installed.
- **`scale: 1` and the absence of `h-6` are a matched pair.** Because
  `presetIcons` uses `mask-size: 100% 100%`, setting only one dimension distorts
  the glyph. If icon size ever needs to change, change `scale` (or the icon
  element's `font-size`) — never a bare `h-*` / `w-*` utility.
- **`extraProperties: {display: "inline-block"}` is not optional.** `presetIcons`
  does not emit `display` by default, and an inline `<span>` ignores width and
  height, so removing it makes every icon disappear with no error anywhere.
  `tests/build-output.test.ts` asserts it.
- A reviewer should: load the page and confirm all six icons render at the same
  size and colour as production, hover a button to confirm the icon still picks up
  `var(--accent)`, and check the diff does not touch `src/lib/constants.ts`.
- **Deliberately deferred**: no CI workflow and no `pnpm audit` gate. The
  remaining `high` advisories come from `astro` core and the ESLint
  devDependencies and are not removable, so an `--audit-level=high` gate would be
  permanently red and would train the maintainer to ignore it. A non-blocking
  scheduled audit report plus Dependabot is the right shape if this is ever
  revisited.
