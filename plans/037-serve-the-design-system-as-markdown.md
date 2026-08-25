# Plan 037: Serve the design system as markdown, in the repo and on the web

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update the status row for this
> plan in `plans/README.md` — **except in this repository, where you must NOT.** That file's status
> table is the reviewer's alone; it says so in its own words, and it is gated in full, so an edit
> from you can redden a branch you cannot then make green. Report your status in the pull request
> body instead and leave the index untouched.
>
> **Drift check (run first)**:
> `git diff --stat dc2790c..HEAD -- src/content src/lib src/pages src/layouts/BasicLayout.astro public/_headers tests .design-sync`
> This plan is written against a tree in which **plan 036 has landed**. If `src/content/design.ts`
> and `src/pages/design.astro` do not exist, STOP — 036 is a hard dependency, not a suggestion.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/036-serve-the-design-system-as-a-page.md`
- **Category**: docs
- **Planned at**: commit `dc2790c`, 2026-08-25

## Why this matters

Plan 036 makes `src/content/design.ts` the single authored source of this site's design vocabulary
and renders it as a public page. The readers it does not serve are the ones that do not read HTML:
a coding agent doing recon in a checkout, and any agent fetching the page over HTTP.

Both have an established answer. The `improve` skill this directory implements globs for
`DESIGN.md` at the repo root by name, describing it as the "design-system spec", and carries what it
finds into the plans it writes — so a generated `DESIGN.md` makes this repository compose with the
very pipeline that produced this file. On the web, the convention is a markdown twin at the page's
URL plus `.md`, discoverable through `<link rel="alternate" type="text/markdown">` and an `llms.txt`
entry. This site already publishes `llms.txt`, so it is half-way into that convention already.

The cheap part is that **`DESIGN.md` and `/design.md` are the same bytes in two locations**. One
renderer produces the string; the repo file is that string committed and gated, the endpoint is that
string served. What this plan adds beyond 036 is therefore one renderer, two thin surfaces, the
discovery wiring, and one button.

## Current state

**This plan assumes 036 has landed.** From it: `src/content/design.ts` exports `DESIGN_PAGE`,
`TOKEN_ROLES` and `SECTIONS`; `src/pages/design.astro` renders them; `tests/design-system.test.ts`
holds them against the built stylesheet and generates `.design-sync/conventions.md` through
`toMatchFileSnapshot`.

- `src/layouts/BasicLayout.astro:6-25` — the layout takes typed props and destructures them:

    ```
    interface Props {
        ...
        noindex?: boolean;
    }
    const {title, description, noindex = false} = Astro.props;
    ```

  `noindex` is the existing precedent for a per-page head variation; line 140 consumes it
  (`<meta name="robots" …>`). A markdown-alternate link follows the same shape.

- `src/pages/llms.txt.ts:219-229` — **the static build discards a route's response headers**, and
  the file says so in its own words:

    ```
    // THE STATIC BUILD DISCARDS THIS HEADER, and it is worth saying so rather than
    ...
    return new Response(body, {headers: {"content-type": "text/plain; charset=utf-8"}})
    ```

  Astro keeps response headers only for an adapter that asks for them; this build has none. So the
  content-type of any new text endpoint is decided by the HOST, from the file extension.

- `public/_headers` — the only place a header can actually be set on the deployed site. It sets
  cache-control for `/_astro/*` and three security headers for `/*`. **It never sets a
  `Content-Type` today.** Cloudflare's `_headers` has no most-specific-match rule: every matching
  rule applies in file order, so a `/*` rule and a `/design.md` rule both apply.

- `src/pages/robots.txt.ts`, `src/pages/llms.txt.ts`, `src/pages/.well-known/security.txt.ts` —
  the three existing static text endpoints. Model the new one on `llms.txt.ts`: a `GET` returning a
  `Response` whose body is built from content modules. Route naming follows the filename, so
  `src/pages/design.md.ts` serves `/design.md`.

- `src/layouts/BasicLayout.astro:184` and `:231` — two `is:inline` scripts (the pre-paint theme
  resolver and the press-hold listener). `src/components/ThemeSwitcher.astro` ships a third as a
  module on the home page only. `tests/build-output.test.ts:904` asserts the site
  **ships zero external JavaScript files** — inline is the only permitted shape. The baseline row in
  `plans/README.md` records "three first-party scripts, all inline"; step 7 makes it four.

- `tests/control-geometry.test.ts:1-26` — every styled control must be ONE box, and
  **"exactly one rule in the whole stylesheet may declare a control's box"**. It discovers controls
  from the surface's signature in the shipped sheet, so a new button is caught rather than skipped.
  A copy button must therefore wear the existing `control` shortcut rather than inventing a box.

### Repo conventions this plan must honour

- Copy and configurable values live in `src/content/` (see `README.md` § Configuration). Any new
  string a reader sees — the button's label, its copied-state text, the view-markdown link — belongs
  in `src/content/design.ts`, not in the route or the component.
- `src/content/` modules are read through unconfig/jiti by `uno.config.ts`: no `import.meta.glob`,
  no `astro:content`, no top-level `await`, no `.astro` import. See `src/content/site.ts:7-14`.
- Build-wide gates the new surfaces must satisfy: `ships no emoji in any page, stylesheet or text
  endpoint`, `ships no HTML comments — rationale is source-side only (plan 016)`, and
  `emits an llms.txt carrying the constants it claims to summarise`.

### What `.design-sync/conventions.md` is for, and why it is NOT DESIGN.md

Settle this before writing the renderer; the two documents look interchangeable and are not.
`conventions.md` is prepended to a generated README through the `readmeHeader` key and **inlined
into the system prompt of a design agent** that never sees this repository — it "gets the README and
the bound artifacts, nothing else", and must be pointed at the BOUND copies of the stylesheet rather
than at `src/`. Its budget is **2-4k characters**. `DESIGN.md` has the opposite reader: an agent
with the checkout open, no token budget, and every reason to be sent to `src/layouts/BasicLayout.astro`.

So they stay two documents from one source, distinguished by an audience parameter. The file today
is 5,032 bytes — already over budget — which step 3 fixes rather than inherits.

## Commands you will need

| Purpose        | Command                                             | Expected on success        |
|----------------|-----------------------------------------------------|----------------------------|
| Node           | `node -v`                                            | v26 — the version in `.nvmrc` |
| Install        | `pnpm install --frozen-lockfile`                     | exit 0                     |
| Typecheck      | `pnpm check`                                         | exit 0, `- 0 errors`       |
| Lint           | `pnpm eslint`                                        | exit 0                     |
| Tests          | `pnpm test`                                          | exit 0, all pass           |
| Regenerate     | `pnpm test:update`                                   | rewrites file snapshots    |
| Build          | `pnpm build`                                         | exit 0                     |
| Serve built    | `pnpm preview`                                       | serves `dist/` on :4321    |

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

**In scope**:
- `src/lib/design-doc.ts` (create — the renderer)
- `src/content/design.ts` (extend — new reader-facing strings only)
- `src/pages/design.md.ts` (create — the endpoint)
- `src/pages/design.astro` (the view-markdown link and the copy button)
- `src/layouts/BasicLayout.astro` (one optional prop + one `<link>`)
- `src/pages/llms.txt.ts` (one alternate entry)
- `public/_headers` (step 6, only if step 6's measurement says so)
- `DESIGN.md` (create — generated output)
- `.design-sync/conventions.md` (becomes the terse audience rendering)
- `tests/design-system.test.ts`, `tests/build-output.test.ts` (extend)
- `.design-sync/NOTES.md`

**Out of scope**:
- `src/content/design.ts`'s token roles and section rules — 036 authored them; this plan renders
  them, and changing the wording here would make 036's review meaningless.
- The token VALUES in `src/layouts/BasicLayout.astro`.
- `.design-sync/config.json`'s `projectId`.
- Any second inline script beyond the one in step 7, and any external JavaScript file at all.
- `robots.txt`, the sitemap, and `/.well-known/security.txt`.

## Git workflow

- Worktree branch per `CONTRIBUTING.md` § "Isolating the work"; symlink `node_modules`.
- **Never commit to `main`.** Conventional Commits, lowercase imperative subject, body explaining
  why and what was verified.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the audience-parameterised renderer

Create `src/lib/design-doc.ts` exporting something of the shape
`renderDesignDoc(audience: "full" | "agent"): string`, building markdown from `DESIGN_PAGE`,
`TOKEN_ROLES` and `SECTIONS`.

- `"full"` — the complete spec: heading, lede, the token table, every section with its do/don't
  lists. May reference repository paths such as `src/layouts/BasicLayout.astro`.
- `"agent"` — terse: the two load-bearing rules (a `data-theme` attribute is mandatory; the shipped
  stylesheet is a closed set), the token table, and the named classes. It must reference the BOUND
  artifact paths, never `src/`.

Emit no emoji and no HTML comments. Keep the exact sentence
`` `control-surface` is not in the stylesheet `` in the agent rendering — `tests/design-system.test.ts`
parses for it.

**Verify**: `pnpm check` → exit 0.

### Step 2: Generate `DESIGN.md` at the repo root

Add a test that writes the `"full"` rendering to `DESIGN.md` through
`await expect(renderDesignDoc("full")).toMatchFileSnapshot("../DESIGN.md")`.

`DESIGN.md` is committed. It is a generated file whose gate can fail — the same shape as
`dns/requirements.txt` compiled from `dns/requirements.in`.

**Verify**: `pnpm test:update` → `DESIGN.md` appears; `pnpm test` → exit 0. Then change one role in
`src/content/design.ts` and run `SKIP_BUILD=1 pnpm test -- tests/design-system.test.ts` → RED. Revert.

### Step 3: Retarget `conventions.md` to the agent rendering, and hold its budget

Point 036's existing snapshot at `renderDesignDoc("agent")`. Add an assertion that the rendered
string is **at most 4096 characters**, with a failure message naming the budget and why it exists
(it is inlined into a design agent's system prompt).

**Verify**: `pnpm test:update` then `pnpm test` → exit 0, and
`wc -c .design-sync/conventions.md` → at most 4096.

### Step 4: Serve `/design.md`

Create `src/pages/design.md.ts` on the model of `src/pages/llms.txt.ts`: return
`new Response(renderDesignDoc("full"), {headers: {"content-type": "text/markdown; charset=utf-8"}})`.

Keep the header even though the static build discards it, and say why in a comment — `llms.txt.ts`
already sets that precedent and gives the reason.

**Verify**: `pnpm build` → `dist/design.md` exists and
`diff <(cat dist/design.md) DESIGN.md` → no differences.

### Step 5: Make the markdown twin discoverable

- Add an optional prop to `src/layouts/BasicLayout.astro` (model it on `noindex` at `:22` and `:25`)
  that emits `<link rel="alternate" type="text/markdown" href="…">` in the head when set. Only
  `src/pages/design.astro` passes it.
- Add one entry to `src/pages/llms.txt.ts` pointing at `/design.md`.
- Add a `text-link` on the page to `/design.md`, labelled from `src/content/design.ts`. **This is
  the no-JavaScript path and must ship whether or not step 7 does.**

**Verify**: `pnpm build`, then
`grep -c 'rel="alternate" type="text/markdown"' dist/design/index.html` → 1, and
`grep -c 'rel="alternate"' dist/index.html` → 0 (only the design page carries it).

### Step 6: Settle the content-type on the real host — measure, do not assume

The static build discards the header from step 4, so what a reader actually gets is decided by
Cloudflare Pages from the `.md` extension. **This is unverified and must be measured, not reasoned
about**: if it serves `application/octet-stream`, the twin downloads instead of displaying and the
whole surface is worse than not shipping it.

Open a pull request so a preview deploy is built, then:

`curl -sI https://<preview-host>/design.md | grep -i content-type`

- Reports `text/markdown` or `text/plain` → nothing to do; record the measurement in
  `.design-sync/NOTES.md`.
- Reports anything else → add a rule to `public/_headers` setting `content-type: text/markdown;
  charset=utf-8` for `/design.md`. Note that `_headers` has **no most-specific-match**: every
  matching rule applies in file order, so place it deliberately and re-measure after deploying.

**Verify**: the `curl` above reports a markdown or plain content-type on the preview host.

### Step 7: The copy-as-markdown button

Only after steps 1–6 are green. The button is the only part of this plan that needs JavaScript.

- Render a control on `src/pages/design.astro` wearing the existing `control` shortcut — do not
  invent a box; `tests/control-geometry.test.ts` holds that exactly one rule may declare a control's
  box, and it discovers new controls automatically.
- Ship its behaviour as ONE `is:inline` script. No external file: `tests/build-output.test.ts:904`
  asserts zero external JavaScript.
- It must have a perceivable accessible name and a copied-state affordance, both from
  `src/content/design.ts`. The button is an enhancement over step 5's link, not a replacement.
- It copies the same string the endpoint serves. The simplest correct source is a fetch of
  `/design.md`; if that is awkward, embed the string once and copy from it — do not maintain a
  second copy of the markdown in the page's markup.

**Verify**: `pnpm test` → exit 0 including `ships zero external JavaScript files` and every test in
`tests/control-geometry.test.ts`; then `pnpm preview` and confirm by hand that the button copies and
that the page still works with JavaScript disabled (step 5's link).

## Test plan

Extend `tests/design-system.test.ts`:
- `DESIGN.md` matches `renderDesignDoc("full")` (step 2's snapshot).
- `.design-sync/conventions.md` matches `renderDesignDoc("agent")` and is at most 4096 characters.
- The agent rendering references no `src/` path — assert `!/\bsrc\//.test(renderDesignDoc("agent"))`,
  because that agent cannot open this repository.
- Both renderings are non-empty and contain the token table's every token, so an empty render cannot
  pass the snapshot by being regenerated.

Extend `tests/build-output.test.ts`:
- `dist/design.md` exists and is byte-identical to `DESIGN.md`.
- The design page carries exactly one markdown alternate link and no other page carries one.

Verification: `pnpm test` → exit 0, at least four new tests beyond 036's set.

## Done criteria

- [ ] `pnpm check` exits 0 with `- 0 errors`
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `DESIGN.md` exists and `diff dist/design.md DESIGN.md` reports no differences after `pnpm build`
- [ ] `wc -c .design-sync/conventions.md` reports at most 4096
- [ ] `grep -c 'rel="alternate" type="text/markdown"' dist/design/index.html` returns 1
- [ ] `find dist -name '*.js' -not -path 'dist/_astro/*'` returns nothing new; no external JS added
- [ ] The preview host's `content-type` for `/design.md` is recorded in `.design-sync/NOTES.md`
- [ ] `git status` shows no modified file outside the in-scope list
- [ ] `git diff --name-only origin/main...HEAD` does NOT list `plans/README.md` — the index is the reviewer's

## STOP conditions

Stop and report back (do not improvise) if:

- `src/content/design.ts` or `src/pages/design.astro` do not exist — plan 036 has not landed.
- The agent rendering cannot be brought under 4096 characters without dropping one of the two
  load-bearing rules. **Do not truncate it silently**; report and let a human decide what goes.
- Cloudflare serves `/design.md` as a download and a `public/_headers` rule does not change it.
  Steps 1–5 stand on their own; ship those and report rather than inventing a redirect or renaming
  the route to something the convention does not use.
- `tests/control-geometry.test.ts` fails on the copy button and cannot be satisfied by wearing the
  existing `control` shortcut. Steps 1–6 stand; ship those and report.
- Adding the button would require a second inline script or any external JavaScript file.
- A step's verification fails twice after a reasonable fix attempt.
- You discover the assumption "**`DESIGN.md` and `/design.md` can be the same bytes**" is false —
  e.g. the endpoint needs front-matter the repo file must not carry.

## Maintenance notes

- **One renderer, three surfaces.** If a fourth surface is ever wanted, add an audience to
  `renderDesignDoc` rather than a second renderer. The moment two functions produce design prose,
  they will disagree.
- **The 4096 budget is not arbitrary and is not this repo's choice** — it comes from the document
  being inlined into a design agent's system prompt. If the design-sync skill's stated budget
  changes, change the assertion and say so in `.design-sync/NOTES.md`.
- **A reviewer should scrutinise** that the agent rendering contains no `src/` path, and that the
  copy button is an enhancement over a link that works without it.
- **This plan changes a baseline row.** `plans/README.md` records "three first-party scripts, all
  inline"; step 7 makes it four. Re-derive that row rather than incrementing it — the cell says so.
- **Deferred**: markdown twins for the other pages. This plan does one page because one page is
  where the convention pays for itself; a site-wide `.md` twin is a separate decision with its own
  sitemap and discovery questions.
