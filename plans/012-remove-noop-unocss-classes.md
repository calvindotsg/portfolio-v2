# Plan 012: Remove the no-op UnoCSS classes and lock the class↔rule pairing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md` — do
> not edit it.
>
> **Drift check (run first)**: `git diff --stat 4e15674..HEAD -- src/ tests/`
> Plan 011 lands before this plan and touches some of the same files — that
> drift is expected and accounted for below. For anything else, compare the
> "Current state" excerpts against the live code; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2 (maintainer-mandated)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/011-emoji-to-icons.md (merged first; shares files)
- **Category**: tech-debt
- **Planned at**: commit `4e15674`, 2026-07-22

## Why this matters

The maintainer reported unnecessary UnoCSS utility classes in the components.
The claim was verified empirically against the built stylesheet and the CSS
spec: nine class tokens either generate no CSS at all or generate rules with
zero effect in their context. All are relics of the upstream template's
3D-tilt hover effect, whose JavaScript was deleted in plan 003. Removing them
makes every remaining class token meaningful, and a new build-gating test
locks the invariant "every class in the shipped HTML has a CSS rule" so dead
classes cannot silently accumulate again.

## Current state

Evidence per class (verified at `4e15674` by extracting every class token
from `dist/index.html` and every class selector from `dist/_astro/*.css`):

| Class | Where | Why it is dead |
|---|---|---|
| `card` | `src/components/Card/index.astro:12` | No rule in the stylesheet, no scoped style, no JS or test references it. Upstream relic. |
| `group` | `src/components/Card/index.astro:12` | UnoCSS group marker; zero `group-*` variant classes exist anywhere in `src/`. The tilt effect that used it is gone. |
| `perspective-1200` | `src/components/Card/index.astro:12` | Generates `perspective:1200px`, which only affects 3D-transformed children. No 3D transforms remain in the codebase (only 2D translate/scale). |
| `justify-start` | `src/components/Card/index.astro:12` | `justify-content` on a `display:block` element (the div has no `flex`/`grid` utility) — no-op. |
| `flex-none` | `src/components/Card/index.astro:12` | `flex:none` applies to flex items; every Card is a grid item of `main.grid`, never a flex item — no-op. |
| `h-full` | `src/components/Card/index.astro:12` | Grid items stretch to their grid area by default (`align-items: stretch`); `height:100%` resolves to the same box in every breakpoint. Removal must be layout-verified (step 4). |
| `z-20` | `src/components/Card/index.astro` (h2) | z-index on a static-positioned element whose parent is `display:block` — ignored per spec. Nothing overlaps card titles since the tilt effect died. |
| `z-20` | `src/components/Now.astro:10` (h2) | The h2 is a flex item so z-index *applies*, but no element overlaps it — zero visual effect, copy-paste of the Card h2 list. |
| `sm:gap-2` | `src/pages/index.astro:17` | Duplicates the base `gap-2` (both emit `gap:.5rem`) — the sm: variant never changes anything. |
| bare `transform` | `src/components/IntroCard.astro:36` | Every wind3 `translate-*`/`scale-*` utility emits the full `transform:` property itself (verified in the built CSS), so the bare `transform` class is redundant beside `-translate-y-1/2`. `md:transform-none` still works — it overrides the same property later in the sheet. |

Note: `ProgressBar.astro` also carried a bare `transform` (plus
`scale-x-[-1]`) — plan 011 removes that whole pattern when it swaps the emoji
for an icon class. It is NOT in this plan's scope.

Classes that look similar but are LOAD-BEARING — keep them:

- `overflow-hidden` on the Card div — clips the portrait, which at mobile is
  absolutely positioned at `right-[-50px]` inside the intro card.
- `relative` on the Card div — the containing block for that same absolutely
  positioned portrait.
- `md:transform-none` on the IntroCard image — cancels the mobile translate
  at md+.

Current class attributes (after plan 011; the Card h2 also carries a
`titleIcon` span from 011 — the h2's class list is unchanged):

`src/components/Card/index.astro:12` (one long line — excerpt of the class
attribute's start):
```
card group overflow-hidden bg-[var(--card-background)] shadow-lg rounded-lg p-6 border border-[var(--card-border)] hover:border-[var(--accent)] flex-none h-full justify-start relative perspective-1200 w-full transition-colors duration-300 ease-in-out col-span-1 ...
```

`src/pages/index.astro:17` (main): contains `... p-2 grid gap-2 max-w-6xl
overflow-hidden relative w-full sm:p-4 sm:gap-2 md:grid-cols-2 ...`

`src/components/Now.astro:10`:
```astro
            <h2 class="text-xl font-bold m-0 z-20">Now</h2>
```

`src/components/IntroCard.astro:36` (Image class): contains
`... absolute right-[-50px] top-1/2 transform -translate-y-1/2 z-[-1] ...`

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Tests | `pnpm test` | all pass (measure baseline in step 1) |
| Lint | `pnpm eslint` | exit 0, no output |
| Build | `pnpm build` | exit 0, "1 page(s) built" |

pnpm ONLY — never npm. The `lint-staged` pre-commit hook is expected.

## Scope

**In scope** (the only files you may modify):
- `src/components/Card/index.astro`
- `src/components/Now.astro`
- `src/components/IntroCard.astro`
- `src/pages/index.astro`
- `tests/build-output.test.ts`

**Out of scope** (do NOT touch):
- `src/components/ProgressBar.astro` — plan 011 already handled its dead
  classes.
- Every other class on the touched elements (including `overflow-hidden`,
  `relative`, `md:transform-none` — see load-bearing list).
- `src/components/Button.astro`, `ThemeSwitcher.astro` — their `max-h`/`max-w`
  constraints are defensive but functional; not part of the evidence set.
- `plans/README.md`.

## Git workflow

- Branch: `improve/012-remove-noop-unocss-classes`
- Conventional commit, e.g. `refactor: remove no-op UnoCSS classes left by the deleted tilt effect`
- Do NOT push, do NOT open a PR.

## Steps

### Step 1: Baseline

`pnpm install && pnpm check && pnpm test && pnpm build` — record the passing
test count. Capture the pre-change layout fingerprint for step 4:

```bash
python3 - <<'EOF'
import re
html = open('dist/index.html').read()
# every class token in the shipped page, sorted
tokens = sorted({t for m in re.finditer(r'class="([^"]*)"', html) for t in m.group(1).split()})
print(len(tokens), 'unique class tokens')
open('/tmp/plan012-before-tokens.txt', 'w').write('\n'.join(tokens))
EOF
```

**Verify**: all commands exit 0; the token file exists.

### Step 2: remove the dead classes

1. `src/components/Card/index.astro:12`: delete the tokens `card`, `group`,
   `perspective-1200`, `justify-start`, `flex-none`, `h-full` from the div's
   class attribute (leave every other token exactly as is).
2. Same file, the h2: delete `z-20` (keep `text-xl font-bold m-0`).
3. `src/components/Now.astro:10`: delete `z-20` from the h2.
4. `src/pages/index.astro:17`: delete `sm:gap-2` from main's class list.
5. `src/components/IntroCard.astro:36`: delete the bare `transform` token
   (keep `-translate-y-1/2` and `md:transform-none`).

**Verify**: `grep -rn 'perspective-1200\|justify-start\|flex-none\|z-20\|sm:gap-2' src/` → no matches;
`grep -c 'class="card group' src/components/Card/index.astro` → 0.

### Step 3: add the class↔rule tripwire test

In `tests/build-output.test.ts`, inside the existing
`describe("source hygiene", ...)` block (whose header comment explains the
UnoCSS fails-silently problem — this test generalizes it), add:

```ts
    it("gives every class token in the shipped HTML a rule in the stylesheet", () => {
        // UnoCSS fails silently on unknown utilities and Astro drops nothing:
        // a dead class ships as markup bytes with no effect. After plan 012
        // every remaining token is load-bearing; this keeps it that way.
        // The stylesheet escapes special chars in selectors (`.md\:pr-8`), so
        // unescape before comparing.
        const html = read("dist/index.html");
        const sheet = readdirSync("dist/_astro").find((f) => f.endsWith(".css"))!;
        const css = read(`dist/_astro/${sheet}`);
        const cssClasses = new Set(
            [...css.matchAll(/\.((?:[\w-]|\\.)+)/g)].map((m) => m[1].replace(/\\(.)/g, "$1")),
        );
        const tokens = new Set(
            [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean)),
        );
        expect(tokens.size, "the page must ship class tokens").toBeGreaterThan(50);
        for (const token of tokens) {
            expect(cssClasses.has(token), `class "${token}" has no rule in the stylesheet`).toBe(true);
        }
    });
```

Note the HTML attribute may contain entity-encoded values; the shipped page
uses plain quotes for class attributes, so the regex above is sufficient —
verify with the mutation in step 5.

**Verify**: `pnpm build && pnpm test` → all pass, count = step-1 baseline + 1.

### Step 4: prove the layout is unchanged

Two checks, both required.

**4a — markup check (deterministic).** The only deltas this plan may produce
in the built page are inside class attributes. Prove it: `git stash`, then
`pnpm build`, save `cp dist/index.html /tmp/plan012-before.html`, then
`git stash pop`, `pnpm build` again, and diff with class attributes stripped:

```bash
diff <(sed 's/ class="[^"]*"//g' /tmp/plan012-before.html) \
     <(sed 's/ class="[^"]*"//g' dist/index.html)
```

**Verify**: empty diff.

**4b — geometry check (for `h-full`).** Grid stretch should make the removal
invisible — prove it with before/after screenshots in headless Chromium.
While the *before* build from 4a is checked out (i.e. do this between
`git stash` and `git stash pop`, or repeat the stash), serve and capture; then
capture the *after* build the same way:

```bash
pnpm preview &   # serves the current dist/ on http://localhost:4321
sleep 2
# --wait-for-timeout outlasts the 0.4s+0.48s entrance animation
pnpm dlx playwright@latest screenshot --viewport-size=1280,800 --wait-for-timeout=3000 http://localhost:4321 /tmp/plan012-<before|after>-lg.png
pnpm dlx playwright@latest screenshot --viewport-size=375,667 --wait-for-timeout=3000 http://localhost:4321 /tmp/plan012-<before|after>-sm.png
kill %1
```

Compare: `cmp /tmp/plan012-before-lg.png /tmp/plan012-after-lg.png` (and the
sm pair). If `cmp` reports a difference, produce a pixel-diff bounding box
(python3 + PIL if available) before concluding anything — identical
dimensions with sub-pixel antialiasing noise is acceptable ONLY if the diff
bounding box is empty at threshold 8/255; any real geometry shift is a STOP.

**Verify**: both viewport pairs byte-identical, or diff-bounding-box empty.
Report which outcome you got. If headless Chromium cannot run in your
environment at all, STOP and report — do not skip the geometry check by
restoring `h-full` or by declaring it safe untested.

### Step 5: mutation-test the tripwire

Temporarily add a bogus class (e.g. `unstyled-probe`) to any element in
`src/pages/index.astro`, run `pnpm build && pnpm test`:

**Verify**: exactly the new "every class token … has a rule" test fails,
naming `unstyled-probe`. Revert the mutation, rebuild, confirm fully green.
Report both outcomes.

### Step 6: full ladder + commit

`pnpm check && pnpm eslint && pnpm test && pnpm build` — all green. Commit.

## Test plan

One new test (step 3), mutation-tested (step 5). No existing test changes —
no current test asserts any of the removed classes (verified: the "source
hygiene" DEAD_CLASSES list contains only typo-classes, none of these).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` → 0 errors; `pnpm eslint` → exit 0
- [ ] `pnpm test` → all pass, count = step-1 baseline + 1
- [ ] `grep -rn 'perspective-1200\|justify-start\|flex-none\|sm:gap-2' src/` → no matches
- [ ] `grep -rn 'z-20' src/` → no matches
- [ ] The class-stripped HTML diff of step 4 is empty (or browser geometry match reported)
- [ ] Mutation check of step 5 reported (fail-then-green)
- [ ] `git status` — no files outside the in-scope list modified

## STOP conditions

Stop and report back (do not improvise) if:

- Any listed class is missing from where "Current state" says it is (plan 011
  may have drifted the files — compare carefully; only ProgressBar's tokens
  were expected to move).
- The step-4 comparison shows ANY difference outside class attributes.
- The new tripwire test fails on a class you did NOT remove — that means some
  other token has no rule; report it, do not delete it unilaterally.
- The tripwire test cannot pass without whitelisting exceptions — the
  invariant is supposed to hold exactly; a needed exception is a finding, not
  something to code around.

## Maintenance notes

- The tripwire means any future class token must earn a rule: real utilities
  do automatically; custom names (like `progress-fill`, `button-grid`,
  `theme-toggle`) need a style block that references them. That is the
  desired friction.
- If a group-hover effect is ever reintroduced, `group` goes back on the Card
  div — but `group` is a marker class UnoCSS never generates a rule for, so
  the tripwire will fail on it. That failure is correct behavior: at that
  point add `group` to an explicit allowlist inside the test with a comment
  explaining the marker semantics.
- Reviewer should scrutinize: the step-4 evidence (byte-identical page modulo
  class attributes), and that the removed-token list matches this plan
  exactly — nothing extra "cleaned up".
