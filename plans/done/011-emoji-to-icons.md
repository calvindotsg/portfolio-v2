# Plan 011: Migrate every emoji to a UnoCSS presetIcons icon

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md` — do
> not edit it.
>
> **Drift check (run first)**: `git diff --stat 4e15674..HEAD -- src/ tests/ uno.config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 (maintainer-mandated)
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `4e15674`, 2026-07-22

## Why this matters

The maintainer has mandated this: the site's icon system is UnoCSS
`presetIcons` mask rules (collections `@iconify-json/ri` and
`@iconify-json/fa6-brands` — zero `<svg>` in the HTML, zero client JS), but
eight emoji characters still ship as raw text. Emojis render differently on
every OS/font, clash stylistically with the mask icons beside them, and are
announced inconsistently by screen readers. After this plan, every glyph on
the site comes from the one icon system, and a build-gating test locks emojis
out permanently.

**Voice constraint (from the maintainer's directive):** swap glyphs only. The
surrounding prose in `constants.ts` is the maintainer's own voice — replace
the emoji characters within it, change nothing else about his words.

## Current state

All eight emojis, verified at `4e15674`:

| Where | Emoji | Replacement (already verified to exist in `@iconify-json/ri` at the installed version) |
|---|---|---|
| `src/components/ThemeSwitcher.astro:18,22` | 🔆 / 🌙 as CSS `content` | `i-ri-sun-line` / `i-ri-moon-line` spans |
| `src/lib/constants.ts:37,48` | `emoji: "🔧"` / `emoji: "🔎"` (CAREER) | `ri:tools-line` / `ri:search-line` |
| `src/lib/constants.ts:78,87` | `goal_logo: "🚴🏻"` / `"🏃🏻"` (GOALS) | `ri:riding-line` / `ri:run-line` |
| `src/lib/constants.ts:95` | `"👋 Hi, I'm Calvin"` (WELCOME) | inline `ri:hand` icon before the first hero line |
| `src/lib/constants.ts:107` | `"Built with ❤️, more love to …"` (FOOTER) | inline `ri:heart-fill` + sr-only "love" |

Decisions already made — do not relitigate:

- **Progress-bar flip is dropped.** `ProgressBar.astro:28` carries
  `transform scale-x-[-1]` because the emoji cyclist/runner face left. The ri
  glyphs face right (head circle at x=16 of 24 for `riding-line`, x=13.5 for
  `run-line` — verified from the SVG path data), so the flip must go.
- **👋 becomes an icon, not a removal** — the wave is part of the greeting's
  warmth; it moves out of the prose string into a `greeting_icon` field.
- **❤️ becomes an icon with `<span class="sr-only">love</span>`** — the heart
  is semantic ("Built with ❤️" means "built with love", and "more love" later
  in the sentence refers back to it), so screen readers must still get the
  word.
- **CAREER's field is renamed `emoji` → `icon`** (it no longer holds an
  emoji). GOALS' `goal_logo` and `cta_logo` keep their names — after this
  plan both hold `collection:icon` ids, which is already `cta_logo`'s format.

Key mechanics (the repo's icon conventions — match them):

- `src/lib/icons.ts` exports `iconClass("ri:sun-line")` → `"i-ri-sun-line"`.
  Every icon rendered from a constants value goes through it.
- **UnoCSS only generates rules for class names it sees literally in source.**
  Classes derived from constants at render time must be safelisted in
  `uno.config.ts` (see its existing header comment). Classes written literally
  in `.astro` files need no safelist entry.
- Decorative icon spans carry `aria-hidden="true"` and sit next to an sr-only
  or visible text label — see `src/components/Goal.astro:36-37` as the
  exemplar.
- The pre-paint script in `BasicLayout.astro` always sets
  `document.documentElement.dataset.theme` to `"light"` or `"dark"`, and the
  static HTML ships `<html data-theme="light">` (test-locked at
  `tests/build-output.test.ts:91`).

Current-state excerpts (confirm before editing):

`src/components/ThemeSwitcher.astro:16-24`:
```astro
<style is:global>
    .theme-toggle::before {
        content: "🔆";
    }

    :root[data-theme="dark"] .theme-toggle::before {
        content: "🌙";
    }
</style>
```

`src/components/Career.astro:7-11`:
```astro
<Card
        colSpan="md:col-span-1"
        rowSpan="md:row-span-6"
        title=`${job.emoji} I'm a ${job.job_name}`
>
```

`src/components/Card/index.astro` (whole file is 17 lines; the h2 is):
```astro
    {title && <h2 class="text-xl font-bold m-0 z-20">{title}</h2>}
```

`src/components/ProgressBar.astro:28-30`:
```astro
        <span aria-hidden="true" class="absolute right-6 top-1.5 translate-x-1/2 -translate-y-1/4 transform scale-x-[-1] text-base">
            {goalLogo}
        </span>
```

`src/components/IntroCard.astro:16`:
```astro
                {WELCOME.description.map((item) => (<h1 class="m-0 font-light text-xl">{item}</h1>))}
```

`src/pages/index.astro:28-32`:
```astro
        <Card colSpan="md:col-span-1" rowSpan="md:row-span-1">
            <p class="text-xs">
                {FOOTER.footer}
            </p>
        </Card>
```

`uno.config.ts:8` (safelist):
```ts
    safelist: [...LINKS.map((l) => iconClass(l.logo)), ...GOALS.map((g) => iconClass(g.cta_logo))],
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 (fresh worktree has no node_modules) |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Tests | `pnpm test` | all pass (measure the baseline count in step 1) |
| Lint | `pnpm eslint` | exit 0, no output |
| Build | `pnpm build` | exit 0, "1 page(s) built" |

pnpm ONLY — never npm. A `lint-staged` pre-commit hook runs on commit; that is
expected and fine.

## Scope

**In scope** (the only files you may modify):
- `src/lib/constants.ts`
- `src/lib/` — no new files needed; `icons.ts` is read-only reference
- `src/components/ThemeSwitcher.astro`
- `src/components/Career.astro`
- `src/components/Card/index.astro`
- `src/components/ProgressBar.astro`
- `src/components/IntroCard.astro`
- `src/pages/index.astro`
- `uno.config.ts`
- `tests/constants.test.ts`
- `tests/rendered-html.test.ts`
- `tests/build-output.test.ts`

**Out of scope** (do NOT touch):
- `src/components/Goal.astro` — it passes `goal.goal_logo` through unchanged;
  the value's format change doesn't alter its code.
- `public/llms.txt` — maintainer-owned prose (it contains no emoji anyway).
- `plans/README.md` — the reviewer maintains it.
- Any wording change to prose values in `constants.ts` beyond deleting the
  emoji characters and their adjacent space.
- All other UnoCSS utility classes on the elements you touch (a separate plan
  removes dead ones — do not "clean up while you're in there").

## Git workflow

- Branch: `improve/011-emoji-to-icons` (create from the worktree's HEAD)
- Conventional commits, e.g. `refactor: migrate emojis to presetIcons icons`
  (match `git log --oneline` style). Commit at least once; per-step commits
  are fine.
- Do NOT push, do NOT open a PR.

## Steps

### Step 1: Baseline

Run `pnpm install`, then `pnpm check`, `pnpm test`, `pnpm build`. Record the
passing test count — done criteria compare against it relatively. Confirm the
emojis are where "Current state" says (e.g.
`grep -n 'emoji\|goal_logo' src/lib/constants.ts`).

**Verify**: all four commands exit 0.

### Step 2: constants.ts — new values and shapes

1. CAREER: rename the `emoji` field to `icon` in the type and both entries;
   values `"ri:tools-line"` (HeyMax) and `"ri:search-line"` (NCS Group).
2. GOALS: `goal_logo: "🚴🏻"` → `"ri:riding-line"`;
   `goal_logo: "🏃🏻"` → `"ri:run-line"`. (Type/field name unchanged.)
3. WELCOME: add a `greeting_icon` field and strip the emoji from the string:
   ```ts
   export const WELCOME: {
       greeting_icon: string
       description: string[]
   } = {
       greeting_icon: "ri:hand",
       description: ["Hi, I'm Calvin", "Business Systems Analyst.", "Road cyclist.", "Enthusiastic learner."]
   }
   ```
4. FOOTER: split around the heart, changing none of the words:
   ```ts
   export const FOOTER: {
       prefix: string
       icon: string
       suffix: string
   } = {
       prefix: "Built with",
       icon: "ri:heart-fill",
       suffix: ", more love to Astro template by Gianmarco"
   }
   ```

**Verify**: `grep -cP '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0F}]' src/lib/constants.ts`
→ `0`. (Tests will fail until steps 3–7 land — expected mid-plan.)

### Step 3: safelist the new constants-derived icon classes

In `uno.config.ts`, extend the safelist (and the import line) to cover every
icon class now derived from constants at render time:

```ts
import {CAREER, FOOTER, GOALS, LINKS, WELCOME} from "./src/lib/constants";
...
    safelist: [
        ...LINKS.map((l) => iconClass(l.logo)),
        ...GOALS.map((g) => iconClass(g.cta_logo)),
        ...GOALS.map((g) => iconClass(g.goal_logo)),
        ...CAREER.map((c) => iconClass(c.icon)),
        iconClass(WELCOME.greeting_icon),
        iconClass(FOOTER.icon),
    ],
```

(ThemeSwitcher's sun/moon classes are written literally in the component in
step 7 — they need no safelist entry.)

**Verify**: `pnpm build` exits 0, then
`grep -c 'i-ri-riding-line\|i-ri-tools-line\|i-ri-hand\|i-ri-heart-fill' dist/_astro/*.css`
→ at least 1 per pattern (run individually if combined grep is awkward).

### Step 4: Card title icon + Career

`src/components/Card/index.astro`: add an optional `titleIcon` prop (a
ready-made class string) and render it inside the h2:

```astro
interface Props {
    title?: string;
    titleIcon?: string;
    colSpan?: string;
    rowSpan?: string;
}
...
    {title && <h2 class="text-xl font-bold m-0 z-20">{titleIcon && <span class={titleIcon} aria-hidden="true"></span>} {title}</h2>}
```

`src/components/Career.astro`: import `iconClass` from `../lib/icons`, drop
the emoji from the title, pass the icon:

```astro
<Card
        colSpan="md:col-span-1"
        rowSpan="md:row-span-6"
        title=`I'm a ${job.job_name}`
        titleIcon={iconClass(job.icon)}
>
```

**Verify**: `pnpm check` exits 0 (0 errors).

### Step 5: ProgressBar renders the goal icon

`src/components/ProgressBar.astro`: import `iconClass` from `../lib/icons`.
Replace the emoji span (lines 28–30) — the icon class replaces the text node,
and `transform scale-x-[-1]` is removed (ri glyphs already face right):

```astro
        <span aria-hidden="true" class={`${iconClass(goalLogo)} absolute right-6 top-1.5 translate-x-1/2 -translate-y-1/4 text-base`}></span>
```

Keep everything else in the file untouched.

**Verify**: `pnpm check` exits 0.

### Step 6: hero wave and footer heart

`src/components/IntroCard.astro:16` — prefix only the first line with the
greeting icon:

```astro
                {WELCOME.description.map((item, index) => (<h1 class="m-0 font-light text-xl">{index === 0 && <span class={iconClass(WELCOME.greeting_icon)} aria-hidden="true"></span>} {item}</h1>))}
```

(`iconClass` is already imported in IntroCard.)

`src/pages/index.astro` — import `iconClass` from `../lib/icons`, then:

```astro
            <p class="text-xs">
                {FOOTER.prefix} <span class={iconClass(FOOTER.icon)} aria-hidden="true"></span><span class="sr-only">love</span>{FOOTER.suffix}
            </p>
```

**Verify**: `pnpm check` exits 0.

### Step 7: ThemeSwitcher

Replace the `::before` content rules with two literal icon spans inside the
button (before the existing sr-only span):

```astro
    <span class="i-ri-sun-line theme-icon-light" aria-hidden="true"></span>
    <span class="i-ri-moon-line theme-icon-dark" aria-hidden="true"></span>
    <span class="sr-only">Toggle Theme</span>
```

And replace the whole `<style is:global>` block with display toggling. The
descendant selector `.theme-toggle .theme-icon-*` is load-bearing: it outranks
presetIcons' own `display: inline-block` on `.i-ri-*` (0,2,0 vs 0,1,0), which
a bare `.theme-icon-dark` rule would only beat by stylesheet order — fragile:

```astro
<style is:global>
    /* data-theme is always "light" or "dark" (set pre-paint in BasicLayout);
       the descendant selector outranks presetIcons' display:inline-block. */
    .theme-toggle .theme-icon-dark {
        display: none;
    }

    :root[data-theme="dark"] .theme-toggle .theme-icon-light {
        display: none;
    }

    :root[data-theme="dark"] .theme-toggle .theme-icon-dark {
        display: inline-block;
    }
</style>
```

**Verify**: `pnpm build` exits 0, then:
- `grep -c 'theme-icon-light' dist/_astro/*.css` → ≥ 1
- `grep -cP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' dist/_astro/*.css` → 0

### Step 8: update the touched tests

`tests/constants.test.ts`:
1. GOALS "names an icon from an installed iconify collection" (line ~72):
   extend to also check `goal_logo`:
   ```ts
   for (const goal of GOALS) {
       expect(ICON_COLLECTIONS, `${goal.goal_name} cta_logo`).toContain(goal.cta_logo.split(":")[0]);
       expect(ICON_COLLECTIONS, `${goal.goal_name} goal_logo`).toContain(goal.goal_logo.split(":")[0]);
   }
   ```
2. GOALS "has a visible progress emoji and unit" (line ~84): retitle to
   `"has a visible progress icon and unit"`; assertions unchanged.
3. CAREER: add, inside the existing CAREER describe block:
   ```ts
   it("names a title icon from an installed iconify collection", () => {
       for (const job of CAREER) {
           expect(ICON_COLLECTIONS, `${job.company} icon`).toContain(job.icon.split(":")[0]);
       }
   });
   ```
4. "prose blocks" (line ~141): `FOOTER.footer.length` →
   `(FOOTER.prefix + FOOTER.suffix).length`.

`tests/rendered-html.test.ts`:
1. "renders the footer" (line ~89-91) becomes:
   ```ts
   it("renders the footer", () => {
       expect(text).toContain(FOOTER.prefix);
       expect(text).toContain(FOOTER.suffix.replace(/^, /, ""));
   });
   ```
   (The sr-only "love" and the comma sit between prefix and suffix in the
   normalised text, so a single containment of the joined string would fail.)
2. Add a new test in the "page content" describe block — do NOT modify the
   existing "renders a decorative icon element for every configured icon"
   test (its exact-class counting logic doesn't fit compound-class spans):
   ```ts
   it("renders an aria-hidden icon for every icon migrated off emoji", () => {
       const migrated = [
           ...CAREER.map(({icon}) => iconClass(icon)),
           ...GOALS.map(({goal_logo}) => iconClass(goal_logo)),
           iconClass(WELCOME.greeting_icon),
           iconClass(FOOTER.icon),
       ];
       for (const cls of migrated) {
           const el = doc.querySelector(`span[class~="${cls}"]`);
           expect(el, `no element carries the icon class ${cls}`).toBeTruthy();
           expect(el?.getAttribute("aria-hidden"), `${cls} must be decorative`).toBe("true");
       }
   });
   ```

`tests/build-output.test.ts`:
1. "emits a usable CSS rule for every safelisted icon class" (line ~46):
   extend `wanted` to mirror the new safelist exactly (import `CAREER`,
   `FOOTER`, `WELCOME` too):
   ```ts
   const wanted = new Set([
       ...LINKS.map(({logo}) => iconClass(logo)),
       ...GOALS.map(({cta_logo}) => iconClass(cta_logo)),
       ...GOALS.map(({goal_logo}) => iconClass(goal_logo)),
       ...CAREER.map(({icon}) => iconClass(icon)),
       iconClass(WELCOME.greeting_icon),
       iconClass(FOOTER.icon),
   ]);
   ```
2. Add the migration lock — a new test in the `describe("dist/", ...)` block:
   ```ts
   /**
    * Plan 011 migrated every emoji to presetIcons mask classes. This is the
    * gate that keeps them out: emoji pictographs must never appear in the
    * shipped page or stylesheet again (llms.txt is maintainer-owned prose and
    * deliberately not scanned). FE0F is the emoji variation selector; the
    * F000-block ranges cover pictographs, transport symbols and skin tones.
    */
   const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

   it("ships no emoji in the page or stylesheet", () => {
       expect(read("dist/index.html")).not.toMatch(EMOJI);
       const sheet = readdirSync("dist/_astro").find((f) => f.endsWith(".css"));
       expect(read(`dist/_astro/${sheet}`)).not.toMatch(EMOJI);
   });
   ```

**Verify**: `pnpm build && pnpm test` → all pass; the passing count is the
step-1 baseline **+2** (one new CAREER constants test, one migrated-icons
rendered test, one emoji-lock test = +3 new, no removals — so baseline **+3**;
if your count differs, re-check before proceeding).

### Step 9: mutation-test the new lock

Temporarily reintroduce one emoji (e.g. set `prefix: "Built with ❤️"` in
constants.ts), run `pnpm build && pnpm test`:

**Verify**: exactly the "ships no emoji in the page or stylesheet" test fails
(the constants-collection tests stay green — the emoji is in prose, not an
icon field). Then revert the mutation and confirm `pnpm build && pnpm test`
is fully green again. Report both outcomes.

### Step 10: full ladder + commit

`pnpm check && pnpm eslint && pnpm test && pnpm build` — all green. Commit.

## Test plan

Covered in steps 8–9: two extended tests, three new tests, one mutation
check. Model new tests on the excerpts given — they match the suite's style.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` → 0 errors, 0 warnings, 2 hints
- [ ] `pnpm eslint` → exit 0
- [ ] `pnpm test` → all pass, count = step-1 baseline + 3
- [ ] `pnpm build` → exit 0
- [ ] `grep -rPc '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]' src/ uno.config.ts` → 0 for every file (grep exits 1 = no matches)
- [ ] `grep -P '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]' dist/index.html dist/_astro/*.css` → no matches
- [ ] `grep -n 'emoji' src/lib/constants.ts` → no matches (field renamed)
- [ ] Mutation check of step 9 reported (fail-then-green)
- [ ] `git status` — no files outside the in-scope list modified

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt doesn't match the live file (drift).
- `pnpm build` emits no rule for a safelisted class (build-output test
  fails on a `--un-icon` assertion) after step 3 — the safelist mechanism
  changed; do not hand-write CSS to compensate.
- An icon name turns out not to exist in the installed `@iconify-json/ri`
  (build warning "unknown icon" or an empty rule) — do not substitute a
  different icon without reporting.
- The step-8 test-count arithmetic doesn't reconcile.
- Fixing anything seems to require touching `src/components/Goal.astro`,
  `BasicLayout.astro`, or any file not in scope.

## Maintenance notes

- Every icon on the site is now either a constants-declared `collection:icon`
  id (safelisted in `uno.config.ts` — the safelist and the build-output test
  must stay in lockstep) or a literal class in a component (ThemeSwitcher).
  Adding a new constants-driven icon means: constants value + safelist entry;
  the build-output test enforces the pairing.
- The emoji-lock test scans `dist/index.html` and the stylesheet only —
  `public/llms.txt` is deliberately exempt (maintainer-owned prose).
- Reviewer should scrutinize: the FOOTER visible text is unchanged
  word-for-word (compare rendered text before/after — only the glyph
  differs), and the two theme icons swap correctly when toggling (preview
  deploy, click the toggle).
- A separate plan (012) removes dead UnoCSS classes on some of these same
  elements — keep the two changes in separate commits/PRs.
