# Plan 018: Let a plan live in `plans/` again, and write down what governs it

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Your reviewer maintains `plans/README.md` —
> do not edit it beyond what step 4 specifies.
>
> **Drift check (run first)**:
> `git diff --stat 8ce7565..HEAD -- tests/docs-drift.test.ts plans/README.md CLAUDE.md`
> STOP if `tests/docs-drift.test.ts` gained or lost a gate that iterates `liveDocs()`, or if any
> file matching `plans/0*.md` other than this one already exists — the gap may already be closed.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one test file, two documents; no runtime code)
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `8ce7565`, 2026-08-07
- **Executed**: in the same PR that added it (#130), which is unusual and deliberate. This plan
  is the prerequisite for every other plan in the directory, so leaving it as TODO would have
  meant parking plans 019–023 somewhere gitignored until someone ran it. The steps below are kept
  as the record of what was done and why, and their Verify commands are the evidence.

## Why this matters

Two things are wrong, and they compound.

**The conventions are tacit.** `plans/` implements the *improve* skill pipeline from
`github.com/shadcn/improve`. Nothing in the repository says so, so every session re-derives the
numbering, the template and the executor/advisor split by reading archived files — and gets a
slightly different answer each time.

**A live plan cannot exist here any more.** Every plan sits in `plans/done/`, which
`tests/docs-drift.test.ts` exempts as an archive. That exemption reads as "archives are stale by
nature", but the property that actually matters is different: **a plan is a proposal, and a
proposal names the tree it intends to create.** Three gates check names against the tree that
exists, so a live plan reddens them. Measured against the five plans that land with this one:
**51 path misses and 5 `pnpm`-script misses.** The clearest is plan 019 naming `pnpm typecheck`
and `pnpm lint` inside a sentence warning an executor that neither exists here — a document
penalised for saying the true thing the suite exists to enforce.

The gate has never met a live plan — 016 and 017 sat at top level until 2026-07-29, and
`tests/docs-drift.test.ts` landed 2026-07-31. So this is not a regression; it is a gap that every
future run of the pipeline hits.

## Current state

- `tests/docs-drift.test.ts:111` —
  `const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", ".venv", "coverage", ".scratchpad"]);`
- `tests/docs-drift.test.ts:113` — `const ARCHIVE = "plans/done/";`
- `tests/docs-drift.test.ts:139` — `liveDocs()`, which walks the tree and filters out `ARCHIVE`.
- **Three gates iterate `liveDocs()`**, and a proposal names tomorrow's tree in all three
  dimensions:

  | gate | misses on the five plans landing alongside |
  |---|---|
  | `it("names no file that is not there")` | **51** |
  | `it("names no pnpm script that is not in package.json")` | **5** |
  | `it("names no configured value that is declared nowhere")` | **0** — unexercised, exempted anyway |

- Inside `names no file that is not there`, the two filters that already exist, and which decide
  how narrow the new one has to be (cited by gate name rather than by line: the path gate strips a
  `:NNN` anchor before resolving, so an anchor is the one citation form this suite cannot keep
  honest — and these very anchors went stale in the commit that executed this plan):
  ```ts
  if (!TOP_LEVEL.some((t) => token.startsWith(t))) continue;
  if (/[*${}]/.test(token)) continue; // globs and interpolations are not paths
  ```
  The second means a token written `plans/NNN-*.md` is **already** skipped. The problem is not the
  plan's own filename — it is the paths a plan file *contains*.
- `plans/README.md:3` — "**Nothing is executable right now.**" This plan makes that false.
- `plans/README.md:71-73` — the execution table, currently ending at 017.
- `CLAUDE.md` — has no section on `plans/` at all.

**The repo convention for a plan's shape** is the upstream template; `plans/done/015-*.md` is the
closest exemplar in-tree — executor instructions, a drift check against a stamped SHA, a Status
block, Current state with inlined excerpts, per-step **Verify**, machine-checkable Done criteria,
STOP conditions.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Tests | `pnpm test` | all pass |
| Read the upstream skill | `pnpm dlx opensrc path shadcn/improve` | prints a cached source path |

## Scope

**In scope**:
- `tests/docs-drift.test.ts`
- `plans/README.md`
- `CLAUDE.md` (one short section)
- `plans/019-*.md` … `plans/023-*.md` (added alongside, and the reason the exemption is needed)

**Out of scope**:
- **Restating anything the upstream repository or its `SKILL.md` already says** — not the
  template, not the numbering rule, not the file naming, not the advisor/executor split. Name the
  source and how to read it. A copied convention goes stale silently, which is the failure mode
  `.devin/wiki.json` exists to record.
- `plans/done/` — an archive. Nothing in it changes.
- Widening the path gate to catch bare basenames. That is a real idea and it belongs to plan 023,
  which is sized on it; doing it here mixes two arguments.

## Git workflow

- Branch: `plan/018-live-plans`
- Conventional commits, matching `git log`: e.g.
  `docs(plans): let a plan live in plans/ again, and record what governs it`

## Steps

### Step 1: exempt a proposal from the three name gates

In `tests/docs-drift.test.ts`, add one predicate beside `ARCHIVE`:

```ts
/** A numbered plan under `plans/`. Distinct from `plans/README.md`, which is current-state. */
const isProposal = (file: string) => /^plans\/\d{3}-/.test(file);
```

Skip proposals in `names no file that is not there`, `names no pnpm script that is not in
package.json` and `names no configured value that is declared nowhere` — and **only** those three.
Record
the reason in place: a plan names the tree it intends to create, so gating its names against the
tree that exists is a category error, and the document class is neither current-state nor a
standing instruction. `plans/README.md` is **not** a proposal and stays fully gated: its baseline
table is a claim about now.

Assert the exemption in **both** directions, the way `keeps no excuse for a file that has come
back` already does for `NAMED_AS_ABSENT` — the predicate must recognise a numbered plan and must
not match `plans/README.md`, so it cannot silently widen. **Ask the predicate about a filename,
never the tree about its current contents**: a floor shaped "some live plan is exempted right now"
reddens the day the last plan is archived, which is the first rule this directory writes down.

**Verify**: `pnpm test` → all pass.

### Step 2: prove the exemption is doing work

Temporarily add a line to this file naming a path that does not exist and a `pnpm` script that
does not exist, both backticked.

**Verify**: `pnpm test` → still green (the exemption catches them). Then move the same two tokens
into `plans/README.md` and confirm `pnpm test` → **red**, naming both. Remove them.

This is the minimum stimulus for both halves; a floor proved only on the path gate stays green on
a bad script name.

### Step 3: finish the standard

`plans/README.md`'s "What governs this directory" section and `CLAUDE.md`'s "Plans" section were
written in the same commit as this plan, so most of this step is already done — read them before
adding anything. They deliberately name `github.com/shadcn/improve` as the source and restate
none of the pipeline, and they record only what is local: the `plans/done/` archive convention,
monotonic numbering, the override of the user-level lifecycle, and the staging directory.

**One bullet was held back because it was not true yet**, and step 1 makes it true. Add it to
"What governs this directory":

> A numbered plan is a **proposal** and is exempt from the three gates that check a name against
> the tree that exists — paths, `pnpm` scripts and configured values. `plans/README.md` is not a
> proposal and is fully gated.

Do not restate the exemption's mechanism there; the reason belongs beside the predicate in
`tests/docs-drift.test.ts`, and a second copy is a second thing to keep in step.

**Verify**: `pnpm test` → all pass. `grep -c "shadcn/improve" plans/README.md` → at least 1.

### Step 4: open the ledger

In `plans/README.md`: delete "Nothing is executable right now" and the sentence that says every
plan is archived, both now false. Add rows 018–023 to the execution table with their dependencies,
and add the five plan files to `plans/` in the same commit as step 1.

**They land together on purpose.** An earlier draft staged them in the repository's gitignored
scratch directory to keep the gate green until this plan executed. That is the wrong shape twice
over: it breaks the pipeline's own rule that plans live under `plans/`, and a gitignored plan does
not travel with a branch, appear in a PR, or survive a fresh clone. Ship the change the plans
depend on first, then the plans — never park a plan outside the tree.

**Verify**: `pnpm test` → all pass, **with all six plans present**. This is the whole point of the
plan: if it is green here, a live plan can exist again.

## Test plan

- Extend `tests/docs-drift.test.ts` with the both-directions assertion on `isProposal` described
  in step 1. No new file.
- Step 2 is the executable proof and its result belongs in the PR body: a bad path and a bad
  script name in a proposal are green; the same two in `plans/README.md` are red.
- Verification: `pnpm test` → all pass.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0 with six files matching `plans/0*.md` present
- [ ] `grep -c "isProposal" tests/docs-drift.test.ts` returns at least 4 (definition, three gates)
- [ ] the both-directions assertion exists and fails if `isProposal` is widened to match `plans/README.md`
- [ ] step 2's red-and-green pair recorded in the PR body
- [ ] `plans/README.md` no longer says "Nothing is executable right now"
- [ ] `plans/README.md` names `github.com/shadcn/improve` and states only the local deviations
- [ ] `CLAUDE.md` points at that section without restating it
- [ ] `git status --porcelain` lists only in-scope files

## STOP conditions

- Step 2's second half is green — `plans/README.md` is being exempted too, and the whole gate has
  been switched off rather than scoped.
- A gate other than the three at `:196`, `:238` and `:281` turns out to iterate `liveDocs()`.
  Re-read before exempting it; durability and internal-consistency gates must still apply.
- `pnpm test` is red after step 4 for a reason that is not a name gate. That is a real finding
  about one of the five plans; report it rather than editing the plan to pass.

## Maintenance notes

- The exemption is scoped to `plans/NNN-*.md`. A plan named any other way is gated like ordinary prose,
  which is the safe default — do not loosen the pattern to accommodate a filename; rename the file.
- Plans 019–023 assume this landed. 019 is independent of the rest; 020 must precede 021 and 022;
  023 is sized on all four.
- If plan 023 widens the path gate to catch bare basenames, re-check that `isProposal` still short-
  circuits before the new rule, or a proposal starts failing on filenames it legitimately predicts.
