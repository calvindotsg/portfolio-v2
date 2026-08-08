# Plan 026: Close the bare-filename gate's case gap, and give a foreign name a list of its own

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT update `plans/README.md`; your reviewer
> maintains the index.
>
> **Drift check (run first)**: `git diff --stat 219dcde..HEAD -- tests/docs-drift.test.ts`
> A change to the **shape** of what this plan edits — `BARE_SOURCE_FILE`, either
> excuse list, or `unmetNames`'s signature — is a STOP condition. Anything else
> in that file is a NOTES entry.
>
> Separately run
> `git diff --stat 219dcde..HEAD -- src/data/races/README.md src/data/races/index.ts tests/build-output.test.ts`.
> Those three hold the census sites in "Current state". A moved line anchor or a
> changed count there is **expected drift and a NOTES entry, not a STOP** — step 2
> re-measures the census anyway, and `tests/build-output.test.ts` is also sibling
> plan 025's only file.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `219dcde`, 2026-08-08

## Why this matters

`tests/docs-drift.test.ts` holds a rule that catches the rot a rename leaves in
prose: a backticked bare filename must name a file that exists somewhere in the
tree. Plan 021 is why it exists — that plan deleted one file and **33 bare
references to it survived a fully green suite**.

The rule is case-sensitive, and this repository names its components in
PascalCase. So the rule that exists to catch a rename cannot see a rename of
`BasicLayout.astro`, `Goal.astro`, `Now.astro`, `Patch.astro`,
`ProgressBar.astro` or `Pulse.astro`. **A rename's broken imports are caught by
the compiler; this gate's subject is the prose left behind**, and for those six
names there is nothing watching it. The gate's own comment records the gap as
*"KNOWN GAP, MEASURED AND DEFERRED"* and says why: widening it reports a handful
of tokens that were never files of this repository, and those *"need a 'not a
file of ours' list rather than an entry in GONE, whose come-back gate would then
be asserting something false about its own subject."*

That is a complete design. This plan implements it. The deferral was a budget
decision inside plan 023's cleanup, not a doubt about the fix.

## Current state

### The rule — `tests/docs-drift.test.ts:291`

```ts
const BARE_SOURCE_FILE = /^[a-z0-9][a-z0-9._-]*\.(ts|astro|mjs|js|json|yml|yaml|sh|py)$/;
```

The leading character class is the gap. **The leading-underscore exclusion is
NOT a style preference and must survive**: `_worker.js` and `_routes.json` are
named in this suite precisely to assert they are *not* in the build, so a rule
that accepted a leading underscore would redden on the two names whose absence is
the assertion. A medial underscore is allowed and is what makes the `py` arm live
(`dns/test_filters.py`).

### Where the rule is applied — `tests/docs-drift.test.ts:376-399`

```ts
    type Named = {token: string, line: number, kind: "path" | "file"}
    function unmetNames(
        tokens: {token: string, line: number}[],
        doc: string,
        hasPath: (p: string) => boolean,
        hasFile: (name: string) => boolean,
    ): {misses: Named[], considered: number} {
        const misses: Named[] = [];
        let considered = 0;
        for (const {token, line} of tokens) {
            if (/[*${}]/.test(token)) continue; // globs and interpolations are not paths
            const bare = token.replace(/:\d+(-\d+)?$/, "").replace(/\/$/, "");
            if (TOP_LEVEL.some((t) => token.startsWith(t))) {
                if (excused(NAMED_AS_ABSENT, token, doc) || excused(NAMED_AS_ABSENT, `${bare}/`, doc)) continue;
                considered++;
                if (!hasPath(bare)) misses.push({token, line, kind: "path"});
            } else if (BARE_SOURCE_FILE.test(bare)) {
                if (excused(GONE, bare, doc)) continue;
                considered++;
                if (!hasFile(bare)) misses.push({token, line, kind: "file"});
            }
        }
        return {misses, considered};
    }
```

The four parameters are spelled out because **step 5 calls this function
directly** with all of them.

### The excuse shape, and the two lists that use it — `tests/docs-drift.test.ts:310-365`

```ts
type Excuse = {name: string, where: readonly string[], why: string}

const excused = (list: readonly Excuse[], name: string, doc: string) =>
    list.some((e) => e.name === name
        && e.where.some((w) => (w.endsWith("/") ? doc.startsWith(w) : doc === w)));
```

- `NAMED_AS_ABSENT` — repository **paths** named in order to say they are not
  there (`public/llms.txt`, `src/content.config.ts`, …).
- `GONE` — bare **filenames** named in order to record a deletion or a rename
  (`constants.ts`, `constants.test.ts`).

Both are asserted in both directions:

- `it("keeps no excuse for a file that has come back")` — every
  `NAMED_AS_ABSENT` path and every `GONE` filename must **not** exist.
- `it("scopes every excuse to documents that exist")` — every `where` must be
  non-empty and every document in it must exist.

**That first gate is why the two foreign names below cannot go in `GONE`:** it
asserts the name never comes back, so a legitimate future `parseHeaders.ts` in
this repository would redden the suite with a message about a deletion that never
happened. `GONE` also *means* "we had this and deleted it", which is false of
both.

### The census, measured at `219dcde`

A probe replicating the gate exactly — same `walk` with the same `SKIP_DIRS`,
same document extensions, `plans/done/` excluded, `pnpm-lock.yaml` and
`package.json` excluded, numbered plans skipped as proposals, `:12` line anchors
stripped:

| pattern | bare tokens that resolve | misses |
|---|---|---|
| current (lowercase-only) | 114 | **8** |
| widened (leading `[A-Za-z0-9]`) | 154 | **12** |

The 8 current misses are all excused by `GONE` — seven sites naming the file plan
021 deleted, one naming the suite it renamed — which is why the gate is green
today.

Widening newly *sees* **44 token sites**. Forty of them resolve. The four that do
not are the whole cost of this change:

| site | token |
|---|---|
| `src/data/races/README.md:7` | `YYYY-MM-DD-slug.ts` |
| `src/data/races/index.ts:65` | `YYYY-MM-DD-slug.ts` |
| `tests/docs-drift.test.ts:286` | `YYYY-MM-DD-slug.ts` |
| `tests/build-output.test.ts:2677` | `parseHeaders.ts` |

The distinct stems the widening newly reaches, in full:
`BasicLayout.astro`, `Goal.astro`, `Now.astro`, `Patch.astro`,
`ProgressBar.astro`, `Pulse.astro`, `YYYY-MM-DD-slug.ts`, `parseHeaders.ts`.
That list is the only thing against which a newly-*resolving* stem is visible as
out-of-census; no STOP condition covers that direction.

**The gate's own comment predicted three sites and there are four.** The reason
is stated in that same comment: *"A CENSUS IN THIS FILE COUNTS ITSELF"* — the
rule scans every live document and `tests/docs-drift.test.ts` is one, so the
comment describing the gap added a site to the gap's own total. Expect your own
re-measurement to move again for the same reason once you have written the new
comment. **Report the number you actually observe; do not adjust prose to match
this table.**

### What the two foreign names are

- `YYYY-MM-DD-slug.ts` is a **naming pattern**, not a file.
  `src/data/races/README.md:7` says *"Name it `YYYY-MM-DD-slug.ts`, export the
  race as the default"*, and `src/data/races/index.ts:65` says *"Every sibling of
  this file is one race, named `YYYY-MM-DD-slug.ts` so a directory listing reads
  as a calendar"*. No file will ever have that name, and none should.
- `parseHeaders.ts` is **Cloudflare's own source file**.
  `tests/build-output.test.ts:2677` records that the `_headers` gate was
  *"Executed against Cloudflare's own `parseHeaders.ts`"* rather than against a
  third grammar the test invented — which is the evidence for why that gate has
  its current shape.

Neither is a file this repository deleted, and that is the distinction the third
list exists to keep.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Lint | `pnpm eslint` | exit 0, 0 problems (says nothing about `.ts`) |
| Tests | `pnpm test` | see step 1 — you record the baseline |
| One file | `SKIP_BUILD=1 pnpm test docs-drift` | faster while iterating |
| Build | `pnpm build` | exit 0, 5 pages |

`SKIP_BUILD=1` reuses whatever is already in `dist/`. It never rebuilds, so if
`dist/` is ever emptied you must run `pnpm build` before using it again.

## Scope

**In scope** (the only file you should modify):

- `tests/docs-drift.test.ts`

**Out of scope** (do NOT touch, even though the census names them):

- `src/data/races/README.md`, `src/data/races/index.ts`,
  `tests/build-output.test.ts` — these are the documents the new excuses are
  written **for**. Their prose is correct and must stay. Editing a document to
  stop it naming a foreign file would delete a true statement to satisfy a gate,
  which is the failure mode this whole suite is built against.
- Every component and every other test file. If the widened gate reports a miss
  in a document not listed in the census above, that is a **finding** — report
  it, do not fix the document, and do not add an excuse for it.
- `plans/README.md` and `CLAUDE.md`.

## Git workflow

- Branch: `advisor/026-close-the-bare-filename-case-gap`
- One commit (two is acceptable if you separate the rule change from the excuse
  list). Conventional commits, e.g.
  `test(docs): see a PascalCase filename, and name a foreign one as foreign`
- Do NOT push or open a PR; the reviewer does that.

## Steps

### Step 1: Establish YOUR baseline, and reproduce the gap

```
pnpm install
pnpm test
```

**Record**: the suite's `N passed | 7 skipped`. At the time of writing N was
**531**. A higher N means sibling plan 024 or 025 landed first — that is expected
drift, not a STOP. Every later figure in this plan is `N + 1`. The `7 skipped` is
absolute.

Now demonstrate the gap. Add one line to `README.md` naming, in backticks, a
PascalCase file that does not exist — a sentence mentioning `Vanished.astro`
will do. Then:

```
SKIP_BUILD=1 pnpm test docs-drift
```

**Verify**: **green**. A live, fully-gated document names a file that is not
there and the suite does not care. That is the defect.

Revert: `git checkout -- README.md`, then confirm `git status --porcelain` is
empty.

### Step 2: Widen the pattern

Change `BARE_SOURCE_FILE` (line ~291) so its first character class accepts an
uppercase letter, and the rest of the stem does too. The extensions stay
lowercase — every source extension in this repository is written lowercase, and
widening them would start matching prose that is not a filename.

The leading `_` must still be rejected, and a medial `_` must still be accepted.

Rewrite the block comment above it. What must change:

- The "KNOWN GAP, MEASURED AND DEFERRED" paragraph now describes something that
  is fixed; replace it with what the rule does and why the third excuse list
  exists.
- Keep the paragraphs that are still true: the argument for the weak question,
  the extension list, the medial-vs-leading underscore rule, and the note that a
  census in this file counts itself.
- Update any figure you restate by **re-measuring it**, not by copying this plan.
  A count in prose here is inside the population it counts.

**Verify**: `SKIP_BUILD=1 pnpm test docs-drift` → red, with **two** tests
failing:

- `names no file that is not there`, listing the four census sites (or whatever
  set your own measurement produced);
- `catches a name that is gone, and passes one that is there`, because its
  fixture pins the old behaviour. Step 4 rewrites it.

Record the exact list from the first. Any *third* red is a STOP condition.

### Step 3: Add the third excuse list and wire it in

Add a third `readonly Excuse[]` beside `GONE` and `NAMED_AS_ABSENT`, named for
what it holds — the gate's own comment calls it *"a 'not a file of ours' list"*,
so `NOT_A_FILE_OF_OURS` matches the register of the two names already there.

Two entries, each with the `where` documents that name it and a `why` that says
what it actually is:

- `YYYY-MM-DD-slug.ts` — the naming convention for a race module, scoped to
  `src/data/races/README.md`, `src/data/races/index.ts`, and
  `tests/docs-drift.test.ts` **if and only if** your rewritten comment still
  names it. Do not scope it to a document that does not name it.
- `parseHeaders.ts` — Cloudflare's own source, scoped to
  `tests/build-output.test.ts`.

Consult it in `unmetNames`, in the bare-filename arm only, beside the existing
`GONE` check. A foreign name is not a path, so the path arm needs nothing.

Then extend the **scope** gate — `it("scopes every excuse to documents that
exist")` — to iterate the new list alongside the other two.

**Do NOT add the new list to `it("keeps no excuse for a file that has come
back")`.** Write a short comment in that test saying why it is excluded: a
foreign name has no come-back semantics, and asserting one would redden the suite
if this repository ever legitimately created a file with that name.

**Verify**: `SKIP_BUILD=1 pnpm test docs-drift` → **`1 failed | 12 passed`**.

`names no file that is not there` is now GREEN — that is what this step did. The
one remaining red is `catches a name that is gone, and passes one that is there`,
whose diff shows exactly one added line, `+ "file Vanished.astro"`. Step 4
rewrites it. **This is the expected result; proceed.** Any other red, or a green
suite here, is a STOP condition.

Do not attempt to make this step green by adding an excuse — the STOP list below
forbids it, and the entry would be false.

### Step 4: Update the two places that pin the gap

`it("catches a name that is gone, and passes one that is there")` at line ~456
contains this fixture line and this comment:

```
`PascalCase is the known gap: ${quoted("Vanished.astro")}`,
```

> THE PASCALCASE PAIR IS LOAD-BEARING. The rule's case-sensitivity is a
> deliberate, measured gap rather than an oversight …

Both are now false. The fixture line stays — it is the case that pins the new
behaviour — but its label and the comment must be rewritten to say that
PascalCase is now seen. The expectations change with it:

- `misses` gains `"file Vanished.astro"`, in fixture order — after
  `"file test_filters.py"` and before `"path src/components/Vanished.astro"`.
- `considered` goes from `6` to `7`.

**And there is a second site the plan-before-review missed**: the inline comment
at `tests/docs-drift.test.ts:479-480`, immediately below those expectations —

> Four names reached a predicate and were satisfied or reported; the
> leading-underscore and PascalCase tokens reached none, which is the deferred gap
> stated in place.

That sentence becomes false the moment `considered` is 7. Rewrite it: five names
reach a predicate, and only the leading-underscore token reaches none.

**The fixture's backticks are assembled from a `tick` variable rather than
typed**, because this file is gated by the rule it defines and a literally
backticked fake name is a claim like any other. Keep doing that for anything you
add.

**Verify**: `SKIP_BUILD=1 pnpm test docs-drift` → green.

### Step 5: Add a wiring assertion for the new list

The lists are consulted inside `unmetNames`, and a pure rule with a list it never
reads is a rule that passes every test of its logic while doing nothing. Add one
`it(...)` that pushes a real entry through `unmetNames` with the real predicates
`hasPath` and `hasFile`, in **both** directions:

- the foreign name in a document its `where` names → **no miss**;
- the same token in a document its `where` does not name → **exactly one miss**,
  of kind `file`.

Build the backticked token with the `tick` variable, as step 4 describes.
Structural pattern: `it("asks the real filesystem, on both halves of the rule")`
at line ~431, which does the same job for the two existing halves.

**Verify**: `SKIP_BUILD=1 pnpm test docs-drift` → green, and `pnpm test` → the
suite total is now `N + 1 passed | 7 skipped`.

### Step 6: Mutation-test the change, and run the full ladder

Each mutation is applied, measured, and reverted before the next.

| # | mutation | expected |
|---|---|---|
| 1 | revert `BARE_SOURCE_FILE`'s leading class to `[a-z0-9]` | the step-4 calibration test fails on both the `misses` list and `considered` |
| 2 | make the leading class `[A-Za-z0-9_]` (accepting a leading underscore) | a test fails naming `_routes.json` or `_worker.js` |
| 3 | remove the `NOT_A_FILE_OF_OURS` consultation from `unmetNames` | `names no file that is not there` fails, naming the foreign sites |
| 4 | **add** a document that does not exist to one entry's existing `where` (do not replace the real one — replacing removes a live excuse and produces two reds) | `1 failed | 12 passed`, the scope gate alone, naming that entry |
| 5 | add a line to a live document naming a PascalCase file that is not there | `names no file that is not there` fails, naming it — this is the whole point of the plan |

For each: apply, run `SKIP_BUILD=1 pnpm test docs-drift`, record which test failed
and the message, then revert and confirm green.

Then:

```
pnpm check
pnpm eslint
pnpm test
```

**Verify**: check → 0 errors / 0 warnings / 2 hints; eslint → 0 problems;
test → `N + 1 passed | 7 skipped`.

### Step 7: Commit

```
git add tests/docs-drift.test.ts
git commit -m "test(docs): see a PascalCase filename, and name a foreign one as foreign"
git status --porcelain
git show --stat HEAD
```

**Verify**: working tree clean; the commit names `tests/docs-drift.test.ts` and
nothing else.

## Test plan

- **One new test**: the step-5 wiring assertion.
- **One test amended**: the step-4 calibration, whose PascalCase pair moves from
  pinning the gap to pinning its closure — along with the inline comment below it.
- **One test extended**: the scope gate, to cover the third list.
- **One test deliberately not extended**: the come-back gate, with a comment
  saying why.
- Verification: `pnpm test` → `N + 1` pass, and each of the five mutations in
  step 6 turns **exactly the named test** red — which is stricter than the done
  criteria below and is the point of running them one at a time.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git diff --name-only main...HEAD` lists exactly `tests/docs-drift.test.ts`
      (three dots — the branch point, not this plan's `Planned at` SHA, which the
      plan files themselves have already moved past)
- [ ] `pnpm test` exits 0 with `N + 1 passed | 7 skipped`, against the N you
      recorded in step 1
- [ ] `pnpm check` exits 0 with 0 errors and 0 warnings
- [ ] `pnpm eslint` exits 0 with 0 problems
- [ ] `grep -n "A-Za-z0-9" tests/docs-drift.test.ts` shows the widened character
      class
- [ ] `grep -ci "known gap" tests/docs-drift.test.ts` returns 0 and
      `grep -ci "deferred gap" tests/docs-drift.test.ts` returns 0 — **the `-i`
      is load-bearing**: the paragraph step 2 must delete is written `KNOWN GAP,
      MEASURED AND DEFERRED`, so a case-sensitive check passes while it is still
      there
- [ ] The new excuse list has exactly two entries, each with a non-empty `where`
      and a `why` that says what the name actually is
- [ ] The come-back gate does **not** iterate the new list, and carries a comment
      saying why
- [ ] All five mutations in step 6 turn a test red, and `git status --porcelain`
      is empty afterwards

## STOP conditions

Stop and report back (do not improvise) if:

- The widened gate reports a miss at a site **not** in the census table above,
  other than sites created by your own new comment in
  `tests/docs-drift.test.ts`. That is a real finding about a real document, and
  the decision of whether to fix the prose or excuse the name is not yours.
- Making the suite green requires editing any file other than
  `tests/docs-drift.test.ts`.
- Step 2 or step 3 produces a red test other than the two each names.
- Mutation 5 does not turn the gate red — that would mean the widening did not
  take effect and the plan has achieved nothing.
- The pattern change makes `names no file that is not there` report more than
  about a dozen misses. The plan's premise is that the cost is four sites; an
  order of magnitude more means the widened pattern is matching prose that is not
  a filename, and the extension list or the character class needs rethinking
  rather than a pile of excuses.
- You are tempted to add a third, fourth or fifth entry to
  `NOT_A_FILE_OF_OURS` to make things green. The list is for names that were
  never files of this repository; anything else is rot, and covering rot with an
  excuse is the failure this suite exists to prevent.

## Maintenance notes

- **The cost of this change is that the next file rename gets named by the gate
  instead of by a person.** That is the trade the deferral note already priced:
  a rename now reddens the suite until its prose is repointed. That is the
  intended behaviour, not a regression.
- **A repointing sweep must tell a live pointer from a record of what was true
  then.** When this gate names a document after a rename, check whether the
  sentence describes the current tree or records history. A record that says
  "X used to be Y" is correct and belongs in `GONE`, scoped to that document; a
  live pointer should be repointed.
- Any future census from this gate must record **both** the pattern used and the
  fact that this file scans itself — one quantity has already produced four
  different honest numbers here depending on whether line anchors were stripped
  and whether the gate file was included.
- A reviewer should check the third list's two entries individually: is each one
  genuinely a name this repository never owned, and is its `where` the minimum
  set of documents that actually name it?
- The extensions remain lowercase-only and the leading underscore remains
  excluded. If either ever changes, re-derive the census in "Current state"
  first.
