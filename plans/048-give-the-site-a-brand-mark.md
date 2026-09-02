# Plan 048: Give the site a brand mark, wear it, and publish it

> **Executor instructions**: Follow this plan step by step. Run every verification command
> and confirm the expected result before moving to the next step. If anything in the "STOP
> conditions" section occurs, stop and report — do not improvise. Your reviewer maintains
> `plans/README.md` — do not edit it (the edits execution implies are listed at the end for
> the reviewer). This repository overrides the upstream instruction to update your own status
> row.
>
> **Drift check (run first)**:
>
> ```sh
> git diff --stat a1b8ee5..HEAD -- \
>   src/content/design.ts src/content/home.ts src/components/IntroCard.astro \
>   src/layouts/BasicLayout.astro src/lib/icons.ts src/lib/palette.ts \
>   src/lib/design-doc.ts src/pages/design.astro src/pages/llms.txt.ts \
>   uno.config.ts public/favicon.ico public/preview.jpg
> ```
>
> If any of those changed since `a1b8ee5`, compare the "Current state" excerpts below against
> the live code before proceeding. **On a mismatch, treat it as a STOP condition.**

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED — touches the home page's measured height budget, retires an icon from a
  census two consumers read, and retracts a declared `omitted` token group
- **Depends on**: none
- **Category**: direction (design system)
- **Planned at**: commit `a1b8ee5`, 2026-09-02

## Why this matters

calvin.sg has no brand mark: `public/favicon.ico` is an icon nothing in `src/` authored, and
`--brand-ink` is worn by exactly one thing, a heart in the footer. A mark nevertheless exists
— a five-ray sunrise over a two-tone bar beside the word `calvin.sg` — but it lives in a
Python module in a dotfiles repository, drawn with this site's token *values* typed in as
literal hexes. This plan moves the mark to the repository that owns the palette, makes the
site wear it, and publishes it as files an off-site consumer can fetch instead of redraw.
The payoff is that the mark stops being a copy: it is derived here, like every other value
this design system publishes.

## Design decisions — settled by the maintainer. Do NOT relitigate

Locked 2026-09-02. The first five were decided in discussion; the last four were decided
against **rendered specimens**, drawn in these tokens at these sizes, at
[Sunrise Mark Mockups](https://claude.ai/code/artifact/1ab56b6b-f9a1-49eb-b37f-93890c4f1cf0).

1. **The sunrise is the site's mark, worn everywhere, and `ri:open-arm-line` is retired.**
2. **The bar is live in every placement**, and the figure is the **average of the two goals'
   own fractions** — not the sum of kilometres over the sum of targets. Cycling's target is
   5000 km against running's 600, so a sum-based ratio is the cycling goal with a rounding
   error attached; the average is the reading in which a strong running year is visible.
3. **calvin.sg is the source of truth and this plan touches no other repository.**
   `~/.config/bin` is a proof of concept and is explicitly disposable.
4. **The `components` token group is published**, in the DESIGN.md format's own vocabulary,
   derived from the implementation rather than authored. See the next section.
5. **The mark ships as fetchable files** — SVG and JSON — announced from `llms.txt`, so an
   agent building in this design system fetches the palette and the mark rather than
   inferring them.
6. **The mark sits inline in the `<h1>`, enlarged 1.4× against the text** (mockup option
   1B). Not a same-size swap: at the `text-xl` step the rays soften into the dome, and 1.4×
   is where they survive while still costing no line.
7. **One drawing at every size** (option 2A). There is no ray-less small variant. The 16px
   softness is **accepted**, and the Brand Mark section records it as accepted rather than
   leaving a reader to discover it.
8. **The `/design` specimen draws the ladder, both grounds, and names what the bar measures**
   (option 3B). The last part is load-bearing — see "The Data Visualization rule this stands
   outside".
9. **`favicon.ico` stays, frozen at the designed proportion, and is documented as frozen.**

## Current state

Evidence gathered 2026-09-02 at `a1b8ee5`. Every excerpt below was read from the live tree.

### The files this plan touches, and each one's role

- `src/content/home.ts` — the intro card's copy, including the greeting mark's Iconify id.
- `src/lib/icons.ts` — `ICON_IDS`, the census of every mark the site uses. **Two consumers**:
  `uno.config.ts` safelists it, and `/design` renders it.
- `src/components/IntroCard.astro` — the home page's hero card; draws the greeting mark.
- `src/layouts/BasicLayout.astro` — wraps every page; holds the `<link rel="icon">` and the
  two `:root[data-theme]` blocks that define every colour.
- `src/lib/palette.ts` — reads those two blocks **as text** at build and publishes each
  token's two values.
- `src/content/design.ts` — the one authored description of the design system.
- `src/lib/design-doc.ts` — renders that module as markdown for two audiences.
- `src/pages/design.astro` — draws the live specimens.
- `src/pages/llms.txt.ts` — the site as plain text for an agent.
- `uno.config.ts` — the utility engine's config; holds the six shortcuts.

### The greeting mark, and its three consumers

`src/content/home.ts:190-196`:

```ts
export const WELCOME: {
    greeting_icon: string
    description: string[]
} = {
    greeting_icon: "ri:open-arm-line",
    description: ["Hi, I'm Calvin", `${CAREER[0].job_name}.`, "Road cyclist."]
}
```

`src/lib/icons.ts:47-51` — the census reads it:

```ts
export const ICON_IDS: readonly string[] = [
    ...LINKS.map((l) => l.logo),
    ...GOALS.map((g) => g.goal_logo),
    ...CAREER.map((c) => c.icon),
    WELCOME.greeting_icon,
```

`src/components/IntroCard.astro:186` — the only place it is drawn:

```astro
<h1 class="m-0 font-light text-xl"><span class={iconClass(WELCOME.greeting_icon)} aria-hidden="true"></span> {greeting}</h1>
```

`grep -rn 'open-arm' src/` returns exactly one hit, `src/content/home.ts:194`. Nothing else
on the site uses this mark.

### The tokens the mark is drawn from

`src/layouts/BasicLayout.astro:463` and `:481` — the two values this plan needs:

```css
    :root[data-theme='light'] { … --progress-track: #E3B3B8; --brand-ink: #A82334; … }
    :root[data-theme='dark']  { … --progress-track: #462F32; --brand-ink: #F3A3AA; … }
```

`src/lib/palette.ts` exports exactly three things, and the first is the contract this plan
consumes:

```ts
export type TokenValues = {token: string, light: string, dark: string}
export const PALETTE: readonly TokenValues[] = parsePalette(readFileSync(THEME_SOURCE, "utf8"))
export function valueIn(values: TokenValues, theme: string): string
```

### The mark as it exists today, outside this repository

`~/.config/bin/bft_card_lib/card_layout.py:10-11` — the palette, hardcoded:

```python
L = dict(bg="#FAFAFA", card="#F5F5F5", bord="#E5E5E5", text="#0B0B0B", ink="#A82334", track="#E3B3B8")
D = dict(bg="#111111", card="#171717", bord="#2C2C2C", text="#FAFAFA", ink="#F3A3AA", track="#462F32")
```

`~/.config/bin/bft_card_lib/card_layout.py:46-52` — the mark itself. **This is the drawing
this plan ports.** Read the file; do not retype it from here:

```python
def mark(ink, track, px):
    rays = "".join(f'<rect x="49" y="6" width="2.6" height="13" fill="{ink}" transform="rotate({a} 50 62)"/>'
                   for a in (-58, -29, 0, 29, 58))
    return (f'<svg viewBox="0 0 100 100" width="{px}" height="{px}" aria-hidden="true">{rays}'
            f'<path d="M21 62 A29 29 0 0 1 79 62 Z" fill="{ink}"/>'
            f'<rect x="8" y="73" width="84" height="13" fill="{track}"/>'
            f'<rect x="8" y="73" width="44.5" height="13" fill="{ink}"/></svg>')
```

The bar is filled 44.5 of 84 = **52.98%**. The site's two goals stand at 317/600 and
2602.2/5000 — 52.83% and 52.04%, average **52.44%**. The mark was hand-drawn within half a
point of the figure this plan derives it from.

### The claim this plan corrects

`src/content/design.ts:469-474`:

```ts
    {
        section: "components",
        reason: "The site is built in Astro, whose components compile to a server render and have "
            + "no runtime form, so there is nothing to mount and the component namespace is empty "
            + "by construction. Build with plain elements and the named classes below.",
    },
```

**That reason answers a different question than the DESIGN.md format asks.** The format's
`components` group is a map from a component identifier to *style* tokens —
`backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`,
`width` — with no notion of mounting anything. Quoting the spec at
`~/.opensrc/repos/github.com/google-labs-code/design.md/main/docs/spec.md`:

> The components section defines a collection of design tokens used to ensure consistent
> styling of common components. It's a map<string, map<string, string>> that maps a component
> identifier to a group of sub token names and values.

The existing sentence is true of the `.design-sync` **bundle**, and `src/lib/design-doc.ts`
already owns that class of claim. The omission is therefore retracted, not reversed:
`typography`, `spacing` and `rounded` stay omitted, because those are scales this site
genuinely does not have.

### The shortcuts the components group will publish

`uno.config.ts:465-472` — six shortcuts, of which four ship a rule (`control-surface` and
`chip-surface` are composed, never worn):

```ts
    shortcuts: {
        "control-surface": "text-[var(--text)] bg-[var(--background)] border border-[var(--accent)] …",
        "control-cta": "control-surface text-xs min-h-12 w-full px-3 py-1 inline-flex flex-wrap items-center justify-center gap-x-2",
        "text-link": "underline decoration-from-font underline-offset-[0.18em] self-start text-[var(--text)] …",
        "chip-surface": "border border-[color-mix(in_srgb,var(--text)_32%,transparent)] rounded-[2px] …",
        "chip": "chip-surface inline-flex items-center gap-[0.4em] min-h-11 min-w-11 px-[0.7rem] py-[0.3rem] text-xs font-bold tracking-[0.1em] uppercase",
        "chip-icon": "chip-surface inline-flex items-center justify-center shrink-0 w-11 h-11",
    },
```

**`tests/design-system.test.ts:4` already does `import unoConfig from "../uno.config"`**, so
importing that config from TypeScript in this repository is a measured fact, not a hope.

### Conventions this plan must match

Read these three exemplars before writing anything, and match them:

- **A derived-value module**: `src/lib/palette.ts`. It reads a source file as text at build
  and publishes what it finds. Nothing in it is typed twice. `src/lib/brand-mark.ts` is its
  sibling.
- **A two-consumer census**: `src/lib/icons.ts:12-17` — *"`ICON_IDS` HAS TWO CONSUMERS AND
  MUST NEVER HAVE A SECOND COPY."* Step 1 applies that rule to the shortcuts.
- **A test in this suite**: `tests/design-system.test.ts`. Note its `themeTokens()` helper at
  line 179 and the `pageCss` / `classTokens` helpers it imports from `tests/helpers/`. New
  tests follow this file's structure.

### Design constraints quoted from the repository's own docs

The executor has not read these. They are binding.

From `src/content/design.ts`'s header:

> if you find yourself typing a hex, a rem, a pixel count or a class name that the page could
> read out of the build instead, it does not belong here.

> NO COUNTS EITHER, in any string a reader can see.

From the same file, the jiti constraint that binds every module `uno.config.ts` can reach:

> `uno.config.ts` READS THE CONTENT MODULES THROUGH unconfig/jiti RATHER THAN VITE … no
> `import.meta.glob`, no `astro:content`, no top-level `await`, and no `.astro` import.

From `CLAUDE.md`, the rule that decides where the mark may go:

> `control-cta` — that surface at the width of what contains it … **this card's one action**.
> `chip-icon` — the same surface pinned at 44x44 for one mark: **one of a set, or a
> preference**.

From `SECTIONS.data` in `src/content/design.ts` — the rule this plan must openly stand
outside:

> Say what a bar is measured against, in words the reader meets before the bars.

> Let the drawing be the only carrier of a figure it encodes. Print the number as well.

From `src/pages/design.md.ts` — a constraint on step 7's shape:

> IT IS BYTE-IDENTICAL TO `DESIGN.md` AT THE REPOSITORY ROOT … Nothing here may add a header,
> a stamp or a banner to one copy — the moment it does, they are two documents.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0, no output |
| Full gate | `pnpm test` | exit 0, all files pass (runs `pnpm build` first) |
| One test, fast | `SKIP_BUILD=1 npx vitest run tests/<file>` | exit 0 |
| Build | `pnpm build` | exit 0, `dist/` written |
| Serve the build | `pnpm preview --port 4322` | listening on 4322 — **no `--` separator** |
| Agent bundle CSS | `node .design-sync/prepare-css.mjs` | exit 0 |

## Suggested executor toolkit

- **`EnterWorktree`** for all file changes — this repository's standing instruction.
- **`/git-commit-helper`** for commits and **`/pr-helper`** for the PR; there is no
  `CONTRIBUTING.md` rule that overrides them for this work.
- The DESIGN.md format spec is on disk at
  `~/.opensrc/repos/github.com/google-labs-code/design.md/main/docs/spec.md`. Read its
  "Sections", "Components" and "Consumer Behavior for Unknown Content" sections before
  step 5 and step 6.
- The mark's source of record is `~/.config/bin/bft_card_lib/card_layout.py`. Read it; it is
  a proof of concept and is **not** to be edited, imported, or kept in sync.

## Scope

**In scope** (the only files you may modify or create):

- `src/lib/brand-mark.ts` (create), `src/lib/shortcuts.ts` (create),
  `src/lib/component-tokens.ts` (create)
- `src/components/BrandMark.astro` (create)
- `src/pages/brand/mark.svg.ts`, `mark-light.svg.ts`, `mark-dark.svg.ts` (create)
- `src/pages/design_tokens.json.ts` (create), `design_tokens.json` (create, repo root)
- `src/content/design.ts`, `src/content/home.ts`, `src/components/IntroCard.astro`,
  `src/layouts/BasicLayout.astro`, `src/lib/icons.ts`, `src/lib/design-doc.ts`,
  `src/pages/design.astro`, `src/pages/llms.txt.ts`, `uno.config.ts`
- `public/favicon.ico`, `public/preview.jpg`
- `tests/brand-mark.test.ts` (create), `tests/component-tokens.test.ts` (create),
  `tests/design-system.test.ts`, `tests/content.test.ts`, `tests/icon-alignment.test.ts`,
  `tests/rendered-html.test.ts`, `tests/build-output.test.ts`, and any snapshot they own.
  **The last three are in scope because retiring a mark reddens them**, which is not obvious
  from the change: each holds its own census of `WELCOME.greeting_icon`. See step 3.
- `CLAUDE.md`, `README.md`, `.design-sync/NOTES.md`

**Out of scope** (do NOT touch, even though they look related):

- **`~/.config/bin/**`** — a proof of concept the maintainer has declared disposable.
  Porting changes back to it is explicitly not wanted.
- **`src/components/ProgressBar.astro`** — orphaned, and owed a deletion by plan 047 that was
  left out of that plan's scope. Deleting it here mixes two changes and steals another plan's
  measurement.
- **`src/components/PageHeader.astro`, `src/pages/404.astro`, the footer in
  `src/pages/index.astro`** — see "Where the mark does not go". Each already draws a mark
  that is its own control's signifier.
- **`.devin/wiki.json`** — the durability-gated document. It may not carry counts, component
  filenames or exported constant names, and a mark's placements are exactly that class of
  fact.
- **`plans/README.md`** — the reviewer's.
- **`src/data/strava-progress.json`** — bot-owned.

## Git workflow

- Branch: `EnterWorktree` on `feat/048-brand-mark` off `main`.
- One commit per step group. Conventional commits, matching `git log --oneline`:
  `feat(dns): today.calvin.sg, answered by a Worker and nothing else (#251)` — a scoped
  type, then a sentence that says what became true.
- Open a PR. The Cloudflare Pages deploy preview is the evidence for every visual claim in
  "Done criteria"; a local `pnpm preview` is not (`UMAMI_ID` and `BUILD_DATE` differ).

## Where the mark goes, and where it deliberately does not

**It goes** in four places, each a different job:

| Placement | Why |
|---|---|
| The intro card's `<h1>` | Identity, on the one page that is about the person. Replaces the greeting icon. |
| The favicon | The tab is where a mark earns its keep, and the site has never had one there. |
| `public/preview.jpg` | Not a decision — the hero is a render of the intro card, so it arrives automatically. |
| `/design`'s Brand Mark section | The specimen, live, at the size ladder, in both themes. |

**It does not go** in the page header, the 404, or the footer:

- **The page header's marks are its controls' own signifiers.** `PAGE_HEADER.home_icon` is,
  in that component's own words, *"deliberately the arrow the way out mirrors"* — the brand
  mark there breaks a pairing the component defends at length, and adds a non-interactive
  object to a row whose every item is a chip.
- **The 404's mark is that same object**; it labels the way home.
- **The footer is an attribution, not identity.** `--brand-ink`'s one existing wearer is a
  heart in a sentence about Astro, which is what that token is for.

## The Data Visualization rule this stands outside, said out loud

A favicon cannot say what its bar is measured against. Rather than ship a contradiction, the
design system **names the exception**: the mark's bar is an identity device whose proportion
happens to be measured, not a quantity offered for reading. The Brand Mark section states it,
the Data Visualization section gains one sentence pointing at it, and step 5's test holds the
two together.

Where the mark *does* have a reader who can be told — the intro card — it is told: the mark's
accessible name prints the figure and names its scale, which satisfies *"print the number as
well"* in the one placement where a number can land.

## Steps

### Step 1: Move the shortcuts into their own module

Cut the `shortcuts` object from `uno.config.ts:465-472` into `src/lib/shortcuts.ts` as
`export const SHORTCUTS`, and import it back. Move the prose above it **unedited**. Give the
new module the jiti-constraint note every sibling in that graph carries (quoted in "Current
state").

This is the `ICON_IDS` rule applied to a second census: one home, two consumers — the engine,
and `src/lib/component-tokens.ts` in step 6.

**Verify**:

```sh
find dist -type f | sort | xargs shasum > /tmp/048-before.txt   # BEFORE editing
# …edit…
pnpm build && find dist -type f | sort | xargs shasum > /tmp/048-after.txt
diff /tmp/048-before.txt /tmp/048-after.txt
```

→ **no output.** `dist/` must be byte-identical; this step changes no behaviour.

### Step 2: Author the mark once

Create `src/lib/brand-mark.ts`, ported from `card_layout.py:44-51`. Export:

- `MARK_GEOMETRY` — a **data structure**, not a template string: the viewBox, the five ray
  angles `[-58, -29, 0, 29, 58]`, the ray rect, the dome arc `M21 62 A29 29 0 0 1 79 62 Z`,
  and the bar's track and fill rects. Step 6 publishes these as component tokens, and a
  string cannot be read for a rect's width. Every number here is authored, because **this
  module is the drawing** — nothing else in the repository may state one of them.
- `SIZE_LADDER = [120, 48, 24, 16]`, with the recorded note that the rays are the first
  thing to fill in and that at 16px the mark degrades to a dome with fuzz.
- `markFill(): number` — the **average of each goal's own clamped fraction**, read from
  `GOALS` in `src/lib/goal.ts`. Not the sum of kilometres over the sum of targets: cycling's
  target is 5000 against running's 600, so a sum-based ratio is the cycling goal with a
  rounding error attached.
- `markSvg({ink, track, fill, px, title}): string` — the SVG. `ink` and `track` are supplied
  by the caller, so **this module never chooses a colour**.

Create `tests/brand-mark.test.ts` alongside it (see "Test plan").

**Verify**: `pnpm check` → exit 0. Then
`SKIP_BUILD=1 npx vitest run tests/brand-mark.test.ts` → all pass.

### Step 3: Draw it on the site, and retire the icon it replaces

Create `src/components/BrandMark.astro`. It renders `markSvg` inline with
`ink="var(--brand-ink)"` and `track="var(--progress-track)"`, so **one markup re-tones with
the theme** rather than shipping two variants. Size comes from `font-size` on the wrapper,
the way every mark on this site is sized. It takes a `label` prop: on the intro card the
label prints the figure and its scale; elsewhere the SVG is `aria-hidden`.

**Its inline form is decided and measured** (decision 6): in a run of text the mark is
`1.4em` square and sits on the text's own baseline with `vertical-align: -0.145em` — the same
offset the Iconify masks already use, so the mark lands where the icon it replaces landed.
1.4× is not a taste call: at `text-xl` (`1.25rem`, per the built CSS) a 1em mark puts the
five rays under 2px each and they close up against the dome. The enlargement was chosen
against a rendered ladder, and the accepted cost is a slightly taller line box — which must
be **measured**, not assumed, because the page's slack is 14px and 24px.

Then, in one commit:

1. `src/components/IntroCard.astro:186` — replace
   `<span class={iconClass(WELCOME.greeting_icon)} aria-hidden="true"></span>` with
   `<BrandMark>` at the inline size above.
2. `src/content/home.ts` — delete `greeting_icon` from `WELCOME` and from its type.
3. `src/lib/icons.ts:51` — delete the `WELCOME.greeting_icon` entry from `ICON_IDS`.
4. **Retire the greeting from the four test censuses that name it.** This is the step's real
   cost and it is not visible from the change: `tsconfig.json` includes `**/*`, so deleting
   the field from `WELCOME`'s TYPE makes every one of these a compile error under
   `pnpm check`, not merely a failing assertion.
   - `tests/icon-alignment.test.ts:304` — drop it from `EXPECTED_INLINE_HOSTED`, and correct
     the heading-hosted count that follows: the `<h1>`'s mark is now an inline `<svg>` rather
     than a `presetIcons` mask, so it leaves that census entirely.
   - `tests/rendered-html.test.ts:1033` and `tests/build-output.test.ts:1066` — drop
     `iconClass(WELCOME.greeting_icon)` from the safelisted-rule sets.
   - `tests/content.test.ts:596` — retarget the intro-card fingerprint at the brand mark
     (step 9 finishes this one, with the hero regeneration it owes).

The census falls by one, and `/design`, `DESIGN.md`, `.design-sync/conventions.md` and the
UnoCSS safelist all follow without being edited. That is what makes it a census — but the
four test files above hold their OWN censuses of the same field, and those do not follow.

**Verify**:

```sh
pnpm build
grep -c 'i-ri-open-arm-line' dist/index.html          # → 0
grep -c '<svg' dist/index.html                        # → at least 1 more than before
grep -rn 'open-arm' src/                              # → no matches
SKIP_BUILD=1 npx vitest run tests/design-system.test.ts
```

→ the first is `0`, the third returns nothing, the suite passes. `tests/content.test.ts`
**is expected to be red at this point** — step 9 closes it, because the fingerprint it
carries is owed a regenerated hero. Every other test named in item 4 must be GREEN before
you leave this step; if one is still red, you have not finished the step rather than hit a
STOP condition.

### Step 4: Ship the mark as files, and put it in the tab

Create three prerendered routes under `src/pages/brand/`, all reading their hexes from
`PALETTE`:

- `mark.svg.ts` — self-theming: literal light values, plus a `prefers-color-scheme: dark`
  block inside the SVG's own `<style>` swapping to the dark pair. **This is the favicon.**
- `mark-light.svg.ts`, `mark-dark.svg.ts` — pinned, for a consumer that cannot evaluate CSS.

None of the three may contain a typed colour.

In `src/layouts/BasicLayout.astro`, put the SVG link **after** the existing `.ico` link and
give the `.ico` an explicit `sizes`, so the pair reads:

```astro
    <link rel="icon" href="/favicon.ico" sizes="32x32"/>
    <link rel="icon" type="image/svg+xml" href="/brand/mark.svg"/>
```

**The order and the `sizes` attribute are both load-bearing, and getting this backwards
ships the frozen raster to every browser that supports the live mark.** Two mechanisms, and
the recipe satisfies both: browsers that resolve several `rel="icon"` declarations generally
take the LAST one they can use, and `sizes` on the `.ico` is what marks it as the bitmap so a
browser preferring vector picks the SVG regardless of order. This is the canonical two-line
recipe rather than this plan's invention. **Do not gate the source order in a test** — assert
the RESOLVED icon instead (see Done criteria), because a test over source order is exactly
what would lock the wrong answer in.

**The `.ico` is the one placement whose fill cannot be live, and this plan says so rather
than pretending otherwise.** An `.ico` is a raster; regenerating it at build needs a
rasteriser this build has no other reason to carry. Redraw it once from the mark at the
designed proportion, keep it as the legacy fallback, and record it in the Brand Mark section
as a fixed-proportion fallback. **Do not decide the alternative** — deleting `favicon.ico`
and its link is a one-line change; flag it in the PR body for the maintainer.

**Verify**:

```sh
pnpm build
ls dist/brand/                                        # → mark.svg mark-light.svg mark-dark.svg
grep -c 'prefers-color-scheme' dist/brand/mark.svg    # → 1
grep -o '#[0-9A-Fa-f]\{6\}' dist/brand/mark-light.svg | sort -u   # → only #A82334 and #E3B3B8
grep -n 'rel="icon"' dist/index.html                  # → the .ico line precedes the svg+xml line
grep -c 'sizes="32x32"' dist/index.html               # → 1
```

### Step 5: Publish the section

In `src/content/design.ts`, add a `mark` key to `SECTIONS`, positioned **after `type` and
before `controls`** — identity before furniture. Heading: **`Brand Mark`**, which is the term
a reader arriving from another design system searches for, per that module's own rule that a
heading is a lookup key and not a place to be distinctive.

Its lede says what the mark is, that its bar is measured, and that it is the identity device
the Data Visualization rules do not govern. Its don'ts carry the three real traps: do not
recolour it off `--brand-ink`; do not draw it where a control's own mark belongs; do not
redraw it from the document — fetch `/brand/mark.svg`.

Add **one** sentence to `SECTIONS.data.lede` naming the exception and pointing at the mark
section. **Neither section may restate the other**: the mark section owns *why the bar is not
a reading*; the data section owns *what a bar means when it is one*.

In `src/pages/design.astro`, add the specimen. Decision 8 fixes what it draws, and it is
three things rather than one:

1. **The size ladder** — the real mark at each step of `SIZE_LADDER`, labelled with its size.
2. **Both grounds** — the mark on a light surface and on a dark one, side by side, for the
   reason the Colors section already gives about `-on-ink` pairs: drawing only on the page's
   own ground renders the pale half of every pair as a mistake.
3. **The bar, named** — the two swatches with the words for what each region is, and the live
   figure in prose. This is the part that discharges the Data Visualization obligation; a
   specimen that draws the bar and does not name its scale reproduces on `/design` exactly
   the defect that section forbids.

Record the 16px softness here too (decision 7): one drawing at every size, the rays close up
at the smallest step, and that is accepted rather than unnoticed.

**Verify**:

```sh
pnpm build
grep -n '^## Brand Mark' DESIGN.md                    # → one hit, between Typography and Controls
grep -c '^## ' DESIGN.md                              # → one more than before
diff DESIGN.md dist/design.md                         # → no output
SKIP_BUILD=1 npx vitest run tests/design-system.test.ts
```

### Step 6: Publish the `components` token group

Create `src/lib/component-tokens.ts`. It **derives**; it authors nothing:

**The mechanism is SPIKED, not assumed — measured 2026-09-02 at `a1b8ee5`, and four of the
five facts below are traps you would otherwise hit one at a time:**

1. Import `createGenerator` from **`unocss`**, which is a direct devDependency. **Not from
   `@unocss/core`** — that is transitive, and pnpm's strict layout fails the import with
   `Cannot find package`. **No new dependency is needed**; do not add one.
2. `createGenerator` is **async** in v66: `const uno = await createGenerator(cfg)`.
3. **Strip `safelist` from the config before generating.** Otherwise every call emits the whole
   icon layer — measured at 44 KB of `data:` URIs — and the shortcut's own rule is a needle in
   it. Filter the result to lines containing `.${name}`.
4. `generate(name, {preflights: false})` then yields exactly the properties this step maps,
   **with `var(--token)` intact**, e.g. `.control-cta{min-height:3rem;…border-color:var(--accent);
   border-radius:0.5rem;background-color:var(--background);padding-left:0.75rem;…}`. Lengths
   arrive resolved (`3rem`, `0.5rem`, `2px`), which is the Dimension form the format wants.
5. **Two parsing quirks**: `transition-duration` is emitted TWICE (150ms then 300ms — last
   wins), and padding arrives as four longhands rather than a shorthand, so `padding` has to be
   recombined rather than read off.

- For each shortcut in `SHORTCUTS`, run the class name through UnoCSS's own generator
  (`createGenerator` over the config, per the spike above), parse the emitted declarations, and
  map a fixed set of CSS properties onto the spec's component property tokens: `background-color` →
  `backgroundColor`, `color` → `textColor`, `border-radius` → `rounded`, `padding` →
  `padding`, `min-height` → `height`, `min-width` → `width`. A declaration whose value is
  `var(--x)` is emitted in the format's own reference syntax against the token the Colors
  group already publishes — which is how `primary: "{colors.light-accent}"` is already
  written in `src/lib/design-doc.ts`.
- For `brand-mark`, read `MARK_GEOMETRY` and `SIZE_LADDER`.

In `src/content/design.ts`, delete the `components` entry from `OMISSIONS` (lines 469-474).
In `src/lib/design-doc.ts`, render the group into the front matter in the position the format
specifies (after `spacing`, before `omitted`), and rewrite the paragraph that explains why
`components` was omitted into one explaining what that reason actually answered — the bundle,
not the format. Keep the bundle claim where it already lives.

Create `tests/component-tokens.test.ts` with the two-way gate the icon census already has.

**Verify**:

```sh
pnpm build
grep -n '^components:' DESIGN.md                      # → one hit
grep -n 'section: components' DESIGN.md               # → no matches
grep -c '{colors.light-' DESIGN.md                    # → more than before
SKIP_BUILD=1 npx vitest run tests/component-tokens.test.ts tests/design-system.test.ts
```

### Step 7: Publish the tokens as JSON, and announce all of it

Create `src/pages/design_tokens.json.ts` and its committed twin `design_tokens.json` at the
repository root, **byte-identical, from one renderer** — the arrangement `DESIGN.md` and
`/design.md` already have, for the reason quoted in "Current state". The filename is the one
the format's own examples use beside a `DESIGN.md`
(`~/.opensrc/repos/github.com/google-labs-code/design.md/main/examples/*/design_tokens.json`),
which is what makes it findable by a tool that globs for it.

It carries the front matter's token groups plus `MARK_GEOMETRY`, so a consumer can draw the
mark without parsing an SVG.

In `src/pages/llms.txt.ts`, add `/design_tokens.json` and `/brand/mark.svg` as
`[name](url)` list items with notes, in the shape that file's own header documents — a
required hyperlink per item, notes after a colon.

**Verify**:

```sh
pnpm build
diff design_tokens.json dist/design_tokens.json       # → no output
node -e "JSON.parse(require('fs').readFileSync('design_tokens.json','utf8'));console.log('ok')"
grep -c 'design.md' dist/llms.txt                     # → 1, NOT 2: it is already announced
grep -c 'design_tokens.json' dist/llms.txt            # → 1
grep -c 'brand/mark.svg' dist/llms.txt                # → 1
SKIP_BUILD=1 npx vitest run tests/build-output.test.ts
```

### Step 8: Re-measure the agent budget

Adding a section to `SECTIONS` puts pressure on `.design-sync/conventions.md`, which
`tests/design-system.test.ts` holds to a character budget and which had roughly **200
characters of headroom** at the last recorded measurement (`.design-sync/NOTES.md` records
"237 spare", then a later entry "161 spare"; the live file is 3962 against a 4096 budget).
**Re-derive from NOTES.md rather than trusting any of those three figures.** Declare the mark section dropped in `AGENT_DROPS` with its reason
— that audience is handed a stylesheet and builds screens, and the mark is a file it can
fetch — and add one line pointing at `/brand/mark.svg` in its place.

Record the measurement in `.design-sync/NOTES.md`, in the shape its existing entries use.
**Re-measure; do not trust any figure written in this plan.**

**Verify**:

```sh
pnpm test:update                                      # regenerates the file snapshot
SKIP_BUILD=1 npx vitest run tests/design-system.test.ts
```

→ the suite passes. **Do not verify this by measuring the committed file**: the gate at
`tests/design-system.test.ts:313-321` asserts on `renderDesignDoc("agent").length`, and
`.design-sync/conventions.md` is a `toMatchFileSnapshot` that a plain `vitest run` never
rewrites — only `pnpm test:update` does. And `prepare-css.mjs` is unrelated: it writes
`.design-sync/.cache/css/tokens.css` and `site.css` and never touches `conventions.md`.

### Step 9: Regenerate `public/preview.jpg`

The hero is a render of the intro card, whose greeting mark just changed, so it is owed. The
recipe's parameters are **acceptance criteria, not preferences**: card **824×357** at a
1200px viewport; captured **3296px** wide at `deviceScaleFactor: 2 × clip.scale: 2`; resized
to **1180×511**; composited at **(10, 63)** on a 1200×630 canvas filled `#111111`; encoded
`q82 4:4:4 mozjpeg` → **50–56 KB**.

Mechanical traps, each one measured on this machine:

- Clip selector is `main > div:first-child`. **Assert the matched element contains an
  `<img>`** rather than assuming it is still the intro card.
- Freeze the `card-in` entrance before capturing, or the card is caught mid-slide.
- Seed `localStorage.theme` via `Page.addScriptToEvaluateOnNewDocument` **before** navigating,
  set `documentElement.dataset.theme` after load as well, and read back `--text` = `#fafafa`
  to prove the theme took. Asserting the attribute you just wrote proves nothing.
- `Emulation.setDeviceMetricsOverride` **requires `mobile`**; omitting it throws a
  deserialisation error that reads like a protocol-version problem.
- Resolve `sharp` with `createRequire('<repo>/package.json')('sharp')` from a scratch script.
  Plain `import sharp` from outside the tree fails, and `NODE_PATH` does not work for ESM.
- **There is no ImageMagick on this machine and it is not to be installed** (decided
  2026-08-08). Diff with `sharp`.

**Prove it is a retake, not a recomposition.** Build `origin/main` into the scratchpad
(`git archive`, symlink the repo's `node_modules`, run `node_modules/.bin/astro build`),
render it through the same pipeline, and diff both ways. **The metric that decides is the
bounding box of the changed pixels, never RMSE** — RMSE cannot separate JPEG noise from a
real change, which this repository has measured twice.

Then update the `tests/content.test.ts` fingerprint to watch the brand mark where it watched
the greeting mark.

**Verify**:

```sh
node -e "const s=require('sharp');s('public/preview.jpg').metadata().then(m=>console.log(m.width,m.height,m.size))"
```

→ `1200 630` and a size in **50000–56000**. Then `SKIP_BUILD=1 npx vitest run tests/content.test.ts`
→ passes. And the branch-vs-main changed box is **contained to the `<h1>` line**; a taller box
means the composition moved.

### Step 10: Documentation

`CLAUDE.md` gains the mark, its four placements, the three refusals, and the retraction of the
`components` omission.

**It also has one sentence this plan makes FALSE, and step 1 is what breaks it.**
`CLAUDE.md:181` reads "`uno.config.ts` holds the icon safelist, the `blocklist`, **six
shortcuts**, the presets…". After step 1 the shortcuts live in `src/lib/shortcuts.ts`.
Retarget the sentence and **keep the spelled-out count**: `tests/docs-drift.test.ts` derives
that number from the config and requires this file to contain it as a canonical phrase, so
reword around it and never edit the number by hand.

`README.md` gains the brand resources only if it already names that class of thing.
`.devin/wiki.json` gets **nothing** — see Scope.

**Verify**: `SKIP_BUILD=1 npx vitest run tests/docs-drift.test.ts` → all pass.

## Test plan

New tests, modelled structurally on `tests/design-system.test.ts` — same imports from
`tests/helpers/css` and `tests/helpers/pages`, same `describe`/`it` shape, same practice of
writing the *reason* for an assertion above it.

**`tests/brand-mark.test.ts`** (new):

- `markFill()` equals the average of each goal's clamped fraction — computed in the test from
  `GOALS`, never typed.
- `markSvg` emits exactly five rays, at the geometry module's angles, **at every size** —
  decision 7 means there is one drawing and no ray-less variant, so a size argument may not
  change the shape.
- The intro card's mark is `1.4em` and carries `vertical-align: -0.145em` (decision 6), read
  from the built HTML rather than from the component source.
- `markSvg` contains no colour it was not given: passing sentinel values yields an SVG whose
  only hex-like tokens are those sentinels.
- The three `/brand/*.svg` routes' output contains only colours present in `PALETTE`.
- `/brand/mark.svg` contains a `prefers-color-scheme: dark` block carrying the dark pair.

**`tests/component-tokens.test.ts`** (new):

- Every component in the emitted group resolves to a real shortcut in `SHORTCUTS` or to
  `brand-mark`.
- Every shortcut that ships a rule, and `brand-mark`, appears in the group. (Both directions —
  this is the `ICON_IDS` treatment.)
- Every emitted value matches the shipped stylesheet, read with `pageCss`.

**Extended**: `tests/design-system.test.ts` gains the Brand Mark section's presence, its
position between Typography and Controls, and the agreement between that section and the Data
Visualization sentence. `tests/content.test.ts`'s intro-card fingerprint is updated.

**Every assertion must be mutation-proven** — break it, watch the named test go red, restore
it. An assertion that cannot fail is decoration:

| Mutation | Test that must redden |
|---|---|
| change one goal's `total_goal` | `brand-mark` fill |
| type a hex into a `/brand` route | `brand-mark` palette check |
| delete the `prefers-color-scheme` block | `brand-mark` theming |
| reorder the two `rel="icon"` links | the resolved-icon check in Done criteria, NOT a source-order grep |
| change `chip`'s `px-[0.7rem]` | `component-tokens` value match |
| add a seventh shortcut | `component-tokens` completeness |
| delete a component entry | `component-tokens` completeness |
| add a banner to `/design_tokens.json` | byte-identity |
| duplicate a `##` heading in the doc | `design-system` |
| delete the Data Visualization sentence | `design-system` agreement |
| restore `WELCOME.greeting_icon` | `design-system` census, both ways |

**Verification**: `pnpm test` → exit 0, with the new files passing and no snapshot left
obsolete.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0; `tests/brand-mark.test.ts` and `tests/component-tokens.test.ts`
      exist and pass
- [ ] `grep -rn 'open-arm' src/` returns no matches
- [ ] `ls dist/brand/` lists exactly `mark.svg`, `mark-light.svg`, `mark-dark.svg`
- [ ] The browser actually RESOLVES the SVG, not the frozen `.ico`. Load the built page in
      the same CDP driver step 9 uses and read back the resolved icon URL; it must be
      `/brand/mark.svg`. A source-order grep is not evidence for this and must not be
      substituted for it.
- [ ] `diff design_tokens.json dist/design_tokens.json` produces no output
- [ ] `diff DESIGN.md dist/design.md` produces no output
- [ ] `grep -n '^components:' DESIGN.md` returns exactly one hit
- [ ] `grep -n 'section: components' DESIGN.md` returns no matches
- [ ] `node -e "const s=require('sharp');s('public/preview.jpg').metadata().then(m=>console.log(m.width,m.height))"`
      prints `1200 630`
- [ ] `<main>` on the built home page measures **809px at 1280px wide and 829px at 1024px
      wide** at the default text size — the same figures as `main`. Measure on the built page
      with the CDP driver; do not reason about it.
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] The PR body names the `.ico` fixed-fill decision so the maintainer can overturn it in
      one line, and carries the preview.jpg changed-box diff as evidence

## STOP conditions

Stop and report back — do not improvise — if:

- **The "Current state" excerpts do not match the live code.** The tree has drifted since
  `a1b8ee5`.
- **A step's verification fails twice** after a reasonable fix attempt.
- **A fix appears to require touching an out-of-scope file.**
- **`<main>` grows at either viewport.** The budget is 14px at 1280+ and 24px at 1024, and
  this change is meant to cost zero. Report the delta; do not spend the slack.
- **`.design-sync/conventions.md` cannot be brought under budget** without dropping a claim
  that has no twin elsewhere in that document. Report the arithmetic; do not drop a lone
  claim to make room.
- **The preview regeneration's changed box is taller than the `<h1>` line.** You are
  recomposing the hero rather than retaking it.
- **The generator spike in step 6 does not reproduce.** It was run and measured at `a1b8ee5`
  (see step 6), so a failure means something moved. Do not paper over it with a second copy of
  the shortcuts: the fallback is to derive the values from the shipped sheet in the test and
  author them in the module under that gate.
- **Retracting `components` breaks a DESIGN.md consumer.** Report the message rather than
  reinstating the omission with the old reason.

## Maintenance notes

For whoever owns this after it lands:

- **The mark's fill moves whenever the bot writes `src/data/strava-progress.json`**, so
  `/brand/*.svg` and the favicon change on most builds. That is intended, and it is why the
  `.ico` fallback is documented as fixed rather than left to look stale.
- **On 1 January the fill drops to near zero** and the mark is nearly empty for weeks. That is
  the honest reading, and the same behaviour the goal cards already have. If it reads badly,
  the fix is a floor argued in `brand-mark.ts` — not a different figure.
- **What a reviewer should scrutinise**: that no hex was typed into any new module; that the
  Brand Mark and Data Visualization sections do not restate each other; that `<main>`'s
  measurement is a measurement and not an assertion; and that the preview regeneration's
  changed box is contained.
- **Deferred out of this plan, deliberately**: the share card (plan 049); teaching
  `calvin-sg-token-drift` on the Hermes box about `/design_tokens.json`, which is a
  terminal-config change; and the deletion `ProgressBar.astro` is owed by plan 047.

## plans/README.md updates (reviewer applies at acceptance — not the executor)

- Add row 048 to the execution table: P2 / L / depends on — / status.
- **Two baseline rows go false and neither is a mark census** (there is no such row):
  - `plans/README.md:615` — "`<svg>` in the HTML | **zero** — icons are UnoCSS `presetIcons`
    mask rules". The `<h1>`'s brand mark is an inline `<svg>`, so this becomes non-zero.
  - `plans/README.md:617` — the `uno.config.ts` row, whose line count and shortcut list both
    move when step 1 extracts `src/lib/shortcuts.ts`. (That cell already reads "four
    shortcuts" against a live six, so it was stale before this plan; re-derive rather than
    patch.)
  Both cells say "derive" — re-derive them, do not edit the numbers by hand.
