# Plan 036: Serve the design system as a page, and generate the agent's copy from it

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update the status row for this
> plan in `plans/README.md` — **except in this repository, where you must NOT.** That file's status
> table is the reviewer's alone; it says so in its own words, and it is gated in full, so an edit
> from you can redden a branch you cannot then make green. Report your status in the pull request
> body instead and leave the index untouched.
>
> **Drift check (run first)**:
> `git diff --stat dc2790c..HEAD -- src/content src/lib src/pages src/layouts/BasicLayout.astro uno.config.ts tests .design-sync`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts
> against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `dc2790c`, 2026-08-25

## Why this matters

After #203 this repository describes its own design vocabulary in two places that can disagree:
the code, and `.design-sync/conventions.md` — a hand-written document handed to a design agent so
it builds on-brand. A third description was proposed (four generated HTML reference cards) and
rejected, because a committed generated artifact is exactly what `public/preview.jpg` already is,
and that one "has gone stale silently twice".

This plan collapses the description to **one authored source with two derived surfaces**. Meaning
— what each token is *for*, and the rules for using it — is authored once in `src/content/design.ts`.
A public `/design` page renders it as live specimens that cannot drift, because it restates no
value: swatches resolve through `var(--token)` from the real stylesheet, the ramp uses the real
utility classes, and the theme toggle already on the page switches every specimen at once. The
agent's `conventions.md` is generated from that same module and gated, so the two surfaces cannot
disagree. What lands is a styleguide that is true by construction rather than by discipline.

## Current state

- `src/layouts/BasicLayout.astro` — wraps every page. Holds the tokens and their prose roles.
  - Line 320 opens the `/* Theme Variables` comment block that names the role of eleven of the
    fifteen tokens. Lines 412 and 430 open `:root[data-theme='light']` and `:root[data-theme='dark']`.
    Each block defines the same fifteen custom properties. Excerpt, `src/layouts/BasicLayout.astro:412`:

    ```
    :root[data-theme='light'] {
        --background: #FAFAFA; /* grey-50 */
        --card-background: #F5F5F5; /* grey-100 */
        ...
        --sport-run-on-ink: #9FC0F0; /* marine-200 */
    }
    ```

  - **Do not move these values.** This plan authors NAMES and ROLES only; every value stays here.

- `src/pages/index.astro` — the bento home page, and the only page with a footer. Excerpt, `:254`:

    ```
    {FOOTER.prefix} <span class="text-[var(--brand-ink)]"><span class={iconClass(FOOTER.icon)} aria-hidden="true"></span></span><span class="sr-only">love</span>{FOOTER.suffix}
    ```

  `FOOTER` is imported at `src/pages/index.astro:9` from `../content/site`.

- `src/content/site.ts:224` — `FOOTER` is `{prefix, icon, suffix}`. Its head comment (lines 1–14)
  states a standing constraint that applies to ANY new module in `src/content/`: **`uno.config.ts`
  reads these through unconfig/jiti rather than Vite**, so no `import.meta.glob`, no `astro:content`,
  no top-level `await`, no `.astro` import — directly or transitively. Violating it fails
  `pnpm build` with `glob is not a function` before a single test runs.

- `src/pages/llms.txt.ts:193-197` — hand-lists the site's pages, each labelled with the name the
  site itself uses for it:

    ```
    `- [${PATCHES.home_label}](${abs("/")}): the goals, the day job, and where to find me`,
    `- [${PATCHES.heading}](${abs("/patches/")}): every race and challenge, finished or not`,
    ```

- `uno.config.ts:22` — `safelist` is the census of every icon the site uses, and it is DERIVED
  from the content modules (`...LINKS.map((l) => iconClass(l.logo))`, `...GOALS.map(...)`,
  `...CAREER.map(...)`, plus single entries). Its comment (lines 12–21) warns that a second
  sport→icon map "would ship class tokens this list never saw, and a presetIcons class with no
  rule renders as a mask box at zero size — an icon that is silently absent, with correct markup
  and a green build." **Step 6 must not create a second census.**

- `src/lib/icons.ts` — exports `iconClass(logo)` mapping an Iconify id to its utility class. Its
  head carries the same jiti constraint as the content modules.

- `tests/design-system.test.ts` — added in #203. Five tests. It reads the built page's CSS through
  `pageCss()` and holds `.design-sync/conventions.md` against it: both themes define the same token
  set, the document's token table and the stylesheet name the same tokens both ways, the classes it
  promises are present, and `control-surface` is genuinely absent. **This plan extends it; do not
  rewrite it.**

- `.design-sync/conventions.md` — hand-authored in #203, ~5 KB, referenced by
  `.design-sync/config.json`'s `readmeHeader` and prepended verbatim to the README the design agent
  reads. This plan makes it GENERATED.

- `.design-sync/emit-cards.mjs` — generates four HTML reference cards into a gitignored directory.
  This plan retires it; the page replaces it.

### Repo conventions this plan must honour

- **Content lives in `src/content/`**, and configurable values live only in a repository secret, a
  repository variable, or repository content. See `README.md` § Configuration. Model the new module
  on `src/content/site.ts` — a head comment stating what the module holds and why, then typed
  exports.
- **Astro components only, no client-side UI framework; CSS animations only.** See `CLAUDE.md`
  § Key Architecture Points.
- **Text-relative sizing.** `tests/page-fit.test.ts` and `tests/card-fill.test.ts` forbid absolute
  lengths in the breakpoints, `main`'s height clamp, the card heading's space and the control box.
- Exemplar page to match for structure and front-matter: `src/pages/404.astro` (short, uses
  `BasicLayout`, no grid) rather than `src/pages/index.astro` (the bento budget).

## Commands you will need

| Purpose        | Command                          | Expected on success            |
|----------------|----------------------------------|--------------------------------|
| Node           | `node -v`                        | v26 — the version in `.nvmrc`  |
| Install        | `pnpm install --frozen-lockfile` | exit 0                         |
| Typecheck      | `pnpm check`                     | exit 0, `- 0 errors`           |
| Lint           | `pnpm eslint`                    | exit 0, no output              |
| Tests          | `pnpm test`                      | exit 0, all pass               |
| Tests (fast)   | `SKIP_BUILD=1 pnpm test`         | reuses `dist/` — never for the run you trust |
| Regenerate     | `pnpm test:update`               | rewrites file snapshots        |
| Build only     | `pnpm build`                     | exit 0                         |

There is no `lint` and no `typecheck` script — those names do not exist here.

## Suggested executor toolkit

You are most likely a fresh Claude Code session with no memory of why this plan exists. Before
typing anything:

- **Read `CLAUDE.md` at the repo root, and read this plan's code against it.** That is the most
  recent lesson this plans directory recorded: plan 035 shipped green while putting values in a home
  the Configuration rule does not allow, because every gate passed and that rule is prose. A green
  suite does not mean a change obeys this repository.
- **Read `CONTRIBUTING.md`** — § "The change gate" for the three commands, and § "Isolating the work"
  for the worktree flow and the `node_modules` symlink trap.
- Use the `git-commit-helper` skill for commits if it is available; this repo has a `CONTRIBUTING.md`
  so its conventions win over any generic default.
- Use the `find-docs` skill for Astro API questions rather than guessing from memory — this repo runs
  Astro 7 and several of its idioms changed.
- **Do not invoke the `/design-sync` skill.** Nothing in this plan re-exports anything, and running it
  would upload to a live design project.

## Scope

**In scope** (the only files you should modify or create):
- `src/content/design.ts` (create)
- `src/pages/design.astro` (create)
- `src/pages/index.astro` (footer link only)
- `src/pages/llms.txt.ts` (one page entry)
- `src/lib/icons.ts` (step 6 only — export the icon census)
- `uno.config.ts` (step 6 only — consume that census)
- `tests/design-system.test.ts` (extend)
- `.design-sync/conventions.md` (becomes generated output)
- `.design-sync/emit-cards.mjs` (delete in step 7)
- `.design-sync/NOTES.md` (record the new maintenance model)

**Out of scope** (do NOT touch, even though they look related):
- `src/layouts/BasicLayout.astro`'s token VALUES — this plan authors names and roles only. Moving
  the values to a module is a separate change with its own risk, and the page does not need it.
- `tests/docs-drift.test.ts` — its discovery was reworked in #203; nothing here requires it.
- `public/preview.jpg` and its fingerprint in `tests/content.test.ts` — the new page does not
  change the intro card.
- `.design-sync/config.json`'s `projectId` — never edit; it pins which design project this repo
  syncs to.
- Any re-run of the design-sync upload. This plan changes what WOULD be exported; it does not export.
- `DESIGN.md`, a `/design.md` endpoint, a copy-as-markdown button, and any `<link rel="alternate">`
  discovery wiring. **Plan 037 does all of that and depends on this one.** Everything it needs is
  the module and the renderer step 5 creates, so build them as specified here and stop — a
  markdown surface built early would have to be rewritten when 037 parameterises the renderer by
  audience.

## Git workflow

- Branch in its own worktree, per `CONTRIBUTING.md` § "Isolating the work":
  `git worktree add .claude/worktrees/design-page -b design-page`, then symlink `node_modules`
  rather than installing again.
- **Never commit to `main`.**
- Conventional Commits, lowercase imperative subject, with a body that explains WHY and what was
  verified. Example from `git log`: `feat(design): export the palette to a design tool, and gate it here`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Author `src/content/design.ts`

Create the module holding the design system's MEANING and nothing else. It must contain no colour
value, no pixel size, and no icon class — those all come from the code at render time.

Export at least:
- `DESIGN_PAGE`: `{title, heading, lede, link_label, description}` — SEO title/description for the
  route, the `<h1>`, an introductory sentence, and the words the footer link wears.
- `TOKEN_ROLES`: an ordered array of `{token, role}` for all fifteen custom properties, using the
  role wording already written at `src/layouts/BasicLayout.astro:320-347` for the eleven documented
  there; author short roles for `--background`, `--card-background`, `--card-border` and `--text`.
- `SECTIONS`: for each of palette / type / controls / icons, a `{heading, lede, does[], donts[]}`.

Head the file with a comment in the house style saying what it holds, that it holds no VALUES on
purpose, and repeating the jiti constraint from `src/content/site.ts:7-14`.

**`link_label` and `heading` must be the same words** — see step 3.

**Verify**: `pnpm check` → exit 0, `- 0 errors`.

### Step 2: Create `src/pages/design.astro`

Render the page from `BasicLayout` using `DESIGN_PAGE`, `TOKEN_ROLES` and `SECTIONS`.

Rules that decide whether this page can rot:
- A swatch is `style="background: var(--token)"` — never a hex. The reader's current theme resolves
  it, and the existing theme toggle re-renders every specimen.
- The type ramp uses the real utility classes (`text-xs` … `text-3xl`) on real text; do not restate
  their rem values as copy.
- The controls section renders real `control`, `control-cta` and `text-link` elements.
- No HTML comments and no emoji anywhere in the output — two build-wide gates forbid both.
- `<h1>` is `DESIGN_PAGE.heading`.

**Verify**: `pnpm build` → exit 0 and `dist/design/index.html` exists.

### Step 3: Link it from the home page footer

In `src/pages/index.astro`, append a link to the footer paragraph at `:254`, wearing `text-link` so
it carries a perceivable signifier. Its text is `DESIGN_PAGE.link_label`.

Two build-wide gates make this mandatory and constrain its words:
- `reaches every built page from the site root by following links` — an unlinked page fails.
- `heads each destination with the words the control that reaches it wears` — the link's words and
  the destination's heading must agree, which is why step 1 makes them one constant.

**Verify**: `SKIP_BUILD=1 pnpm test -- tests/build-output.test.ts` → all pass, including
`reaches every built page from the site root by following links`.

### Step 4: Add the page to `llms.txt`

Add one entry beside the existing ones at `src/pages/llms.txt.ts:193-197`, labelled
`DESIGN_PAGE.heading` — the name the site itself uses — with a one-line description.

**Verify**: `SKIP_BUILD=1 pnpm test -- tests/build-output.test.ts` → `emits an llms.txt carrying the
constants it claims to summarise` and `keeps llms.txt to the spec: every H2 list item is a markdown
link` both pass.

### Step 5: Generate `.design-sync/conventions.md` from the same module

Add a test to `tests/design-system.test.ts` that renders the agent's document from
`src/content/design.ts` and asserts it against the committed file with vitest's file snapshot:

```ts
await expect(renderConventions()).toMatchFileSnapshot("../.design-sync/conventions.md")
```

`toMatchFileSnapshot` is available in the installed vitest (4.1.10) and `pnpm test:update` already
maps to `vitest run -u`, so regeneration is one command and drift fails `pnpm test`. This is the
legitimate form of a committed generated file — the same shape as `dns/requirements.txt` compiled
from `dns/requirements.in`, where a gate can fail.

`renderConventions()` must keep the two facts the existing tests already look for, because they
parse the file: a markdown token table with one row per token in backticks, and the sentence
`` `control-surface` is not in the stylesheet ``. Keep the guidance the current file carries about
the stylesheet being a closed set and `data-theme` being mandatory.

**Verify**: `pnpm test:update` then `git diff --stat .design-sync/conventions.md` → the file is
rewritten; then `pnpm test` → exit 0. Then mutate: change one role in `src/content/design.ts`, run
`SKIP_BUILD=1 pnpm test -- tests/design-system.test.ts` → RED; revert.

### Step 6: Make the icon census single-source, then render it

Only after steps 1–5 are green.

`uno.config.ts:22-33` computes the icon census inline. Export it instead from `src/lib/icons.ts`
(e.g. `ICON_IDS`), have `uno.config.ts` safelist `ICON_IDS.map(iconClass)`, and have the page render
the same array. This keeps the census in one place — the comment at `uno.config.ts:12-21` is
explicit that a second copy ships classes with no rule.

`src/lib/icons.ts` is read through jiti, so the same constraint applies: no `import.meta.glob`, no
`astro:content`, no top-level `await`, no `.astro` import.

**Verify**: `pnpm build` → exit 0 (a jiti violation fails here with `glob is not a function`), then
`pnpm test` → exit 0 including `emits a usable CSS rule for every safelisted icon class`.

### Step 7: Retire the card generator and record the model

Delete `.design-sync/emit-cards.mjs`. Update `.design-sync/NOTES.md`: remove the section describing
the cards and replace it with the maintenance model — `src/content/design.ts` is the single authored
source, `/design` renders it, `conventions.md` is a file snapshot regenerated by `pnpm test:update`,
and a token rename reddens `tests/design-system.test.ts` until the module names it.

**Verify**: `grep -rn "emit-cards" . --exclude-dir=node_modules --exclude-dir=.git` → no matches
outside `plans/`.

## Test plan

Extend `tests/design-system.test.ts` (do not create a second suite — `tests/docs-drift.test.ts`
requires every suite to explain itself above its first `describe(`, and this one already does):

- The conventions file matches the module (step 5's file snapshot).
- `TOKEN_ROLES` names exactly the tokens defined in the built CSS, both directions — extend the
  existing "names every token…" test to read the module rather than the markdown table, so the
  module becomes the gated source.
- Every `SECTIONS` entry has at least one `does` and one `donts` item, so an empty section cannot
  ship silently.
- Structural pattern to model: the existing tests in that same file.

Verification: `pnpm test` → exit 0, all pass, with at least two new tests beyond the current five.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0 with `- 0 errors`
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0; `tests/design-system.test.ts` reports at least 7 tests
- [ ] `dist/design/index.html` exists after `pnpm build`
- [ ] `grep -c "text-link" src/pages/index.astro` returns at least 1 (the footer link)
- [ ] `grep -rn "emit-cards" . --exclude-dir=node_modules --exclude-dir=.git` matches nothing outside `plans/`
- [ ] `git status` shows no modified file outside the in-scope list
- [ ] `git diff --name-only origin/main...HEAD` does NOT list `plans/README.md` — the index is the reviewer's

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live code — in particular if
  `src/layouts/BasicLayout.astro:412` and `:430` are no longer the two `:root[data-theme]` blocks,
  or `src/pages/index.astro:254` is no longer the footer line.
- `pnpm build` fails with `glob is not a function` — a jiti constraint was violated by something the
  new module or `src/lib/icons.ts` now imports. Do not work around it by moving the import; report.
- The build-wide gate `heads each destination with the words the control that reaches it wears`
  fails and cannot be fixed by making the footer link's words and the page heading one constant.
- Step 6 cannot keep the icon census in one place without touching a file outside the scope list.
  Steps 1–5 stand on their own; ship those and report rather than widening scope.
- A step's verification fails twice after a reasonable fix attempt.
- You discover the assumption "**a swatch can render every token without restating a value**" is
  false — e.g. a token turns out not to be resolvable from the page's own cascade.

## Maintenance notes

For whoever owns this after it lands:

- **The point of the design is that no value is authored twice.** If a future change adds a hex, a
  rem or an icon class to `src/content/design.ts`, that is the defect this plan exists to prevent —
  the module holds meaning only.
- **A reviewer should scrutinise** two things: that the page restates no value, and that step 5's
  snapshot actually fails on drift (ask for the mutation's red output, not just a green run).
- **`/design` is public, linked and indexed**, because the gates forbid a hidden page. It enters the
  sitemap automatically and `llms.txt` by hand.
- **Deferred out of scope**: moving the token VALUES out of `BasicLayout.astro` into a module. That
  would let the page render a two-theme comparison chart rather than one theme at a time. It is a
  bigger change with real risk, and the theme toggle already covers the reader's need.
- The next `/design-sync` run re-exports the styling layer and picks up the regenerated
  `conventions.md` through `readmeHeader`; see `.design-sync/NOTES.md`.
- **Plan 037 follows this one** and adds the markdown surfaces: `DESIGN.md` at the repo root, a
  `/design.md` twin, and a copy button. It turns step 5's renderer into an audience-parameterised
  one — `conventions.md` stays a SEPARATE, terser rendering rather than being replaced, because the
  design agent it feeds cannot read this repository and is inlined into a system prompt under a
  2-4k character budget. Do not merge the two documents here.
