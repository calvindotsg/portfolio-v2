# Plan 032: No assertion here passes by construction, and no comment states a reason that is false

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. **This plan edits `plans/README.md` beyond its
> own status row, which that file normally reserves to the reviewer. The maintainer waived that for
> the two prose corrections in step 7 — put them in their own commit and name it in the pull request
> body.**
>
> **Drift check (run first)**:
> `git diff --stat 847d4a7..HEAD -- tests/content.test.ts tests/data-contract.test.ts tests/build-output.test.ts tests/docs-drift.test.ts src/lib/goal.ts dns/config.yaml .github/workflows/dns.yml CLAUDE.md plans/README.md public/resume.pdf`
> If any of those changed, compare the excerpts under "Current state" against the live code before
> proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (assertions and prose; the only binary change is a metadata-only PDF swap)
- **Depends on**: `plans/030-gates-that-cover-what-their-prose-claims.md` — they share
  `tests/build-output.test.ts`. Land 030 first and rebase.
- **Category**: tests / docs
- **Planned at**: commit `847d4a7`, 2026-08-19
- **Finding**: security audit run 1 defects 2, 5 and 6; run 2 note 12; plus four further false or
  over-broad statements found while verifying those.

## Why this matters

Two kinds of defect, one cause.

**Three assertions in this suite cannot fail.** One bounds a value against a field that is
`Math.min` of itself; one is `toBeGreaterThanOrEqual(0)` on a counter that starts at zero; one
compares two expressions built from the same constant. All three are cited — in docblocks and in
`CLAUDE.md` — as protecting something. A validator poisoned the bot's JSON with `9999999.9`, ran the
suite, and got a full green run with the page rendering "Goal met".

**Seven statements in the tree are wrong or claim more than they earned.** This repository's own
doctrine is that a wrong reason outlives every review that trusts it, and it is unusually good at
following it everywhere else. Each of these was believed by someone: the `_dmarc` exclusion's
privacy rationale is contradicted by a file the site serves at `Allow: /`; `dns.yml` describes a
review gate with zero reviewers behind it; `CLAUDE.md` tells you nothing offline can catch a
mistyped `metres` when something can; `plans/README.md` records a decision against a control that
git history says was never built.

Nothing here is a runtime risk. Everything here is something a future reader would act on.

## Current state

### A — a bound that is true by construction

`src/lib/goal.ts:123-128`:

```ts
export const clampToGoal = (progress: number, total_goal: number): number => Math.min(progress, total_goal)
```
```ts
    raw_progress: goal.current_progress,
    current_progress: clampToGoal(goal.current_progress, goal.total_goal)
```

`tests/content.test.ts:108-113`:

```ts
    it("keeps progress within [0, total_goal]", () => {
        for (const goal of GOALS) {
            expect(goal.current_progress, `${goal.goal_name} current_progress`).toBeGreaterThanOrEqual(0);
            expect(goal.current_progress, `${goal.goal_name} current_progress`).toBeLessThanOrEqual(goal.total_goal);
        }
    });
```

The upper bound holds for every input the codebase admits. `raw_progress` — the unclamped value, and
the one a poisoned JSON would move — is asserted nowhere.

### B — a floor that counts nothing

`tests/data-contract.test.ts:590`, under a docblock calling itself "the only offline constraint on
this field":

```ts
        expect(checked, "split races checked").toBeGreaterThanOrEqual(0);
```

`checked` starts at `0` and only increments.

### C — a pairing that compares a constant to itself

`tests/build-output.test.ts:631` is `it("heads each destination with the words the control that
reaches it wears", ...)`. It compares each destination page's `<h1>` against the control's label.
But `src/components/EventsLink.astro:116` is:

```js
const label = NEXT_RACE.control.replace("{sport}", goal.goal_name.toLowerCase());
```

and `src/pages/patches/[...sport].astro:98-100` is:

```js
const heading = goal === undefined
    ? PATCHES.heading
    : NEXT_RACE.control.replace("{sport}", sportWord);
```

The identical expression over the identical constant, so both sides of the assertion move together.
`CLAUDE.md` cites this as "a pairing no single-page test can see". **The second half of that test —
that no two pages share an `<h1>` — does bite and must stay.**

### D — the `_dmarc` privacy rationale

`dns/config.yaml:91-94`:

```
      # DMARC, excluded for a reason that has nothing to do with DNS: its `rua=` is a personal
      # mailbox, and no email address appears anywhere else in this public repository. Putting
      # it here would be the first, and git history does not forget. The record is live and
      # correct; it is simply not managed from git.
```

**Verified false at `847d4a7`** by hashing both values rather than printing either: the address in
the live `_dmarc` `rua=` and the address `pdftotext` extracts from `public/resume.pdf` have the same
SHA-256. `public/resume.pdf` is tracked, served under `Allow: /`, and linked from the home page.

Not managing `_dmarc` from git remains defensible on its own merits. **Only the reason is wrong.**
The `TO ADOPT IT` instruction below it is correct and hard-won — it records that deleting the line
alone plans a `Delete TXT _dmarc` — and must survive intact.

### E — a review gate with no reviewers

`.github/workflows/dns.yml:232-233`:

```
    # The write token lives ONLY here, as an environment secret behind whatever reviewers the
    # `dns` environment requires. That is structural, and it fails differently from the `if:`
```

**Verified against the live GitHub API at `847d4a7`**: the `dns` environment carries exactly one
protection rule and it is a `branch_policy`. Zero required reviewers. The sentence is technically
hedged — "whatever reviewers … requires" is satisfied by none — but it reads as a control, and run
1 recorded that a reader will take it for one.

**This item is conditional.** The maintainer may add required reviewers to the `dns` environment,
which would make the sentence true. Check before editing: if reviewers now exist, leave the comment
and note that in the pull request body instead.

### F — `CLAUDE.md` on mistyped metres

`CLAUDE.md:323-325`:

```
  rather than a figure in every row, which is the point of storing the metres. Nothing
  offline can catch a mistyped `metres`; only `tests/strava-verify.test.ts` can, and it is
  opt-in.
```

Half false. `tests/derived-figures.test.ts:59` scopes its snapshot to `eventsInYear(GOAL_YEAR)`, so
a mistyped `metres` on a **current-year** race does redden `pnpm test`. Only a past-year row — the
majority of the list — has no offline witness. The true sentence is more useful than either the
current one or silence, because it tells a reader which edits are covered.

### G — a recorded decision against a control that was never built

`plans/README.md:241` states that a client-JavaScript census gate "was written and then deliberately
deleted". **Verified**: `git log --all -S 'querySelectorAll("script")' -- tests/` returns exactly one
commit, `621dd5a`, and that commit **added** the inline-script filter that is still live in
`tests/rendered-html.test.ts`. No census gate was ever written or deleted.

The row's *imperative* — do not pin a count, re-derive it — is right and must survive. Only its
historical claim is unsupported.

### H — the CSP rejection's premise

`plans/README.md:605` rejects security headers partly because "a real CSP needs `unsafe-inline` plus
a cloud.umami.is allow-list". Audit run 2 measured a three-`sha256` `script-src` working under the
real Rocket Loader with a non-degeneracy control, which contradicts the premise.

**That measurement was not reproduced**, and run 2's own notes call it the most load-bearing
unreproduced claim in either run. So: **delete the false premise, do not install run 2's claim in
its place.** Say the ground is unmeasured and name what would settle it. Replacing a wrong reason
with an unverified one is the same defect twice.

### I — the résumé, and an over-broad claim about it

`public/resume.pdf`'s `/Title` reads `Calvin_Loh_Technical_Customer_Support_Resume`;
`src/content/home.ts:64` gives `CAREER[0].job_name` as `"Business Systems Analyst"`. The title is
what a browser tab and a search result display for a public URL.

**The maintainer has already re-exported it.** The replacement is at
`/Users/calvin/Downloads/Calvin_Loh_Business_Systems_Analyst_Resume.pdf`, and it was verified at
`847d4a7`: `/Title` reads `Calvin_Loh_Business_Systems_Analyst_Resume`, and `pdftotext` output is
**byte-identical** to the committed copy. It is a metadata-only change — nothing a reader sees moves.

`tests/docs-drift.test.ts:839-845` records that this surface is unreachable:

```
     * ONE SURFACE STAYS OUT OF REACH AND IS RECORDED RATHER THAN GATED: public/resume.pdf states
     * the job too, and it is not checkable from this repository. Measured rather than assumed —
     * the title appears in none of that file's inflated content streams, so a check written
     * against the bytes finds nothing and an external PDF tool is needed to read it at all.
```

**Both halves were reproduced, and the conclusion is wider than the measurement.** The *body text*
genuinely is unreachable — `Business Systems Analyst` appears in neither the raw bytes nor any of the
ten inflated content streams, because the fonts are subsetted. But `/Title` is a plain literal in the
Info dictionary and reads out with one regex over the bytes, no external tool:

```python
re.search(rb'/Title\s*\(((?:\\.|[^)\\])*)\)', open(path,'rb').read())
```

So the claim must be **narrowed to the body**, not deleted — and the metadata can be gated.

### Conventions that apply

- Comments here argue rather than assert; the exemplar is the file being edited.
- Keep the imperative, cut the archaeology. Several of these items have a correct instruction sitting
  on a wrong reason — preserve the instruction.
- Non-vacuity is first-class: 168 `toBeGreaterThan(` calls across 17 of 19 suites. Every assertion
  you repair gets a floor that proves it ran.
- Prose is gated: `tests/docs-drift.test.ts` reaches `.md`, `.yml`, `.json` and `.ts`, so every
  backticked name must resolve against the real tree. **`plans/README.md` is gated in full** — it is
  the living index, not a proposal.
- Never commit to `main`; every change gets its own branch in its own worktree.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0, no output |
| Tests (builds first) | `pnpm test` | exit 0, all files pass |
| Fast iteration | `SKIP_BUILD=1 pnpm test` | reuses `dist/` — never for the run you trust |
| Read a PDF title | `pdfinfo public/resume.pdf \| head -3` | `Title: Calvin_Loh_Business_Systems_Analyst_Resume` after step 6 |

## Scope

**In scope**:

- `tests/content.test.ts` — A, and the `/Title` gate from I
- `tests/data-contract.test.ts` — B
- `tests/build-output.test.ts` — C
- `tests/docs-drift.test.ts` — the docblock at `:839-845` only (I)
- `dns/config.yaml` — the `_dmarc` comment only (D)
- `.github/workflows/dns.yml` — the comment at `:232-233` only, and only if E still holds
- `CLAUDE.md` — the sentence at `:323-325` only (F)
- `plans/README.md` — the two prose corrections (G, H), this plan's status row, **and nothing else**
- `public/resume.pdf` — replaced with the maintainer's re-export (I)
- this file

**Out of scope**:

- The clamp itself. `current_progress` is a *display* value and `src/lib/goal.ts:54-65` argues why at
  length. This plan asserts the right field; it does not change the model.
- `dns/config.yaml`'s `TO ADOPT IT` instruction, and the DKIM regex exclusion above it. Both are
  correct and were executed rather than reasoned.
- The decision to exclude `_dmarc` from octoDNS. Only its stated reason is in scope.
- The CSP decision itself. You are removing a false premise, not reopening the choice.
- The second half of `tests/build-output.test.ts:631` (no two pages share an `<h1>`). It bites.
- Regenerating `public/preview.jpg`, or anything else in `src/content/`.
- Any other assertion in any of the four test files.

## Git workflow

- Branch: short and descriptive, in its own worktree under `.claude/worktrees/`.
- Conventional Commits, lowercase imperative subject; the body carries *why* and *what was verified*.
- **The two `plans/README.md` prose edits (step 7) go in their own commit**, separate from
  everything else, and the pull request body names it. That is the shape the file's own carve-out
  uses for reviewer-owned edits.
- Squash-merge. The pull request title becomes the commit subject.
- Do not push or open a pull request unless the operator instructed it.

## Steps

### Step 1 (A): assert the field that can move

Change `tests/content.test.ts:108-113` to bound `raw_progress` rather than `current_progress`, and
keep a separate assertion that `current_progress` never exceeds `total_goal` — that one is now
documenting the clamp rather than pretending to bound the input, so say so in the docblock.

**Verify**: set a goal's progress in `src/data/strava-progress.json` to `9999999.9`, run
`SKIP_BUILD=1 pnpm test`, confirm the new assertion **fails**. Restore the file with
`git checkout -- src/data/strava-progress.json` and confirm green.

### Step 2 (B): give the split-race counter a real floor

`toBeGreaterThanOrEqual(0)` → `toBeGreaterThan(0)`.

**Verify**: the suite is green (there are split races in `EVENTS`, so the counter is non-zero). Then
temporarily narrow the loop's filter so nothing is counted, confirm it fails, restore.

### Step 3 (C): break the tautology

Make the destination-heading assertion compare against something that does not move with the
control. Two acceptable shapes — pick one and say why in the docblock:

- assert the rendered `<h1>` equals the rendered control text **as read from the built HTML on both
  pages**, rather than both being recomputed from `NEXT_RACE.control` in the test; or
- assert the destination `<h1>` against a literal derived from the sport, so the constant appears on
  one side only.

The first is closer to what the docblock claims the test is for ("asserted across the built pages").

**Verify**: change `[...sport].astro`'s heading to a different constant, run `SKIP_BUILD=1 pnpm
test` after a rebuild, confirm the assertion fails. Restore. Under the current code this mutation
passes — that is the defect.

### Step 4 (D, E, F): correct three comments

- `dns/config.yaml` — delete the "no email address appears anywhere else in this public repository"
  claim. Give the real reason for the exclusion, or state plainly that the record is simply not
  managed from git. **Do not print the address anywhere**, in the comment or the commit message.
  Keep the `TO ADOPT IT` block byte-for-byte.
- `.github/workflows/dns.yml` — **first check** whether the `dns` environment now has required
  reviewers (`gh api repos/calvindotsg/portfolio-v2/environments`). If it does, leave the comment
  and record that in the pull request body. If it does not, rewrite the sentence to describe what is
  actually structural — the secret is unreadable to a job without `environment: dns` — without
  implying a review gate.
- `CLAUDE.md` — replace the "Nothing offline can catch a mistyped `metres`" sentence with the true
  one: a `GOAL_YEAR` row is caught by `tests/derived-figures.test.ts`; a past-year row has no
  offline witness and needs the opt-in `tests/strava-verify.test.ts`.

**Verify**: `pnpm test` green — `docs-drift` reaches all three files, so any name you invent must
exist. Then `grep -n 'no email address appears' dns/config.yaml` → no match.

### Step 5 (I): narrow the docblock, and gate the title

- Rewrite `tests/docs-drift.test.ts:839-845` so the unreachability claim is about the **body text**,
  which is measured and true, and note that `/Title` is readable and is now gated. Keep the
  "never resolve a disagreement by editing `CAREER`" instruction — it is the load-bearing half.
- Add an assertion to `tests/content.test.ts` that `public/resume.pdf`'s `/Title` contains
  `CAREER[0].job_name`. Read it with a regex over the file's bytes; **do not add a PDF dependency**.
  Give it a non-vacuity floor: the extracted title must be non-empty, or a failed match would pass
  as "no title, no mismatch".

**Verify**: this assertion must **fail** against the currently committed PDF and pass after step 6.
Run it before the swap to confirm.

### Step 6 (I): swap in the re-exported résumé

```bash
cp /Users/calvin/Downloads/Calvin_Loh_Business_Systems_Analyst_Resume.pdf public/resume.pdf
```

Confirm it is metadata-only before committing:

```bash
git stash && pdftotext public/resume.pdf /tmp/old.txt && git stash pop
pdftotext public/resume.pdf /tmp/new.txt && diff /tmp/old.txt /tmp/new.txt && echo "TEXT IDENTICAL"
pdfinfo public/resume.pdf | head -3
```

**Verify**: `TEXT IDENTICAL` prints, `/Title` reads `Calvin_Loh_Business_Systems_Analyst_Resume`,
and step 5's assertion now passes. If the text differs, STOP — the plan's premise was that this is a
metadata-only change, and a content change needs the maintainer's review, not this executor's.

### Step 7 (G, H): the two `plans/README.md` corrections — own commit

- **G**: in the `client JavaScript` row, delete the claim that a census gate "was written and then
  deliberately deleted". Keep the imperative — do not pin a count, re-derive it from the script
  elements in `dist/` — and, if you state a reason at all, state the general one rather than an
  event that did not happen.
- **H**: in the rejected-findings entry for security headers, remove "a real CSP needs
  `unsafe-inline`". Replace it with an honest status: the premise was measured wrong, the
  measurement that shows it wrong has not been reproduced, and reproducing it is what a future run
  should do before rewriting the decision. **Do not assert that a hash-based CSP works.**

Commit these two alone, with a body saying the maintainer waived the reviewer rule for them.

**Verify**: `pnpm test` green; `git log --oneline -1` shows only `plans/README.md` in that commit
(`git show --stat HEAD`).

### Step 8: full ladder

```bash
pnpm check && pnpm eslint && pnpm test
```

## Test plan

Changes to three existing assertions and one new one; no new test file:

- `tests/content.test.ts` — `raw_progress` bound (step 1), and the `/Title` gate (step 5).
- `tests/data-contract.test.ts` — a real floor (step 2).
- `tests/build-output.test.ts` — a non-tautological pairing (step 3).

Each of the four has its mutation named in its step. **All four must be shown red against the
current code** — that is the entire claim of this plan, since three of them are currently green on
broken input by construction. Record each failure in the pull request body.

Verification: `pnpm test` → all files pass. Do not write an absolute suite total anywhere.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check`, `pnpm eslint`, `pnpm test` all exit 0
- [ ] `src/data/strava-progress.json` poisoned with a huge value reddens the suite; restored, it is green
- [ ] `grep -n 'toBeGreaterThanOrEqual(0)' tests/data-contract.test.ts` → no match on the split-race counter
- [ ] Changing `[...sport].astro`'s heading constant reddens the destination-heading assertion
- [ ] `grep -n 'no email address appears' dns/config.yaml` → no match
- [ ] `grep -n 'deliberately deleted' plans/README.md` → no match
- [ ] `grep -n 'unsafe-inline' plans/README.md` → no match, or a match that does not state it as a requirement
- [ ] `pdfinfo public/resume.pdf` → `Title: Calvin_Loh_Business_Systems_Analyst_Resume`
- [ ] `pdftotext` output of the new PDF is identical to the old one
- [ ] The two `plans/README.md` prose edits are in their own commit
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] This plan's row in `plans/README.md` is updated

## STOP conditions

Stop and report back — do not improvise — if:

- `pdftotext` output differs between the committed résumé and the re-export. The premise is a
  metadata-only change; a content change is the maintainer's review, not yours.
- The `/Title` assertion passes against the **currently committed** PDF. Then either the file was
  already replaced or your regex is matching something else — either way you cannot trust the gate.
- The `dns` environment turns out to have required reviewers. Item E's edit becomes wrong; skip it
  and say so.
- Poisoning `strava-progress.json` does **not** redden the suite after step 1. The assertion is not
  reaching the field you think it is.
- Any of the four assertions cannot be made red against current code.
- You find yourself editing `plans/README.md` outside the two named prose corrections and this
  plan's status row. The waiver is scoped to those; anything else is the reviewer's.

## Maintenance notes

- **The three repaired assertions were all cited as protection somewhere.** A reviewer should check
  that each now fails on the input it claims to bound, and that the docblocks say what changed — a
  repaired gate with an unchanged docblock is the next reader's trap.
- `raw_progress` is now the asserted field. If the clamp model changes, this assertion is the one
  that must move with it, not `current_progress`.
- **The `/Title` gate is the first thing in this repository to read a binary.** It is deliberately a
  regex over bytes with no dependency; if a future export produces a PDF whose Info dictionary is in
  an object stream, the gate will stop finding the title and must fail loudly rather than pass
  vacuously — that is what the non-vacuity floor in step 5 is for.
- **Deferred deliberately**: the CSP decision, and whether `_dmarc` should come under `dns/`
  management at all. Both need a measurement this plan does not take. Deleting a false reason is not
  the same as making the decision, and this plan does only the first.
