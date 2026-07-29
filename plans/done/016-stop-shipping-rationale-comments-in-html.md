# Plan 016: Stop shipping rationale comments in the built HTML

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`; do
> not edit it.
>
> **Drift check (run first)**:
> `git diff --stat 45e286f..HEAD -- src/layouts/BasicLayout.astro src/components/Career.astro src/pages/index.astro 'src/pages/patches/[...sport].astro' tests/build-output.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `45e286f`, 2026-07-29

## Why this matters

This repo documents its decisions in long measured comments — that style is
deliberate and stays. But ten of those comments are written in HTML form
(`<!-- -->`) inside `.astro` template bodies, and Astro preserves HTML
comments in the built output (its `compressHTML` collapses whitespace only).
The result, measured on a build of `45e286f`: **4,311 bytes of source
rationale ship on every `/patches` page** (30–43% of the raw markup;
~1.4 KB brotli, roughly 45–50% of the compressed markup on the smallest
page) and 5,970 bytes on `/`. The maintainer named `/patches` loading time
as a concern; this is the single largest attributable dead weight on those
pages. Astro's JS-style template comment `{/* ... */}` carries identical
prose and is stripped at build — `src/components/Patch.astro` already uses
that form throughout, so this change converts the outliers to the repo's own
majority convention. A one-sentence rule in `CLAUDE.md` already warns about
exactly this ("Explanatory comments in Astro template bodies ship as HTML").

## Current state

Ten HTML-form comments in four files (verified at `45e286f`; byte sizes are
the comment body, excluding the `<!--`/`-->` markers):

| File | Line | First words | Body bytes |
|---|---|---|---|
| `src/layouts/BasicLayout.astro` | 106 | `Basic OG tags for sharing…` | 90 |
| `src/layouts/BasicLayout.astro` | 110 | `THE PAGE'S OWN URL, not the origin…` | 573 |
| `src/layouts/BasicLayout.astro` | 122 | `Basic Twitter Card tags` | 25 |
| `src/components/Career.astro` | 22 | `THE COMPANY NAME IS A LINK…` | 810 |
| `src/pages/index.astro` | 186 | `The lg grid is packed exactly 32/32 cells…` | 275 |
| `src/pages/index.astro` | 190 | `The right-hand column is its own stack…` | 658 |
| `src/pages/index.astro` | 204 | `THE EXTRA lg ROWS ARE WHAT MAKE THE DATELINE FIT…` | 2,673 |
| `src/pages/patches/[...sport].astro` | 113 | `` `min-h-6` is 1.5rem, which is the floor… `` | 747 |
| `src/pages/patches/[...sport].astro` | 121 | `` `text-link` is the shared idiom… `` | 435 |
| `src/pages/patches/[...sport].astro` | 134 | `` `break-anywhere` IS WHAT STOPS THE DOCUMENT… `` | 2,399 |

What ships as a consequence (measured on `dist/` at `45e286f`):
`dist/index.html` 8 comments / 5,970 B (Career.astro's one comment ships
twice — the component renders once per `CAREER` entry); each of the three
`dist/patches/**/index.html` pages 6 comments / 4,311 B (the three
BasicLayout head comments plus the three `[...sport].astro` ones).

Facts that make the conversion safe, each verified at planning time:

- **None of the ten comment bodies contains `*/`**, so each can be wrapped
  in `{/* ... */}` verbatim. (One — `[...sport].astro:134` — contains brace
  characters; braces inside a JS block comment are inert.)
- `src/components/Patch.astro` is the exemplar: its template rationale is
  written as `{/* ... */}` (e.g. lines 105–107 and 135–147 at `45e286f`)
  and none of it reaches `dist/`.
- No test references `<!--` (`grep -rn '<!--' tests/` returns nothing), and
  no test pins the byte size of a built page.
- UnoCSS extracts class tokens from the whole file text including comments,
  and several of these comments deliberately name utilities the element
  beside them wears (`min-h-6`, `text-link`, `break-anywhere`). The
  conversion changes only the comment *markers*, not one byte of the prose,
  so the extracted token set is unchanged.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck (.ts gate) | `pnpm check` | 0 errors (2 pre-existing hints are fine) |
| Lint | `pnpm eslint` | exit 0, no output |
| Tests (builds `dist/` first) | `pnpm test` | all files pass |
| Reuse existing `dist/` while iterating | `SKIP_BUILD=1 pnpm test` | all pass — but NEVER for the final verification; a stale `dist/` makes any dist assertion meaningless |

## Scope

**In scope** (the only files you should modify):

- `src/layouts/BasicLayout.astro` — comment markers only
- `src/components/Career.astro` — comment markers only
- `src/pages/index.astro` — comment markers only
- `src/pages/patches/[...sport].astro` — comment markers only
- `tests/build-output.test.ts` — one new assertion

**Out of scope** (do NOT touch, even though they look related):

- The prose of any comment — do not reword, trim, "fix", or update a single
  word. Several comments are worded around UnoCSS's extractor and around
  facts that look stale but are the maintainer's record; the maintainer's
  voice is his. Marker conversion only.
- `src/components/Patch.astro` — already uses `{/* */}`; nothing to do.
- Frontmatter `/* */` comments anywhere — already stripped by Astro.
- `astro.config.mjs` — no build hook, no compress integration; the fix is
  source-side by design.
- The ~525 B inline theme script in `BasicLayout.astro` — not a comment.

## Git workflow

- Branch: `advisor/016-stop-shipping-rationale-comments`
- Conventional-commit style, e.g. `perf(html): stop shipping rationale comments in built pages`
  (repo examples: `fix(a11y): draw every link so a reader can tell it is one`)
- A `lint-staged` pre-commit hook runs; that is normal.
- Do NOT push and do NOT open a PR — your reviewer does both.

## Steps

### Step 1: Baseline measurement

Run `pnpm install --frozen-lockfile`, then `pnpm test` (this builds
`dist/`). Record the comment census:

```bash
python3 - <<'EOF'
import re, glob
for f in sorted(glob.glob('dist/**/*.html', recursive=True)):
    s = open(f).read()
    cs = re.findall(r'<!--.*?-->', s, re.S)
    print(f, len(cs), sum(len(c) for c in cs), 'B')
EOF
```

**Verify**: `dist/index.html` reports 8 comments / ~5,970 B and each
`dist/patches/**/index.html` reports 6 / ~4,311 B (±a few bytes if content
drifted — a *count* mismatch is a STOP).

### Step 2: Convert the ten comments to Astro JS-style template comments

In each of the four files, for each comment listed in "Current state",
replace the opening `<!--` with `{/*` and the closing `-->` with `*/}`.
Preserve every byte between them, including leading/trailing whitespace and
line breaks. Example shape (from `[...sport].astro:113`):

```astro
<!-- `min-h-6` is 1.5rem, which is the floor this codebase already set …
     … so this is the repo's own standard rather than the specification's. -->
```

becomes

```astro
{/* `min-h-6` is 1.5rem, which is the floor this codebase already set …
     … so this is the repo's own standard rather than the specification's. */}
```

**Verify**: `grep -rn '<!--' src/` → no matches.

### Step 3: Add the build-wide gate

In `tests/build-output.test.ts`, inside the existing `describe` that walks
built pages (the file already imports the built-page list from
`tests/helpers/pages.ts` — follow the existing pattern used by the
every-`<a>`-has-a-signifier gate), add one test asserting that **no built
page contains an HTML comment**:

```ts
it("ships no HTML comments — rationale is source-side only (plan 016)", () => {
    for (const page of builtPages()) {
        const html = readFileSync(page, "utf8");
        expect(html, `${page} ships an HTML comment`).not.toContain("<!--");
    }
});
```

Adapt identifier names to what the file actually imports/uses (e.g. if pages
are provided as `[path, html]` pairs, use those); the invariant — every
built page, `not.toContain("<!--")` — is the requirement.

**Verify**: `pnpm test` → all pass (the new assertion passes because Step 2
already removed the sources).

### Step 4: Rebuild and measure the delta

Re-run the Step 1 census (after a real rebuild — not `SKIP_BUILD=1`).

**Verify**: every page reports **0 comments / 0 B**. Record the new
`wc -c` and `gzip -9 | wc -c` for the four HTML pages in your report,
alongside Step 1's numbers.

### Step 5: Full ladder

**Verify**: `pnpm check` → 0 errors; `pnpm eslint` → clean; `pnpm test` →
all pass.

## Test plan

- One new assertion (Step 3) in `tests/build-output.test.ts`, following that
  file's existing walk-every-built-page pattern.
- Mutation check (do this, and report the result): re-add a throwaway
  `<!-- probe -->` to `src/pages/index.astro`'s template, rebuild
  (`pnpm test`, NOT `SKIP_BUILD=1`), confirm exactly the new assertion
  fails, then remove the probe and rebuild. This proves the gate sees the
  class of defect it was written for.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn '<!--' src/` → no matches
- [ ] Step 1 census on a fresh build → 0 comments on every page
- [ ] `pnpm check` exits 0 with 0 errors
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0; the new no-HTML-comments assertion exists and passed a mutation check
- [ ] `git status` shows no modified files outside the five in-scope files
- [ ] The diff contains no change to any comment's inner text (marker-only: verify with `git diff --word-diff` — every hunk should touch only `<!--`/`-->`/`{/*`/`*/}` markers and the new test)

## STOP conditions

Stop and report back (do not improvise) if:

- Any comment listed in "Current state" is not at (or near) the cited line,
  or its first words do not match — the file has drifted.
- After Step 2 a build fails or any existing test goes red — do not "fix"
  the test; report which one and why.
- You find any comment body containing `*/` (would break the JS comment
  form) — the plan asserts none exists; a mismatch means drift.
- The Step 4 census shows a comment remaining in `dist/` after `grep -rn
  '<!--' src/` is clean — that would mean a tool, not a template, injects
  comments, and the fix belongs elsewhere.

## Maintenance notes

- Future template rationale must use `{/* ... */}` (or frontmatter `/* */`);
  the new gate fails the deploy on any `<!--` in a built page, which is the
  point — if a legitimate need for a shipped HTML comment ever appears
  (e.g. a tool marker), that is a deliberate decision to make against the
  gate, not around it.
- Reviewer scrutiny: the word-diff must show zero prose changes; the
  UnoCSS orphan gate (already in the suite) double-checks that no utility
  token's extraction changed.
- Expected page-weight result for the index: `/patches` pages drop from
  ~4.0 KB to ~2.2 KB gzip markup; `/` from ~6.6 KB to ~4.6 KB. The reviewer
  records production brotli numbers after deploy.
