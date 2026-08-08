# Plan 024: Refresh the lockfile in-range, taking the audit from eight highs to two unpatchable ones

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT update `plans/README.md`; your reviewer
> maintains the index.
>
> **Drift check (run first)**: `git diff --stat 219dcde..HEAD -- package.json pnpm-lock.yaml`
> If either file changed since this plan was written, re-run the measurement in
> "Current state" before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dependencies
- **Planned at**: commit `219dcde`, 2026-08-08

## Why this matters

`pnpm audit` reports **1 moderate and 8 high** advisories. The repository's own
baseline says **1 moderate and 1 high**, and names both as deliberate residuals
that no in-range refresh can clear. Both halves of that sentence are now false:
seven of the eight highs did not exist when it was written, and the two reasons
recorded for the documented residuals have **expired** — a patched
`brace-expansion@1.x` now exists, and the transitive pin that held
`@opentelemetry/core` at a vulnerable version has been lifted upstream.

Measured on a scratch copy of `package.json` + `pnpm-lock.yaml`: a single
`pnpm update --no-save` takes the audit to **0 moderate and 2 high**, and the two
survivors are the same advisory pair against `image-size`, whose "Patched
versions" field reads `<0.0.0` — upstream has published no fix at all. The
result is an audit floor that is once again fully explained, and a baseline that
matches the tool.

This is the same shape as plans 009 and 017, both of which landed cleanly: the
manifest is not touched, only the lockfile moves, and every bump is inside the
range `package.json` already declares.

## Current state

Measured in a scratch directory holding only copies of the two files below,
so nothing in the working tree was mutated to produce these numbers.

### Files in play

- `pnpm-lock.yaml` — the only file this plan changes.
- `package.json` — **must come out byte-identical**; `pnpm update --no-save` is
  what guarantees that, and step 2 asserts it.

### `pnpm audit` today, at `219dcde`

```
{ info: 0, low: 0, moderate: 1, high: 8, critical: 0 }
```

| severity | package | vulnerable | patched | path |
|---|---|---|---|---|
| high | `brace-expansion` | `<1.1.17` | `>=1.1.17` | `.>eslint-plugin-jsx-a11y>minimatch>brace-expansion` |
| high | `brace-expansion` | `<1.1.18` | `>=1.1.18` | same |
| high | `brace-expansion` | `>=4.0.0 <5.0.9` | `>=5.0.9` | `.>@typescript-eslint/parser>…` |
| high | `fast-uri` | `>=3.0.0 <3.1.5` | `>=3.1.5` | `.>@astrojs/check>@astrojs/language-server>volar-…` |
| high | `js-yaml` | `>=4.0.0 <4.3.1` | `>=4.3.1` | `.>astro>js-yaml` |
| high | `nanoid` | `<3.3.17` | `>=3.3.17` | `.>postcss>nanoid` |
| high | `image-size` (ICNS) | `<=2.0.2` | **`<0.0.0`** | `.>astro>unstorage>@netlify/blobs>@netlify/dev-utils>image-size` |
| high | `image-size` (JXL/HEIF) | `<=2.0.2` | **`<0.0.0`** | same |
| moderate | `@opentelemetry/core` | `<2.8.0` | `>=2.8.0` | `.>astro>unstorage>@netlify/blobs>@netlify/…` |

### The two expired reasons — this is the part that is easy to get wrong

The baseline in `plans/README.md` and the archive in `plans/done/README.md` both
record two residuals as unfixable. **Do not carry those reasons forward.**

1. **`brace-expansion` on the `minimatch@3` path.** The record says *"the
   advisory's only patched release is 5.0.8 (no patched 1.x)"* and that an
   override to `brace-expansion@5` was built and measured to throw
   `TypeError: expand is not a function`. Both `1.1.17` and `1.1.18` are now
   published. Verified against the registry:
   `npm view brace-expansion versions --json` lists
   `… 1.1.15, 1.1.16, 1.1.17, 1.1.18`. `minimatch@3` declares
   `brace-expansion ^1.1.7`, so `1.1.18` is **in range** — no override is needed
   and none must be added.
2. **`@opentelemetry/core`.** The record says it is *"pinned exactly by
   `@netlify/otel@6.0.3`"*, unreachable without an override. The installed
   `@netlify/otel` is `6.0.4` and the refresh moves it to `6.0.5`, which resolves
   `@opentelemetry/core` to `2.8.0`. The record's own prediction — *"it clears
   when @netlify/otel bumps and a future `pnpm update --no-save` picks it up"* —
   is what happens.

### Measured result of the refresh

`pnpm audit` after `pnpm update --no-save` in the scratch copy:

```
2 vulnerabilities found
Severity: 2 high
```

Both are the `image-size` pair above. Their "Patched versions" is `<0.0.0`,
which is how the advisory database spells *no patched release exists*. They
arrive through `astro → unstorage → @netlify/blobs → @netlify/dev-utils`, i.e.
build-time only, and there is nothing in range to move to.

### The version moves, in full

Only packages whose resolved version changed:

| package | before | after |
|---|---|---|
| `astro` | 7.1.5 | **7.2.0** (minor — the one to scrutinise) |
| `eslint` | 10.8.0 | 10.8.1 |
| `js-yaml` | 4.3.0 | 4.3.1 |
| `nanoid` | 3.3.16 | 3.3.18 |
| `fast-uri` | 3.1.4 | 3.1.5 |
| `brace-expansion` | 1.1.16, 5.0.8 | 1.1.18, 5.0.9 |
| `@opentelemetry/core` | 2.7.1, 2.9.0 | 2.8.0, 2.9.0 |
| `@typescript-eslint/parser` | 8.65.0 | 8.66.0 |
| `@netlify/otel` | 6.0.4 | 6.0.5 |
| `postcss` | 8.5.24 | 8.5.26 |

`astro 7.1.5 → 7.2.0` is a **minor** version of the framework that renders every
page. Plan 017's refresh moved astro by a patch and produced a byte-identical
`dist/`; a minor gives no such expectation for free, which is why step 3 below
compares the built output explicitly rather than trusting the suite.

### Known non-blocking noise

`pnpm update` prints an unmet-peer warning:

```
└─┬ eslint-plugin-jsx-a11y 6.10.2
  └── ✕ unmet peer eslint@"^3 || ^4 || … || ^9": found 10.8.1
```

This is **pre-existing** — the repo has run eslint 10 against that plugin since
plan 009, `pnpm eslint` reports 0 problems, and this plan does not change it.
Do not attempt to fix it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Refresh | `pnpm update --no-save` | exit 0; only the peer warning above |
| Audit | `pnpm audit` | see step 2 |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Lint | `pnpm eslint` | exit 0, 0 problems |
| Tests | `pnpm test` | 531 passed, 7 skipped (18 files passed, 1 skipped) |
| Build | `pnpm build` | exit 0, 5 pages |

`pnpm test` runs `pnpm build` first via `globalSetup`, so `dist/` is real when
the suite asserts against it.

## Scope

**In scope** (the only file you should modify):

- `pnpm-lock.yaml`

**Out of scope** (do NOT touch, even though they look related):

- `package.json` — the whole point of `--no-save` is that this file does not
  move. If it does, you have run the wrong command.
- `pnpm.overrides` / `resolutions` — **do not add one for anything.** The
  `brace-expansion@5` override was already built and measured to break at
  runtime; the in-range `1.1.18` is the fix and needs no override. An override
  added here would be an out-of-scope change that also re-creates a known defect.
- Any `src/`, `tests/`, `plans/` or workflow file. If the refresh breaks a test,
  that is a STOP condition, not a licence to edit the test.
- `plans/README.md` — the reviewer updates the baseline row and the status table.

## Git workflow

- Branch: `advisor/024-refresh-the-lockfile-again`
- One commit. Message style is conventional commits — recent examples from
  `git log --oneline`:
  `docs: retire the last references to constants.ts, and gate the bare filename`,
  `test(events): separate the data contract from behaviour, promote the Strava tooling`.
  Use: `chore(deps): refresh the lockfile in-range, clearing six high advisories`
- Do NOT push or open a PR; the reviewer does that.

## Steps

### Step 1: Establish the baseline in this worktree

A fresh worktree shares git history but not `node_modules`. Install first, then
record the "before" numbers **from this worktree**, not from the plan.

```
pnpm install
pnpm audit ; echo "audit exit: $?"
pnpm test
```

**Verify**: `pnpm audit` reports **1 moderate and 8 high**. `pnpm test` reports
**531 passed | 7 skipped**.

If the audit counts differ from 1 moderate / 8 high, the advisory database has
moved since this plan was written. That is expected drift and is **not** a STOP
condition on its own — record the numbers you actually see and carry on; step 2
judges the result by the shape of what survives, not by an integer.

### Step 2: Refresh the lockfile in range

```
pnpm update --no-save
```

Then confirm the manifest did not move, and re-audit:

```
git diff --exit-code -- package.json ; echo "package.json unchanged: $?"
git diff --stat -- pnpm-lock.yaml
pnpm audit
```

**Verify**, all three:

- `git diff --exit-code -- package.json` exits **0** (no output). If it exits 1,
  STOP — `--no-save` was not honoured.
- `git diff --stat -- pnpm-lock.yaml` shows the lockfile as the **only** changed
  file.
- `pnpm audit` reports **no moderate advisories**, and every remaining advisory
  has `Patched versions: <0.0.0`. Expected: 2 high, both `image-size`.

**If any remaining advisory has a real patched range**, record which one and
whether it is in range for its dependent, then STOP and report — do not add an
override to force it.

### Step 3: Run the full gate ladder, and compare the built output

`astro` moved a minor version, so the suite passing is not by itself evidence
that the shipped page is unchanged.

```
pnpm check
pnpm eslint
pnpm test
```

**Verify**: `pnpm check` → 0 errors, 0 warnings, 2 hints. `pnpm eslint` → exit 0,
0 problems. `pnpm test` → **531 passed | 7 skipped**, the same as step 1.

Then compare `dist/` against a build of the pre-refresh lockfile. Do this by
building the current tree, saving the artefact list, then rebuilding from
`git stash`:

```
pnpm build
find dist -type f | sort > /tmp/024-after.txt
shasum -a 256 $(find dist -type f | sort) > /tmp/024-after-hashes.txt
git stash push -- pnpm-lock.yaml
pnpm install --frozen-lockfile
pnpm build
find dist -type f | sort > /tmp/024-before.txt
shasum -a 256 $(find dist -type f | sort) > /tmp/024-before-hashes.txt
git stash pop
pnpm install --frozen-lockfile
```

**Verify**: `diff /tmp/024-before.txt /tmp/024-after.txt` is empty — the same
set of files with the same content-hashed names.

Then `diff /tmp/024-before-hashes.txt /tmp/024-after-hashes.txt`.

- **Empty** — `dist/` is byte-identical. This is the expected and best outcome;
  record it and move on.
- **Non-empty** — do NOT treat this as a failure yet, and do NOT stop. Astro
  minors legitimately change generated markup. For **each** differing file,
  report in NOTES: the filename, the byte-size before and after, and the actual
  textual delta (`diff` the two builds' copies of that file, or for a minified
  asset, the first differing region). The reviewer decides whether the delta is
  acceptable; your job is to make it visible, not to judge it.

Note that `pnpm test` builds with `NODE_ENV=test`, which adds a
`data-image-component` attribute that a plain `pnpm build` does not — so run
this comparison with `pnpm build` on **both** sides, as written above, and never
compare a `pnpm test` `dist/` against a `pnpm build` one.

### Step 4: Commit

```
git add pnpm-lock.yaml
git commit -m "chore(deps): refresh the lockfile in-range, clearing six high advisories"
git status --porcelain
```

**Verify**: `git status --porcelain` is empty except for untracked scratch
output, and `git show --stat HEAD` names `pnpm-lock.yaml` and nothing else.

## Test plan

**No new tests.** This plan changes no source and no assertion. The existing
suite is the regression net, and the specific gate that matters is
`pnpm test`'s build step plus the `dist/` comparison in step 3 — the suite
already asserts the rendered page's text, markup, class-to-rule pairing and
asset hashing, so an astro minor that changed any of those turns it red.

Adding a test that pins an advisory count would be a mistake and must not be
done: the advisory database is external and changes without a commit here, so
such a test reddens on a day nobody touched the repository.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git diff --name-only 219dcde..HEAD` lists exactly `pnpm-lock.yaml`
- [ ] `git diff --exit-code -- package.json` exits 0
- [ ] `pnpm audit` reports 0 moderate, 0 critical, and every surviving advisory
      has `Patched versions: <0.0.0`
- [ ] `grep -c "overrides" package.json` returns 0
- [ ] `pnpm check` exits 0 with 0 errors and 0 warnings
- [ ] `pnpm eslint` exits 0 with 0 problems
- [ ] `pnpm test` exits 0 with 531 passed and 7 skipped
- [ ] The step-3 `dist/` filename comparison is empty, and any hash delta is
      itemised in NOTES with sizes and the textual difference

## STOP conditions

Stop and report back (do not improvise) if:

- `package.json` changes at any point.
- `pnpm test` fails, or the pass count is anything other than 531. **Do not edit
  a test to make it pass.** Report the failing assertion verbatim.
- `pnpm check` reports any error or warning, or `pnpm eslint` reports any
  problem beyond the pre-existing unmet-peer *warning from `pnpm update`*
  (which is not an eslint problem).
- After the refresh, an advisory survives that DOES have a patched release in
  range for its dependent — that is a different finding and needs a decision,
  not an override.
- The step-3 comparison shows `dist/` gaining or losing a **file** (not merely
  changing one's bytes).
- You find yourself wanting to add `pnpm.overrides`, `resolutions`, or a
  `packageExtensions` entry. The answer is no; report instead.

## Maintenance notes

- **This will need doing again, and the reasons recorded for a residual expire.**
  Twice now a residual has been written down as unfixable-by-construction and
  been cleared by an ordinary in-range refresh a few weeks later. When the
  reviewer records the new floor, it should say what is unpatchable *and how to
  tell* — `Patched versions: <0.0.0` is the machine-readable form — rather than
  restating an upstream author's current release plans as a permanent fact.
- The `image-size` pair reaches the tree through `@netlify/blobs`, which arrives
  as an `astro → unstorage` dependency and has nothing to do with the site's
  host. It clears when either upstream publishes a fixed `image-size` or astro's
  storage layer stops depending on it. Neither is actionable here.
- A reviewer should scrutinise **the astro minor**, not the audit numbers: the
  audit result is a one-line command anyone can re-run, whereas a rendering
  change hides in the `dist/` diff.
- `plans/README.md`'s baseline row for `pnpm audit` and the `direct dependencies`
  row are the reviewer's to update. The count in the latter comes from
  `jq '(.dependencies + .devDependencies) | length' package.json` and this plan
  does not change it.
