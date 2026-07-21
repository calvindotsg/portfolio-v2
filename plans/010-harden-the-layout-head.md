# Plan 010: Harden the layout head — default theme for no-JS visitors, drop the dead og:image fallback, assert the social-preview tags

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT update `plans/README.md` — your reviewer
> maintains the index.
>
> **Drift check (run first)**: `git diff --stat c8fe10f..HEAD -- src/layouts/BasicLayout.astro tests/build-output.test.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (independent of plan 009; either order is fine)
- **Category**: bug (minor) + tests
- **Planned at**: commit `c8fe10f`, 2026-07-21

## Why this matters

Three small, related gaps in `src/layouts/BasicLayout.astro`'s `<head>`/`<html>`:

1. **No-JS visitors lose the design (cosmetic robustness, honestly framed).**
   Every color on the page is a CSS custom property defined only under
   `:root[data-theme='light']` / `:root[data-theme='dark']`, and `data-theme`
   is set exclusively by the inline pre-paint script. With JS disabled
   (NoScript, strict extensions — a small but real slice), no token resolves:
   text stays legible on the UA default background, but every card loses its
   background, border, and shadow — the bento design collapses. A hardcoded
   `data-theme="light"` on `<html>` fixes it; the pre-paint script (synchronous,
   in `<head>`, runs before first paint) still overrides for JS visitors, so
   nothing changes for them — including no flash for dark-mode users.
2. **A dead fallback misleads readers.** `content={image || METADATA.image_url}`
   on the og:image/twitter:image tags looks defensive, but `image` is a template
   literal that is always truthy — the right-hand branch is unreachable. Both
   branches also resolve to the identical string today
   (`https://calvin.sg/preview.jpg`), so this is pure dead code that makes the
   tag look protected when it isn't. Delete-only fix.
3. **Social unfurls are unasserted.** LinkedIn/X/Slack unfurls are this site's
   main sharing surface, yet no test opens the og:*/twitter:* tags — deleting
   `twitter:image` would ship green. Five assertions in the existing `dist/`
   suite close that.

## Current state

- `src/layouts/BasicLayout.astro` — the only layout; relevant excerpts as of
  `c8fe10f` (verify these before editing):

  Line 10 (frontmatter):
  ```ts
  const image = `${Astro.url.origin}/preview.jpg`;
  ```

  Line 34:
  ```html
  <html lang="en">
  ```

  Lines 48–51 and 56–59 (the two meta tags with the dead fallback):
  ```html
  <meta
          property="og:image"
          content={image || METADATA.image_url}
  />
  ...
  <meta
          name="twitter:image"
          content={image || METADATA.image_url}
  />
  ```

  Lines 96–112 define the theme tokens ONLY under `:root[data-theme='light']`
  and `:root[data-theme='dark']` — leave that CSS exactly as is.

  Lines 64–72: the inline pre-paint script that sets
  `document.documentElement.dataset.theme` — leave it exactly as is.

- `tests/build-output.test.ts` — asserts on `dist/` after a real build (the
  vitest globalSetup `tests/setup/build.ts` runs `pnpm build` first). The
  describe block `"dist/index.html is prerendered"` (line 70) is where the new
  tests go. Its `doc()` helper already parses `dist/index.html` with linkedom.
  NOTE (from the file's own header comment): linkedom has a quirk with this
  file — element queries work, whole-document `textContent` does not. The new
  tests use only element queries. `doc().querySelector("html")` works — verified.

- Built output today: `og:url` is `https://calvin.sg` (origin, **no** trailing
  slash) while canonical is `https://calvin.sg/`. **This split is documented,
  intended behavior from plan 002 — do NOT assert og:url equals the canonical
  or `METADATA.site_url`; assert it equals the site's origin.**

- In the prerendered static build, `Astro.url.origin` is `https://calvin.sg`
  (from `site` in `astro.config.mjs`), so `image` renders as
  `https://calvin.sg/preview.jpg` — byte-identical to `METADATA.image_url` in
  `src/lib/constants.ts:112`. Deleting the fallback therefore changes nothing
  in the output. **In the Container-API suite (`tests/rendered-html.test.ts`)
  the origin is a test-server placeholder instead — that is why the new
  assertions go in the `dist/` suite, not there. Do not add them to
  `rendered-html.test.ts`.**

- Repo conventions: pnpm only, never npm. Test style: small `it` blocks with a
  one-line reason string in the `expect` message where non-obvious — model the
  new tests on the existing `"self-canonicalises to the configured site URL"`
  test (`tests/build-output.test.ts:83-86`). A `lint-staged` pre-commit hook
  runs `eslint --fix` on staged `src/**/*.{js,astro}`; it is expected and fine.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Tests (builds site first) | `pnpm test` | all pass |
| Re-test without rebuild | `SKIP_BUILD=1 pnpm test` | all pass (reuses `dist/`) |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Lint | `pnpm eslint` | exit 0, no problems |

## Scope

**In scope** (the only files you may modify):
- `src/layouts/BasicLayout.astro` — exactly two edits (steps 2 and 3)
- `tests/build-output.test.ts` — two new `it` blocks (step 4)

**Out of scope** (do NOT touch, even though they look related):
- The theme CSS blocks and the pre-paint script in `BasicLayout.astro` — the
  fix is the `<html>` attribute, not a CSS restructure.
- `tests/rendered-html.test.ts` — Container origin differs; assertions there
  would be wrong (see Current state).
- `src/lib/constants.ts`, `public/preview.jpg` (its content is a known,
  maintainer-owned item), `src/components/ThemeSwitcher.astro`.

## Git workflow

- Branch: `improve/010-harden-layout-head` (or the worktree's assigned branch).
- Two commits, conventional style:
  1. `fix(layout): default data-theme to light and drop the dead og:image fallback`
  2. `test(build): assert the social-preview tags and the no-JS theme default`
- If commit signing fails (1Password locked), commit with
  `git -c commit.gpgsign=false commit …`.
- Do NOT push and do NOT open a PR — the reviewer does both.

## Steps

### Step 1: Record the baseline and snapshot the current build

- `pnpm install`, then `pnpm test` → all pass; record the passed-test count N.
- Snapshot the pristine page for the step-6 diff:
  `cp dist/index.html /tmp/plan010-index-before.html`

**Verify**: suite green; snapshot file exists.

### Step 2: Default the theme on the static `<html>` tag

In `src/layouts/BasicLayout.astro` line 34, change:

```html
<html lang="en">
```

to:

```html
<html lang="en" data-theme="light">
```

**Verify**: `grep -c 'data-theme="light"' src/layouts/BasicLayout.astro` → `1`

### Step 3: Delete the dead fallback on both image meta tags

In the same file, replace `content={image || METADATA.image_url}` with
`content={image}` in BOTH places (og:image, lines 48–51; twitter:image, lines
56–59).

**Verify**: `grep -c 'METADATA.image_url' src/layouts/BasicLayout.astro` → `1`
(the sole remaining reference is `image: METADATA.image_url` in the JSON-LD
schema object at line 18 — that one stays).

### Step 4: Add the two assertions to the dist suite

In `tests/build-output.test.ts`, inside
`describe("dist/index.html is prerendered", …)` (after the canonical test is a
natural spot), add:

```ts
it("declares a default theme so no-JS visitors keep the designed colors", () => {
    // Every color token is defined under :root[data-theme=…]; without this
    // attribute a visitor whose JS never runs gets unstyled, transparent cards.
    expect(doc().querySelector("html")?.getAttribute("data-theme")).toBe("light");
});

it("emits the social-preview tags unfurls depend on", () => {
    const meta = (sel: string) => doc().querySelector(sel)?.getAttribute("content");
    expect(meta('meta[property="og:title"]')).toBe(METADATA.title);
    expect(meta('meta[property="og:description"]')).toBe(METADATA.description);
    expect(meta('meta[property="og:image"]')).toBe(METADATA.image_url);
    expect(meta('meta[name="twitter:image"]')).toBe(meta('meta[property="og:image"]'));
    expect(meta('meta[name="twitter:card"]')).toBe("summary_large_image");
    // og:url is origin-only BY DESIGN (plan 002) — never assert it against the
    // canonical URL or METADATA.site_url, which carry a trailing slash.
    expect(meta('meta[property="og:url"]')).toBe(new URL(METADATA.site_url).origin);
});
```

`METADATA` is already imported at the top of this file.

**Verify**: `pnpm test` → all pass, count is N + 2.

### Step 5: Full ladder

- `pnpm check` → 0 errors, 0 warnings, 2 hints (unchanged — the two known
  `astro(4000)` hints predate this plan).
- `pnpm eslint` → 0 problems.

**Verify**: as stated.

### Step 6: Prove the shipped page changed by exactly one attribute

```bash
diff <(tr '>' '\n' < /tmp/plan010-index-before.html) <(tr '>' '\n' < dist/index.html)
```

**Verify**: the diff touches exactly ONE token — the `<html …` tag gaining
` data-theme="light"`. In particular the og:image/twitter:image tags must be
byte-identical (the fallback deletion is output-neutral). Any other delta →
STOP.

### Step 7: Mutation-test both new assertions

Each mutation: edit → `SKIP_BUILD=` **unset** full `pnpm test` (the build must
re-run to pick up source edits) → confirm exactly the named test fails →
revert → `pnpm test` green again.

1. Remove ` data-theme="light"` from the `<html>` tag → the
   *"declares a default theme…"* test (and only it) fails → restore.
2. In `BasicLayout.astro`, delete the entire `twitter:image` `<meta …/>`
   element → the *"emits the social-preview tags…"* test (and only it)
   fails → restore.

**Verify**: both mutations turn exactly the expected test red; suite is green
after both reverts.

### Step 8: Commit

Two commits per the git workflow section: source edit(s), then tests.

**Verify**: `git show --name-status` on each commit — commit 1 touches only
`src/layouts/BasicLayout.astro`; commit 2 touches only
`tests/build-output.test.ts`.

## Test plan

Covered by steps 4 and 7: two new `it` blocks in the existing
`tests/build-output.test.ts` `dist/` suite (extend, never rebuild), each
mutation-tested. Expected suite delta: exactly +2 tests, both passing.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm test` → all pass, exactly N+2 where N is the step-1 baseline
- [ ] `pnpm check` → 0 errors, 0 warnings, 2 hints
- [ ] `pnpm eslint` → exit 0
- [ ] `grep -c 'METADATA.image_url' src/layouts/BasicLayout.astro` → `1`
- [ ] `grep -c 'data-theme="light"' src/layouts/BasicLayout.astro` → `1`
- [ ] Step-6 diff shows exactly the one predicted delta
- [ ] Both step-7 mutations each turned exactly one named test red
- [ ] No file outside the two in-scope files is modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check flags either in-scope file, or any "Current state" excerpt
  does not match the live code (especially: line 34 already carrying a
  `data-theme` attribute, or the fallback expressions already gone).
- The step-6 diff shows ANY delta beyond ` data-theme="light"` on the `<html>`
  tag.
- A step-7 mutation leaves the suite green, or turns a *different* test red.
- `pnpm check` reports anything other than 0 errors / 0 warnings / 2 hints.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- If a dark-default is ever wanted for no-JS visitors, the change is this one
  attribute plus the assertion — do not add a `prefers-color-scheme` CSS
  duplicate of the token blocks for it; that path was considered and rejected
  as more code for a sliver of traffic.
- The og:image assertion pins the derived `Astro.url.origin` value to
  `METADATA.image_url`. If the site URL ever changes in `astro.config.mjs`,
  this test failing is the intended alarm that `METADATA.image_url` (and the
  preview asset) must move with it.
- Reviewer should scrutinize: the step-6 single-attribute diff claim, and that
  the mutation tests were actually run (ask for the failing test names).
- Deferred deliberately: asserting og/twitter tags in the Container suite
  (wrong origin there), and any restructuring of the theme CSS.
