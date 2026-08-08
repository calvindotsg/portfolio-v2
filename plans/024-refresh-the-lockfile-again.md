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
> That pin is deliberate and path-scoped: it asks whether the two files this plan
> measures have moved, not whether the branch has.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dependencies
- **Planned at**: commit `219dcde`, 2026-08-08

## Why this matters

`pnpm audit` reports **1 moderate and 8 high** advisories. The repository's own
baseline says 1 moderate and 1 high, and names both as deliberate residuals that
no in-range refresh can clear. Neither half is true any more: seven of the eight
highs did not exist when it was written, and the reason recorded for one of the
two residuals has **expired** — a patched `brace-expansion@1.x` now exists where
the record says none does.

Measured on a scratch copy of the two files: one `pnpm update --no-save` takes
the audit to **0 moderate and 2 high**, and the two survivors are the same
advisory pair against `image-size`, whose "Patched versions" field reads
`<0.0.0` — upstream has published no fix at all. The result is an audit floor
that is once again fully explained, and a baseline that matches the tool.

This is the same shape as plans 009 and 017, both of which landed cleanly: only
the lockfile moves, and every bump is inside the range `package.json` already
declares.

## Current state

Measured in a scratch directory holding copies of the two files — nothing in the
working tree was mutated to produce these numbers.

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

Six distinct new high advisory IDs account for seven of these rows —
`brace-expansion` appears three times because three separate advisories reach two
different major versions of it.

### The recorded residuals, and which reason actually expired

The baseline in `plans/README.md` and the archive in `plans/done/README.md`
record two residuals as unfixable. **One reason is dead and one came true; the
difference matters, because only the first is a lesson.**

1. **`brace-expansion` on the `minimatch@3` path — the reason has EXPIRED.** The
   record says *"the advisory's only patched release is 5.0.8 (no patched 1.x)"*
   and that an override to `brace-expansion@5` was built and measured to throw
   `TypeError: expand is not a function`. Both `1.1.17` and `1.1.18` are now
   published — `npm view brace-expansion versions --json` lists
   `… 1.1.15, 1.1.16, 1.1.17, 1.1.18`. `minimatch@3` declares
   `brace-expansion ^1.1.7`, so `1.1.18` is **in range**: no override is needed
   and none must be added.
2. **`@opentelemetry/core` — the record's own prediction came TRUE.** It said
   *"it clears when @netlify/otel bumps and a future `pnpm update --no-save`
   picks it up"*, and that is exactly what happens: `@netlify/otel` moves
   6.0.4 → 6.0.5. Note precisely what changed — 6.0.5 **still pins
   `@opentelemetry/core` exactly**, but now at the patched `2.8.0`. The pin was
   never lifted; the pinned version became a safe one.

### Measured result of the refresh

`pnpm audit` after `pnpm update --no-save` in the scratch copy:

```
2 vulnerabilities found
Severity: 2 high
```

Both are the `image-size` pair above, whose "Patched versions" is `<0.0.0` —
how the advisory database spells *no patched release exists*. They arrive
through `astro → unstorage → @netlify/blobs → @netlify/dev-utils`, i.e.
build-time only, and there is nothing in range to move to.

### The moves worth naming

`git diff -- pnpm-lock.yaml` is the complete record — roughly ninety resolved
versions move and about thirty entries are removed. These ten are the ones that
carry meaning: the six that clear an advisory, and four that are large enough to
scrutinise.

| package | before | after | why it is here |
|---|---|---|---|
| `astro` | 7.1.5 | **7.2.0** | a minor of the framework that renders every page |
| `vite` | 8.1.5 | **8.2.1** | carries `rolldown` 1.1.5 → 1.2.3 |
| `eslint` | 10.8.0 | 10.8.1 | |
| `@typescript-eslint/parser` | 8.65.0 | 8.66.0 | |
| `js-yaml` | 4.3.0 | 4.3.1 | clears an advisory |
| `nanoid` | 3.3.16 | 3.3.18 | clears an advisory |
| `fast-uri` | 3.1.4 | 3.1.5 | clears an advisory |
| `brace-expansion` | 1.1.16, 5.0.8 | 1.1.18, 5.0.9 | clears three advisories |
| `@opentelemetry/core` | 2.7.1, 2.9.0 | 2.8.0, 2.9.0 | clears the moderate |
| `@netlify/otel` | 6.0.4 | 6.0.5 | what moves the line above |

**There is no bundler swap here.** `vite@8` already used rolldown; the `rollup`
removal and the `@astrojs/compiler-rs` bump are astro 7.2.0's own dependency
changes and are covered by scrutinising the astro minor.

`astro 7.1.5 → 7.2.0` and `vite 8.1.5 → 8.2.1` are why step 3 compares the built
output explicitly rather than trusting the suite. Plan 017's refresh moved astro
by a patch and produced a byte-identical `dist/`; a minor gives no such
expectation for free.

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
| Tests | `pnpm test` | see step 1 — you record the baseline, you do not read it from here |
| Build | `pnpm build` | exit 0, 5 pages |

`pnpm test` runs `pnpm build` first via `globalSetup`, so `dist/` is real when
the suite asserts against it — **and it builds with `NODE_ENV=test`**, which adds
a `data-image-component` attribute a plain `pnpm build` does not. Never compare a
`pnpm test` `dist/` against a `pnpm build` one.

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

### Step 1: Establish YOUR baseline, and capture the "before" build

A fresh worktree shares git history but not `node_modules`. Install first, then
record the numbers **from this worktree**. Do not take them from this document:
sibling plans 025 and 026 each add one assertion, and either may have landed on
`main` before you start.

```
pnpm install
pnpm audit ; echo "audit exit: $?"
pnpm test
```

**Record**: the suite's `N passed | 7 skipped`. At the time of writing N was
**531**. A higher N means a sibling plan landed — that is expected drift, not a
STOP. Every later figure in this plan is written relative to your N. The
`7 skipped` is absolute and is the discriminating half: it is the opt-in
`tests/strava-verify.test.ts`.

**Record**: the audit counts. At the time of writing, 1 moderate and 8 high.
If they differ, the advisory database has moved. That is expected drift too —
step 2 judges the result by the shape of what survives, not by an integer.

Now capture the pre-refresh build. This must be a plain `pnpm build`, not the
suite's, and it must happen **today** — several pages carry clock-derived text,
so a "before" from yesterday diffs against a "today" for reasons that have
nothing to do with the lockfile.

```
pnpm build
rm -rf /tmp/024-before-dist
cp -R dist /tmp/024-before-dist
```

**Verify**: `find /tmp/024-before-dist -name '*.html' | wc -l` prints **5**.

The `rm -rf` is load-bearing: `cp -R` into an existing directory nests a second
copy inside it rather than replacing it.

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

### Step 3: Run the gate ladder, and compare the built output

```
pnpm check
pnpm eslint
pnpm test
```

**Verify**: `pnpm check` → 0 errors, 0 warnings, 2 hints. `pnpm eslint` → exit 0,
0 problems. `pnpm test` → the same `N passed | 7 skipped` you recorded in step 1.

Now build again and compare against the capture from step 1:

```
pnpm build
rm -rf /tmp/024-after-dist
cp -R dist /tmp/024-after-dist
diff -r /tmp/024-before-dist /tmp/024-after-dist
```

**The expected result is not "empty".** Measured on the real refresh: the four
content-hashed assets under `_astro/` keep their filenames and both stylesheets
are **byte-identical**, and the five HTML pages differ in exactly one place —
the generator meta, `Astro v7.1.5` → `Astro v7.2.0` — at identical length.

So:

- **Only the generator meta differs on the five HTML pages, nothing under
  `_astro/`** — that is the expected branch. Record it and move on.
- **Anything else differs** — do NOT stop, and do NOT judge it. For each
  differing file report in NOTES: the filename, its byte size on both sides, and
  the actual textual delta. The reviewer decides whether the delta is acceptable;
  your job is to make it visible.
- **A file exists on one side and not the other** — that is a STOP condition.

### Step 4: Commit

```
git add pnpm-lock.yaml
git commit -m "chore(deps): refresh the lockfile in-range, clearing six high advisories"
git status --porcelain
git show --stat HEAD
```

**Verify**: `git status --porcelain` is empty, and `git show --stat HEAD` names
`pnpm-lock.yaml` and nothing else.

## Test plan

**No new tests.** This plan changes no source and no assertion. The existing
suite is the regression net: it already asserts the rendered page's text, markup,
class-to-rule pairing and asset hashing, so an astro minor that changed any of
those turns it red. That is also why a non-empty `dist/` diff is safe to report
rather than to fear — the suite has already read the parts of `dist/` that carry
meaning.

Adding a test that pins an advisory count would be a mistake and must not be
done: the advisory database is external and changes without a commit here, so
such a test reddens on a day nobody touched the repository.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git diff --name-only main...HEAD` lists exactly `pnpm-lock.yaml`
      (three dots — the branch point, not this plan's `Planned at` SHA, which
      the plan files themselves have already moved past)
- [ ] `git diff --exit-code -- package.json` exits 0
- [ ] `pnpm audit` reports 0 moderate, 0 critical, and every surviving advisory
      has `Patched versions: <0.0.0`
- [ ] `grep -c "overrides" package.json` returns 0
- [ ] `pnpm check` exits 0 with 0 errors and 0 warnings
- [ ] `pnpm eslint` exits 0 with 0 problems
- [ ] `pnpm test` exits 0 with the baseline `N passed | 7 skipped` from step 1
- [ ] `diff -r /tmp/024-before-dist /tmp/024-after-dist` reports differences only
      in the five HTML files, and any difference beyond the generator meta is
      itemised in NOTES with sizes and the textual delta

## STOP conditions

Stop and report back (do not improvise) if:

- `package.json` changes at any point.
- Any test **fails**, or `passed + skipped` drops **below** the baseline you
  recorded in step 1. A count that is higher than 531 is a sibling plan landing;
  a count that has dropped is a whole file failing to collect, which is exactly
  what a lockfile refresh threatens. **Do not edit a test to make it pass** —
  report the failing assertion verbatim.
- `pnpm check` reports any error or warning, or `pnpm eslint` reports any
  problem. (The unmet-peer warning printed by `pnpm update` is not an eslint
  problem and is expected.)
- After the refresh, an advisory survives that DOES have a patched release in
  range for its dependent — that is a different finding and needs a decision,
  not an override.
- The step-3 comparison shows `dist/` gaining or losing a **file**, or any
  filename under `_astro/` changing.
- You find yourself wanting to add `pnpm.overrides`, `resolutions`, or a
  `packageExtensions` entry. The answer is no; report instead.

## Maintenance notes

- **This will need doing again, and a residual's REASON is what rots.** Two
  residuals were recorded here as unfixable; one reason turned out to be false a
  few weeks later and the other simply came true on schedule. When the reviewer
  records the new floor, it should say what is unpatchable *and how to tell* —
  `Patched versions: <0.0.0` is the machine-readable form — rather than
  restating an upstream author's current release plans as a permanent fact.
- The `image-size` pair reaches the tree through `@netlify/blobs`, which arrives
  as an `astro → unstorage` dependency and has nothing to do with the site's
  host. It clears when either upstream publishes a fixed `image-size` or astro's
  storage layer stops depending on it. Neither is actionable here.
- A reviewer should scrutinise **the astro and vite minors**, not the audit
  numbers: the audit result is a one-line command anyone can re-run, whereas a
  rendering change hides in the `dist/` diff.
- `plans/README.md`'s baseline row for `pnpm audit` and the `direct dependencies`
  row are the reviewer's to update. The count in the latter comes from
  `jq '(.dependencies + .devDependencies) | length' package.json` and this plan
  does not change it.
