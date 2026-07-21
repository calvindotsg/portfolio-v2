# Plan 004: Fix the rendered-output defects, and assert every one of them

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: this plan was written against commit `4550e1f`,
> but plans 002 and 003 land before it and *do* modify some in-scope files. A
> plain `git diff --stat` is therefore useless here. Instead run the eight
> content probes in [Drift check](#drift-check) below. Every one must produce
> the stated output. Any mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — one deliberate, visible change (the bullet lists shrink from
  16px to 14px). Everything else is byte-identical rendered output.
- **Depends on**: `plans/001-regression-safety-net.md`,
  `plans/002-*.md`, `plans/003-*.md`. **All three must be merged to `main`
  before you start.** 001 creates the test suite this plan extends; 002 makes
  the build static; 003 rewrites `BasicLayout.astro` and the two Svelte
  components.
- **Category**: bug
- **Planned at**: commit `4550e1f`, 2026-07-21

## Why this matters

This site's entire product is the HTML it emits. Five separate defects survive
`pnpm check`, `pnpm eslint` and a green `pnpm build` today because all three
gates stop at "does it compile":

- The only machine-readable identity claim the site makes — its JSON-LD `Person`
  block — is malformed (`sameAs` is an array-of-arrays) and factually wrong
  (it names Calvin's employer as "Founding Solutions Engineer"). This has been
  live in production for roughly two years.
- Two bullet lists are styled with `text-sm-1`, a class that generates no CSS at
  all, so they silently render at the inherited size instead of the intended one.
- The hero `<img>` carries a hand-tuned `sizes` attribute that the browser
  ignores, because no `srcset` is ever emitted.
- The `Card` primitive advertises a 10-prop API of which 3 are real, plus a
  conditional branch that has never executed.
- `Button` declares a `rounded` prop nothing passes and silently swallows the
  `aria-label` its two call sites pass.

**Plan 001 deliberately left these unasserted.** Its suite had to be green on the
current, broken code, so it wrote `expect(Array.isArray(schema.sameAs)).toBe(true)`
rather than asserting the correct shape, and said nothing at all about `text-sm-1`.
This plan is where those assertions arrive. **Every fix below lands together with
the test that would have caught it.** A fix without its assertion is not done.

## Current state

### Files involved

| File | Role | Defect |
|---|---|---|
| `src/layouts/BasicLayout.astro` | `<head>`, JSON-LD, global CSS | nested `sameAs`, wrong `worksFor.name`, relative URL in `sameAs`, `http` context |
| `src/lib/constants.ts` | single source of truth for all content | `NOW.description` typed `string[]`, consumed as a string |
| `src/components/AboutMe.astro` | about-me bullet list | `text-sm-1` (no CSS) |
| `src/components/Career.astro` | career bullet lists (×2) | `text-sm-1` (no CSS) |
| `src/components/Button.astro` | the icon button | dead `rounded` prop, `custom-btn` (no CSS) |
| `src/components/IntroCard.astro` | hero card | inert `sizes` on `<Image>`, dead `aria-label` on `<Button>` |
| `src/components/Goal.astro` | cycling-goal card | dead `aria-label` on `<Button>` |
| `src/components/Card/index.astro` | the layout primitive, used 6× | 7 phantom props, dead `href` branch, `transform-y-[-40%]` (no CSS) |
| `src/components/Card/Content.astro` | 14-line fragment, 1 consumer | dead `body` branch; the whole file collapses into `index.astro` |
| `tests/rendered-html.test.ts` | plan 001's Container-API suite | to extend |
| `tests/constants.test.ts` | plan 001's data-invariant suite | to extend |
| `tests/build-output.test.ts` | plan 001's `dist/` suite | to extend |

### Excerpt 1 — the JSON-LD block, `src/layouts/BasicLayout.astro:12-30`

```astro
const schema = {
    "@context": "http://schema.org",
    "@type": "Person",
    name: METADATA.name,
    url: METADATA.site_url,
    sameAs: [LINKS.map(item => item.link)],
    image: METADATA.image_url,
    jobTitle: CAREER[0].job_name,
    worksFor: {
        "@type": "Organization", name: CAREER[0].job_name, address: {
            "@type": "PostalAddress",
            addressLocality: METADATA.address_locality,
            addressCountry: METADATA.address_country,
        },
    },
    nationality: {
        "@type": "Country", name: METADATA.address_locality,
    },
};
```

Three real defects here, verified against `curl -s https://calvin.sg/`:

1. **`sameAs: [LINKS.map(...)]`** wraps an already-array `.map()` result in another
   array. Production emits `"sameAs":[["https://github.com/calvindotsg/", …, "/resume.pdf"]]`.
   schema.org's range for `sameAs` is `URL`, so a nested array is invalid.
2. **`worksFor.name` is `CAREER[0].job_name`** — a copy-paste of the `jobTitle`
   line above it. Production emits `"worksFor":{"@type":"Organization","name":"Founding Solutions Engineer"}`.
   The correct field, `CAREER[0].company` (`"HeyMax"`), exists at
   `src/lib/constants.ts:28` and is **never referenced by this layout**.
3. **`/resume.pdf` lands in `sameAs`.** `src/lib/constants.ts:16` is
   `{ link: "/resume.pdf", logo: "ri:file-pdf-2-line", name: "Resume" }` — a
   site-relative path, flowing into `sameAs` through the unfiltered `.map()`.

> **`"@context": "http://schema.org"` is NOT one of the defects.** The audit's
> skeptic pass explicitly struck this evidence bullet: `http://schema.org` is a
> valid, widely-used context value and schema.org serves both schemes. Step 1
> changes it to `https` anyway because it is one character and `https` is the
> modern canonical form — but do not describe it as a bug fix in the commit
> message, and do not let it justify any additional change.

### Excerpt 2 — the dead classes

`src/components/AboutMe.astro:8`:
```astro
        <ul class="text-sm-1 font-light list-disc list-inside">
```

`src/components/Career.astro:13`:
```astro
        <ul class="text-sm-1 font-light list-disc list-inside">
```

`src/components/Button.astro:10`:
```astro
        class={`custom-btn text-xl max-h-[50px] shadow-custom shadow-[var(--shadow)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] text-[var(--text)] px-5 py-2 border border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-300 ease-in-out bg-[var(--background)] cursor-pointer ${rounded ? "rounded-full" : "rounded-lg"}`}
```

`src/components/Card/index.astro:22` (fragment):
```astro
        class={`card group overflow-hidden transform-y-[-40%] ${bgColor || "bg-[var(--card-background)]"} shadow-lg rounded-lg ${padding || "p-6"} …
```

All three of `text-sm-1`, `custom-btn` and `transform-y-[-40%]` were verified
against the built stylesheet: `grep -c` on `dist/_astro/index.*.css` returns **0**
for each. The stylesheet *does* contain `.text-sm{font-size:.875rem;line-height:1.25rem}`
(emitted for `Now.astro:17` and `IntroCard.astro:15`), and it contains
`.font-light`, `.list-disc`, `.list-inside`, `.perspective-1200` — so the rest of
those class lists is real and must be preserved verbatim.

> **This is the one deliberate visual change in the entire seven-plan refactor.**
> Correcting `text-sm-1` → `text-sm` gives the about-me bullets and both career
> bullet lists a `font-size` they do not have today: they go from the inherited
> 16px down to 14px, matching the "Now" card's paragraph and the `welcome`
> heading. That is what the author clearly intended (the typo is a stray `-1`),
> and it makes the three bullet lists consistent with every other small-print
> block on the page. Every other change in this plan, and in plans 002–007,
> leaves the page pixel-identical. Say so in the commit message.

### Excerpt 3 — `src/lib/constants.ts:86-90` and its consumer

```ts
export const NOW: {
    description: string[]
} = {
    description: ["Building things at a startup, probably cycling when you find me"]
}
```

`src/components/Now.astro:17`:
```astro
    <p class="text-sm">{NOW.description}</p>
```

This renders correctly **today** only because a one-element array stringifies to
its single element. It is a latent trap, not a live bug — the rendered output is
byte-identical before and after the fix, and the audit's skeptic pass downgraded
this finding for exactly that reason. It is worth one line because
`src/lib/constants.ts` is the file `CLAUDE.md` designates as the user-editable
surface and the highest-churn file in the repo: adding a second sentence — the
natural thing to do, since every neighbouring constant is a multi-line list —
would render `a,b` with no separator, and nothing would catch it.

The sibling components show the intended contract for a `string[]`:
`src/components/AboutMe.astro:9-10` and `src/components/IntroCard.astro:16` both
`.map()` over theirs. `NOW` is the odd one out.

### Excerpt 4 — `src/components/Button.astro:1-13`, in full

```astro
---
interface Props {
    rounded?: boolean;
}

const {rounded} = Astro.props;
---

<button
        class={`custom-btn text-xl … cursor-pointer ${rounded ? "rounded-full" : "rounded-lg"}`}
>
    <slot/>
</button>
```

The two call sites are `src/components/IntroCard.astro:21` and
`src/components/Goal.astro:25`:

```astro
                    <Button aria-label={name}>
                        <Icon name={logo} class="h-6"/>
                        <span class="sr-only">{name} Profile</span>
                    </Button>
```
```astro
                    <Button aria-label="Follow me button">
                        <Icon name={`${GOAL.cta_logo}`} class="h-6" />
                        <span class="sr-only">Follow me</span>
                    </Button>
```

(**Correction, verified against `main` after 003 merged**: plan 003 does *not*
touch the `<Icon …/>` lines — it explicitly lists them as out of scope, and
**plan 006** is what replaces them with `<span class={…}>`. Both call sites still
read exactly as quoted above, `<Icon>` included. Leave those lines alone; the
`<Button aria-label=…>` lines are the only thing this plan changes here.)

Neither call site passes `rounded`; production HTML has 7 `custom-btn` buttons,
7 with `rounded-lg`, 0 with `rounded-full`. And `Button` renders a bare
`<button class={…}>` with no `{...Astro.props}` spread, so both `aria-label`
values are silently dropped — production HTML confirms none of the 7 buttons
carries one.

> **Do NOT "fix" this by forwarding `aria-label`.** The audit's skeptic pass
> refuted the auditor's impact claim here. Every one of these buttons already has
> an accessible name from its own content — the `<span class="sr-only">` child,
> which the stylesheet renders with the standard visually-hidden pattern
> (`clip:rect(0,0,0,0);width:1px;height:1px;position:absolute;overflow:hidden`),
> keeping the text in the accessibility tree. Accessible-name computation prefers
> `aria-label` over content, so forwarding it would **downgrade** the names:
> "Github Profile" → "Github", and "Follow me" → "Follow me button". That is a
> regression. The correct fix is to delete the two dead `aria-label` props at the
> call sites and leave `Button` with no prop surface at all.

### Excerpt 5 — `src/components/Card/index.astro`, in full

```astro
---
import {Icon} from "astro-icon/components";
import Content from "./Content.astro";

interface Props {
    title?: string;
    body?: string;
    colSpan?: string;
    rowSpan?: string;
    href?: string;
    colorText?: string;
    height?: string;
    width?: string;
    padding?: string;
    bgColor?: string;
}

const {title, body, colSpan, rowSpan, href, colorText, height, padding, bgColor} = Astro.props;
---

<div
        class={`card group overflow-hidden transform-y-[-40%] ${bgColor || "bg-[var(--card-background)]"} shadow-lg rounded-lg ${padding || "p-6"} border border-[var(--card-border)] hover:border-[var(--accent)] flex-none ${height || "h-full"} justify-start relative perspective-1200 w-full transition-colors duration-300 ease-in-out col-span-1 ${colSpan || "md:col-span-2"} ${rowSpan || ""}`}
>
    {href ? (<a href={href} class="h-full w-full text-[var(--text)]">
        <Icon
                name="ri:arrow-right-up-line"
                class="h-6 float-right group-hover:text-[var(--accent)] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform ease-in-out duration-300 z-20"
        />
        <Content title={title} body={body}>
            <slot/>
        </Content>
    </a>) : (
            <Content title={title} body={body}>
                <slot/>
            </Content>)}
</div>
```

and `src/components/Card/Content.astro`, in full (14 lines):

```astro
---
interface Props {
    title?: string;
    body?: string;
}

const {title, body} = Astro.props;
---

<>
    {title && <h2 class="text-xl font-bold m-0 z-20">{title}</h2>}
    {body && <p class="m-0 font-light text-base">{body}</p>}
    <slot/>
</>
```

There are exactly six `<Card>` call sites, and an exhaustive grep confirms they
pass only `title`, `colSpan` and `rowSpan`:

- `src/components/IntroCard.astro:11` — `colSpan`, `rowSpan`
- `src/components/Goal.astro:9` — `colSpan`, `rowSpan`, `title`
- `src/components/AboutMe.astro:6` — `colSpan`, `rowSpan`, `title`
- `src/components/Career.astro:7-11` — `colSpan`, `rowSpan`, `title`
- `src/components/Now.astro:7` — `colSpan`, `rowSpan`
- `src/pages/index.astro:87` — `colSpan`, `rowSpan`

So `body`, `href`, `colorText`, `height`, `width`, `padding` and `bgColor` are
passed by nobody. `colorText` is destructured but never referenced (eslint warns
about it at `Card/index.astro:18:45`); `width` is declared but never even
destructured. The whole `href` ternary branch has never rendered.

> **Note for the executor — plan 006 depends on this step.** The `<Icon>` inside
> the dead `href` branch is the **only static `astro-icon` reference in the
> repository**; every other icon is derived from `src/lib/constants.ts` at
> runtime. Deleting this branch (and the `import {Icon} from "astro-icon/components"`
> on line 2) is a prerequisite for plan 006's switch to UnoCSS `presetIcons`.
> Do not leave the import behind "just in case".

> **The fix sketch in the audit would break the build**, and the skeptic pass
> caught it: line 22 interpolates `bgColor`, `padding` and `height` as fallback
> expressions. You cannot delete them from `Props` without also **hardcoding the
> three fallback literals** into the class string. Step 5 gives you the exact
> target string. Copy it.

### Excerpt 6 — the inert `sizes`, `src/components/IntroCard.astro:29-38`

```astro
            <Image
                    src={portfolioImage}
                    alt={`${METADATA.name}`}
                    width="275"
                    height="275"
                    sizes="(max-width: 415px) 275px, (min-width: 416px) and (max-width: 1024px) 415px, 550px"
                    format="webp"
                    class="w-auto max-h-[415px] select-none absolute right-[-50px] top-1/2 transform -translate-y-1/2 z-[-1] opacity-70 md:opacity-100 md:relative md:right-auto md:top-auto md:transform-none md:z-auto pointer-events-none md:shadow-[10px_10px_0_var(--shadow)] rounded-[8px]"
                    loading="eager"
            />
```

Astro emits a `srcset` only when given `widths` or `densities`. Neither is
present, so no `srcset` is emitted, and per the HTML spec a `sizes` attribute
without a `srcset` is a **no-op**. This was confirmed against production: the one
`<img>` on the page carries `sizes="…"` and a single `src`, with no `srcset`.

### Repo conventions to match

- 4-space indent in `.astro` and `.ts`, double quotes, semicolons in frontmatter.
- All user-configurable content lives in `src/lib/constants.ts` as exported
  consts with inline type annotations. `CLAUDE.md` states this explicitly —
  **keep every fix driven from those constants**; never hardcode a URL or a
  company name into a component.
- Conventional-commit subjects: `fix:`, `refactor:`, `chore:` (see
  `git log --oneline`, e.g. `fix(constants): remove thousands separator breaking the build`).

## Drift check

Run all eight. Every one must produce the stated result before you change
anything. Line numbers are omitted deliberately — plans 002 and 003 shift them.

| # | Command | Expected |
|---|---|---|
| 1 | `grep -c 'sameAs: \[LINKS.map(item => item.link)\]' src/layouts/BasicLayout.astro` | `1` |
| 2 | `grep -c 'name: CAREER\[0\].job_name' src/layouts/BasicLayout.astro` | `1` |
| 3 | `grep -rc 'text-sm-1' src/components/AboutMe.astro src/components/Career.astro` | `…AboutMe.astro:1` and `…Career.astro:1` |
| 4 | `grep -c 'rounded ? "rounded-full" : "rounded-lg"' src/components/Button.astro` | `1` |
| 5 | `grep -c 'transform-y-\[-40%\]' src/components/Card/index.astro` | `1` |
| 6 | `grep -c 'description: string\[\]' src/lib/constants.ts` | `4` (WELCOME, ABOUT_ME, NOW, and CAREER's) |
| 7 | `grep -c 'sizes=' src/components/IntroCard.astro` | `1` |
| 8 | `ls tests/rendered-html.test.ts tests/constants.test.ts tests/build-output.test.ts` | all three listed |

If probe 8 fails, plan 001 has not landed — **STOP**.
If probes 1–7 disagree, the code has drifted — **STOP** and report which one.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0 (warnings tolerated) |
| Test | `pnpm test` | exit 0, all pass |
| Single test file | `pnpm exec vitest run tests/<file>` | all pass |
| Build | `pnpm build` | exit 0, `Complete!` |
| Reuse last build in tests | `SKIP_BUILD=1 pnpm test` | faster iteration |

**Use `pnpm` for everything. Never `npm`.** (`packageManager` is pinned to
`pnpm@10.32.1`.)

## Scope

**In scope** (the only files you may modify or delete):

- `src/layouts/BasicLayout.astro` — the JSON-LD block only (steps 1)
- `src/lib/constants.ts` — the `NOW` export only (step 3)
- `src/components/AboutMe.astro` (step 2)
- `src/components/Career.astro` (step 2)
- `src/components/Button.astro` (step 4)
- `src/components/IntroCard.astro` — the `<Button aria-label>` and the `sizes` line (steps 4, 6)
- `src/components/Goal.astro` — the `<Button aria-label>` only (step 4)
- `src/components/Card/index.astro` (step 5)
- `src/components/Card/Content.astro` — **delete** (step 5)
- `tests/rendered-html.test.ts`, `tests/constants.test.ts`, `tests/build-output.test.ts` (steps 1–7)
- `plans/README.md` — status row only

**Out of scope** (do NOT touch, even though they look related):

- **The rest of `src/layouts/BasicLayout.astro`.** Plan 002 owns the canonical /
  `og:url` / `og:image` tags (they derive from `Astro.url`, which prerendering
  fixes), and plan 003 owns the `<style is:global>` block and the theme script.
  Touch the `const schema = {…}` object and nothing else in that file.
- `uno.config.ts` — **plan 005 owns it.** Do not add a rule, a shortcut or a
  safelist entry to make `text-sm-1`, `custom-btn` or `transform-y-[-40%]` work.
  Those classes are typos; the fix is to remove them, not to define them.
- `astro-icon` and `@iconify-json/*` — **plan 006 owns the replacement.** Step 5
  removes one `import {Icon}` line because its only use is dead code; it does not
  touch the dependency, `package.json`, or the dynamic `<Icon>`/`<span class="i-…">`
  usages in `IntroCard.astro` and `Goal.astro`.
- `README.md`, `CLAUDE.md`, `llms.txt` — **plan 007 owns the docs.**
- `src/components/ProgressBar.*`, `src/components/ThemeSwitcher.*`,
  `src/pages/index.astro` — plans 002/003 own these; they are already in their
  final shape when you start.
- **The `card` class on `Card`'s wrapper `<div>`.** It generates no CSS rule
  either, but unlike `transform-y-[-40%]` it is a semantic hook, not a mistyped
  utility. Leave it.
- **`ABOUT_ME.description` copy.** It is the owner's own self-description; do not
  edit the words while fixing the class on the `<ul>` that renders them.
- **`WELCOME.description.map((item, index) => …)`'s unused `index`** at
  `IntroCard.astro:16`. Plan 005 owns the remaining eslint warning. Leave it.

## Git workflow

- Branch: `fix/004-rendered-output-defects` off `main`.
- One commit per step, or one per logical unit; conventional-commit subjects
  matching `git log` style, e.g.
  `fix(seo): emit a flat sameAs list and name the real employer in JSON-LD`.
- The step-2 commit must state in its body that the bullet lists visibly shrink
  from 16px to 14px and that this is the intended correction of a typo.
- Do **not** push or open a PR unless the operator instructed it.

## Steps

### Step 0: Record the test baseline

Plans 001–003 have each added tests, so you cannot know the current total from
this file. Capture it now — the done criteria are expressed as a delta.

```
pnpm test
```

Write down the `Tests  N passed (N)` number. Call it **`BASE`**. Everything must
still pass at this point.

**Verify**: `pnpm test` → exit 0, no failures. Record `BASE`.

### Step 1: Fix the JSON-LD Person block, and assert its shape

In `src/layouts/BasicLayout.astro`, replace the `const schema = {…}` object with
exactly this:

```astro
const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: METADATA.name,
    url: METADATA.site_url,
    sameAs: LINKS.filter(item => /^https?:\/\//.test(item.link)).map(item => item.link),
    image: METADATA.image_url,
    jobTitle: CAREER[0].job_name,
    worksFor: {
        "@type": "Organization", name: CAREER[0].company, address: {
            "@type": "PostalAddress",
            addressLocality: METADATA.address_locality,
            addressCountry: METADATA.address_country,
        },
    },
    nationality: {
        "@type": "Country", name: METADATA.address_locality,
    },
};
```

Four changes, in order of importance:

1. `sameAs` loses the outer brackets — it is now a flat `string[]`.
2. `worksFor.name` reads `CAREER[0].company` (`"HeyMax"`) instead of
   `CAREER[0].job_name`. `jobTitle` keeps `job_name`, which was always correct.
3. `sameAs` is **filtered to absolute URLs**, which drops `/resume.pdf`.
4. `@context` moves to `https` (cosmetic — see the note in "Current state").

**Why filter rather than resolve `/resume.pdf` against `METADATA.site_url`?**
Both are one line, so the tie-break is semantics. schema.org defines `sameAs` as
"a reference Web page that unambiguously indicates the item's identity" — an
external profile that corroborates who you are. A PDF hosted on your own site
corroborates nothing that `url: METADATA.site_url` does not already assert, so it
does not belong in `sameAs` under either spelling. Filtering also keeps the block
fully driven from `LINKS`: add a new social profile to `src/lib/constants.ts` and
it appears in `sameAs` automatically, exactly as `CLAUDE.md` requires.

Now add the assertions. In `tests/rendered-html.test.ts`, inside the existing
`describe("JSON-LD structured data", …)` block, **replace** the test currently
reading:

```ts
    it("exposes a sameAs list", () => {
        expect(Array.isArray(schema.sameAs)).toBe(true);
    });
```

with these three:

```ts
    it("exposes sameAs as a flat list of the absolute LINKS URLs", () => {
        const absolute = LINKS.filter((l) => /^https?:\/\//.test(l.link)).map((l) => l.link);
        expect(absolute.length, "LINKS must contain at least one absolute URL").toBeGreaterThan(0);
        // Flat array of strings — not [[…]], and no site-relative paths.
        expect(schema.sameAs).toEqual(absolute);
        for (const entry of schema.sameAs) expect(entry).toMatch(/^https?:\/\//);
    });

    it("names the employer in worksFor, and the job title in jobTitle", () => {
        expect(schema.worksFor.name).toBe(CAREER[0].company);
        expect(schema.jobTitle).toBe(CAREER[0].job_name);
        expect(schema.worksFor.name).not.toBe(schema.jobTitle);
    });

    it("uses the https schema.org context", () => {
        expect(schema["@context"]).toBe("https://schema.org");
    });
```

`LINKS` and `CAREER` are already imported at the top of that file by plan 001 —
do not add imports.

**Verify**, both:
- `pnpm exec vitest run tests/rendered-html.test.ts` → all pass, **2 more tests than before**
- `pnpm check` → `0 errors`

### Step 2: Correct `text-sm-1` → `text-sm`, and assert the lists are styled

This is the deliberate visual change. Two one-token edits.

`src/components/AboutMe.astro:8` — change
`<ul class="text-sm-1 font-light list-disc list-inside">` to:

```astro
        <ul class="text-sm font-light list-disc list-inside">
```

`src/components/Career.astro:13` — the identical change:

```astro
        <ul class="text-sm font-light list-disc list-inside">
```

Change nothing else on those lines; `font-light`, `list-disc` and `list-inside`
all emit real rules and must be preserved in the same order.

Now add the assertion. In `tests/rendered-html.test.ts`, append a new `describe`
block at the end of the file:

```ts
describe("markup defects fixed by plan 004", () => {
    it("styles every bullet list with a class the stylesheet actually defines", () => {
        const lists = [...doc.querySelectorAll("main ul")];
        expect(lists.length, "the about-me and career cards render <ul>s").toBeGreaterThan(0);
        for (const ul of lists) {
            // Token-wise, not substring-wise: "text-sm-1" contains "text-sm".
            const tokens = (ul.getAttribute("class") ?? "").split(/\s+/);
            expect(tokens).toContain("text-sm");
            expect(tokens).not.toContain("text-sm-1");
        }
    });
});
```

The token split matters: a naive `toContain("text-sm")` on the raw class string
passes even with the bug present.

**Verify**, all three:
- `pnpm exec vitest run tests/rendered-html.test.ts` → all pass, **1 more test**
- `pnpm build` → `Complete!`
- `grep -c 'text-sm-1' dist/_astro/*.css` → `0` on every file, **and**
  `grep -o '\.text-sm{[^}]*}' dist/_astro/*.css` → `.text-sm{font-size:.875rem;line-height:1.25rem}`

### Step 3: Make `NOW.description` a string, and assert its type

In `src/lib/constants.ts`, replace the `NOW` export with:

```ts
export const NOW: {
    description: string
} = {
    description: "Building things at a startup, probably cycling when you find me"
}
```

Do **not** touch `src/components/Now.astro` — `{NOW.description}` is already
correct for a string, and the rendered HTML is byte-identical before and after.

Add to `tests/constants.test.ts`, as a new `describe` block (place it next to the
existing `describe("prose blocks", …)`):

```ts
describe("NOW", () => {
    it("is a single string, so a second sentence cannot silently run together", () => {
        expect(typeof NOW.description).toBe("string");
        expect(Array.isArray(NOW.description)).toBe(false);
    });
});
```

`NOW` is already imported at the top of that file by plan 001. Its existing
assertion `expect(NOW.description.length).toBeGreaterThan(0)` in
`describe("prose blocks", …)` still holds for a string — leave it alone.

**Verify**, all three:
- `pnpm exec vitest run tests/constants.test.ts` → all pass, **1 more test**
- `pnpm check` → `0 errors` (a leftover `.map()` or `[0]` on `NOW.description`
  would surface here)
- `pnpm exec vitest run tests/rendered-html.test.ts` → still all pass (the "Now"
  card text is unchanged)

### Step 4: Strip `Button` to nothing, drop the two dead `aria-label` props

Replace `src/components/Button.astro` in full with:

```astro
<button
        class="text-xl max-h-[50px] shadow-custom shadow-[var(--shadow)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] text-[var(--text)] px-5 py-2 border border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-300 ease-in-out bg-[var(--background)] cursor-pointer rounded-lg"
>
    <slot/>
</button>
```

Note what happened: the frontmatter fence is gone entirely (an `.astro` file
without frontmatter is valid), `custom-btn` is dropped (no CSS rule), the
`rounded` ternary is collapsed to the literal `rounded-lg` it always produced,
and the class attribute is now a plain string rather than a template literal.
`shadow-custom` is kept — it *does* emit a rule.

Then delete the now-dead attribute at the two call sites.

`src/components/IntroCard.astro` — change `<Button aria-label={name}>` to:

```astro
                    <Button>
```

`src/components/Goal.astro` — change `<Button aria-label="Follow me button">` to:

```astro
                    <Button>
```

Leave both `<span class="sr-only">…</span>` children exactly as they are — they
are what gives each button its accessible name. Leave the `aria-label` on the
wrapping `<a>` elements alone too; those are real and reach the DOM.

Add the assertion, inside the `describe("markup defects fixed by plan 004", …)`
block created in step 2:

```ts
    it("labels every button from its own content, without an overriding aria-label", () => {
        const buttons = [...doc.querySelectorAll("button")];
        expect(buttons.length, "the page renders icon buttons").toBeGreaterThan(0);
        for (const button of buttons) {
            const srOnly = button.querySelector(".sr-only")?.textContent?.trim() ?? "";
            const ariaLabel = button.getAttribute("aria-label") ?? "";
            expect(srOnly || ariaLabel, "every button needs an accessible name").not.toBe("");
            // aria-label wins over content, so it must not sit on top of sr-only text.
            if (srOnly) expect(ariaLabel, "aria-label would override the sr-only name").toBe("");
        }
    });
```

This also passes for the theme-toggle button plan 003 introduces, which carries
an `aria-label` and no `sr-only` child.

**Verify**, all three:
- `pnpm exec vitest run tests/rendered-html.test.ts` → all pass, **1 more test**
- `grep -rc 'rounded-full\|custom-btn' src/` → no matches in any file
- `pnpm check` → `0 errors`

### Step 5: Collapse `Card` to its three real props and delete `Content.astro`

Replace `src/components/Card/index.astro` in full with:

```astro
---
interface Props {
    title?: string;
    colSpan?: string;
    rowSpan?: string;
}

const {title, colSpan, rowSpan} = Astro.props;
---

<div
        class={`card group overflow-hidden bg-[var(--card-background)] shadow-lg rounded-lg p-6 border border-[var(--card-border)] hover:border-[var(--accent)] flex-none h-full justify-start relative perspective-1200 w-full transition-colors duration-300 ease-in-out col-span-1 ${colSpan || "md:col-span-2"} ${rowSpan || ""}`}
>
    {title && <h2 class="text-xl font-bold m-0 z-20">{title}</h2>}
    <slot/>
</div>
```

Compare against Excerpt 5 and confirm each deletion is intentional:

- `import {Icon} from "astro-icon/components"` — gone; its only use was the dead
  `href` branch. **Plan 006 depends on this.**
- `import Content from "./Content.astro"` — gone; its two lines are inlined.
- `body`, `href`, `colorText`, `height`, `width`, `padding`, `bgColor` — gone
  from `Props` and from the destructure.
- `transform-y-[-40%]` — gone (no CSS rule).
- `${bgColor || "bg-[var(--card-background)]"}` → the literal
  `bg-[var(--card-background)]`; `${padding || "p-6"}` → `p-6`;
  `${height || "h-full"}` → `h-full`. **These three literals must stay**, in the
  same positions, or every card loses its background, padding and height.
- The `href` ternary — gone; only the plain branch survives.
- `Content`'s `{body && <p …>}` line — gone; `body` was never passed.
- The `card`, `group`, `perspective-1200` and every other token in the class
  string are unchanged and in the same order.

Then delete the file:

```
git rm src/components/Card/Content.astro
```

**Verify**, all five:
- `test ! -e src/components/Card/Content.astro && echo gone` → `gone`
- `grep -rn 'Content.astro\|astro-icon' src/components/Card/` → no matches
- `pnpm check` → `0 errors`
- `pnpm eslint` → exit 0, and the `colorText` warning at `Card/index.astro` is
  **gone** (one warning should remain: unused `index` in `IntroCard.astro`,
  which plan 005 owns)
- `pnpm exec vitest run tests/rendered-html.test.ts` → all pass, count unchanged
  from step 4 (all six cards still render their titles and bodies)

### Step 6: Delete the inert `sizes` attribute, and assert the invariant

In `src/components/IntroCard.astro`, delete the whole `sizes="…"` line from the
`<Image>` component. Nothing else in that block changes.

**Why delete rather than add `widths`?** Both are one line, so again the tie-break
is the evidence:

- The rendered box is **275 CSS px**, not 415. The class list is
  `w-auto max-h-[415px]`: `max-height` is a ceiling, and with `width:auto` on a
  replaced element the used size is the intrinsic size of the delivered bitmap
  (275×275), so the ceiling never binds. There is no upscaling at 1× DPR — the
  current delivery is a pixel-exact match.
- After plan 002 the portrait is optimised at build time from the 1000×1000
  source down to **8,892 bytes at 275px** (measured in the spike; production
  today ships 42,314 bytes through a per-request Netlify Image CDN call). Adding
  a 550px rendition costs roughly **+9.8 kB on every high-DPI viewport**.
- So `widths` buys a sharper portrait on retina screens at a real byte cost, in
  the middle of a refactor whose entire point is removing bytes. That is a
  judgement call about image quality, not a defect fix — and it is the owner's
  call, not this plan's.
- Deleting `sizes` costs nothing, changes nothing a browser does, and removes an
  attribute that lies about behaviour the page does not have. Retina screens keep
  the 2× under-resolution they have today; that is the status quo, not a
  regression.

If the owner later wants the sharper portrait, the follow-up is one prop —
recorded in "Maintenance notes".

Add the assertion, inside the same `describe("markup defects fixed by plan 004", …)`
block. Note it is written as an **invariant**, so it stays correct if a future
change adds `widths` instead:

```ts
    it("never emits a sizes attribute without a srcset to select from", () => {
        for (const img of [...doc.querySelectorAll("img")]) {
            if (img.hasAttribute("sizes")) {
                expect(img.hasAttribute("srcset"), "sizes is inert without srcset").toBe(true);
            }
        }
    });
```

**Verify**, both:
- `pnpm exec vitest run tests/rendered-html.test.ts` → all pass, **1 more test**
- `grep -c 'sizes=' src/components/IntroCard.astro` → `0`

### Step 7: Add the source-level dead-class tripwire

The three dead classes are invisible to every existing gate — UnoCSS emits
nothing for them and reports nothing, so the built stylesheet cannot be asserted
against. The only place they are detectable is the source.

Append to `tests/build-output.test.ts`:

```ts
describe("source hygiene", () => {
    /**
     * These class names look like utilities but generate no CSS rule at all —
     * each was verified against the built stylesheet. They are typos, not
     * shortcuts: `text-sm-1` should be `text-sm`. UnoCSS fails silently on them,
     * so this is the only gate that can catch a reintroduction.
     */
    const DEAD_CLASSES = ["text-sm-1", "custom-btn", "transform-y-["];

    it("references no utility class that generates no CSS", () => {
        const files = readdirSync("src", {recursive: true, encoding: "utf8"})
            .filter((f) => /\.(astro|ts|css)$/.test(f))
            .map((f) => `src/${f}`);
        expect(files.length, "src/ must contain source files").toBeGreaterThan(0);
        for (const file of files) {
            const source = read(file);
            for (const dead of DEAD_CLASSES) {
                expect(source, `${file} references the dead class "${dead}"`).not.toContain(dead);
            }
        }
    });
});
```

`readdirSync` and the local `read` helper are already imported at the top of that
file by plan 001; add `readdirSync` to the existing `node:fs` import only if it
is not there already.

**Verify**: `pnpm exec vitest run tests/build-output.test.ts` → all pass,
**1 more test**

### Step 8: Run every gate

**Verify**, all four:
- `pnpm check` → exit 0, `0 errors`
- `pnpm eslint` → exit 0 (exactly one warning expected: unused `index` in
  `IntroCard.astro`)
- `pnpm build` → exit 0, `Complete!`
- `pnpm test` → exit 0, `Tests  N passed (N)` where **N = BASE + 7**

Then eyeball the one intended visual change and nothing else:

```
grep -o '<ul class="[^"]*"' dist/index.html
```

→ three matches, each `<ul class="text-sm font-light list-disc list-inside"`.

```
node -e 'const m=require("fs").readFileSync("dist/index.html","utf8").match(/<script type="application\/ld\+json">(.*?)<\/script>/s); console.log(JSON.stringify(JSON.parse(m[1]),null,2))'
```

→ `sameAs` is a flat array of five `https://…` strings with no `/resume.pdf`;
`worksFor.name` is `"HeyMax"`; `jobTitle` is `"Founding Solutions Engineer"`;
`@context` is `"https://schema.org"`.

## Test plan

Seven new assertions, all added to plan 001's existing files. Model each on the
tests already in those files: `describe`/`it`, `expect(...).toBe/toEqual/toMatch`,
content read from `src/lib/constants.ts` rather than hardcoded.

| File | New tests | Defect it locks down |
|---|---|---|
| `tests/rendered-html.test.ts` | `exposes sameAs as a flat list of the absolute LINKS URLs` (**replaces** plan 001's deliberately-weak `exposes a sameAs list`) | nested `sameAs`, relative `/resume.pdf` |
| `tests/rendered-html.test.ts` | `names the employer in worksFor, and the job title in jobTitle` | `worksFor.name` copy-paste |
| `tests/rendered-html.test.ts` | `uses the https schema.org context` | context scheme |
| `tests/rendered-html.test.ts` | `styles every bullet list with a class the stylesheet actually defines` | `text-sm-1` |
| `tests/rendered-html.test.ts` | `labels every button from its own content, without an overriding aria-label` | the `aria-label`/`sr-only` trap, in both directions |
| `tests/rendered-html.test.ts` | `never emits a sizes attribute without a srcset to select from` | inert `sizes` |
| `tests/constants.test.ts` | `is a single string, so a second sentence cannot silently run together` | `NOW.description` type |
| `tests/build-output.test.ts` | `references no utility class that generates no CSS` | `text-sm-1`, `custom-btn`, `transform-y-[` reintroduction |

Net: **+7 tests** (one replacement, seven additions).

Not asserted, deliberately: nothing verifies that `Card` has exactly three props
or that `Content.astro` is gone. Those are structural, not behavioural — the
existing rendered-HTML content tests already fail loudly if the collapse drops a
card title or a slot, which is the only thing a visitor could notice.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm test` exits 0 and reports exactly `BASE + 7` tests passed
- [ ] `pnpm check` exits 0 with `0 errors`
- [ ] `pnpm eslint` exits 0, with the `colorText` warning gone
- [ ] `pnpm build` exits 0
- [ ] `grep -rn 'text-sm-1\|custom-btn\|transform-y-\[' src/` → **no matches**
- [ ] `grep -rn 'rounded-full\|rounded?: boolean' src/` → **no matches**
- [ ] `grep -rn 'astro-icon' src/components/Card/` → **no matches**
- [ ] `grep -c 'sizes=' src/components/IntroCard.astro` → `0`
- [ ] `test ! -e src/components/Card/Content.astro`
- [ ] `grep -c 'CAREER\[0\].company' src/layouts/BasicLayout.astro` → `1`
- [ ] `grep -c 'sameAs: LINKS.filter' src/layouts/BasicLayout.astro` → `1`
- [ ] `grep -c 'description: string$' src/lib/constants.ts` → `1` (the `NOW` block)
- [ ] `node -e '…'` from step 8 prints a flat `sameAs` of absolute URLs and
      `worksFor.name === "HeyMax"`
- [ ] `git status --porcelain` lists only the files in the "In scope" list
- [ ] `plans/README.md` status row for 004 updated

## STOP conditions

Stop and report back (do not improvise) if:

- **Any of the eight drift probes disagrees.** In particular, if probe 8 fails,
  plan 001 has not landed and there is no test suite to extend — this plan cannot
  run.
- **`pnpm test` does not start from a fully green `BASE`.** A pre-existing failure
  means plan 002 or 003 left something broken; that is theirs to fix, not yours.
- **Any content assertion in `tests/rendered-html.test.ts` starts failing after a
  step that was supposed to be output-neutral** (steps 3, 4, 5). Steps 3–5 are
  designed to leave the rendered page byte-identical apart from `Card`'s and
  `Button`'s class attributes. If a card title, a bullet, a link or the footer
  disappears, you have deleted something live — revert that step and report.
- **`pnpm check` reports an error after step 3.** That means some component still
  treats `NOW.description` as an array. Report the location; do not "fix" it by
  reverting the type.
- **`pnpm eslint` starts reporting an *error* (not a warning).** The dead-class
  and dead-prop deletions should not be able to do this; if they do, something
  else changed.
- **You conclude a fix requires touching `uno.config.ts`.** It does not. If you
  find yourself wanting to add a rule so `text-sm-1` or `custom-btn` works, stop:
  those are typos, and plan 005 owns that file.
- **The `sameAs` filter empties the array** (i.e. `LINKS` contains no absolute
  URL). That would mean `src/lib/constants.ts` has changed shape; report it.
- **You are tempted to add `{...Astro.props}` to `Button.astro`.** Read the block
  quoted under Excerpt 4 again and stop. Forwarding `aria-label` is an
  accessible-name regression, not an improvement.

## Maintenance notes

For the human or agent who owns this code next:

- **Plan 006 is now unblocked.** Step 5 removed the repository's only static
  `astro-icon` reference. The only remaining `<Icon>`/`i-…` usages are the
  constants-driven ones in `IntroCard.astro` and `Goal.astro`, which is exactly
  the case plan 006's `presetIcons` safelist handles.
- **Follow-up deliberately deferred: the retina portrait.** Step 6 deleted the
  inert `sizes` attribute rather than adding `widths`. If the owner decides a
  sharper portrait on high-DPI screens is worth roughly +9.8 kB there, the fix is
  to add `densities={[1, 2]}` (or `widths={[275, 550]}` together with a restored
  `sizes`) to the `<Image>` in `IntroCard.astro`. The step-6 test is written as an
  invariant precisely so that change passes without editing the test.
- **The `card` class still generates no CSS.** It was left in place because it is
  a semantic hook rather than a mistyped utility, and plan 003's card-entrance
  animation may want a selector. If nothing ever selects it, it is a free deletion
  — but it is not a defect.
- **What a reviewer should scrutinise**, in order:
  1. The three hardcoded literals in `Card`'s class string —
     `bg-[var(--card-background)]`, `p-6`, `h-full`. Dropping any one of them
     while removing the props they came from would visibly break all six cards,
     and no test asserts on card styling.
  2. That `sameAs` is still derived from `LINKS` and `worksFor.name` from
     `CAREER[0].company` — not hardcoded. `CLAUDE.md` requires every configurable
     value to live in `src/lib/constants.ts`.
  3. The bullet-list font-size change is the *only* visual diff in the PR.
- **If a `<Card>` ever needs to be a link again**, do not resurrect the `href`
  branch from git history — it carried an `astro-icon` import that no longer
  exists. Wrap the `<Card>` at the call site instead.
- **If `LINKS` gains a second site-relative entry**, it will silently drop out of
  `sameAs` by design. That is correct behaviour, and the step-1 test documents it.
